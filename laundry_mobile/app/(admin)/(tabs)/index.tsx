import React, { useEffect, useRef, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AdminColors, AdminShadows } from '../../../constants/AdminColors';
import { SkeletonCard } from '../../../components/admin/SkeletonCard';
import { useSettings } from '../../../src/hooks/query/useSettings';
import { router } from 'expo-router';
import { useOrderCreation } from '../../../src/context/OrderCreationContext';
import { useRTL, row, font, arabicSafe, pos, textAlign, alignStart, alignEnd, chevronForward, borderStart, textProps } from '../../../src/utils/rtl';
import { ScannerModal } from '../../../components/admin/ScannerModal';
import { useDashboardStats, useStatusOverview, useUnpaidOverview } from '../../../src/hooks/query/useDashboard';
import { useOrders } from '../../../src/hooks/query/useOrders';
import { useReadyDeliveries, usePendingPickups, useOverdueStats } from '../../../src/hooks/queries/useLivreur';

const { width: screenWidth } = Dimensions.get('window');

interface StatusStats {
  count: number;
  total: number;
}

interface OverviewData {
  PENDING_PICKUP: StatusStats;
  PICKED_UP: StatusStats;
  IN_PROCESS: StatusStats;
  READY_FOR_DELIVERY: StatusStats;
  DELIVERED: StatusStats;
  PICKUP_FAILED: StatusStats;
  DELIVERY_FAILED: StatusStats;
  CANCELLED: StatusStats;
  AU_LOCAL: StatusStats;
  PAID_DEBTS: StatusStats;
}


