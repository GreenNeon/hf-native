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
import { SAMPLE_PRESETS, validateAndParseQR } from '../utils/qrParser';
import { FeedItem, ScannedBatchDetail, StockBatch } from '../types/inventory';
import { fetchBatchesForSku, fetchFeedItems } from '../services/api';

interface ManualInputModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmitPayload: (detail: ScannedBatchDetail) => void;
  onError: (errorMessage: string) => void;
}

type ModalTab = 'AUTOCOMPLETE' | 'RAW_PRESETS';

export const ManualInputModal: React.FC<ManualInputModalProps> = ({
  visible,
  onClose,
  onSubmitPayload,
  onError,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('AUTOCOMPLETE');

  // Search & Autocomplete state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [allItems, setAllItems] = useState<FeedItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<FeedItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  // Selected item & batches state
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [availableBatches, setAvailableBatches] = useState<StockBatch[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState<boolean>(false);
  const [selectedBatch, setSelectedBatch] = useState<StockBatch | null>(null);

  // Raw payload input fallback
  const [rawText, setRawText] = useState<string>('');

  // Initial load of master feed items when modal opens
  useEffect(() => {
    if (visible) {
      setIsLoadingItems(true);
      fetchFeedItems()
        .then((items) => {
          setAllItems(items);
          setFilteredItems(items);
        })
        .catch(() => {
          // Handled gracefully in api.ts fallback
        })
        .finally(() => {
          setIsLoadingItems(false);
        });
    } else {
      // Reset state when modal is closed
      setSearchQuery('');
      setSelectedItem(null);
      setSelectedBatch(null);
      setAvailableBatches([]);
      setIsDropdownOpen(false);
      setRawText('');
    }
  }, [visible]);

  // Handle search query change for SKU / Product Name
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    setIsDropdownOpen(true);

    if (!text.trim()) {
      setFilteredItems(allItems);
      return;
    }

    const q = text.trim().toLowerCase();
    const matches = allItems.filter(
      (item) =>
        item.sku.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
    setFilteredItems(matches);
  };

  // When a feed item is picked from autocomplete
  const handleSelectItem = (item: FeedItem) => {
    setSelectedItem(item);
    setSearchQuery(item.sku);
    setIsDropdownOpen(false);
    setSelectedBatch(null);
    setIsLoadingBatches(true);

    // Fetch live or cached batches for this SKU
    fetchBatchesForSku(item.sku, item.id)
      .then((batches) => {
        setAvailableBatches(batches);
        // Pre-select first active batch if available
        const activeBatch = batches.find((b) => b.status === 'ACTIVE') || batches[0];
        if (activeBatch) {
          setSelectedBatch(activeBatch);
        }
      })
      .catch((err) => {
        console.error('Error fetching batches for SKU:', err);
      })
      .finally(() => {
        setIsLoadingBatches(false);
      });
  };

  // Clear selected item to search again
  const handleClearSelectedItem = () => {
    setSelectedItem(null);
    setSelectedBatch(null);
    setAvailableBatches([]);
    setSearchQuery('');
    setFilteredItems(allItems);
    setIsDropdownOpen(true);
  };

  // Submit the selected batch
  const handleSubmitSelectedBatch = () => {
    if (!selectedItem || !selectedBatch) {
      onError('Please select a SKU and an available batch.');
      return;
    }

    const cleanExpiry = selectedBatch.expired_date.includes('T')
      ? selectedBatch.expired_date.split('T')[0]
      : selectedBatch.expired_date;

    const payloadString =
      selectedBatch.qr_payload ||
      JSON.stringify({
        batch_number: selectedBatch.batch_number,
        sku: selectedItem.sku,
        expired_date: cleanExpiry,
      });

    const detail: ScannedBatchDetail = {
      sku: selectedItem.sku,
      batch_number: selectedBatch.batch_number,
      expired_date: cleanExpiry,
      name: selectedItem.name,
      category: selectedItem.category,
      unit: selectedItem.unit,
      current_qty: selectedBatch.current_qty,
      rawPayload: payloadString,
    };

    onClose();
    onSubmitPayload(detail);
  };

  // Raw payload fallback submit
  const handleValidateAndSubmitRaw = () => {
    const text = rawText.trim();
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
      animationType="slide"
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
              <Text style={styles.title}>Manual Input & Batch Search</Text>
              <Text style={styles.subtitle}>Search SKU number & select batch</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Mode Switcher Tabs */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'AUTOCOMPLETE' && styles.tabBtnActive,
              ]}
              onPress={() => setActiveTab('AUTOCOMPLETE')}
            >
              <Ionicons
                name="search-outline"
                size={14}
                color={activeTab === 'AUTOCOMPLETE' ? '#0F172A' : '#64748B'}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === 'AUTOCOMPLETE' && styles.tabBtnTextActive,
                ]}
              >
                SKU Autocomplete
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'RAW_PRESETS' && styles.tabBtnActive,
              ]}
              onPress={() => setActiveTab('RAW_PRESETS')}
            >
              <Ionicons
                name="code-slash-outline"
                size={14}
                color={activeTab === 'RAW_PRESETS' ? '#0F172A' : '#64748B'}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === 'RAW_PRESETS' && styles.tabBtnTextActive,
                ]}
              >
                Raw / Presets
              </Text>
            </TouchableOpacity>
          </View>

          {/* Body Content */}
          <ScrollView
            style={styles.body}
            contentContainerStyle={{ paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {activeTab === 'AUTOCOMPLETE' ? (
              <View>
                {/* 1. SKU Search & Autocomplete */}
                <Text style={styles.sectionLabel}>SEARCH SKU OR PRODUCT</Text>
                <View style={styles.searchBarContainer}>
                  <Ionicons name="search" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Type SKU (e.g. HF-BR-01) or name..."
                    placeholderTextColor="#94A3B8"
                    value={searchQuery}
                    onChangeText={handleSearchChange}
                    onFocus={() => setIsDropdownOpen(true)}
                    autoCapitalize="characters"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity
                      onPress={handleClearSelectedItem}
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="close-circle" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                  {isLoadingItems && (
                    <ActivityIndicator size="small" color="#0F172A" style={{ marginLeft: 6 }} />
                  )}
                </View>

                {/* Autocomplete Dropdown List */}
                {isDropdownOpen && filteredItems.length > 0 && (
                  <View style={styles.dropdownContainer}>
                    <Text style={styles.dropdownHeader}>
                      MATCHING FEED ITEMS ({filteredItems.length})
                    </Text>
                    {filteredItems.map((item) => (
                      <TouchableOpacity
                        key={item.id || item.sku}
                        style={styles.dropdownItem}
                        onPress={() => handleSelectItem(item)}
                      >
                        <View style={styles.dropdownItemLeft}>
                          <View style={styles.skuPill}>
                            <Text style={styles.skuPillText}>{item.sku}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.dropdownItemName} numberOfLines={1}>
                              {item.name}
                            </Text>
                            <Text style={styles.dropdownItemMeta}>
                              {item.category} • {item.unit}
                            </Text>
                          </View>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Selected Item Card */}
                {selectedItem && (
                  <View style={styles.selectedCard}>
                    <View style={styles.selectedCardHeader}>
                      <View style={styles.selectedBadgeRow}>
                        <View style={styles.selectedSkuPill}>
                          <Text style={styles.selectedSkuText}>{selectedItem.sku}</Text>
                        </View>
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryBadgeText}>{selectedItem.category}</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.changeItemBtn}
                        onPress={handleClearSelectedItem}
                      >
                        <Ionicons name="swap-horizontal" size={12} color="#0F172A" style={{ marginRight: 4 }} />
                        <Text style={styles.changeItemText}>Change</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.selectedItemTitle}>{selectedItem.name}</Text>
                    <Text style={styles.selectedItemUnit}>Packaging Unit: {selectedItem.unit}</Text>
                  </View>
                )}

                {/* 2. Existing Batches Selection for Selected Item */}
                {selectedItem && (
                  <View style={{ marginTop: 14 }}>
                    <View style={styles.batchesHeaderRow}>
                      <Text style={styles.sectionLabel}>AVAILABLE BATCHES</Text>
                      {isLoadingBatches && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <ActivityIndicator size="small" color="#0F172A" />
                          <Text style={styles.loadingBatchesText}>Fetching batches...</Text>
                        </View>
                      )}
                    </View>

                    {availableBatches.length > 0 ? (
                      <View style={styles.batchList}>
                        {availableBatches.map((batch) => {
                          const isSelected = selectedBatch?.batch_number === batch.batch_number;
                          const cleanExpiry = batch.expired_date.includes('T')
                            ? batch.expired_date.split('T')[0]
                            : batch.expired_date;

                          return (
                            <TouchableOpacity
                              key={batch.batch_number}
                              style={[
                                styles.batchCard,
                                isSelected && styles.batchCardSelected,
                              ]}
                              onPress={() => setSelectedBatch(batch)}
                              activeOpacity={0.7}
                            >
                              <View style={styles.batchCardTop}>
                                <View style={styles.batchNumberRow}>
                                  <Ionicons
                                    name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                                    size={16}
                                    color={isSelected ? '#16A34A' : '#94A3B8'}
                                    style={{ marginRight: 6 }}
                                  />
                                  <Text
                                    style={[
                                      styles.batchNumberText,
                                      isSelected && styles.batchNumberTextSelected,
                                    ]}
                                  >
                                    {batch.batch_number}
                                  </Text>
                                </View>
                                <View
                                  style={[
                                    styles.statusPill,
                                    batch.status === 'ACTIVE'
                                      ? styles.statusActive
                                      : batch.status === 'EXPIRED'
                                      ? styles.statusExpired
                                      : styles.statusDepleted,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.statusPillText,
                                      batch.status === 'ACTIVE'
                                        ? styles.statusActiveText
                                        : batch.status === 'EXPIRED'
                                        ? styles.statusExpiredText
                                        : styles.statusDepletedText,
                                    ]}
                                  >
                                    {batch.status}
                                  </Text>
                                </View>
                              </View>

                              <View style={styles.batchCardBottom}>
                                <Text style={styles.batchMetaText}>
                                  <Text style={styles.batchMetaLabel}>Stock: </Text>
                                  {batch.current_qty} {selectedItem.unit}
                                </Text>
                                <Text style={styles.batchMetaText}>
                                  <Text style={styles.batchMetaLabel}>Exp: </Text>
                                  {cleanExpiry}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ) : (
                      !isLoadingBatches && (
                        <View style={styles.emptyBatchesBox}>
                          <Ionicons name="cube-outline" size={24} color="#94A3B8" />
                          <Text style={styles.emptyBatchesText}>
                            No existing batches found for {selectedItem.sku}.
                          </Text>
                        </View>
                      )
                    )}

                    {/* Proceed Button */}
                    <TouchableOpacity
                      style={[
                        styles.submitBtn,
                        !selectedBatch && styles.submitBtnDisabled,
                        { marginTop: 16 },
                      ]}
                      onPress={handleSubmitSelectedBatch}
                      disabled={!selectedBatch}
                    >
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="#FFFFFF"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.submitBtnText}>
                        {selectedBatch
                          ? `Proceed with ${selectedBatch.batch_number}`
                          : 'Select a Batch to Proceed'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              /* Tab 2: Raw / Presets Fallback */
              <View>
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

                <Text style={[styles.sectionLabel, { marginTop: 18 }]}>
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
                  onPress={handleValidateAndSubmitRaw}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={16}
                    color="#FFFFFF"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.submitBtnText}>Validate & Proceed</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    padding: 16,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxHeight: '85%',
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
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    padding: 6,
    gap: 6,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  body: {
    padding: 18,
  },
  sectionLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    padding: 0,
    fontWeight: '600',
  },
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    overflow: 'hidden',
  },
  dropdownHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  dropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  skuPill: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  skuPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  dropdownItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  dropdownItemMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  selectedCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 10,
  },
  selectedCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  selectedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectedSkuPill: {
    backgroundColor: '#0F172A',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  selectedSkuText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  categoryBadge: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryBadgeText: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '600',
  },
  changeItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  changeItemText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '600',
  },
  selectedItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  selectedItemUnit: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  batchesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  loadingBatchesText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  batchList: {
    gap: 8,
  },
  batchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  batchCardSelected: {
    borderColor: '#16A34A',
    backgroundColor: '#F0FDF4',
  },
  batchCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  batchNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  batchNumberText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  batchNumberTextSelected: {
    fontWeight: '700',
    color: '#166534',
  },
  statusPill: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusActive: {
    backgroundColor: '#DCFCE7',
  },
  statusActiveText: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '700',
  },
  statusExpired: {
    backgroundColor: '#FEE2E2',
  },
  statusExpiredText: {
    color: '#B91C1C',
    fontSize: 10,
    fontWeight: '700',
  },
  statusDepleted: {
    backgroundColor: '#F1F5F9',
  },
  statusDepletedText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
  },
  batchCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
  },
  batchMetaLabel: {
    color: '#64748B',
    fontWeight: '500',
  },
  batchMetaText: {
    fontSize: 11,
    color: '#0F172A',
    fontWeight: '600',
  },
  emptyBatchesBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  emptyBatchesText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
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
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
