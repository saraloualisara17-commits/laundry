import React, { useRef, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Animated, Image
} from 'react-native';
import { row } from '../../src/utils/rtl';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useDispatch } from 'react-redux';
import { logOut } from '../../src/store/authSlice';
import { useSettings } from '../../src/hooks/query/useSettings';
import * as SecureStore from 'expo-secure-store';
import { AdminColors, AdminShadows } from '../../constants/AdminColors';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { useTranslation } from 'react-i18next';
import i18n from '../../src/i18n';
import { useStatusOverview, useUnpaidOverview } from '../../src/hooks/query/useDashboard';
import { useOrderCreation } from '../../src/context/OrderCreationContext';
import { useOrders } from '../../src/hooks/query/useOrders';
import { useReadyDeliveries, usePendingPickups } from '../../src/hooks/queries/useLivreur';
import { StatusColors } from '../../constants/StatusColors';

function changeLanguage(lang: string) {
  i18n.changeLanguage(lang);
}

const STATUS_CARDS = [
  { key: 'PENDING_PICKUP',     color: '#C2185B', bg: 'rgba(194, 24, 91, 0.08)' },
  { key: 'PICKED_UP',          color: '#D32F2F', bg: 'rgba(211, 47, 47, 0.08)' },
  { key: 'IN_PROCESS',         color: '#7B1FA2', bg: 'rgba(123, 31, 162, 0.08)' },
  { key: 'READY_FOR_DELIVERY', color: '#00897B', bg: 'rgba(0, 137, 123, 0.08)' },
  { key: 'DELIVERY_FAILED',    color: '#B71C1C', bg: 'rgba(183, 28, 28, 0.08)' },
  { key: 'PICKUP_FAILED',      color: '#E65100', bg: 'rgba(230, 81, 0, 0.08)' },
];

const C = {
  primary: '#0D7377',
  success: '#10B981',
  successBg: 'rgba(16,185,129,0.12)',
  warning: '#F59E0B',
  warningBg: 'rgba(245,158,11,0.12)',
};

