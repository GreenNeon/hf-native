import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { ScannedBatchDetail } from '../types/inventory';
import { validateAndParseQR } from '../utils/qrParser';

// Safe dynamic resolution of @pushpendersingh/react-native-scanner
let PushpenderScanner: any = null;
let PushpenderCameraView: any = null;
try {
  const pkg = require('@pushpendersingh/react-native-scanner');
  PushpenderScanner = pkg.BarcodeScanner;
  PushpenderCameraView = pkg.CameraView;
} catch {
  PushpenderScanner = null;
  PushpenderCameraView = null;
}

// Fallback to expo-camera for Expo Go / simulator testing
let ExpoCameraModule: any = null;
try {
  ExpoCameraModule = require('expo-camera');
} catch {
  ExpoCameraModule = null;
}

interface ScannerViewProps {
  onValidCode: (detail: ScannedBatchDetail) => void;
  onInvalidCode?: (rawText: string, reason?: string) => void;
  isPaused: boolean;
  onTogglePause: () => void;
}

export const ScannerView: React.FC<ScannerViewProps> = ({
  onValidCode,
  onInvalidCode,
  isPaused,
  onTogglePause,
}) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [lastScannedTime, setLastScannedTime] = useState<number>(0);
  const [scannerEngine, setScannerEngine] = useState<'pushpender' | 'expo' | 'mock'>('pushpender');

  // Animated laser line
  const laserAnim = useRef(new Animated.Value(0)).current;

  // Request camera permission on mount
  useEffect(() => {
    (async () => {
      // 1. Try pushpender scanner permission
      if (PushpenderScanner && typeof PushpenderScanner.requestCameraPermission === 'function') {
        try {
          const granted = await PushpenderScanner.requestCameraPermission();
          setHasPermission(granted);
          setScannerEngine('pushpender');
          return;
        } catch {
          // Native TurboModule not linked in this runtime (e.g. Expo Go)
        }
      }

      // 2. Try expo-camera permission fallback
      if (ExpoCameraModule?.Camera) {
        try {
          const { status } = await ExpoCameraModule.Camera.requestCameraPermissionsAsync();
          setHasPermission(status === 'granted');
          setScannerEngine('expo');
          return;
        } catch {
          // expo-camera fallback
        }
      }

      // 3. Simulator / Web fallback
      setHasPermission(true);
      setScannerEngine('mock');
    })();
  }, []);

  // Continuous laser animation when active
  useEffect(() => {
    if (!isPaused) {
      const scanLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, {
            toValue: 1,
            duration: 2200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(laserAnim, {
            toValue: 0,
            duration: 2200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );
      scanLoop.start();
      return () => scanLoop.stop();
    } else {
      laserAnim.setValue(0);
    }
  }, [isPaused]);

  // Listener for @pushpendersingh/react-native-scanner
  useEffect(() => {
    if (scannerEngine === 'pushpender' && PushpenderScanner && !isPaused && hasPermission) {
      let isSubscribed = true;

      try {
        PushpenderScanner.startScanning((barcodes: any[]) => {
          if (!isSubscribed || isPaused || !barcodes || barcodes.length === 0) return;
          const barcode = barcodes[0];
          handleScannedData(barcode.data);
        }).catch(() => {
          setScannerEngine('expo');
        });
      } catch {
        setScannerEngine('expo');
      }

      return () => {
        isSubscribed = false;
        try {
          PushpenderScanner.stopScanning?.().catch?.(() => {});
        } catch {}
      };
    }
  }, [scannerEngine, isPaused, hasPermission]);

  // Handle scanned raw string
  const handleScannedData = (rawText: string) => {
    const now = Date.now();
    // Debounce 1.5s
    if (now - lastScannedTime < 1500) return;
    setLastScannedTime(now);

    const result = validateAndParseQR(rawText);

    if (result.isValid && result.data) {
      onValidCode(result.data);
    } else {
      onInvalidCode?.(rawText, result.error);
    }
  };

  // Toggle flashlight
  const toggleTorch = (e: any) => {
    e.stopPropagation();
    const nextState = !torchOn;
    setTorchOn(nextState);

    if (scannerEngine === 'pushpender' && PushpenderScanner) {
      try {
        if (nextState) {
          PushpenderScanner.enableFlashlight?.();
        } else {
          PushpenderScanner.disableFlashlight?.();
        }
      } catch {}
    }
  };

  const laserTranslateY = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 280],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onTogglePause}
      style={styles.container}
    >
      {/* 1. Camera View Layer */}
      <View style={styles.cameraClip}>
        {!isPaused && hasPermission ? (
          <>
            {scannerEngine === 'pushpender' && PushpenderCameraView ? (
              <PushpenderCameraView style={StyleSheet.absoluteFill} />
            ) : ExpoCameraModule?.CameraView ? (
              <ExpoCameraModule.CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                enableTorch={torchOn}
                barcodeScannerSettings={{
                  barcodeTypes: ['qr', 'code128', 'ean13', 'upc_a'],
                }}
                onBarcodeScanned={(result: any) => {
                  if (result?.data) {
                    handleScannedData(result.data);
                  }
                }}
              />
            ) : (
              // Simulator / Web fallback view
              <View style={[StyleSheet.absoluteFill, styles.simulatorBackground]}>
                <Ionicons name="scan-outline" size={64} color="#94A3B8" />
                <Text style={styles.simulatorText}>Live Camera Stream Active</Text>
                <Text style={styles.simulatorSubtext}>Point at HiFeed Feed Sack or Pallet QR</Text>
              </View>
            )}
          </>
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.pausedBlackdrop]} />
        )}

        {/* 2. Active Scanner HUD Overlay */}
        {!isPaused && hasPermission && (
          <View style={styles.hudOverlay} pointerEvents="box-none">
            {/* Corner Aiming Brackets */}
            <View style={styles.reticleContainer} pointerEvents="none">
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />

              {/* Animated Laser Line */}
              <Animated.View
                style={[
                  styles.laserLine,
                  {
                    transform: [{ translateY: laserTranslateY }],
                  },
                ]}
              />
            </View>

            {/* Top Status Badge */}
            <View style={styles.topHud}>
              <View style={styles.statusBadge}>
                <View style={styles.pulsingDot} />
                <Text style={styles.statusText}>READY TO SCAN</Text>
              </View>

              <TouchableOpacity
                style={[styles.torchButton, torchOn && styles.torchButtonActive]}
                onPress={toggleTorch}
              >
                <Ionicons
                  name={torchOn ? 'flash' : 'flash-outline'}
                  size={16}
                  color={torchOn ? '#F59E0B' : '#FFFFFF'}
                />
              </TouchableOpacity>
            </View>

            {/* Bottom Tap Hint */}
            <View style={styles.bottomHud}>
              <View style={styles.tapToPausePill}>
                <Ionicons name="pause" size={12} color="#E2E8F0" style={{ marginRight: 4 }} />
                <Text style={styles.tapToPauseText}>Tap to pause camera</Text>
              </View>
            </View>
          </View>
        )}

        {/* 3. Paused Blur Overlay (Requirement: "make the toggle: pause to be blur background") */}
        {isPaused && (
          <BlurView intensity={90} tint="light" style={StyleSheet.absoluteFill}>
            <View style={styles.blurContent}>
              <View style={styles.pauseIconCircle}>
                <Ionicons name="play" size={28} color="#0F172A" style={{ marginLeft: 3 }} />
              </View>
              <Text style={styles.pauseTitle}>Camera Paused</Text>
              <Text style={styles.pauseSubtitle}>Tap anywhere to resume scanning</Text>
              <View style={styles.resumePill}>
                <Ionicons name="scan-outline" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.resumePillText}>Resume Camera</Text>
              </View>
            </View>
          </BlurView>
        )}

        {/* 4. Permission Denied State */}
        {hasPermission === false && (
          <View style={[StyleSheet.absoluteFill, styles.permissionContainer]}>
            <Ionicons name="camera-reverse-outline" size={40} color="#64748B" />
            <Text style={styles.permissionTitle}>Camera Permission Needed</Text>
            <Text style={styles.permissionDesc}>
              HiFeed scanner requires camera access to read QR barcodes on feed sacks.
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const { width } = Dimensions.get('window');
const BOX_WIDTH = Math.min(width - 36, 380);
const BOX_HEIGHT = Math.round(BOX_WIDTH * 1.15);

const styles = StyleSheet.create({
  container: {
    width: BOX_WIDTH,
    height: BOX_HEIGHT,
    alignSelf: 'center',
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cameraClip: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  simulatorBackground: {
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  simulatorText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
  },
  simulatorSubtext: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  pausedBlackdrop: {
    backgroundColor: '#F1F5F9',
  },
  hudOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    padding: 14,
  },
  topHud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
    marginRight: 6,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  torchButton: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  torchButtonActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.5)',
  },
  reticleContainer: {
    position: 'absolute',
    top: '18%',
    bottom: '22%',
    left: '12%',
    right: '12%',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#FFFFFF',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 2.5,
    borderLeftWidth: 2.5,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 2.5,
    borderRightWidth: 2.5,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 2.5,
    borderLeftWidth: 2.5,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 2.5,
    borderRightWidth: 2.5,
  },
  laserLine: {
    position: 'absolute',
    left: 4,
    right: 4,
    height: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
    opacity: 0.9,
  },
  bottomHud: {
    alignItems: 'center',
  },
  tapToPausePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  tapToPauseText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '500',
  },
  blurContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  pauseIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  pauseTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  pauseSubtitle: {
    color: '#64748B',
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
  resumePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  resumePillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  permissionContainer: {
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  permissionTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 6,
  },
  permissionDesc: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
