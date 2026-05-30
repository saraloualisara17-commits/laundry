import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { SkeletonCard } from '../../components/admin/SkeletonCard';
import { EmptyState } from '../../components/admin/EmptyState';
import { AdminColors, AdminShadows } from '../../constants/AdminColors';
import { useTranslation } from 'react-i18next';
import { formatOrderItemsSummary } from '../../src/utils/orderSummary';
import { useInfiniteOrders } from '../../src/hooks/query/useOrders';

export default function LivreurOrdersScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  const TABS = [
    { id: 'Toutes',             label: t('common.all') },
    { id: 'PENDING_PICKUP',     label: t('status.PENDING_PICKUP') },
    { id: 'PICKED_UP',          label: t('status.PICKED_UP') },
    { id: 'IN_PROCESS',         label: t('status.IN_PROCESS') },
    { id: 'READY_FOR_DELIVERY', label: t('status.READY_FOR_DELIVERY') },
    { id: 'PICKUP_FAILED',      label: t('status.PICKUP_FAILED') },
    { id: 'DELIVERY_FAILED',    label: t('status.DELIVERY_FAILED') },
    { id: 'CANCELLED',          label: t('status.CANCELLED') },
  ];

  const [activeTab, setActiveTab] = useState('Toutes');
  const [search, setSearch] = useState('');

  const filters = useMemo(() => ({
    status: activeTab === 'Toutes' ? undefined : activeTab,
    search: search.length > 2 ? search : undefined,
  }), [activeTab, search]);

  const {
    data: ordersPages,
    isLoading: loading,
    isFetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage: loadingMore,
  } = useInfiniteOrders(filters);

  const orders = useMemo(
    () => (ordersPages?.pages ?? [])
      .flatMap((p: any) => p.content || p || [])
      .filter((o: any) => o.status !== 'DELIVERED'),
    [ordersPages]
  );
  const totalCount = orders.length;
  const refreshing = isFetching && !loading && !loadingMore;

  const onRefresh = () => { refetch(); };
  const loadMore = () => { if (hasNextPage && !loadingMore) fetchNextPage(); };

  const renderCard = ({ item }: { item: any }) => {
    const statusCfg = require('../../constants/StatusColors').StatusColors[item.status] || { dot: '#94A3B8' };
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
          <Text style={styles.headerTitle}>{t('tabs.orders')}</Text>
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
              onPress={() => { setActiveTab(item.id); }}
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
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={15}
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
