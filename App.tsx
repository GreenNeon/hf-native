import React, { useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ScannerView } from './src/components/ScannerView';
import { ConfirmationModal } from './src/components/ConfirmationModal';
import { HistoryModal } from './src/components/HistoryModal';
import { ManualInputModal } from './src/components/ManualInputModal';
import { Toast } from './src/components/Toast';
import { ScannedBatchDetail } from './src/types/inventory';

export default function App() {
  const [isCameraPaused, setIsCameraPaused] = useState<boolean>(false);
  const [activeScannedDetail, setActiveScannedDetail] = useState<ScannedBatchDetail | null>(null);
  const [isHistoryVisible, setIsHistoryVisible] = useState<boolean>(false);
  const [isManualInputVisible, setIsManualInputVisible] = useState<boolean>(false);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToastMessage(message);
    setToastType(type);
  };

  // Triggered when a valid QR or Barcode is detected
  const handleValidCode = (detail: ScannedBatchDetail) => {
    // Pause camera to prevent repeated scans while confirmation modal is active
    setIsCameraPaused(true);
    setActiveScannedDetail(detail);
  };

  // Triggered when an unrecognized code is scanned
  const handleInvalidCode = (_rawText: string, reason?: string) => {
    showToast(reason || 'Unrecognized barcode format. Expected HiFeed batch payload.', 'warning');
  };

  const handleCloseConfirmation = () => {
    setActiveScannedDetail(null);
    // Unpause camera after closing confirmation
    setIsCameraPaused(false);
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar style="dark" />
        <View style={styles.container}>
          {/* Toast Feedback */}
          <Toast
            message={toastMessage}
            type={toastType}
            onDismiss={() => setToastMessage(null)}
          />

          {/* 1. Header Bar */}
          <View style={styles.headerBar}>
            <View style={styles.brandRow}>
              <View style={styles.logoBadge}>
                <MaterialCommunityIcons name="sprout" size={20} color="#16A34A" />
              </View>
              <View>
                <View style={styles.brandTitleRow}>
                  <Text style={styles.brandTitle}>HiFeed</Text>
                  <View style={styles.opsTag}>
                    <Text style={styles.opsTagText}>SCOM</Text>
                  </View>
                </View>
                <Text style={styles.brandSubtitle}>Warehouse & Field Operations</Text>
              </View>
            </View>

            {/* Quick Manual Entry / Preset Button */}
            <TouchableOpacity
              style={styles.manualEntryBtn}
              onPress={() => setIsManualInputVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="keypad-outline" size={16} color="#0F172A" />
              <Text style={styles.manualEntryText}>Manual</Text>
            </TouchableOpacity>
          </View>

          {/* Operator Badge */}
          <View style={styles.operatorRow}>
            <View style={styles.operatorPill}>
              <View style={styles.onlineDot} />
              <Text style={styles.operatorLabel}>OPERATOR:</Text>
              <Text style={styles.operatorValue}>staff-01</Text>
            </View>
            <View style={styles.rolePill}>
              <Text style={styles.roleText}>Field Operator</Text>
            </View>
          </View>

          {/* 2. Main Camera Area (Big Rounded Rectangle) */}
          <View style={styles.cameraSection}>
            <ScannerView
              isPaused={isCameraPaused}
              onTogglePause={() => setIsCameraPaused((prev) => !prev)}
              onValidCode={handleValidCode}
              onInvalidCode={handleInvalidCode}
            />
          </View>

          {/* Instructions banner */}
          <View style={styles.instructionBox}>
            <Ionicons name="information-circle-outline" size={16} color="#64748B" style={{ marginRight: 6 }} />
            <Text style={styles.instructionText}>
              Align QR or Barcode inside rectangle. Tap box to pause/resume.
            </Text>
          </View>

          {/* 3. Bottom Section: History Button */}
          <View style={styles.bottomSection}>
            <TouchableOpacity
              style={styles.historyButton}
              onPress={() => setIsHistoryVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.historyIconWrapper}>
                <Ionicons name="time-outline" size={20} color="#0F172A" />
              </View>
              <View style={styles.historyTextContainer}>
                <Text style={styles.historyButtonTitle}>Mutation History</Text>
                <Text style={styles.historyButtonSubtitle}>
                  View chronological inbound & dispatch audit ledger
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Confirmation Modal (Inbound, Dispatch, or Cancel) */}
          <ConfirmationModal
            visible={!!activeScannedDetail}
            batchDetail={activeScannedDetail}
            onClose={handleCloseConfirmation}
            onSuccess={(msg) => showToast(msg, 'success')}
            onError={(err) => showToast(err, 'error')}
          />

          {/* History Modal (Audit Ledger) */}
          <HistoryModal
            visible={isHistoryVisible}
            onClose={() => setIsHistoryVisible(false)}
          />

          {/* Manual Code & Sample Presets Modal */}
          <ManualInputModal
            visible={isManualInputVisible}
            onClose={() => setIsManualInputVisible(false)}
            onSubmitPayload={handleValidCode}
            onError={(err) => showToast(err, 'warning')}
          />
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandTitle: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  opsTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  opsTagText: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '700',
  },
  brandSubtitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  manualEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  manualEntryText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '600',
  },
  operatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 4,
    marginBottom: 4,
  },
  operatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  operatorLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },
  operatorValue: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '700',
  },
  rolePill: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  roleText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
  },
  cameraSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  instructionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    marginHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  instructionText: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    flexShrink: 1,
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 18 : 20,
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  historyIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyTextContainer: {
    flex: 1,
  },
  historyButtonTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
  historyButtonSubtitle: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
});