export default function LivreurDashboard() {
  const { t, i18n: i18nHook } = useTranslation();
  const isArabic = i18nHook.language === 'ar';
  const dispatch = useDispatch();
  const { clearOrder, setMode } = useOrderCreation();
  const [showCreate, setShowCreate] = useState(false);

  const handleCreate = (mode: 'immediate' | 'scheduled') => {
    clearOrder();
    setMode(mode);
    setShowCreate(false);
    router.push({ pathname: '/(admin)/order-client', params: { mode } });
  };

  const { data: settingsData } = useSettings();
  const settings = settingsData ?? { appName: 'ASTRA PROPRE', logoUrl: null };

  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const { data: overviewRes, isFetching: fetchingOverview, refetch: refetchOverview } = useStatusOverview();
  const { data: unpaidData, refetch: refetchUnpaid } = useUnpaidOverview();
  const { data: recentOrdersData, isLoading: loading, isFetching: fetchingOrders, refetch: refetchOrders } = useOrders({ limit: 5 });
  const { data: readyDeliveries = [], refetch: refetchDeliveries } = useReadyDeliveries();
  const { data: readyOrders = [], refetch: refetchPickups } = usePendingPickups();

  const overview = overviewRes?.data ?? overviewRes ?? null;
  const unpaid = unpaidData ?? null;
  const recentOrders = useMemo(() => {
    const raw = recentOrdersData?.content || recentOrdersData || [];
    return (Array.isArray(raw) ? raw : []).filter((o: any) => o.status !== 'DELIVERED').slice(0, 5);
  }, [recentOrdersData]);

  const deliveryCount = readyDeliveries.length;
  const pickupCount = readyOrders.length;

  const refreshing = (fetchingOverview || fetchingOrders) && !loading;
  const onRefresh = () => {
    refetchOverview();
    refetchUnpaid();
    refetchOrders();
    refetchDeliveries();
    refetchPickups();
  };

  const handleLogout = async () => {
    dispatch(logOut());
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('user');
    router.replace('/(auth)/login');
  };

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator color={AdminColors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.headerContent}>
          <View style={styles.logoCircle}>
            {settings.logoUrl ? (
              <Image source={{ uri: settings.logoUrl }} style={styles.logoImage} resizeMode="contain" />
            ) : (
              <Ionicons name="water-outline" size={28} color={AdminColors.primary} />
            )}
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={() => changeLanguage(isArabic ? 'fr' : 'ar')}
              >
                <Text style={styles.headerBtnText}>{isArabic ? 'FR' : 'AR'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerBtn} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color="white" />
              </TouchableOpacity>
            </View>
            <Text style={styles.headerAppName}>{settings.appName}</Text>
          </View>
        </View>

        {/* Mission count chips */}
        <View style={styles.missionChipsRow}>
          <TouchableOpacity
            style={styles.missionChip}
            onPress={() => router.push({ pathname: '/(livreur)/map-view', params: { filter: 'delivery' } })}
            activeOpacity={0.8}
          >
            <Animated.View style={[styles.chipDot, { backgroundColor: C.success, opacity: pulseAnim }]} />
            <Text style={styles.chipNumber}>{deliveryCount}</Text>
            <Text style={styles.chipLabel}>{t('livreur.deliveries')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.missionChip}
            onPress={() => router.push({ pathname: '/(livreur)/map-view', params: { filter: 'pickup' } })}
            activeOpacity={0.8}
          >
            <Animated.View style={[styles.chipDot, { backgroundColor: C.warning, opacity: pulseAnim }]} />
            <Text style={styles.chipNumber}>{pickupCount}</Text>
            <Text style={styles.chipLabel}>{t('livreur.pickups')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AdminColors.primary} />
        }
      >
        {/* Create Order */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.createBtn, showCreate && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}
            onPress={() => setShowCreate(!showCreate)}
            activeOpacity={0.85}
          >
            <View style={styles.createIcon}>
              <Text style={styles.plusText}>{showCreate ? '−' : '+'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.createTitle, isArabic && { textAlign: 'right' }]}>
                {t('dashboard.create_order')}
              </Text>
              <Text style={[styles.createSub, isArabic && { textAlign: 'right' }]}>
                {t('dashboard.create_order_sub')}
              </Text>
            </View>
            <Ionicons name={showCreate ? 'chevron-up' : 'chevron-down'} size={18} color={AdminColors.primary} />
          </TouchableOpacity>
          {showCreate && (
            <View style={styles.createOptions}>
              <TouchableOpacity
                style={[styles.createOption, { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }]}
                onPress={() => handleCreate('immediate')}
              >
                <Text style={styles.createOptionText}>{t('admin.orders.create.btn_now')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createOption} onPress={() => handleCreate('scheduled')}>
                <Text style={styles.createOptionText}>{t('admin.orders.create.btn_later')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Mission Quick Actions — tasks of the day first */}
        <Text style={[styles.sectionTitle, isArabic && { textAlign: 'right' }]}>
          {t('livreur.missions_today')}
        </Text>
        <View style={[styles.missionActions, row(isArabic)]}>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push({ pathname: '/(livreur)/missions', params: { tab: 'delivery' } })}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIcon, { backgroundColor: C.successBg }]}>
              <Text style={{ fontSize: 26 }}>🚚</Text>
            </View>
            <Text style={styles.quickLabel}>{t('livreur.deliveries_tab')}</Text>
            {deliveryCount > 0 && (
              <View style={[styles.quickBadge, { backgroundColor: C.success }]}>
                <Text style={styles.quickBadgeText}>{deliveryCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push({ pathname: '/(livreur)/missions', params: { tab: 'pickup' } })}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIcon, { backgroundColor: C.warningBg }]}>
              <Text style={{ fontSize: 26 }}>📦</Text>
            </View>
            <Text style={styles.quickLabel}>{t('livreur.pickups_tab')}</Text>
            {pickupCount > 0 && (
              <View style={[styles.quickBadge, { backgroundColor: C.warning }]}>
                <Text style={styles.quickBadgeText}>{pickupCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push('/search')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIcon, { backgroundColor: 'rgba(59,130,246,0.12)' }]}>
              <Ionicons name="search-outline" size={26} color="#3B82F6" />
            </View>
            <Text style={styles.quickLabel}>{t('tabs.search')}</Text>
          </TouchableOpacity>
        </View>

        {/* Status Cards */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }, isArabic && { textAlign: 'right' }]}>
          {t('dashboard.overview')}
        </Text>
        <View style={[styles.statusRow, row(isArabic)]}>
          {STATUS_CARDS.map(({ key, color, bg }) => (
            <TouchableOpacity
              key={key}
              style={[styles.statusCard, { borderTopColor: color, backgroundColor: bg }]}
              onPress={() => router.push({ pathname: '/(admin)/orders-by-status', params: { status: key } })}
              activeOpacity={0.75}
            >
              <Text style={[styles.statusCount, { color }]}>
                {overview?.[key]?.count ?? 0}
              </Text>
              <Text style={styles.statusLabel} numberOfLines={2}>
                {t(`status.${key}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Gallery Quick Action */}
        <TouchableOpacity
          style={styles.galleryCard}
          onPress={() => router.push('/(livreur)/gallery' as any)}
          activeOpacity={0.8}
        >
          <View style={[styles.galleryRow, row(isArabic)]}>
            <View style={styles.galleryIcon}>
              <Text style={{ fontSize: 22 }}>📷</Text>
            </View>
            <Text style={[styles.galleryTitle, isArabic && { textAlign: 'right' }]}>
              {t('admin.gallery.title', { defaultValue: 'Galerie Photos' })}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={AdminColors.textMuted} />
          </View>
        </TouchableOpacity>

        {/* Unpaid Card */}
        {unpaid && (
          <TouchableOpacity
            style={styles.unpaidCard}
            onPress={() => router.push('/(livreur)/unpaid')}
            activeOpacity={0.8}
          >
            <View style={[styles.unpaidRow, row(isArabic)]}>
              <View style={styles.unpaidIcon}>
                <Text style={{ fontSize: 22 }}>{unpaid.totalRemaining > 0 ? '💰' : '✅'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.unpaidTitle, isArabic && { textAlign: 'right' }]}>
                  {unpaid.totalRemaining > 0 ? t('dashboard.unpaid_balance') : t('dashboard.all_settled')}
                </Text>
                {unpaid.totalRemaining > 0 && (
                  <Text style={[styles.unpaidSub, isArabic && { textAlign: 'right' }]}>
                    {unpaid.clientsWithDebt} {t('dashboard.clients')} · {unpaid.totalOrders} {t('dashboard.orders_count')}
                  </Text>
                )}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.unpaidAmount, { color: unpaid.totalRemaining > 0 ? AdminColors.danger : AdminColors.success }]}>
                  {unpaid.totalRemaining} {t('common.dh')}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={AdminColors.textMuted} />
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Recent Orders */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }, isArabic && { textAlign: 'right' }]}>
          {t('dashboard.recent_orders')}
        </Text>

        {recentOrders.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>{t('admin.orders.empty_title')}</Text>
          </View>
        ) : (
          recentOrders.map((order) => (
            <TouchableOpacity
              key={order.id}
              style={[styles.orderRow, row(isArabic)]}
              onPress={() => router.push(`/order/${order.id}`)}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.orderRef, isArabic && { textAlign: 'right' }, { color: (StatusColors[order.status] || { dot: '#94A3B8' }).dot, fontSize: 17, fontWeight: '800' }]}>
                  #{order.id}
                </Text>
                <Text style={[styles.orderClient, isArabic && { textAlign: 'right' }]}>
                  {order.client?.name || order.clientNom}
                </Text>
              </View>
              <StatusBadge status={order.status} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerSafe: { backgroundColor: AdminColors.primary, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14 },
  logoCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', ...AdminShadows.shadowSmall },
  logoImage: { width: 52, height: 52, borderRadius: 26 },
  headerAppName: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 },
  headerBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerBtnText: { color: 'white', fontWeight: '700', fontSize: 12 },
  missionChipsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingBottom: 20 },
  missionChip: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipNumber: { fontSize: 20, fontWeight: '800', color: 'white' },
  chipLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '600', flex: 1 },
  scroll: { flex: 1, marginTop: -20 },
  section: { marginHorizontal: 16, marginTop: 16 },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
    borderRadius: 14, padding: 16, gap: 12, ...AdminShadows.shadowSmall,
  },
  createIcon: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: AdminColors.primary100,
    alignItems: 'center', justifyContent: 'center',
  },
  plusText: { fontSize: 22, fontWeight: '700', color: AdminColors.primary, lineHeight: 26 },
  createTitle: { fontSize: 15, fontWeight: '700', color: AdminColors.textPrimary },
  createSub: { fontSize: 12, color: AdminColors.textMuted, marginTop: 2 },
  createOptions: {
    backgroundColor: 'white', borderBottomLeftRadius: 14, borderBottomRightRadius: 14,
    borderTopWidth: 1, borderTopColor: '#F1F5F9', ...AdminShadows.shadowSmall,
  },
  createOption: { paddingHorizontal: 20, paddingVertical: 14 },
  createOptionText: { fontSize: 14, color: AdminColors.textSecondary, fontWeight: '500' },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: AdminColors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginHorizontal: 16, marginTop: 20, marginBottom: 10,
  },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10 },
  statusCard: { width: '30%', flexGrow: 1, borderTopWidth: 3, borderRadius: 12, padding: 14, alignItems: 'center', ...AdminShadows.shadowSmall },
  statusCount: { fontSize: 26, fontWeight: '800', marginBottom: 6 },
  statusLabel: { fontSize: 10, fontWeight: '600', color: AdminColors.textMuted, textTransform: 'uppercase', textAlign: 'center', letterSpacing: 0.3 },
  missionActions: { flexDirection: 'row', paddingHorizontal: 16, gap: 10 },
  quickCard: {
    flex: 1, backgroundColor: 'white', borderRadius: 16, padding: 14,
    alignItems: 'center', position: 'relative',
    ...AdminShadows.shadowSmall,
  },
  quickIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  quickLabel: { fontSize: 11, fontWeight: '600', color: AdminColors.textPrimary, textAlign: 'center' },
  quickBadge: {
    position: 'absolute', top: 8, right: 8,
    minWidth: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  quickBadgeText: { fontSize: 10, fontWeight: '800', color: 'white' },
  galleryCard: {
    backgroundColor: 'white', borderRadius: 14, marginHorizontal: 16, marginTop: 12, padding: 16,
    ...AdminShadows.shadowSmall,
  },
  galleryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  galleryIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center' },
  galleryTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: AdminColors.textPrimary },
  unpaidCard: {
    backgroundColor: 'white', borderRadius: 14, marginHorizontal: 16, marginTop: 12, padding: 16,
    ...AdminShadows.shadowSmall,
  },
  unpaidRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  unpaidIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center' },
  unpaidTitle: { fontSize: 14, fontWeight: '700', color: AdminColors.textPrimary },
  unpaidSub: { fontSize: 12, color: AdminColors.textMuted, marginTop: 2 },
  unpaidAmount: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  orderRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
    borderRadius: 12, marginHorizontal: 16, marginBottom: 8, padding: 14, gap: 12,
    ...AdminShadows.shadowSmall,
  },
  orderRef: { fontSize: 13, fontWeight: '700', color: AdminColors.textPrimary },
  orderClient: { fontSize: 12, color: AdminColors.textMuted, marginTop: 2 },
  emptyBox: { alignItems: 'center', marginTop: 30 },
  emptyText: { color: AdminColors.textMuted, fontSize: 14 },
});