export default function AdminDashboard() {
  const { t, isRTL: isArabic } = useRTL();

  const { data: settingsData } = useSettings();
  const settings = settingsData ?? { appName: 'ASTRA PROPRE', logoUrl: null, businessPhone: null };

  const [showScanner, setShowScanner] = useState(false);
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const { clearOrder, setMode } = useOrderCreation();

  const readyPulsingAnim = useRef(new Animated.Value(1)).current;

  const { data: stats } = useDashboardStats();
  const { data: overviewRes, isLoading: isLoadingOverview, isFetching: isFetchingOverview, isError: overviewError, refetch: refetchOverview } = useStatusOverview();
  const { data: unpaidOverviewData, refetch: refetchUnpaid } = useUnpaidOverview();
  const { data: pendingPickups = [], refetch: refetchPickups } = usePendingPickups();
  const { data: readyDeliveries = [], refetch: refetchDeliveries } = useReadyDeliveries();
  const { data: overdueData, refetch: refetchOverdue } = useOverdueStats();
  const { data: selfSubmittedData, refetch: refetchSelfSubmitted } = useOrders({ selfSubmitted: true, status: 'PENDING_PICKUP', limit: 1 });

  const selfSubmittedCount = selfSubmittedData?.totalElements ?? 0;
  const overview = overviewRes?.data ?? overviewRes ?? null;
  const unpaidOverview = unpaidOverviewData ?? null;
  const myMissionCount = pendingPickups.length + readyDeliveries.length;
  const overduePickups = overdueData?.overduePickups ?? 0;
  const overdueDeliveries = overdueData?.overdueDeliveries ?? 0;
  const totalOverdue = overduePickups + overdueDeliveries;
  const refreshing = isFetchingOverview && !isLoadingOverview;

  const lastUpdated = useMemo(
    () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    [overviewRes]
  );


  const onRefresh = () => {
    refetchOverview();
    refetchUnpaid();
    refetchPickups();
    refetchDeliveries();
    refetchOverdue();
    refetchSelfSubmitted();
  };

  const loadOverviewData = refetchOverview;

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


  const handleSelectMode = (mode: 'immediate' | 'scheduled') => {
    clearOrder();
    setMode(mode);
    setShowCreateOptions(false);
    router.push({ pathname: '/(admin)/order-client', params: { mode } });
  };

  const renderStatusCard = (status: keyof OverviewData, label: string, icon: string, color: string, type: 'basic' | 'sub' = 'basic') => {
    const data = overview?.[status] ?? { count: 0, total: 0 };

    const onPress = () => {
      if (status === 'AU_LOCAL') {
        router.push({ pathname: '/(admin)/orders-by-status', params: { mode: 'IMMEDIATE' } });
      } else if (status === 'PAID_DEBTS') {
        router.push({ pathname: '/(admin)/orders-by-status', params: { specialFilter: 'PAID_DEBTS' } });
      } else {
        router.push({ pathname: '/(admin)/orders-by-status', params: { status } });
      }
    };

    const showPrice = !['CANCELLED', 'DELIVERY_FAILED', 'PICKUP_FAILED', 'PAID_DEBTS', 'AU_LOCAL'].includes(status);

    if (type === 'sub') {
      return (
        <TouchableOpacity
          style={styles.subStatusCard}
          onPress={onPress}
          activeOpacity={0.8}
        >
          <View style={[styles.subCardTopRow, row(isArabic)]}>
            <View style={[styles.subCardIconCircle, { backgroundColor: color + '20' }]}>
              <Ionicons name={icon as any} size={24} color={color} />
            </View>
            <Text style={[styles.subCardCount, { color }, font.extrabold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{data.count}</Text>
          </View>
          <Text style={[styles.subCardLabel, textAlign(isArabic), font.bold(isArabic)]} numberOfLines={2} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{label}</Text>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.statusCard, { backgroundColor: color }]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <View style={[styles.cardTopRow, row(isArabic)]}>
          <Ionicons name={icon as any} size={28} color="rgba(255,255,255,0.85)" />
          <Text style={[styles.cardCount, font.extrabold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{data.count}</Text>
        </View>
        <Text style={[styles.cardLabel, textAlign(isArabic), font.bold(isArabic)]} numberOfLines={2} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{label}</Text>
        {showPrice && (
          <View style={[styles.cardAmountRow, isArabic ? { alignItems: 'flex-start' } : { alignItems: 'flex-end' }]}>
            <Text style={[styles.cardAmount, font.bold(isArabic)]} numberOfLines={1} adjustsFontSizeToFit>
              {data.total.toLocaleString()} {t('common.dh')}
            </Text>
          </View>
        )}
        {status === 'READY_FOR_DELIVERY' && data.count > 0 && (
          <Animated.View style={[styles.attentionDot, pos.end(10, isArabic), { top: 8, opacity: readyPulsingAnim }]} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={[styles.headerContent, row(isArabic)]}>
          {/* Logo */}
          <View style={styles.logoCircle}>
            {settings.logoUrl ? (
              <Image source={{ uri: settings.logoUrl }} style={styles.logoImage} resizeMode="contain" />
            ) : (
              <Ionicons name="water-outline" size={28} color={AdminColors.primary} />
            )}
          </View>
          {/* Title + app name — aligns to reading-end */}
          <View style={[styles.headerTitleCol, { alignItems: isArabic ? 'flex-start' : 'flex-end' }]}>
            <Text style={[styles.headerScreenTitle, font.extrabold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{t('tabs.home')}</Text>
            <Text style={[styles.headerAppName, arabicSafe(isArabic), font.semibold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{settings.appName}</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AdminColors.primary} />}
      >
        {/* Quick Actions — row 1: Missions, Scan, Map */}
        <View style={[styles.quickActionsRow, { marginTop: 20 }]}>
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => router.push('/(admin)/missions')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: AdminColors.primary }]}>
              <Ionicons name="car-sport-outline" size={22} color="white" />
              {myMissionCount > 0 && (
                <View style={styles.actionBadge}>
                  <Text style={styles.actionBadgeText}>
                    {myMissionCount}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.quickActionLabel}>{t('livreur.map_title', { defaultValue: 'Missions' })}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => setShowScanner(true)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#10B981' }]}>
              <Ionicons name="qr-code-outline" size={22} color="white" />
            </View>
            <Text style={styles.quickActionLabel}>{t('admin.orders.scan')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => router.push('/(admin)/all-orders-map')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#8B5CF6' }]}>
              <Ionicons name="map-outline" size={22} color="white" />
            </View>
            <Text style={styles.quickActionLabel}>{t('admin.more.map_title')}</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions — row 2: Gallery, Search, Call Logs */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => router.push('/(admin)/gallery')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#F59E0B' }]}>
              <Ionicons name="images-outline" size={22} color="white" />
            </View>
            <Text style={styles.quickActionLabel}>{t('admin.gallery.title', { defaultValue: 'Galerie' })}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => router.push('/search')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#3B82F6' }]}>
              <Ionicons name="search-outline" size={22} color="white" />
            </View>
            <Text style={styles.quickActionLabel}>{t('tabs.search')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => router.push('/(admin)/call-logs')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#EC4899' }]}>
              <Ionicons name="call-outline" size={22} color="white" />
            </View>
            <Text style={styles.quickActionLabel}>{t('call_logs.btn')}</Text>
          </TouchableOpacity>
        </View>

        {/* Overdue Alert */}
        {totalOverdue > 0 && (
          <View style={styles.overdueRow}>
            {overduePickups > 0 && (
              <TouchableOpacity
                style={[styles.overdueChip, { borderColor: '#F59E0B' }]}
                onPress={() => router.push({ pathname: '/(admin)/late-orders', params: { type: 'pickup' } })}
                activeOpacity={0.8}
              >
                <Ionicons name="time-outline" size={16} color="#F59E0B" />
                <Text style={[styles.overdueChipText, { color: '#F59E0B' }]}>
                  {overduePickups} {t('dashboard.overdue_pickups', { defaultValue: 'collectes en retard' })}
                </Text>
              </TouchableOpacity>
            )}
            {overdueDeliveries > 0 && (
              <TouchableOpacity
                style={[styles.overdueChip, { borderColor: '#EF4444' }]}
                onPress={() => router.push({ pathname: '/(admin)/late-orders', params: { type: 'delivery' } })}
                activeOpacity={0.8}
              >
                <Ionicons name="car-outline" size={16} color="#EF4444" />
                <Text style={[styles.overdueChipText, { color: '#EF4444' }]}>
                  {overdueDeliveries} {t('dashboard.overdue_deliveries', { defaultValue: 'livraisons en retard' })}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* 2. Create Order Section */}
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={[styles.mainCreateBtn, row(isArabic), borderStart(isArabic, 4, AdminColors.primary), showCreateOptions && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }]}
            onPress={() => setShowCreateOptions(!showCreateOptions)}
            activeOpacity={0.9}
          >
            <View style={styles.mainCreateIcon}><Text style={styles.plusSign}>{showCreateOptions ? '−' : '+'}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.mainCreateTitle, textAlign(isArabic), font.bold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{t('dashboard.create_order')}</Text>
              <Text style={[styles.mainCreateSub, textAlign(isArabic), font.regular(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{t('dashboard.create_order_sub')}</Text>
            </View>
            <Ionicons name={showCreateOptions ? "chevron-up" : "chevron-down"} size={20} color={AdminColors.primary} />
          </TouchableOpacity>

          {showCreateOptions && (
            <View style={styles.createOptionsColumn}>
              <TouchableOpacity
                style={[styles.createOptionRow, { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }]}
                onPress={() => handleSelectMode('immediate')}
              >
                <Text style={[styles.createOptionRowText, textAlign(isArabic), font.semibold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{t('admin.orders.create.btn_now')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.createOptionRow}
                onPress={() => handleSelectMode('scheduled')}
              >
                <Text style={[styles.createOptionRowText, textAlign(isArabic), font.semibold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{t('admin.orders.create.btn_later')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 3. Status Section - Phase 1: Operational Flow */}
        <View style={[styles.sectionOverviewHeader, row(isArabic)]}>
          <Text style={[styles.sectionOverviewTitle, font.extrabold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{t('dashboard.overview')}</Text>
          <Text style={[styles.lastUpdatedText, font.regular(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{lastUpdated}</Text>
        </View>

        {isLoadingOverview ? (
          <View style={{ paddingHorizontal: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <SkeletonCard style={{ width: (screenWidth - 52) / 2, height: 120, borderRadius: 20 }} />
              <SkeletonCard style={{ width: (screenWidth - 52) / 2, height: 120, borderRadius: 20 }} />
            </View>
          </View>
        ) : overviewError ? (
          <TouchableOpacity style={styles.errorContainer} onPress={() => loadOverviewData()}>
            <Text style={styles.errorText}>⚠️ {t('dashboard.stats_error')}</Text>
            <Text style={styles.retryText}>{t('dashboard.retry')}</Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={[styles.statusCardsContainer, row(isArabic)]}>
              {renderStatusCard('PENDING_PICKUP',     t('status.PENDING_PICKUP'),     'time-outline',    '#C2185B')}
              {renderStatusCard('PICKED_UP',          t('status.PICKED_UP'),          'swap-horizontal', '#D32F2F')}
              {renderStatusCard('READY_FOR_DELIVERY', t('status.READY_FOR_DELIVERY'), 'car-outline',     '#00897B')}
              {renderStatusCard('DELIVERED',          t('status.DELIVERED'),          'checkmark-done',  '#388E3C')}
            </View>

            {/* Self-Submitted Orders Card (web client orders) */}
            <View style={styles.unpaidWrapper}>
              <View style={[styles.selfSubmittedHeader, row(isArabic)]}>
                <Text
                  style={[styles.selfSubmittedHeaderLabel, font.semibold(isArabic)]}
                  maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}
                >
                  {t('dashboard.self_submitted_orders')}
                </Text>
                <View style={styles.selfSubmittedCountBadge}>
                  <Text
                    style={[styles.selfSubmittedCountText, font.extrabold(isArabic)]}
                    maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}
                  >
                    {selfSubmittedCount}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.unpaidCard, { borderColor: '#6366F1' }]}
                onPress={() => router.push('/(admin)/self-submitted-orders')}
                activeOpacity={0.8}
              >
                <View style={[styles.unpaidMain, row(isArabic)]}>
                  <View style={[styles.unpaidIcon, { backgroundColor: '#EEF2FF' }]}>
                    <Text style={{ fontSize: 24 }}>🌐</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.unpaidTitle, textAlign(isArabic), font.bold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
                      {t('dashboard.self_submitted_orders')}
                    </Text>
                    <Text style={[styles.unpaidSubtitle, textAlign(isArabic), font.regular(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
                      {t('dashboard.self_submitted_sub')}
                    </Text>
                  </View>
                  <Ionicons name={chevronForward(isArabic)} size={20} color={AdminColors.textMuted} />
                </View>
              </TouchableOpacity>
            </View>

            {/* 4. Unpaid Card (Middle Section) */}
            {unpaidOverview && (
              <View style={styles.unpaidWrapper}>
                <TouchableOpacity 
                  style={[styles.unpaidCard, unpaidOverview.totalRemaining === 0 && { backgroundColor: '#ECFDF5', borderColor: '#10B981' }]}
                  onPress={() => router.push('/(admin)/unpaid-orders')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.unpaidMain, row(isArabic)]}>
                    <View style={[styles.unpaidIcon, unpaidOverview.totalRemaining === 0 && { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
                      <Text style={{ fontSize: 24 }}>{unpaidOverview.totalRemaining > 0 ? '💰' : '✅'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.unpaidTitle, textAlign(isArabic), font.bold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
                        {unpaidOverview.totalRemaining > 0 ? t('dashboard.unpaid_balance') : t('dashboard.all_settled')}
                      </Text>
                      {unpaidOverview.totalRemaining > 0 && (
                        <Text style={[styles.unpaidSubtitle, textAlign(isArabic), font.regular(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
                          {unpaidOverview.clientsWithDebt} {t('dashboard.clients')} • {unpaidOverview.totalOrders} {t('dashboard.orders_count')}
                        </Text>
                      )}
                    </View>
                    <View style={[styles.unpaidAmountCol, isArabic ? { alignItems: 'flex-start' } : { alignItems: 'flex-end' }]}>
                      <Text style={[styles.unpaidAmount, { color: unpaidOverview.totalRemaining > 0 ? '#EF4444' : '#10B981' }, font.extrabold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
                        {unpaidOverview.totalRemaining.toLocaleString()} {t('common.dh')}
                      </Text>
                      <Text style={[styles.unpaidAmountLabel, arabicSafe(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{t('dashboard.to_collect')}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* 5. Status Section - Phase 2: Exceptions & Location (Sub Cases) */}
            <View style={[styles.statusCardsContainer, row(isArabic)]}>
              {renderStatusCard('DELIVERY_FAILED', t('status.DELIVERY_FAILED'), 'alert-circle-outline', '#F43F5E', 'sub')}
              {renderStatusCard('PICKUP_FAILED',   t('status.PICKUP_FAILED'),   'warning-outline',      '#EF4444', 'sub')}
              {renderStatusCard('CANCELLED',       t('status.CANCELLED'),       'trash-outline',        '#94A3B8', 'sub')}
              {renderStatusCard('AU_LOCAL',        t('dashboard.at_local'),     'home-outline',         '#7C3AED', 'sub')}
            </View>

            {/* 6. Accounts / General Statistics (Account style) */}
            <View style={styles.accountCardsWrapper}>
              <TouchableOpacity
                style={[styles.accountCard, row(isArabic)]}
                onPress={() => router.push('/(admin)/(tabs)/clients')}
                activeOpacity={0.8}
              >
                <View style={styles.accountAvatar}>
                  <Ionicons name="people" size={24} color={AdminColors.primary} />
                </View>
                <View style={[styles.accountInfo, isArabic ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
                  <Text style={[styles.accountLabel, font.semibold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{t('tabs.clients')}</Text>
                  <Text style={[styles.accountValue, font.extrabold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{stats?.totalClients || 0}</Text>
                </View>
                <Ionicons name={chevronForward(isArabic)} size={20} color={AdminColors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.accountCard, row(isArabic)]}
                onPress={() => router.push('/(admin)/(tabs)/orders')}
                activeOpacity={0.8}
              >
                <View style={styles.accountAvatar}>
                  <Ionicons name="receipt" size={24} color={AdminColors.primary} />
                </View>
                <View style={[styles.accountInfo, isArabic ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
                  <Text style={[styles.accountLabel, font.semibold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{t('tabs.orders')}</Text>
                  <Text style={[styles.accountValue, font.extrabold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{stats?.totalCommandes || 0}</Text>
                </View>
                <Ionicons name={chevronForward(isArabic)} size={20} color={AdminColors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* 8. Paid Debts Card (Large bottom card) */}
            {overview?.PAID_DEBTS && (
              <View style={styles.unpaidWrapper}>
                <TouchableOpacity 
                  style={[styles.unpaidCard, { backgroundColor: '#F0FDF4', borderColor: '#10B981' }]}
                  onPress={() => router.push({ pathname: '/(admin)/orders-by-status', params: { specialFilter: 'PAID_DEBTS' } })}
                  activeOpacity={0.8}
                >
                  <View style={[styles.unpaidMain, row(isArabic)]}>
                    <View style={[styles.unpaidIcon, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
                      <Text style={{ fontSize: 24 }}>💰</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.unpaidTitle, textAlign(isArabic), font.bold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
                        {t('dashboard.paid_debts')}
                      </Text>
                      <Text style={[styles.unpaidSubtitle, textAlign(isArabic), font.regular(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
                        {t('dashboard.orders_count_completed')}
                      </Text>
                    </View>
                    <View style={[styles.unpaidAmountCol, isArabic ? { alignItems: 'flex-start' } : { alignItems: 'flex-end' }]}>
                      <Text style={[styles.unpaidAmount, { color: '#10B981' }, font.extrabold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
                        {overview.PAID_DEBTS.count}
                      </Text>
                      <Text style={[styles.unpaidAmountLabel, arabicSafe(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{t('dashboard.orders')}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

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
  logoCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', ...AdminShadows.shadowSmall },
  logoImage: { width: 52, height: 52, borderRadius: 26 },
  headerTitleCol: { flex: 1 },
  headerScreenTitle: { color: 'white', fontSize: 22, fontWeight: '900' },
  headerAppName: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 },
  content: { flex: 1, marginTop: -20 },
  heroCard: { backgroundColor: '#0D1B2A', marginHorizontal: 20, borderRadius: 24, padding: 24, ...AdminShadows.shadowMedium, overflow: 'hidden', position: 'relative' },
  quickActionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    justifyContent: 'flex-start',
    marginTop: 10,
    marginBottom: 2,
    gap: 12
  },
  quickActionBtn: {
    width: (screenWidth - 40 - 24) / 3,
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...AdminShadows.shadowSmall,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: AdminColors.textPrimary,
  },
  langText: {
    color: 'white',
    fontWeight: '900',
    fontSize: 14,
  },
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
  statusCardsContainer: { flexWrap: 'wrap', paddingHorizontal: 20, justifyContent: 'space-between', marginTop: 12 },
  statusCard: { width: '48%', borderRadius: 18, padding: 16, marginBottom: 14, ...AdminShadows.shadowSmall, position: 'relative', overflow: 'hidden' },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardCount: { fontSize: 26, fontWeight: '800', color: 'white' },
  cardLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  cardAmountRow: { marginTop: 6 },
  cardAmount: { fontSize: 13, fontWeight: '800', color: 'white' },
  attentionDot: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: 'white' },
  unpaidWrapper: { paddingHorizontal: 20, marginBottom: 16, marginTop: 4 },
  selfSubmittedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  selfSubmittedHeaderLabel: {
    fontSize: 13,
    color: AdminColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selfSubmittedCountBadge: {
    minWidth: 28,
    height: 24,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selfSubmittedCountText: {
    color: 'white',
    fontSize: 13,
  },
  unpaidCard: { backgroundColor: 'white', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#FEE2E2', ...AdminShadows.shadowSmall },
  unpaidMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  unpaidIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' },
  unpaidTitle: { fontSize: 14, fontWeight: '700', color: AdminColors.textPrimary },
  unpaidSubtitle: { fontSize: 11, color: AdminColors.textMuted, marginTop: 2 },
  unpaidAmountCol: { alignItems: 'flex-end' },
  unpaidAmount: { fontSize: 16, fontWeight: '800' },
  unpaidAmountLabel: { fontSize: 9, fontWeight: '600', color: AdminColors.textMuted, textTransform: 'uppercase' },
  actionsGrid: { paddingHorizontal: 20, gap: 12, marginTop: 12 },
  mainCreateBtn: { backgroundColor: 'white', borderRadius: 18, padding: 16, alignItems: 'center', gap: 14, ...AdminShadows.shadowSmall },
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
  actionIconCircle: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginEnd: 10 },
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
  subStatusCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    ...AdminShadows.shadowSmall,
  },
  subCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  subCardIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subCardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: AdminColors.textSecondary,
  },
  subCardCount: {
    fontSize: 23,
    fontWeight: '900',
  },
  accountCardsWrapper: {
    paddingHorizontal: 20,
    marginTop: 8,
    gap: 12,
    marginBottom: 16,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    ...AdminShadows.shadowSmall,
  },
  accountAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: AdminColors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountInfo: {
    flex: 1,
    marginHorizontal: 16,
  },
  accountLabel: {
    fontSize: 13,
    color: AdminColors.textSecondary,
    fontWeight: '600',
  },
  accountValue: {
    fontSize: 18,
    fontWeight: '800',
    color: AdminColors.textPrimary,
    marginTop: 2,
  },
  errorContainer: { marginHorizontal: 20, padding: 30, backgroundColor: 'white', borderRadius: 20, alignItems: 'center', gap: 10, ...AdminShadows.shadowSmall },
  errorText: { fontSize: 14, color: AdminColors.textSecondary, fontWeight: '600' },
  retryText: { fontSize: 14, color: AdminColors.primary, fontWeight: '700', textDecorationLine: 'underline' },
  actionBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: AdminColors.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  actionBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '800',
  },
  missionWrapper: {
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 20,
  },
  missionCard: {
    backgroundColor: AdminColors.primary,
    borderRadius: 24,
    padding: 20,
    ...AdminShadows.shadowMedium,
  },
  missionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  missionIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  missionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: 'white',
  },
  missionSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  missionDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 16,
  },
  missionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  missionStatItem: {
    flex: 1,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.1)',
  },
  missionStatValue: {
    fontSize: 22,
    fontWeight: '900',
    color: 'white',
  },
  missionStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    marginTop: 4,
    textAlign: 'center',
  },
  overdueRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 12,
    marginTop: 4,
  },
  overdueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: 'white',
  },
  overdueChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
