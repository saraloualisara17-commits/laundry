import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { AdminColors, AdminShadows } from '../../constants/AdminColors';
import { StatusColors } from '../../constants/StatusColors';
import { useInfiniteOrders } from '../../src/hooks/query/useOrders';

export default function SelfSubmittedOrdersScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState('');
  const [searchText, setSearchText] = useState('');

  const filters = useMemo(() => ({
    selfSubmitted: true,
    search: search || undefined,
    sort: 'desc',
  }), [search]);

  const {
    data: ordersPages,
    isLoading: loading,
    isFetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage: loadingMore,
  } = useInfiniteOrders(filters);

  const orders = useMemo(() => {
    const pages = ordersPages?.pages ?? [];
    return pages
      .flatMap((p: any) => p.content || p.commandes || p || [])
      .filter((o: any) => !o.livreur);
  }, [ordersPages]);

  const refreshing = isFetching && !loading && !loadingMore;
  const onRefresh = () => { refetch(); };
  const onLoadMore = () => { if (hasNextPage && !loadingMore) fetchNextPage(); };

  const onSearch = (text: string) => {
    setSearchText(text);
    if (text.length === 0 || text.length > 2) setSearch(text);
  };

  const statusColor = (status: string) => (StatusColors as any)[status]?.bg || '#94A3B8';
  const statusLabel = (status: string) => t(`status.${status}`, { defaultValue: status });

  const renderItem = ({ item }: { item: any }) => {
    const client = item.client || {};
    const clientName = client.name || item.clientName || '—';
    const phone = client.phones?.[0]?.phoneNumber || item.clientPhone || '';
    const total = item.montantTotal ?? 0;
    const paid = item.montantPaye ?? 0;
    const remaining = total - paid;
    const date = item.dateCreation
      ? new Date(item.dateCreation).toLocaleDateString(isArabic ? 'ar-MA' : 'fr-FR', { day: '2-digit', month: 'short' })
      : '';

    return (
      <TouchableOpacity
        style={[styles.card, isArabic && { flexDirection: 'row-reverse' }]}
        onPress={() => router.push({ pathname: '/order/[id]', params: { id: item.id } })}
        activeOpacity={0.8}
      >
        <View style={[styles.cardLeft, { borderLeftColor: statusColor(item.status) }]} />
        <View style={{ flex: 1 }}>
          <View style={[styles.cardTopRow, isArabic && { flexDirection: 'row-reverse' }]}>
            <Text style={styles.orderNum}>{item.numeroCommande}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor(item.status) }]}>
                {statusLabel(item.status)}
              </Text>
            </View>
          </View>

          <View style={[styles.clientRow, isArabic && { flexDirection: 'row-reverse' }]}>
            <Ionicons name="person-outline" size={13} color={AdminColors.textMuted} />
            <Text style={styles.clientName}>{clientName}</Text>
            {phone ? (
              <>
                <Text style={styles.dot}>·</Text>
                <Text style={styles.phone}>{phone}</Text>
              </>
            ) : null}
          </View>

          {!item.livreur && item.status === 'PENDING_PICKUP' && (
            <View style={[styles.noDriverBadge, isArabic && { flexDirection: 'row-reverse', marginLeft: 0, marginRight: 12 }]}>
              <Ionicons name="warning-outline" size={12} color="#D97706" />
              <Text style={styles.noDriverText}>{t('orders.no_pickup_driver')}</Text>
            </View>
          )}

          {item.deliveryAddress ? (
            <View style={[styles.addressRow, isArabic && { flexDirection: 'row-reverse' }]}>
              <Ionicons name="location-outline" size={13} color={AdminColors.textMuted} />
              <Text style={styles.addressText} numberOfLines={1}>{item.deliveryAddress}</Text>
            </View>
          ) : null}

          <View style={[styles.cardBottomRow, isArabic && { flexDirection: 'row-reverse' }]}>
            <Text style={styles.dateText}>{date}</Text>
            <View style={[styles.amountCol, isArabic && { alignItems: 'flex-start' }]}>
              <Text style={styles.totalText}>{total.toFixed(2)} {t('common.dh')}</Text>
              {remaining > 0 && (
                <Text style={styles.remainingText}>
                  {t('financial.remaining')}: {remaining.toFixed(2)} {t('common.dh')}
                </Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={[styles.headerRow, isArabic && { flexDirection: 'row-reverse' }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={22} color="white" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text style={[styles.headerTitle, isArabic && { textAlign: 'right' }]}>
              🌐 {t('dashboard.self_submitted_orders')}
            </Text>
            <Text style={[styles.headerSub, isArabic && { textAlign: 'right' }]}>
              {t('dashboard.self_submitted_sub')}
            </Text>
          </View>
        </View>

        {/* Search */}
        <View style={[styles.searchBar, isArabic && { flexDirection: 'row-reverse' }]}>
          <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.7)" />
          <TextInput
            style={[styles.searchInput, isArabic && { textAlign: 'right' }]}
            placeholder={t('admin.orders.search_placeholder')}
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={searchText}
            onChangeText={onSearch}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => onSearch('')}>
              <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={AdminColors.primary} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AdminColors.primary} />}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={AdminColors.primary} style={{ marginVertical: 16 }} /> : null}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🌐</Text>
              <Text style={styles.emptyTitle}>{t('dashboard.no_self_submitted')}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    backgroundColor: AdminColors.primary,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: 'white', fontSize: 17, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, color: 'white', fontSize: 14 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    flexDirection: 'row', backgroundColor: 'white',
    borderRadius: 16, marginBottom: 10,
    ...AdminShadows.shadowSmall,
    overflow: 'hidden',
  },
  cardLeft: { width: 4, backgroundColor: '#6366F1', borderLeftWidth: 4, borderLeftColor: '#6366F1' },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, paddingBottom: 6 },
  orderNum: { fontSize: 12, fontWeight: '700', color: AdminColors.textMuted },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '700' },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, marginBottom: 4 },
  clientName: { fontSize: 14, fontWeight: '700', color: AdminColors.textPrimary },
  dot: { color: AdminColors.textMuted, fontSize: 12 },
  phone: { fontSize: 12, color: AdminColors.textMuted },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, marginBottom: 6 },
  addressText: { fontSize: 12, color: AdminColors.textSecondary, flex: 1 },
  cardBottomRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 12, paddingBottom: 12, paddingTop: 6,
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  dateText: { fontSize: 11, color: AdminColors.textMuted },
  amountCol: { alignItems: 'flex-end' },
  totalText: { fontSize: 14, fontWeight: '800', color: AdminColors.primary },
  remainingText: { fontSize: 11, color: '#EF4444', fontWeight: '600' },
  noDriverBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FEF3C7', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
    marginLeft: 12, marginBottom: 4, alignSelf: 'flex-start',
  },
  noDriverText: { fontSize: 10, color: '#D97706', fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 15, color: AdminColors.textMuted, fontWeight: '600' },
});
