import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { adminApi } from '../../../src/services/adminApi';
import { StatusBadge } from '../../../components/admin/StatusBadge';
import { SkeletonCard } from '../../../components/admin/SkeletonCard';
import { EmptyState } from '../../../components/admin/EmptyState';
import { AdminColors, AdminShadows } from '../../../constants/AdminColors';
import { useTranslation } from 'react-i18next';

const ALLOWED_STATUSES = [
  'Toutes', 'PENDING_PICKUP', 'PICKED_UP', 'IN_PROCESS', 'READY_FOR_DELIVERY', 'CANCELLED',
];

export default function EmployeOrdersScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  const TABS = [
    { id: 'Toutes',             label: t('common.all') },
    { id: 'PENDING_PICKUP',     label: t('status.PENDING_PICKUP') },
    { id: 'PICKED_UP',          label: t('status.PICKED_UP') },
    { id: 'IN_PROCESS',         label: t('status.IN_PROCESS') },
    { id: 'READY_FOR_DELIVERY', label: t('status.READY_FOR_DELIVERY') },
    { id: 'CANCELLED',          label: t('status.CANCELLED') },
  ];

  const [activeTab, setActiveTab] = useState('Toutes');
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const fetchOrders = async (pageNum: number, isRefresh = false) => {
    try {
      if (pageNum === 0) setLoading(true); else setLoadingMore(true);
      const params = {
        status: activeTab === 'Toutes' ? undefined : activeTab,
        search: search.length > 2 ? search : undefined,
        page: pageNum,
        limit: 20,
      };
      const res = await adminApi.getOrders(params);
      const raw = res.data.content || res.data;
      // filter out DELIVERED on client side as safety net
      const filtered = raw.filter((o: any) => o.status !== 'DELIVERED');
      if (isRefresh || pageNum === 0) setOrders(filtered);
      else setOrders(prev => [...prev, ...filtered]);
      setHasMore(raw.length === 20);
      setTotalCount(res.data.totalElements || filtered.length);
    } catch (e) {
      console.error('Employee orders fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => { fetchOrders(0, true); }, [activeTab, search]);

  const onRefresh = () => { setRefreshing(true); setPage(0); fetchOrders(0, true); };
  const loadMore = () => {
    if (!loadingMore && hasMore) {
      const next = page + 1;
      setPage(next);
      fetchOrders(next);
    }
  };

  const renderCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/order/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={[styles.cardHeader, isArabic && { flexDirection: 'row-reverse' }]}>
        <Text style={styles.ref}>#{item.numeroCommande}</Text>
        <StatusBadge status={item.status} />
      </View>
      <Text style={[styles.clientName, isArabic && { textAlign: 'right' }]}>
        {item.client?.name || item.clientNom}
      </Text>
      <View style={[styles.meta, isArabic && { flexDirection: 'row-reverse' }]}>
        <View style={[styles.metaItem, isArabic && { flexDirection: 'row-reverse' }]}>
          <Ionicons name="cube-outline" size={13} color={AdminColors.textMuted} />
          <Text style={styles.metaText}>{item.commandeTapis?.length || 0} {t('dashboard.orders_count')}</Text>
        </View>
        <View style={[styles.metaItem, isArabic && { flexDirection: 'row-reverse' }]}>
          <Ionicons name="calendar-outline" size={13} color={AdminColors.textMuted} />
          <Text style={styles.metaText}>
            {new Date(item.dateCreation).toLocaleDateString(isArabic ? 'ar-EG' : 'fr-FR')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={[styles.headerRow, isArabic && { flexDirection: 'row-reverse' }]}>
          <Text style={styles.title}>{t('admin.orders.title')}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{totalCount}</Text>
          </View>
        </View>

        {/* Tabs */}
        <FlatList
          horizontal
          inverted={isArabic}
          data={TABS}
          keyExtractor={i => i.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.tab, activeTab === item.id && styles.tabActive]}
              onPress={() => { setActiveTab(item.id); setPage(0); }}
            >
              <Text style={[styles.tabText, activeTab === item.id && styles.tabTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />

        {/* Search */}
        <View style={[styles.search, isArabic && { flexDirection: 'row-reverse' }]}>
          <Ionicons name="search" size={16} color={AdminColors.primary} />
          <TextInput
            style={[styles.searchInput, isArabic && { textAlign: 'right' }]}
            placeholder={t('admin.orders.search_placeholder')}
            placeholderTextColor={AdminColors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={AdminColors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      <FlatList
        data={orders}
        renderItem={renderCard}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AdminColors.primary} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          loading
            ? <View style={{ padding: 16 }}>{Array(5).fill(0).map((_, i) => <SkeletonCard key={i} />)}</View>
            : <EmptyState icon="📋" title={t('admin.orders.empty_title')} subtitle={t('common.no_data')} />
        }
        ListFooterComponent={
          loadingMore
            ? <ActivityIndicator color={AdminColors.primary} style={{ marginVertical: 20 }} />
            : <View style={{ height: 30 }} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  headerSafe: { backgroundColor: 'white', ...AdminShadows.shadowSmall, zIndex: 10 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 10,
  },
  title: { fontSize: 20, fontWeight: '700', color: AdminColors.textPrimary, flex: 1 },
  countBadge: {
    backgroundColor: AdminColors.primary100, borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  countText: { color: AdminColors.primary, fontSize: 12, fontWeight: '600' },
  tabsRow: { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  tab: {
    backgroundColor: 'white', borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
  },
  tabActive: { backgroundColor: AdminColors.primary, borderColor: AdminColors.primary },
  tabText: { fontSize: 12, fontWeight: '600', color: AdminColors.textMuted },
  tabTextActive: { color: 'white' },
  search: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: '#F4F6F8', borderRadius: 12,
    height: 44, paddingHorizontal: 12, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: AdminColors.textPrimary },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: 'white', borderRadius: 14,
    padding: 16, marginBottom: 10,
    ...AdminShadows.shadowSmall,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  ref: { fontSize: 11, fontWeight: '700', color: AdminColors.textMuted, textTransform: 'uppercase' },
  clientName: { fontSize: 16, fontWeight: '700', color: AdminColors.textPrimary, marginBottom: 10 },
  meta: { flexDirection: 'row', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12, color: AdminColors.textSecondary, fontWeight: '500' },
});
