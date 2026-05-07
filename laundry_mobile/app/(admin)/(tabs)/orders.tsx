import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AdminColors, AdminShadows } from '../../../constants/AdminColors';
import { StatusColors } from '../../../constants/StatusColors';
import { adminApi } from '../../../src/services/adminApi';
import { StatusBadge } from '../../../components/admin/StatusBadge';
import { SkeletonCard } from '../../../components/admin/SkeletonCard';
import { EmptyState } from '../../../components/admin/EmptyState';
import { router } from 'expo-router';

const TABS = [
  { id: 'Toutes', label: 'Toutes' },
  { id: 'en_attente', label: 'En attente' },
  { id: 'validee', label: 'Validée' },
  { id: 'en_traitement', label: 'En traitement' },
  { id: 'prete', label: 'Prête' },
  { id: 'livree', label: 'Livrée' },
  { id: 'payee', label: 'Payée' },
];

export default function OrdersScreen() {
  const [activeTab, setActiveTab] = useState('Toutes');
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const fetchOrders = async (pageNum: number, isRefresh: boolean = false) => {
    try {
      if (pageNum === 0) setLoading(true);
      else setLoadingMore(true);

      const params = {
        status: activeTab === 'Toutes' ? undefined : activeTab,
        search: search.length > 2 ? search : undefined,
        page: pageNum,
        limit: 20
      };

      const res = await adminApi.getOrders(params);
      const newOrders = res.data.content || res.data; // Handle both paginated and list responses

      if (isRefresh || pageNum === 0) {
        setOrders(newOrders);
      } else {
        setOrders(prev => [...prev, ...newOrders]);
      }

      setHasMore(newOrders.length === 20);
      setTotalCount(res.data.totalElements || newOrders.length);
    } catch (error) {
      console.error('Fetch orders error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchOrders(0, true);
  }, [activeTab, search]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(0);
    fetchOrders(0, true);
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchOrders(nextPage);
    }
  };

  const handleValidateOrder = (id: number) => {
    Alert.alert(
      'Valider la commande',
      'Voulez-vous valider cette commande pour traitement ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Valider',
          onPress: async () => {
            try {
              await adminApi.updateOrderStatus(id, 'PICKED_UP');
              onRefresh();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de valider la commande');
            }
          }
        }
      ]
    );
  };

  const renderOrderCard = ({ item }: { item: any }) => {
    const statusCfg = StatusColors[item.status] || StatusColors.PENDING_PICKUP;

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => router.push(`/order/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={[styles.statusAccent, { backgroundColor: statusCfg.dot }]} />

        <View style={styles.cardTop}>
          <Text style={styles.orderRef}>#{item.numeroCommande}</Text>
          <StatusBadge status={item.status} />
        </View>

        <Text style={styles.clientName}>{item.client?.name || item.clientNom}</Text>

        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="cube-outline" size={14} color={AdminColors.textSecondary} />
            <Text style={styles.infoText}>{item.commandeTapis?.length || 0} articles</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={14} color={AdminColors.textSecondary} />
            <Text style={styles.infoText}>{new Date(item.dateCreation).toLocaleDateString()}</Text>
          </View>
        </View>

        <View style={styles.cardBottom}>
          <Text style={styles.amountText}>{item.montantTotal} DH</Text>

          {item.status === 'PENDING_PICKUP' && (
            <TouchableOpacity
              style={styles.validateBtn}
              onPress={() => handleValidateOrder(item.id)}
            >
              <Text style={styles.validateBtnText}>Valider</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Commandes</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{totalCount} total</Text>
          </View>
        </View>

        <FlatList
          horizontal
          data={TABS}
          keyExtractor={item => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.tab, activeTab === item.id && styles.activeTab]}
              onPress={() => { setActiveTab(item.id); setPage(0); }}
            >
              <Text style={[styles.tabText, activeTab === item.id && styles.activeTabText]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={AdminColors.primary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher client ou référence..."
            placeholderTextColor={AdminColors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={AdminColors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      <FlatList
        data={orders}
        renderItem={renderOrderCard}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AdminColors.primary} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          loading ? (
            <View style={{ padding: 16 }}>
              {Array(5).fill(0).map((_, i) => <SkeletonCard key={i} />)}
            </View>
          ) : (
            <EmptyState
              icon="📋"
              title="Aucune commande"
              subtitle={activeTab === 'Toutes' ? "Commencez par créer une commande" : `Aucune commande avec le statut "${activeTab}"`}
            />
          )
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator color={AdminColors.primary} style={{ marginVertical: 20 }} /> : <View style={{ height: 40 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AdminColors.bg,
  },
  headerSafe: {
    backgroundColor: 'white',
    ...AdminShadows.shadowSmall,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: AdminColors.textPrimary,
  },
  countBadge: {
    backgroundColor: AdminColors.primary100,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countText: {
    color: AdminColors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tab: {
    backgroundColor: 'white',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    ...AdminShadows.shadowSmall,
  },
  activeTab: {
    backgroundColor: AdminColors.primary,
    borderColor: AdminColors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: AdminColors.textMuted,
  },
  activeTabText: {
    color: 'white',
  },
  searchContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: 'white',
    borderRadius: 14,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
    ...AdminShadows.shadowSmall,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: AdminColors.textPrimary,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    position: 'relative',
    overflow: 'hidden',
    ...AdminShadows.shadowSmall,
  },
  statusAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderRef: {
    fontSize: 11,
    fontWeight: '600',
    color: AdminColors.textMuted,
    textTransform: 'uppercase',
  },
  clientName: {
    fontSize: 16,
    fontWeight: '700',
    color: AdminColors.textPrimary,
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 10,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 13,
    color: AdminColors.textSecondary,
    fontWeight: '500',
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  amountText: {
    fontSize: 18,
    fontWeight: '700',
    color: AdminColors.primary,
  },
  validateBtn: {
    backgroundColor: AdminColors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  validateBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
});
