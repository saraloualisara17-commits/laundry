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
import { formatOrderItemsSummary } from '../../../src/utils/orderSummary';

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
      const newOrders = res.data.content || [];

      if (isRefresh || pageNum === 0) setOrders(newOrders);
      else setOrders(prev => [...prev, ...newOrders]);

      setHasMore(newOrders.length === 20);
      setTotalCount(res.data.totalElements || 0);
    } catch (error) {
      console.error('Fetch employe orders error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => { fetchOrders(0, true); }, [activeTab, search]);

  const onRefresh = () => { setRefreshing(true); setPage(0); fetchOrders(0, true); };
  const loadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      const next = page + 1; setPage(next); fetchOrders(next);
    }
  };

  const renderCard = ({ item }: { item: any }) => {
    const statusCfg = require('../../../constants/StatusColors').StatusColors[item.status] || { dot: '#94A3B8' };
    const itemsSummary = formatOrderItemsSummary(item.commandeTapis, t);

    return (
      <TouchableOpacity
        style={styles.card}
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
            <Text style={styles.infoText}>{itemsSummary}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={14} color={AdminColors.textSecondary} />
            <Text style={styles.infoText}>{new Date(item.dateCreation).toLocaleDateString()}</Text>
          </View>
        </View>

        <View style={styles.cardBottom}>
          <Text style={styles.amountText}>{item.montantTotal} {t('common.dh')}</Text>
          <TouchableOpacity 
             style={styles.detailsBtn}
             onPress={() => router.push(`/order/${item.id}`)}
          >
            <Text style={styles.detailsBtnText}>{t('common.details')} →</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{t('employe.orders.title')}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{totalCount} Total</Text>
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
              <Text style={[styles.tabText, activeTab === item.id && styles.activeTabText]}>{item.label}</Text>
            </TouchableOpacity>
          )}
        />

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={AdminColors.primary} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('admin.orders.search_placeholder')}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </SafeAreaView>

      <FlatList
        data={orders}
        renderItem={renderCard}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AdminColors.primary} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          loading ? (
            <View style={{ padding: 16 }}>{Array(5).fill(0).map((_, i) => <SkeletonCard key={i} />)}</View>
          ) : (
            <EmptyState icon="📋" title={t('admin.orders.empty_title')} subtitle={t('common.no_data')} />
          )
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator color={AdminColors.primary} style={{ marginVertical: 20 }} /> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerSafe: { backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerContent: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: AdminColors.textPrimary },
  countBadge: { backgroundColor: AdminColors.primary50, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  countText: { color: AdminColors.primary, fontSize: 12, fontWeight: '700' },
  tabsContainer: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 99, backgroundColor: '#F1F5F9' },
  activeTab: { backgroundColor: AdminColors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  activeTabText: { color: 'white' },
  searchContainer: { margin: 16, marginTop: 0, paddingHorizontal: 12, height: 44, backgroundColor: '#F1F5F9', borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchInput: { flex: 1, fontSize: 14, color: AdminColors.textPrimary },
  listContent: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12, position: 'relative', overflow: 'hidden', ...AdminShadows.shadowSmall },
  statusAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderRef: { fontSize: 12, fontWeight: '700', color: '#94A3B8' },
  clientName: { fontSize: 16, fontWeight: '700', color: AdminColors.textPrimary, marginBottom: 12 },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 16 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  amountText: { fontSize: 17, fontWeight: '800', color: AdminColors.primary },
  detailsBtn: { backgroundColor: AdminColors.primary50, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  detailsBtnText: { color: AdminColors.primary, fontSize: 12, fontWeight: '700' },
});
