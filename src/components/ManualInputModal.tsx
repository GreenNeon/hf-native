import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SAMPLE_PRESETS, validateAndParseQR } from '../utils/qrParser';
import { ScannedBatchDetail } from '../types/inventory';

interface ManualInputModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmitPayload: (detail: ScannedBatchDetail) => void;
  onError: (errorMessage: string) => void;
}

export const ManualInputModal: React.FC<ManualInputModalProps> = ({
  visible,
  onClose,
  onSubmitPayload,
  onError,
}) => {
  const [rawText, setRawText] = useState<string>('');

  const handleValidateAndSubmit = (textToValidate?: string) => {
    const text = (textToValidate ?? rawText).trim();
    if (!text) {
      onError('Please enter a QR payload or barcode string.');
      return;
    }

    const result = validateAndParseQR(text);
    if (result.isValid && result.data) {
      onClose();
      onSubmitPayload(result.data);
      setRawText('');
    } else {
      onError(result.error || 'Invalid QR payload format.');
    }
  };

  const handleSelectPreset = (preset: ScannedBatchDetail) => {
    onClose();
    onSubmitPayload(preset);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.cardContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Manual Input & Presets</Text>
              <Text style={styles.subtitle}>Simulator fallback & batch selection</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Quick Sample Presets */}
            <Text style={styles.sectionLabel}>SAMPLE BATCH PRESETS</Text>
            <View style={styles.presetList}>
              {SAMPLE_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.batch_number}
                  style={styles.presetItem}
                  onPress={() => handleSelectPreset(preset)}
                >
                  <View style={styles.presetLeft}>
                    <View style={styles.presetSkuBadge}>
                      <Text style={styles.presetSkuText}>{preset.sku}</Text>
                    </View>
                    <View>
                      <Text style={styles.presetName}>{preset.name}</Text>
                      <Text style={styles.presetBatch}>
                        {preset.batch_number} • Exp: {preset.expired_date}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom Input */}
            <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
              PASTE OR TYPE RAW QR PAYLOAD
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder={`{\n  "batch_number": "BATCH-2026-HF01-A",\n  "sku": "HF-BR-01",\n  "expired_date": "2026-12-31"\n}`}
              placeholderTextColor="#94A3B8"
              value={rawText}
              onChangeText={setRawText}
              multiline={true}
              numberOfLines={4}
            />

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={() => handleValidateAndSubmit()}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.submitBtnText}>Validate & Proceed</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  title: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 20,
  },
  sectionLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  presetList: {
    gap: 8,
  },
  presetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  presetSkuBadge: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetSkuText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '700',
  },
  presetName: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '600',
  },
  presetBatch: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 1,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    textAlignVertical: 'top',
    minHeight: 80,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 12,
  },
  submitBtn: {
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
