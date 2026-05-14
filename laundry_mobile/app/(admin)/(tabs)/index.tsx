import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  Animated,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AdminColors, AdminShadows } from '../../../constants/AdminColors';
import { adminApi } from '../../../src/services/adminApi';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../src/store/store';
import { logOut } from '../../../src/store/authSlice';
import * as SecureStore from 'expo-secure-store';
import { StatusBadge } from '../../../components/admin/StatusBadge';
import { SkeletonCard } from '../../../components/admin/SkeletonCard';
import { router, useFocusEffect } from 'expo-router';
import { ScannerModal } from '../../../components/admin/ScannerModal';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../../../src/i18n';
import { useOrderCreation } from '../../../src/context/OrderCreationContext';

const { width: screenWidth } = Dimensions.get('window');

interface DashboardStats {
  totalCommandesToday: number;
  revenuesToday: number;
  totalClients: number;
}

interface StatusStats {
  count: number;
  total: number;
}

interface OverviewData {
  PENDING_PICKUP: StatusStats;
  PICKED_UP: StatusStats;
  READY_FOR_DELIVERY: StatusStats;
  DELIVERED: StatusStats;
  IN_PROCESS?: StatusStats;
}

interface UnpaidOverview {
  totalRemaining: number;
  totalOrders: number;
  clientsWithDebt: number;
}

