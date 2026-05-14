import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../src/store/store';
import { logOut } from '../../../src/store/authSlice';
import * as SecureStore from 'expo-secure-store';
import { adminApi } from '../../../src/services/adminApi';
import { AdminColors, AdminShadows } from '../../../constants/AdminColors';
import { StatusBadge } from '../../../components/admin/StatusBadge';
import { useTranslation } from 'react-i18next';
import { useOrderCreation } from '../../../src/context/OrderCreationContext';
import i18n from '../../../src/i18n';

function changeLanguage(lang: string) {
  i18n.changeLanguage(lang);
}

const STATUS_CARDS = [
  { key: 'PENDING_PICKUP', color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
  { key: 'PICKED_UP',      color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
  { key: 'READY_FOR_DELIVERY', color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
];

export default function EmployeDashboard() {
  const { t, i18n: i18nHook } = useTranslation();
  const isArabic = i18nHook.language === 'ar';
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { clearOrder, setMode } = useOrderCreation();

  const [overview, setOverview] = useState<any>(null);
  const [unpaid, setUnpaid] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const readyAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(readyAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(readyAnim, { toValue: 0.4, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [ovRes, unpaidRes, ordersRes] = await Promise.all([
        adminApi.getStatusOverview(),
        adminApi.getUnpaidOverview(),
        adminApi.getOrders({ limit: 5 }),
      ]);
      setOverview(ovRes.data.data);
      setUnpaid(unpaidRes.data);
      const raw = ordersRes.data.content || ordersRes.data || [];
      setRecentOrders(raw.filter((o: any) => o.status !== 'DELIVERED').slice(0, 5));
    } catch (e) {
      console.error('Employe dashboard error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const handleLogout = async () => {
    dispatch(logOut());
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('user');
    router.replace('/(auth)/login');
  };

  const handleCreate = (mode: 'immediate' | 'scheduled') => {
    clearOrder();
    setMode(mode);
    setShowCreate(false);
    router.push({ pathname: '/(admin)/order-client', params: { mode } });
  };

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator color={AdminColors.primary} size="large" />
      </View>
    );
  }

  const readyCount = overview?.READY_FOR_DELIVERY?.count ?? 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={[styles.headerRow, isArabic && { flexDirection: 'row-reverse' }]}>
          <View style={isArabic && { alignItems: 'flex-end' }}>
            <Text style={styles.greeting}>{t('dashboard.greeting')}</Text>
            <Text style={styles.userName}>{user?.name || 'Employé'}</Text>
          </View>
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
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(); }}
            tintColor={AdminColors.primary}
          />
        }
      >
        {/* Ready notification banner */}
        {readyCount > 0 && (
          <View style={[styles.readyBanner, isArabic && { flexDirection: 'row-reverse' }]}>
            <Animated.View style={[styles.readyDot, { opacity: readyAnim }]} />
            <Text style={styles.readyText}>
              {readyCount} {t('status.READY_FOR_DELIVERY')} — {t('admin.orders.ready', { defaultValue: 'Prêt à livrer' })}
            </Text>
          </View>
        )}

        {/* Create Order Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[
              styles.createBtn,
              showCreate && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
            ]}
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
            <Ionicons
              name={showCreate ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={AdminColors.primary}
            />
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

        {/* Status Cards */}
        <Text style={[styles.sectionTitle, isArabic && { textAlign: 'right' }]}>
          {t('dashboard.overview')}
        </Text>
        <View style={[styles.statusRow, isArabic && { flexDirection: 'row-reverse' }]}>
          {STATUS_CARDS.map(({ key, color, bg }) => (
            <View key={key} style={[styles.statusCard, { borderTopColor: color, backgroundColor: bg }]}>
              <Text style={[styles.statusCount, { color }]}>
                {overview?.[key]?.count ?? 0}
              </Text>
              <Text style={styles.statusLabel} numberOfLines={2}>
                {t(`status.${key}`)}
              </Text>
            </View>
          ))}
        </View>

        {/* Unpaid Card */}
        {unpaid && (
          <TouchableOpacity
            style={styles.unpaidCard}
            onPress={() => router.push('/(employe)/(tabs)/unpaid')}
            activeOpacity={0.8}
          >
            <View style={[styles.unpaidRow, isArabic && { flexDirection: 'row-reverse' }]}>
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
          {t('dashboard.recent_orders', { defaultValue: 'Commandes récentes' })}
        </Text>

        {recentOrders.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>{t('admin.orders.empty_title')}</Text>
          </View>
        ) : (
          recentOrders.map((order) => (
            <TouchableOpacity
              key={order.id}
              style={[styles.orderRow, isArabic && { flexDirection: 'row-reverse' }]}
              onPress={() => router.push(`/order/${order.id}`)}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.orderRef, isArabic && { textAlign: 'right' }]}>
                  #{order.numeroCommande}
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
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: AdminColors.primary },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  greeting: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  userName: { fontSize: 20, color: 'white', fontWeight: '700', marginTop: 2 },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnText: { color: 'white', fontWeight: '700', fontSize: 12 },
  scroll: { flex: 1 },
  readyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderLeftWidth: 3,
    borderLeftColor: AdminColors.success,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  readyDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: AdminColors.success,
  },
  readyText: { fontSize: 13, color: AdminColors.success, fontWeight: '600', flex: 1 },
  section: { marginHorizontal: 16, marginTop: 16 },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    ...AdminShadows.shadowSmall,
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
    backgroundColor: 'white',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    ...AdminShadows.shadowSmall,
  },
  createOption: { paddingHorizontal: 20, paddingVertical: 14 },
  createOptionText: { fontSize: 14, color: AdminColors.textSecondary, fontWeight: '500' },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: AdminColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  statusRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
  },
  statusCard: {
    flex: 1,
    borderTopWidth: 3,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    ...AdminShadows.shadowSmall,
  },
  statusCount: { fontSize: 26, fontWeight: '800', marginBottom: 6 },
  statusLabel: {
    fontSize: 10, fontWeight: '600', color: AdminColors.textMuted,
    textTransform: 'uppercase', textAlign: 'center', letterSpacing: 0.3,
  },
  unpaidCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    ...AdminShadows.shadowSmall,
  },
  unpaidRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  unpaidIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#FFF7ED',
    alignItems: 'center', justifyContent: 'center',
  },
  unpaidTitle: { fontSize: 14, fontWeight: '700', color: AdminColors.textPrimary },
  unpaidSub: { fontSize: 12, color: AdminColors.textMuted, marginTop: 2 },
  unpaidAmount: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    gap: 12,
    ...AdminShadows.shadowSmall,
  },
  orderRef: { fontSize: 13, fontWeight: '700', color: AdminColors.textPrimary },
  orderClient: { fontSize: 12, color: AdminColors.textMuted, marginTop: 2 },
  emptyBox: { alignItems: 'center', marginTop: 30 },
  emptyText: { color: AdminColors.textMuted, fontSize: 14 },
});
