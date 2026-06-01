import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { row, textAlign, font, arabicSafe, textProps } from '../../src/utils/rtl';
import { useFormStyles } from '../../src/hooks/useFormStyles';
import { AdminShadows } from '../../constants/AdminColors';
import { useOverdueOrders } from '../../src/hooks/queries/useLivreur';
import { formatOrderItemsSummary } from '../../src/utils/orderSummary';

// ─── Color palette — separate from the normal admin teal ─────────────────────
const Late = {
  pickup: {
    accent: '#D97706',        // amber-600
    accentBg: '#FEF3C7',      // amber-100
    accentLight: '#FFFBEB',   // amber-50
    headerBg: '#92400E',      // amber-800
    dot: '#F59E0B',
  },
  delivery: {
    accent: '#DC2626',        // red-600
    accentBg: '#FEE2E2',      // red-100
    accentLight: '#FFF5F5',
    headerBg: '#991B1B',      // red-800
    dot: '#EF4444',
  },
};

export default function LateOrdersScreen() {
  const { t } = useTranslation();
  const f = useFormStyles();
  const isArabic = f.isArabic;

  const { type } = useLocalSearchParams<{ type: 'pickup' | 'delivery' }>();
  const orderType: 'pickup' | 'delivery' = type === 'delivery' ? 'delivery' : 'pickup';
  const colors = orderType === 'delivery' ? Late.delivery : Late.pickup;

  const [search, setSearch] = useState('');
  const { data: orders = [], isLoading, isFetching, refetch } = useOverdueOrders(orderType);
  const refreshing = isFetching && !isLoading;

  const filtered = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.toLowerCase();
    return (orders as any[]).filter((o: any) =>
      o.client?.name?.toLowerCase().includes(q) ||
      o.clientNom?.toLowerCase().includes(q) ||
      String(o.id).includes(q) ||
      o.numeroCommande?.toLowerCase().includes(q)
    );
  }, [orders, search]);

  const totalPrice = useMemo(
    () => (orders as any[]).reduce((sum: number, o: any) => sum + (o.montantTotal || 0), 0),
    [orders]
  );

  const title = orderType === 'delivery'
    ? t('dashboard.overdue_deliveries', { defaultValue: 'Livraisons en retard' })
    : t('dashboard.overdue_pickups', { defaultValue: 'Collectes en retard' });

  const icon = orderType === 'delivery' ? 'car-outline' : 'time-outline';

  const renderCard = useCallback(({ item }: { item: any }) => {
    const itemsSummary = formatOrderItemsSummary(item.commandeTapis, t);
    const address = item.client?.addresses?.[0]?.address || item.clientAdresse || null;
    const scheduledDate = orderType === 'delivery'
      ? item.scheduledDeliveryDate
      : item.scheduledPickupDate;

    const hoursLate = scheduledDate
      ? Math.floor((Date.now() - new Date(scheduledDate).getTime()) / 3600000)
      : null;

    return (
      <TouchableOpacity
        style={[styles.card, { borderLeftColor: colors.accent }]}
        onPress={() => router.push(`/order/${item.id}`)}
        activeOpacity={0.75}
      >
        {/* Top row */}
        <View style={[styles.cardTop, row(isArabic)]}>
          <View style={[styles.lateChip, { backgroundColor: colors.accentBg }]}>
            <Ionicons name="time-outline" size={12} color={colors.accent} />
            {hoursLate !== null && (
              <Text style={[styles.lateChipText, { color: colors.accent }]}>
                {hoursLate}h {t('dashboard.late', { defaultValue: 'de retard' })}
              </Text>
            )}
          </View>
          <Text style={[styles.orderId, { color: colors.accent }]}>#{item.id}</Text>
        </View>

        {/* Client */}
        <Text style={[styles.clientName, textAlign(isArabic), font.bold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
          {item.client?.name || item.clientNom}
        </Text>

        {/* Address */}
        {address && (
          <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }, row(isArabic)]}>
            <Ionicons name="location-outline" size={13} color="#94A3B8" />
            <Text style={[styles.addressText, textAlign(isArabic)]} numberOfLines={1}>{address}</Text>
          </View>
        )}

        {/* Items + date */}
        <View style={[styles.infoRow, row(isArabic)]}>
          <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 4 }, row(isArabic)]}>
            <Ionicons name="cube-outline" size={13} color="#64748B" />
            <Text style={[styles.infoText, font.regular(isArabic)]}>{itemsSummary}</Text>
          </View>
          {scheduledDate && (
            <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 4 }, row(isArabic)]}>
              <Ionicons name="calendar-outline" size={13} color="#64748B" />
              <Text style={[styles.infoText, font.regular(isArabic)]}>
                {new Date(scheduledDate).toLocaleDateString('fr-FR')}
              </Text>
            </View>
          )}
        </View>

        {/* Price row — total only, no paid/remaining */}
        <View style={[styles.priceRow, row(isArabic)]}>
          <Text style={[styles.totalPrice, { color: colors.accent }, font.extrabold(isArabic)]}>
            {(item.montantTotal || 0).toLocaleString()} {t('common.dh')}
          </Text>
          {item.pickupDriver || item.deliveryDriver ? (
            <View style={[styles.driverChip, row(isArabic)]}>
              <Ionicons name="person-outline" size={12} color="#64748B" />
              <Text style={[styles.driverText, arabicSafe(isArabic)]}>
                {orderType === 'delivery'
                  ? item.deliveryDriver?.name || item.deliveryDriverName
                  : item.pickupDriver?.name || item.pickupDriverName}
              </Text>
            </View>
          ) : (
            <View style={[styles.driverChip, { backgroundColor: colors.accentBg }, row(isArabic)]}>
              <Ionicons name="warning-outline" size={12} color={colors.accent} />
              <Text style={[styles.driverText, { color: colors.accent }, arabicSafe(isArabic)]}>
                {t('dashboard.no_driver', { defaultValue: 'Non assigné' })}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [t, isArabic, colors, orderType]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }, row(isArabic)]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={24} color="white" />
        </TouchableOpacity>
        <View style={[{ flex: 1, marginLeft: 10 }, isArabic && { marginLeft: 0, marginRight: 10, alignItems: 'flex-end' }]}>
          <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, row(isArabic)]}>
            <Ionicons name={icon as any} size={20} color="rgba(255,255,255,0.9)" />
            <Text style={[styles.headerTitle, font.extrabold(isArabic)]}>{title}</Text>
          </View>
        </View>
      </View>

      {/* Summary card */}
      <View style={[styles.summaryCard, { borderTopColor: colors.accent, backgroundColor: colors.accentLight }]}>
        <View style={[styles.summaryRow, row(isArabic)]}>
          {/* Count */}
          <View style={styles.summaryCol}>
            <Text style={[styles.summaryLabel, font.bold(isArabic)]}>{t('common.total')} {t('tabs.orders')}</Text>
            <Text style={[styles.summaryCount, { color: colors.accent }, font.extrabold(isArabic)]}>
              {isLoading ? '—' : (orders as any[]).length}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          {/* Total price */}
          <View style={styles.summaryCol}>
            <Text style={[styles.summaryLabel, font.bold(isArabic)]}>{t('stats.total_amount', { defaultValue: 'Montant total' })}</Text>
            <Text style={[styles.summaryCount, { color: colors.accent, fontSize: 20 }, font.extrabold(isArabic)]}>
              {isLoading ? '—' : `${totalPrice.toLocaleString()} ${t('common.dh')}`}
            </Text>
          </View>
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchBox, row(isArabic)]}>
        <Ionicons name="search" size={18} color={colors.accent} />
        <TextInput
          style={[styles.searchInput, textAlign(isArabic)]}
          placeholder={t('admin.orders.search_placeholder')}
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {isLoading && !refreshing ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 48 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderCard}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor={colors.accent} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🎉</Text>
              <Text style={styles.emptyTitle}>{t('admin.orders.empty_title')}</Text>
              <Text style={styles.emptySubtitle}>{t('common.no_data')}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFBEB' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: 'white' },

  summaryCard: {
    marginHorizontal: 16, marginTop: 16, borderRadius: 18,
    padding: 18, borderTopWidth: 4,
    ...AdminShadows.shadowSmall,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryCol: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 11, fontWeight: '700', color: '#78716C', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryCount: { fontSize: 28, fontWeight: '900' },
  summaryDivider: { width: 1, height: 48, backgroundColor: 'rgba(0,0,0,0.08)' },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'white', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10,
    marginHorizontal: 16, marginTop: 14, marginBottom: 10,
    ...AdminShadows.shadowSmall,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0D1B2A' },

  list: { paddingBottom: 24, paddingTop: 4 },

  card: {
    backgroundColor: 'white', borderRadius: 16,
    padding: 16, marginHorizontal: 16, marginBottom: 12,
    borderLeftWidth: 4,
    ...AdminShadows.shadowSmall,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  lateChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  lateChipText: { fontSize: 12, fontWeight: '700' },
  orderId: { fontSize: 17, fontWeight: '800' },
  clientName: { fontSize: 16, fontWeight: '700', color: '#0D1B2A' },
  addressText: { fontSize: 12, color: '#94A3B8', fontWeight: '500', flex: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginTop: 10 },
  infoText: { fontSize: 13, color: '#64748B', fontWeight: '500' },

  priceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)',
  },
  totalPrice: { fontSize: 18, fontWeight: '800' },
  driverChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  driverText: { fontSize: 12, fontWeight: '600', color: '#64748B' },

  empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0D1B2A', textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginTop: 8 },
});
