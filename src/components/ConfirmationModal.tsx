import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { ScannedBatchDetail, StockBatch } from '../types/inventory';
import {
  fetchBatchByNumber,
  getMockStock,
  submitInbound,
  submitScanDispatch,
} from '../services/api';

interface ConfirmationModalProps {
  visible: boolean;
  batchDetail: ScannedBatchDetail | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (errorMessage: string) => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  visible,
  batchDetail,
  onClose,
  onSuccess,
  onError,
}) => {
  const [actionMode, setActionMode] = useState<'INBOUND' | 'DISPATCH'>('DISPATCH');
  const [quantity, setQuantity] = useState<number>(10);
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Live batch fetching state
  const [isFetchingBatch, setIsFetchingBatch] = useState<boolean>(true);
  const [liveStock, setLiveStock] = useState<number | null>(null);
  const [liveBatch, setLiveBatch] = useState<StockBatch | null>(null);

  // Re-fetch batch item every time modal opens or scanned batch changes
  const reloadBatchItem = () => {
    if (!batchDetail?.batch_number) return;

    setIsFetchingBatch(true);
    fetchBatchByNumber(batchDetail.batch_number)
      .then((batch) => {
        if (batch) {
          setLiveBatch(batch);
          setLiveStock(batch.current_qty);
        } else {
          // New batch or not found on server
          setLiveStock(batchDetail.current_qty ?? 0);
        }
      })
      .catch((err) => {
        console.error('[CONFIRMATION] Error fetching live batch stock:', err);
        setLiveStock(batchDetail.current_qty ?? getMockStock(batchDetail.batch_number));
      })
      .finally(() => {
        setIsFetchingBatch(false);
      });
  };

  useEffect(() => {
    if (visible && batchDetail?.batch_number) {
      setLiveStock(null);
      setLiveBatch(null);
      reloadBatchItem();
    }
  }, [visible, batchDetail?.batch_number]);

  // Current verified available stock
  const currentAvailableStock =
    liveStock !== null
      ? liveStock
      : (batchDetail?.current_qty ?? (batchDetail ? getMockStock(batchDetail.batch_number) : 0));

  const displayTitle = liveBatch?.feed_item?.name || batchDetail?.name || '';
  const displayUnit = liveBatch?.feed_item?.unit || batchDetail?.unit || 'units';
  const displayExpiry = liveBatch?.expired_date
    ? liveBatch.expired_date.split('T')[0]
    : (batchDetail?.expired_date || '');

  const adjustQty = (amount: number) => {
    setQuantity((prev) => Math.max(1, prev + amount));
  };

  const handleSubmit = async () => {
    if (!batchDetail) return;

    if (quantity <= 0) {
      onError('Quantity must be greater than zero.');
      return;
    }

    if (actionMode === 'DISPATCH' && quantity > currentAvailableStock) {
      onError(
        `Cannot dispatch ${quantity} ${displayUnit}. Current batch stock is only ${currentAvailableStock}.`
      );
      return;
    }

    setIsLoading(true);

    try {
      if (actionMode === 'INBOUND') {
        const response = await submitInbound({
          sku: batchDetail.sku,
          batch_number: batchDetail.batch_number,
          expired_date: displayExpiry,
          quantity,
          notes: notes.trim() || undefined,
        });

        onSuccess(
          `Inbound recorded: +${response.quantity_added} ${displayUnit} to batch ${response.batch_number}`
        );
      } else {
        const response = await submitScanDispatch({
          qr_payload: batchDetail.rawPayload,
          quantity,
          notes: notes.trim() || undefined,
        });

        onSuccess(
          `Dispatch recorded: -${response.dispatched_qty} ${displayUnit} from batch ${response.batch_number}`
        );
      }
      onClose();
    } catch (err: any) {
      console.error('[CONFIRMATION ERROR]', err);
      onError(err.message || 'Transaction failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!visible || !batchDetail) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Stock Confirmation</Text>
              <Text style={styles.sheetSubtitle}>Verify live batch stock before mutating</Text>
            </View>
            <TouchableOpacity
              style={styles.closeCircle}
              onPress={onClose}
              disabled={isLoading}
            >
              <Ionicons name="close" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false}>
            {/* Batch Details Card */}
            <View style={styles.detailCard}>
              <View style={styles.badgeRow}>
                <View style={styles.skuBadge}>
                  <Text style={styles.skuBadgeText}>{batchDetail.sku}</Text>
                </View>
                {batchDetail.category && (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{batchDetail.category}</Text>
                  </View>
                )}

                {/* Live Stock Badge with loading indicator */}
                {isFetchingBatch ? (
                  <View style={[styles.stockBadge, styles.stockBadgeLoading]}>
                    <ActivityIndicator size="small" color="#0F172A" style={{ marginRight: 6 }} />
                    <Text style={styles.stockBadgeLoadingText}>Checking live stock...</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.stockBadge}
                    onPress={reloadBatchItem}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.stockDot,
                        currentAvailableStock > 0 ? styles.stockDotActive : styles.stockDotDepleted,
                      ]}
                    />
                    <Text style={styles.stockBadgeText}>
                      Live Stock: {currentAvailableStock} {displayUnit}
                    </Text>
                    <Ionicons
                      name="refresh"
                      size={12}
                      color="#64748B"
                      style={{ marginLeft: 6 }}
                    />
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.feedTitle}>{displayTitle}</Text>

              <View style={styles.metaGrid}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>BATCH NUMBER</Text>
                  <Text style={styles.metaValue}>{batchDetail.batch_number}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>EXPIRY DATE</Text>
                  <Text style={styles.metaValue}>{displayExpiry}</Text>
                </View>
              </View>
            </View>

            {/* Action Segment Switcher: INBOUND vs DISPATCH */}
            <Text style={styles.sectionHeading}>SELECT ACTION</Text>
            <View style={styles.segmentContainer}>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  actionMode === 'INBOUND' && styles.segmentInboundActive,
                ]}
                onPress={() => setActionMode('INBOUND')}
                disabled={isLoading}
              >
                <Ionicons
                  name="arrow-down-circle"
                  size={16}
                  color={actionMode === 'INBOUND' ? '#FFFFFF' : '#64748B'}
                />
                <Text
                  style={[
                    styles.segmentText,
                    actionMode === 'INBOUND' && styles.segmentTextActive,
                  ]}
                >
                  INBOUND (+ Add)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  actionMode === 'DISPATCH' && styles.segmentDispatchActive,
                ]}
                onPress={() => setActionMode('DISPATCH')}
                disabled={isLoading}
              >
                <Ionicons
                  name="arrow-up-circle"
                  size={16}
                  color={actionMode === 'DISPATCH' ? '#FFFFFF' : '#64748B'}
                />
                <Text
                  style={[
                    styles.segmentText,
                    actionMode === 'DISPATCH' && styles.segmentTextActive,
                  ]}
                >
                  DISPATCH (- Deduct)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Quantity Controls */}
            <Text style={styles.sectionHeading}>
              TRANSFER QUANTITY ({displayUnit.toUpperCase()})
            </Text>
            <View style={styles.stepperBox}>
              <TouchableOpacity
                style={styles.stepperButton}
                onPress={() => adjustQty(-1)}
                disabled={quantity <= 1 || isLoading || isFetchingBatch}
              >
                <Ionicons
                  name="remove"
                  size={20}
                  color={quantity <= 1 ? '#CBD5E1' : '#0F172A'}
                />
              </TouchableOpacity>

              <View style={styles.quantityInputContainer}>
                <TextInput
                  style={styles.quantityInput}
                  keyboardType="numeric"
                  value={quantity.toString()}
                  onChangeText={(val) => {
                    const parsed = parseInt(val.replace(/[^0-9]/g, ''), 10);
                    setQuantity(isNaN(parsed) ? 0 : parsed);
                  }}
                  editable={!isLoading && !isFetchingBatch}
                />
                <Text style={styles.unitSuffix}>{displayUnit}</Text>
              </View>

              <TouchableOpacity
                style={styles.stepperButton}
                onPress={() => adjustQty(1)}
                disabled={isLoading || isFetchingBatch}
              >
                <Ionicons name="add" size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {/* Quick Presets */}
            <View style={styles.presetRow}>
              {[5, 10, 25, 50].map((step) => (
                <TouchableOpacity
                  key={step}
                  style={styles.presetButton}
                  onPress={() => setQuantity(step)}
                  disabled={isLoading || isFetchingBatch}
                >
                  <Text style={styles.presetButtonText}>{step}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Stock Warning if Dispatch exceeds available */}
            {!isFetchingBatch && actionMode === 'DISPATCH' && quantity > currentAvailableStock && (
              <View style={styles.warningAlert}>
                <Ionicons name="alert-circle" size={16} color="#DC2626" />
                <Text style={styles.warningAlertText}>
                  Exceeds live batch stock ({currentAvailableStock} {displayUnit}).
                </Text>
              </View>
            )}

            {/* Notes Input */}
            <Text style={styles.sectionHeading}>MUTATION NOTES (OPTIONAL)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="e.g. Received from Mill 01 or Dispatched to farm..."
              placeholderTextColor="#94A3B8"
              value={notes}
              onChangeText={setNotes}
              multiline={true}
              numberOfLines={2}
              editable={!isLoading && !isFetchingBatch}
            />

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Action Buttons: Submit & Cancel */}
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitButton,
                actionMode === 'INBOUND' ? styles.submitInbound : styles.submitDispatch,
                (isLoading ||
                  isFetchingBatch ||
                  (actionMode === 'DISPATCH' && quantity > currentAvailableStock)) &&
                  styles.submitDisabled,
              ]}
              onPress={handleSubmit}
              disabled={
                isLoading ||
                isFetchingBatch ||
                (actionMode === 'DISPATCH' && quantity > currentAvailableStock)
              }
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : isFetchingBatch ? (
                <>
                  <ActivityIndicator
                    color="#FFFFFF"
                    size="small"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.submitButtonText}>Verifying Stock...</Text>
                </>
              ) : (
                <>
                  <Ionicons
                    name={actionMode === 'INBOUND' ? 'download-outline' : 'paper-plane-outline'}
                    size={16}
                    color="#FFFFFF"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.submitButtonText}>
                    Confirm {actionMode === 'INBOUND' ? 'Inbound' : 'Dispatch'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  sheetTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '700',
  },
  sheetSubtitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  closeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  detailCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  skuBadge: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  skuBadgeText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '700',
  },
  categoryBadge: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryBadgeText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stockBadgeLoading: {
    backgroundColor: '#F1F5F9',
  },
  stockBadgeLoadingText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  stockDotActive: {
    backgroundColor: '#16A34A',
  },
  stockDotDepleted: {
    backgroundColor: '#DC2626',
  },
  stockBadgeText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '600',
  },
  feedTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
    marginVertical: 4,
  },
  metaGrid: {
    flexDirection: 'row',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    gap: 16,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  metaValue: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  sectionHeading: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 2,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 3,
    marginBottom: 14,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 6,
    gap: 6,
  },
  segmentInboundActive: {
    backgroundColor: '#16A34A',
  },
  segmentDispatchActive: {
    backgroundColor: '#DC2626',
  },
  segmentText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 4,
    marginBottom: 8,
  },
  stepperButton: {
    width: 42,
    height: 42,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityInputContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityInput: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    minWidth: 80,
    padding: 0,
  },
  unitSuffix: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  presetButton: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetButtonText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700',
  },
  warningAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 12,
    gap: 8,
  },
  warningAlertText: {
    color: '#991B1B',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  notesInput: {
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    textAlignVertical: 'top',
    minHeight: 52,
  },
  footerRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  submitInbound: {
    backgroundColor: '#16A34A',
  },
  submitDispatch: {
    backgroundColor: '#DC2626',
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
