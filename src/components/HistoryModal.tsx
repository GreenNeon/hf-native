import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StockMutation } from '../types/inventory';
import { fetchMutations } from '../services/api';

interface HistoryModalProps {
  visible: boolean;
  onClose: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ visible, onClose }) => {
  const [mutations, setMutations] = useState<StockMutation[]>([]);
  const [filterType, setFilterType] = useState<'ALL' | 'INBOUND' | 'DISPATCH'>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadData = async () => {
    try {
      const data = await fetchMutations();
      setMutations(data);
    } catch {
      // fallback handled in api.ts
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (visible) {
      setLoading(true);
      loadData();
    }
  }, [visible]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filteredMutations = mutations.filter((m) => {
    if (filterType === 'ALL') return true;
    return m.type === filterType;
  });

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString('en-GB', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const renderItem = ({ item }: { item: StockMutation }) => {
    const isInbound = item.type === 'INBOUND';

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.typeBadgeContainer}>
            <View
              style={[
                styles.typeBadge,
                isInbound ? styles.inboundBadge : styles.dispatchBadge,
              ]}
            >
              <Ionicons
                name={isInbound ? 'arrow-down' : 'arrow-up'}
                size={12}
                color={isInbound ? '#15803D' : '#B91C1C'}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.typeText,
                  isInbound ? styles.inboundText : styles.dispatchText,
                ]}
              >
                {item.type}
              </Text>
            </View>
            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
          </View>

          <Text
            style={[
              styles.quantityText,
              isInbound ? styles.inboundQuantity : styles.dispatchQuantity,
            ]}
          >
            {isInbound ? '+' : '-'}
            {item.quantity}
          </Text>
        </View>

        <Text style={styles.feedName}>{item.feed_item.name}</Text>

        <View style={styles.cardBottom}>
          <View style={styles.detailPill}>
            <Text style={styles.detailLabel}>SKU:</Text>
            <Text style={styles.detailValue}>{item.feed_item.sku}</Text>
          </View>

          <View style={styles.detailPill}>
            <Text style={styles.detailLabel}>Batch:</Text>
            <Text style={styles.detailValue}>{item.batch_item.batch_number}</Text>
          </View>

          <View style={styles.detailPill}>
            <Text style={styles.detailLabel}>Staff:</Text>
            <Text style={styles.detailValue}>{item.created_by}</Text>
          </View>
        </View>

        {item.notes ? (
          <Text style={styles.notesText} numberOfLines={2}>
            "{item.notes}"
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Mutation History</Text>
            <Text style={styles.subtitle}>Audit ledger of recent stock movements</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          {(['ALL', 'INBOUND', 'DISPATCH'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.filterTab,
                filterType === tab && styles.filterTabActive,
              ]}
              onPress={() => setFilterType(tab)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  filterType === tab && styles.filterTabTextActive,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Mutation List */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="small" color="#0F172A" />
            <Text style={styles.loadingText}>Loading mutations...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredMutations}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#0F172A"
                colors={['#0F172A']}
              />
            }
            ListEmptyComponent={
              <View style={styles.centerContainer}>
                <Ionicons name="receipt-outline" size={40} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No mutations found</Text>
                <Text style={styles.emptySubtitle}>
                  Scan QR codes to record inbound or dispatch movements.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 20 : 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  title: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  filterTabActive: {
    backgroundColor: '#0F172A',
  },
  filterTabText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 10,
  },
  card: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  typeBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  inboundBadge: {
    backgroundColor: '#DCFCE7',
  },
  dispatchBadge: {
    backgroundColor: '#FEE2E2',
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  inboundText: {
    color: '#15803D',
  },
  dispatchText: {
    color: '#B91C1C',
  },
  dateText: {
    color: '#64748B',
    fontSize: 11,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '700',
  },
  inboundQuantity: {
    color: '#15803D',
  },
  dispatchQuantity: {
    color: '#B91C1C',
  },
  feedName: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardBottom: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  detailPill: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  detailLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
  },
  detailValue: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '600',
  },
  notesText: {
    color: '#64748B',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    color: '#64748B',
    marginTop: 10,
    fontSize: 13,
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 10,
  },
  emptySubtitle: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});