export default function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [unpaidOverview, setUnpaidOverview] = useState<UnpaidOverview | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [showScanner, setShowScanner] = useState(false);
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const { clearOrder, setMode } = useOrderCreation();
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);
  const [overviewError, setOverviewError] = useState(false);

  const readyPulsingAnim = useRef(new Animated.Value(1)).current;

  const loadOverviewData = async () => {
    // Only admins may call these endpoints — bail out early for other roles
    const role = user?.role?.toLowerCase();
    if (role !== 'admin') return;

    setIsLoadingOverview(true);
    try {
      const [ovRes, unovRes] = await Promise.all([
        adminApi.getStatusOverview(),
        adminApi.getUnpaidOverview()
      ]);
      setOverview(ovRes.data.data);
      setUnpaidOverview(unovRes.data);
      setLastUpdated(
        new Date().toLocaleTimeString(i18n.language === 'ar' ? 'ar-EG' : 'fr-FR', {
          hour: '2-digit', minute: '2-digit'
        })
      );
    } catch (error) {
      console.error('Overview fetch error:', error);
      setOverviewError(true);
    } finally {
      setIsLoadingOverview(false);
    }
  };

  const fetchData = async () => {
    // Only admins may call these endpoints — bail out early for other roles
    const role = user?.role?.toLowerCase();
    if (role !== 'admin') return;

    try {
      const [statsRes, ordersRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getOrders({ limit: 5 })
      ]);
      setStats(statsRes.data);
      setRecentOrders(ordersRes.data.content || ordersRes.data);
    } catch (error) {
      console.error('Fetch dashboard data error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
      loadOverviewData();
    }, [])
  );

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(readyPulsingAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(readyPulsingAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
    loadOverviewData();
  }, []);

  const handleLogout = async () => {
    dispatch(logOut());
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('user');
    router.replace('/(auth)/login');
  };

  const handleSelectMode = (mode: 'immediate' | 'scheduled') => {
    clearOrder();
    setMode(mode);
    setShowCreateOptions(false);
    router.push({ pathname: '/(admin)/order-client', params: { mode } });
  };

  const renderQuickAction = (icon: any, title: string, path: any) => (
    <TouchableOpacity 
      style={styles.actionCard} 
      onPress={() => router.push(path)}
      activeOpacity={0.7}
    >
      <View style={[styles.actionIconCircle, { backgroundColor: AdminColors.primary100 }, isArabic && { marginRight: 0, marginLeft: 12 }]}>
        <Ionicons name={icon} size={22} color={AdminColors.primary} />
      </View>
      <Text style={[styles.actionTitle, isArabic && { textAlign: 'right' }]}>{title}</Text>
      <Ionicons name={isArabic ? "chevron-back" : "chevron-forward"} size={16} color={AdminColors.textMuted} />
    </TouchableOpacity>
  );

  const renderStatusCard = (status: keyof OverviewData, label: string, emoji: string, color: string) => {
    const data = overview?.[status] ?? { count: 0, total: 0 };
    return (
      <TouchableOpacity 
        style={[styles.statusCard, { borderTopColor: color }]}
        onPress={() => router.push({
          pathname: '/(admin)/orders-by-status',
          params: { status }
        })}
        activeOpacity={0.8}
      >
        <View style={[styles.cardTopRow, isArabic && { flexDirection: 'row-reverse' }]}>
          <Text style={styles.cardEmoji}>{emoji}</Text>
          <Text style={[styles.cardCount, { color }]}>{data.count}</Text>
        </View>
        <Text style={[styles.cardLabel, isArabic && { textAlign: 'right' }]} numberOfLines={1}>{label}</Text>
        <View style={[styles.cardAmountRow, isArabic && { alignItems: 'flex-start' }]}>
          <Text style={[styles.cardAmount, { color }]} numberOfLines={1} adjustsFontSizeToFit>
            {data.total.toLocaleString()} {t('common.dh')}
          </Text>
        </View>
        {status === 'READY_FOR_DELIVERY' && data.count > 0 && (
          <Animated.View style={[styles.attentionDot, isArabic ? { left: 10, right: undefined } : { right: 10 }, { opacity: readyPulsingAnim }]} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={[styles.headerContent, isArabic && { flexDirection: 'row-reverse' }]}>
          <View style={[styles.greetingCol, isArabic && { alignItems: 'flex-end' }]}>
            <Text style={styles.greetingText}>{t('dashboard.greeting')}</Text>
            <Text style={styles.adminName}>{user?.name || t('dashboard.admin')}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity 
              style={styles.notificationBtn} 
              onPress={() => changeLanguage(isArabic ? 'fr' : 'ar')}
            >
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>{isArabic ? 'FR' : 'AR'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.notificationBtn} onPress={() => router.push('/(admin)/all-orders-map')}>
              <Ionicons name="map-outline" size={22} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.notificationBtn} onPress={() => setShowScanner(true)}>
              <Ionicons name="qr-code-outline" size={22} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.notificationBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={22} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AdminColors.primary} />}
      >
        {/* 1. Hero Stats Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroDecoration} />
          <Text style={[styles.heroLabel, isArabic && { textAlign: 'right' }]}>{t('dashboard.today')}</Text>
          <View style={[styles.heroMainRow, isArabic && { flexDirection: 'row-reverse' }]}>
            <Text style={styles.heroValue}>{stats?.totalCommandesToday || 0}</Text>
            <Text style={styles.heroUnit}>{t('dashboard.orders')}</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={[styles.heroGrid, isArabic && { flexDirection: 'row-reverse' }]}>
            <View style={[styles.heroGridItem, isArabic && { alignItems: 'flex-end' }]}>
              <Text style={styles.gridLabel}>{t('dashboard.revenue')}</Text>
              <Text style={[styles.gridValue, { color: '#6EE7B7' }]}>
                {stats?.revenuesToday?.toLocaleString() || 0} {t('common.dh')}
              </Text>
            </View>
            <View style={styles.gridDivider} />
            <View style={[styles.heroGridItem, isArabic && { alignItems: 'flex-end' }]}>
              <Text style={styles.gridLabel}>{t('dashboard.total_clients')}</Text>
              <Text style={[styles.gridValue, { color: 'white' }]}>
                {stats?.totalClients || 0}
              </Text>
            </View>
          </View>
        </View>

        {/* 2. Create Order Section (Requested First) */}
        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            style={[styles.mainCreateBtn, isArabic && { flexDirection: 'row-reverse' }, showCreateOptions && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }]}
            onPress={() => setShowCreateOptions(!showCreateOptions)}
            activeOpacity={0.9}
          >
            <View style={styles.mainCreateIcon}><Text style={styles.plusSign}>{showCreateOptions ? '−' : '+'}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.mainCreateTitle, isArabic && { textAlign: 'right' }]}>{t('dashboard.create_order')}</Text>
              <Text style={[styles.mainCreateSub, isArabic && { textAlign: 'right' }]}>{t('dashboard.create_order_sub')}</Text>
            </View>
            <Ionicons name={showCreateOptions ? "chevron-up" : "chevron-down"} size={20} color={AdminColors.primary} />
          </TouchableOpacity>

          {showCreateOptions && (
            <View style={styles.createOptionsColumn}>
              <TouchableOpacity 
                style={[styles.createOptionRow, { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }]}
                onPress={() => handleSelectMode('immediate')}
              >
                <Text style={[styles.createOptionRowText, isArabic && { textAlign: 'right' }]}>{t('admin.orders.create.btn_now')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.createOptionRow}
                onPress={() => handleSelectMode('scheduled')}
              >
                <Text style={[styles.createOptionRowText, isArabic && { textAlign: 'right' }]}>{t('admin.orders.create.btn_later')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 3. Status Section (Requested Second) */}
        <View style={[styles.sectionOverviewHeader, isArabic && { flexDirection: 'row-reverse' }]}>
          <Text style={styles.sectionOverviewTitle}>{t('dashboard.overview')}</Text>
          <Text style={styles.lastUpdatedText}>{lastUpdated}</Text>
        </View>

        {isLoadingOverview ? (
          <View style={{ paddingHorizontal: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <SkeletonCard style={{ width: (screenWidth - 52) / 2, height: 120, borderRadius: 20 }} />
              <SkeletonCard style={{ width: (screenWidth - 52) / 2, height: 120, borderRadius: 20 }} />
            </View>
          </View>
        ) : overviewError ? (
          <TouchableOpacity style={styles.errorContainer} onPress={loadOverviewData}>
            <Text style={styles.errorText}>⚠️ {t('dashboard.stats_error')}</Text>
            <Text style={styles.retryText}>{t('dashboard.retry')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.statusCardsContainer, isArabic && { flexDirection: 'row-reverse' }]}>
            {renderStatusCard('PENDING_PICKUP', t('status.PENDING_PICKUP'), '⏳', '#F59E0B')}
            {renderStatusCard('PICKED_UP', t('status.PICKED_UP'), '📥', '#3B82F6')}
            {renderStatusCard('READY_FOR_DELIVERY', t('status.READY_FOR_DELIVERY'), '✅', '#C9A84C')}
            {renderStatusCard('DELIVERED', t('status.DELIVERED'), '🚚', '#10B981')}
          </View>
        )}

        {/* 4. Unpaid Card (Requested Third) */}
        {unpaidOverview && (
          <View style={styles.unpaidWrapper}>
            <TouchableOpacity 
              style={[styles.unpaidCard, unpaidOverview.totalRemaining === 0 && { backgroundColor: '#ECFDF5', borderColor: '#10B981' }]}
              onPress={() => router.push('/(admin)/unpaid-orders')}
              activeOpacity={0.8}
            >
              <View style={[styles.unpaidMain, isArabic && { flexDirection: 'row-reverse' }]}>
                <View style={[styles.unpaidIcon, unpaidOverview.totalRemaining === 0 && { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
                  <Text style={{ fontSize: 24 }}>{unpaidOverview.totalRemaining > 0 ? '💰' : '✅'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.unpaidTitle, isArabic && { textAlign: 'right' }]}>
                    {unpaidOverview.totalRemaining > 0 ? t('dashboard.unpaid_balance') : t('dashboard.all_settled')}
                  </Text>
                  {unpaidOverview.totalRemaining > 0 && (
                    <Text style={[styles.unpaidSubtitle, isArabic && { textAlign: 'right' }]}>
                      {unpaidOverview.clientsWithDebt} {t('dashboard.clients')} • {unpaidOverview.totalOrders} {t('dashboard.orders_count')}
                    </Text>
                  )}
                </View>
                <View style={[styles.unpaidAmountCol, isArabic && { alignItems: 'flex-start' }]}>
                  <Text style={[styles.unpaidAmount, { color: unpaidOverview.totalRemaining > 0 ? '#EF4444' : '#10B981' }]}>
                    {unpaidOverview.totalRemaining.toLocaleString()} {t('common.dh')}
                  </Text>
                  <Text style={styles.unpaidAmountLabel}>{t('dashboard.to_collect')}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Actions Grid */}
        <View style={styles.actionsGrid}>
          <View style={[styles.actionsRow, isArabic && { flexDirection: 'row-reverse' }]}>
            {renderQuickAction('list-outline', t('dashboard.see_orders'), '/(admin)/orders')}
            {renderQuickAction('people-outline', t('tabs.clients'), '/(admin)/clients')}
          </View>
          <View style={[styles.actionsRow, isArabic && { flexDirection: 'row-reverse' }]}>
            {renderQuickAction('layers-outline', t('tabs.catalog'), '/(admin)/catalog')}
            {renderQuickAction('people-circle-outline', t('tabs.team'), '/(admin)/users')}
          </View>
        </View>

        {/* Recent Orders */}
        <View style={[styles.sectionHeader, isArabic && { flexDirection: 'row-reverse' }]}>
          <Text style={styles.sectionTitle}>{t('dashboard.recent_orders')}</Text>
          <TouchableOpacity onPress={() => router.push('/(admin)/orders')}>
            <Text style={styles.seeAllText}>{t('dashboard.view_all')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.ordersList}>
          {loading ? Array(3).fill(0).map((_, i) => <SkeletonCard key={i} />) : 
            recentOrders.map((order) => (
              <TouchableOpacity key={order.id} style={styles.orderCard} onPress={() => router.push(`/order/${order.id}`)}>
                <View style={[styles.statusAccent, isArabic ? { right: 0, left: undefined } : { left: 0 }, { backgroundColor: (require('../../../constants/StatusColors').StatusColors[order.status] || require('../../../constants/StatusColors').StatusColors.PENDING_PICKUP).dot }]} />
                <View style={[styles.orderTop, isArabic && { flexDirection: 'row-reverse' }]}>
                  <Text style={styles.orderRef}>#{order.numeroCommande}</Text>
                  <StatusBadge status={order.status} />
                </View>
                <Text style={[styles.clientName, isArabic && { textAlign: 'right' }]}>{order.client?.name || order.clientNom}</Text>
                <View style={[styles.orderBottom, isArabic && { flexDirection: 'row-reverse' }]}>
                  <Text style={styles.orderAmount}>{order.montantTotal} {t('common.dh')}</Text>
                  <Text style={styles.orderDate}>{new Date(order.dateCreation).toLocaleDateString(isArabic ? 'ar-EG' : 'fr-FR')}</Text>
                </View>
              </TouchableOpacity>
            ))
          }
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
      <ScannerModal visible={showScanner} onClose={() => setShowScanner(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerSafe: { backgroundColor: AdminColors.primary, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30 },
  greetingCol: { flex: 1 },
  greetingText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '500' },
  adminName: { color: 'white', fontSize: 20, fontWeight: '800', marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  notificationBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  content: { flex: 1, marginTop: -20 },
  heroCard: { backgroundColor: '#0D1B2A', marginHorizontal: 20, borderRadius: 24, padding: 24, ...AdminShadows.shadowMedium, overflow: 'hidden', position: 'relative' },
  heroDecoration: { position: 'absolute', right: -40, top: -40, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(13,115,119,0.15)' },
  heroLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  heroMainRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8, gap: 8 },
  heroValue: { color: 'white', fontSize: 44, fontWeight: '900' },
  heroUnit: { color: 'white', fontSize: 16, fontWeight: '600', opacity: 0.8 },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 18 },
  heroGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  heroGridItem: { flex: 1 },
  gridLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '600', marginBottom: 4 },
  gridValue: { fontSize: 16, fontWeight: '800' },
  gridDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 15 },
  statusCardsContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, justifyContent: 'space-between', marginTop: 12 },
  statusCard: { width: '48%', backgroundColor: 'white', borderRadius: 18, padding: 16, marginBottom: 14, borderTopWidth: 4, ...AdminShadows.shadowSmall, position: 'relative', overflow: 'hidden' },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardEmoji: { fontSize: 20 },
  cardCount: { fontSize: 22, fontWeight: '900' },
  cardLabel: { fontSize: 12, fontWeight: '700', color: AdminColors.textSecondary },
  cardAmountRow: { marginTop: 4 },
  cardAmount: { fontSize: 14, fontWeight: '800' },
  attentionDot: { position: 'absolute', top: 8, right: 8, width: 6, height: 6, borderRadius: 3, backgroundColor: AdminColors.danger },
  unpaidWrapper: { paddingHorizontal: 20, marginBottom: 16, marginTop: 4 },
  unpaidCard: { backgroundColor: 'white', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#FEE2E2', ...AdminShadows.shadowSmall },
  unpaidMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  unpaidIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' },
  unpaidTitle: { fontSize: 14, fontWeight: '700', color: AdminColors.textPrimary },
  unpaidSubtitle: { fontSize: 11, color: AdminColors.textMuted, marginTop: 2 },
  unpaidAmountCol: { alignItems: 'flex-end' },
  unpaidAmount: { fontSize: 16, fontWeight: '800' },
  unpaidAmountLabel: { fontSize: 9, fontWeight: '600', color: AdminColors.textMuted, textTransform: 'uppercase' },
  actionsGrid: { paddingHorizontal: 20, gap: 12, marginTop: 12 },
  mainCreateBtn: { backgroundColor: 'white', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, ...AdminShadows.shadowSmall, borderLeftWidth: 4, borderLeftColor: AdminColors.primary },
  mainCreateIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: AdminColors.primary, alignItems: 'center', justifyContent: 'center' },
  plusSign: { fontSize: 24, color: 'white', fontWeight: '300' },
  mainCreateTitle: { fontSize: 15, fontWeight: '700', color: AdminColors.textPrimary },
  mainCreateSub: { fontSize: 11, color: AdminColors.textMuted },
  createOptionsColumn: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    ...AdminShadows.shadowSmall,
    marginTop: -2,
    overflow: 'hidden',
  },
  createOptionRow: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  createOptionRowText: {
    fontSize: 15,
    fontWeight: '600',
    color: AdminColors.textPrimary,
  },
  actionsRow: { flexDirection: 'row', gap: 12 },
  actionCard: { flex: 1, backgroundColor: 'white', borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', ...AdminShadows.shadowSmall },
  actionIconCircle: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  actionTitle: { flex: 1, fontSize: 13, fontWeight: '600', color: AdminColors.textPrimary },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, marginTop: 24, marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: AdminColors.textPrimary },
  seeAllText: { fontSize: 12, fontWeight: '700', color: AdminColors.primary },
  ordersList: { paddingHorizontal: 20, gap: 10 },
  orderCard: { backgroundColor: 'white', borderRadius: 16, padding: 14, ...AdminShadows.shadowSmall, position: 'relative', overflow: 'hidden' },
  statusAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  orderRef: { fontSize: 12, fontWeight: '700', color: AdminColors.textMuted },
  clientName: { fontSize: 15, fontWeight: '700', color: AdminColors.textPrimary, marginBottom: 12 },
  orderBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  orderAmount: { fontSize: 15, fontWeight: '800', color: AdminColors.primary },
  orderDate: { fontSize: 11, color: AdminColors.textMuted },
  sectionOverviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, marginTop: 24, marginBottom: 8 },
  sectionOverviewTitle: { fontSize: 18, fontWeight: '800', color: AdminColors.textPrimary },
  lastUpdatedText: { fontSize: 12, color: AdminColors.textMuted, fontWeight: '500' },
  errorContainer: { marginHorizontal: 20, padding: 30, backgroundColor: 'white', borderRadius: 20, alignItems: 'center', gap: 10, ...AdminShadows.shadowSmall },
  errorText: { fontSize: 14, color: AdminColors.textSecondary, fontWeight: '600' },
  retryText: { fontSize: 14, color: AdminColors.primary, fontWeight: '700', textDecorationLine: 'underline' },
});
