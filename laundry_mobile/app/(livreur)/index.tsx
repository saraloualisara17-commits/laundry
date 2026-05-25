import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Animated, Linking, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../src/store/store';
import { logOut } from '../../src/store/authSlice';
import * as SecureStore from 'expo-secure-store';
import { authApi } from '../../src/services/api';
import { isVisibleToday } from '../../src/utils/deliveryDateUtils';
import { useRTL, row, font, arabicSafe, pos, textProps } from '../../src/utils/rtl';
import { useLivreurStats, useReadyDeliveries, usePendingPickups } from '../../src/hooks/queries/useLivreur';
import { queryClient } from '../../src/services/query/queryClient';
import { socketClient } from '../../src/services/realtime';

const C = {
  primary: '#0D7377',
  primaryDark: '#0A5C5F',
  success: '#10B981',
  successBg: 'rgba(16,185,129,0.12)',
  warning: '#F59E0B',
  warningBg: 'rgba(245,158,11,0.12)',
  danger: '#EF4444',
  bg: '#F4F6F8',
  surface: '#FFFFFF',
  textPrimary: '#0D1B2A',
  textSecondary: '#4A5568',
  textMuted: '#94A3B8',
};

function openMapsNavigation(lat?: number, lng?: number, address?: string) {
  const url = Platform.select({
    ios: lat && lng
      ? `maps://?daddr=${lat},${lng}`
      : `maps://?daddr=${encodeURIComponent(address || '')}`,
    android: lat && lng
      ? `geo:${lat},${lng}?q=${lat},${lng}`
      : `geo:0,0?q=${encodeURIComponent(address || '')}`,
  });
  if (url) {
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://maps.google.com/?daddr=${lat},${lng}`)
    );
  }
}

export default function LivreurDashboard() {
  const { t, isRTL } = useRTL();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((s: RootState) => s.auth);

  const { refetch: refetchStats } = useLivreurStats();
  const { data: readyDeliveries = [], isLoading: loadingDeliveries, refetch: refetchDeliveries } = useReadyDeliveries();
  const { data: readyOrders = [], isLoading: loadingPickups, refetch: refetchPickups } = usePendingPickups();

  const loading = loadingDeliveries || loadingPickups;
  const [refreshing, setRefreshing] = useState(false);
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchDeliveries(), refetchPickups()]);
    setRefreshing(false);
  }, [refetchStats, refetchDeliveries, refetchPickups]);

  const handleLogout = async () => {
    Alert.alert(t('common.logout_confirm_title'), t('common.logout_confirm_msg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.logout_btn'), style: 'destructive',
        onPress: async () => {
          try { await authApi.logout(); } catch { }
          await SecureStore.deleteItemAsync('user');
          await SecureStore.deleteItemAsync('accessToken');
          await SecureStore.deleteItemAsync('refreshToken');
          socketClient.disconnect();
          queryClient.clear();
          dispatch(logOut());
        },
      },
    ]);
  };

  // Filter delivery orders to only those due today or overdue — not future-scheduled
  const visibleDeliveries = readyDeliveries.filter((o: any) => isVisibleToday(o.scheduledDeliveryDate));

  // Build "next mission" from existing data
  const allMissions = [...visibleDeliveries, ...readyOrders];
  const deliveryCount = visibleDeliveries.length;
  const pickupCount = readyOrders.length;

  const nextMission = allMissions.length > 0 ? (() => {
    const first = visibleDeliveries[0] || readyOrders[0];
    const isDelivery = readyDeliveries.length > 0;
    const addr = first?.client?.addresses?.[0];
    return first ? {
      type: isDelivery ? 'delivery' : 'pickup',
      orderId: first.id,
      clientName: first.client?.name || first.clientNom || '—',
      clientPhone: first.client?.phones?.[0]?.phoneNumber || '',
      clientAddress: addr?.address || addr?.fullAddress || '—',
      clientLatitude: addr?.latitude ? parseFloat(addr.latitude) : null,
      clientLongitude: addr?.longitude ? parseFloat(addr.longitude) : null,
      montantTotal: first.montantTotal || 0,
      montantRestant: first.montantRestant || 0,
      itemCount: first.commandeTapis?.length || 0,
    } : null;
  })() : null;

  const missionBg = nextMission?.type === 'delivery' ? C.success : C.warning;
  const missionTextColor = nextMission?.type === 'delivery' ? 'white' : C.textPrimary;

  // Preview missions (first 3 from combined list)
  const previewMissions = allMissions.slice(0, 3);

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.primary }}>
        <View style={styles.header}>
          <View style={[styles.headerRow, row(isRTL)]}>
            <View>
              <Text style={[styles.greeting, font.regular(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{t('livreur.greeting')}</Text>
              <Text style={[styles.userName, font.extrabold(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{user?.name || t('livreur.driver_fallback')}</Text>
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="white" />
            </TouchableOpacity>
          </View>

          {/* Stats chips */}
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <View style={[styles.chipRow, row(isRTL)]}>
                <Animated.View style={[styles.dot, { backgroundColor: C.success, opacity: pulseAnim }]} />
                <Text style={[styles.chipNumber, font.extrabold(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{deliveryCount}</Text>
              </View>
              <Text style={[styles.chipLabel, font.regular(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{t('livreur.deliveries')}</Text>
            </View>
            <View style={styles.statChip}>
              <View style={[styles.chipRow, row(isRTL)]}>
                <Animated.View style={[styles.dot, { backgroundColor: C.warning, opacity: pulseAnim }]} />
                <Text style={[styles.chipNumber, font.extrabold(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{pickupCount}</Text>
              </View>
              <Text style={[styles.chipLabel, font.regular(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{t('livreur.pickups')}</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
      >
        {/* NEXT MISSION CARD */}
        <View style={styles.sectionPad}>
          {nextMission ? (
            <View style={[styles.missionCard, { backgroundColor: missionBg }]}>
              {/* BG circle decoration */}
              <View style={[styles.missionCircle, pos.end(-30, isRTL)]} />

              <View style={[styles.missionTop, row(isRTL)]}>
                <View style={styles.missionBadge}>
                  <Text style={[styles.missionBadgeText, { color: missionTextColor }]}>
                    {nextMission.type === 'delivery' ? t('livreur.delivery_badge') : t('livreur.pickup_badge')}
                  </Text>
                </View>
                <Text style={[styles.missionLabel, arabicSafe(isRTL)]}>{t('livreur.next_mission')}</Text>
              </View>

              <Text style={[styles.missionClientName, { color: 'white' }]}>{nextMission.clientName}</Text>

              <View style={[styles.missionInfoRow, row(isRTL)]}>
                <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.7)" />
                <Text style={styles.missionInfoText} numberOfLines={1}>{nextMission.clientAddress}</Text>
              </View>
              {nextMission.clientPhone ? (
                <View style={[styles.missionInfoRow, row(isRTL)]}>
                  <Ionicons name="call-outline" size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.missionInfoText}>{nextMission.clientPhone}</Text>
                </View>
              ) : null}

              {nextMission.type === 'delivery' && (
                <View style={[styles.financialRow, row(isRTL)]}>
                  <View>
                    <Text style={[styles.finLabel, font.semibold(isRTL)]}>{t('common.total')}</Text>
                    <Text style={[styles.finValue, font.extrabold(isRTL)]}>{nextMission.montantTotal} DH</Text>
                  </View>
                  <View style={styles.finDivider} />
                  <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                    <Text style={[styles.finLabel, font.semibold(isRTL)]}>{t('livreur.remaining_to_collect')}</Text>
                    <Text style={[styles.finValue, { fontSize: 18 }, font.extrabold(isRTL)]}>{nextMission.montantRestant} DH</Text>
                  </View>
                </View>
              )}

              {nextMission.type === 'pickup' && (
                <Text style={styles.itemsText}>{nextMission.itemCount} {t('livreur.items_to_collect')}</Text>
              )}

              <View style={[styles.missionActions, row(isRTL)]}>
                {nextMission.clientPhone ? (
                  <TouchableOpacity
                    style={[styles.callBtn, row(isRTL)]}
                    onPress={() => Linking.openURL(`tel:${nextMission.clientPhone}`)}
                  >
                    <Ionicons name="call" size={16} color="white" />
                    <Text style={[styles.callBtnText, font.semibold(isRTL)]}>{t('common.call')}</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={[styles.startBtn, { borderColor: missionBg }]}
                  onPress={() => router.push({
                    pathname: '/(livreur)/missions',
                    params: { tab: nextMission.type, orderId: nextMission.orderId },
                  })}
                >
                  <Text style={[styles.startBtnText, { color: missionBg }]}>
                    {t('livreur.start_mission')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={[styles.missionCard, { backgroundColor: C.primary, alignItems: 'center', paddingVertical: 32 }]}>
              <Text style={{ fontSize: 28 }}>✅</Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: 'white', marginTop: 10, textAlign: 'center' }}>
                {t('livreur.all_done')}
              </Text>
              <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 6 }}>{t('livreur.good_day')}</Text>
            </View>
          )}
        </View>

        {/* QUICK ACTIONS */}
        <View style={[styles.sectionPad, { flexDirection: 'row', gap: 10 }]}>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push('/(livreur)/map-view')}
            activeOpacity={0.8}
          >
            <View style={styles.quickIcon}>
              <Text style={{ fontSize: 26 }}>🗺️</Text>
            </View>
            <Text style={styles.quickLabel}>{t('livreur.view_map')}</Text>
          </TouchableOpacity>

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
              <View style={[styles.quickBadge, { backgroundColor: C.success }, pos.end(8, isRTL), { top: 8 }]}>
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
              <View style={[styles.quickBadge, { backgroundColor: C.warning }, pos.end(8, isRTL), { top: 8 }]}>
                <Text style={styles.quickBadgeText}>{pickupCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* TODAY'S MISSIONS PREVIEW */}
        {previewMissions.length > 0 && (
          <>
            <View style={[styles.sectionHeader, row(isRTL)]}>
              <Text style={[styles.sectionTitle, font.bold(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{t('livreur.missions_today')}</Text>
              <TouchableOpacity onPress={() => router.push('/(livreur)/missions')}>
                <Text style={[styles.seeAll, font.semibold(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{t('livreur.see_all')}</Text>
              </TouchableOpacity>
            </View>

            {previewMissions.map((mission: any, idx: number) => {
              const isDelivery = visibleDeliveries.some((d: any) => d.id === mission.id);
              const addr = mission.client?.addresses?.[0];
              return (
                <TouchableOpacity
                  key={mission.id}
                  style={[styles.miniCard, row(isRTL)]}
                  onPress={() => router.push(`/order/${mission.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.miniAccent, { backgroundColor: isDelivery ? C.success : C.warning }]} />
                  <View style={[styles.miniIconCircle, { backgroundColor: isDelivery ? C.successBg : C.warningBg }]}>
                    <Text style={{ fontSize: 18 }}>{isDelivery ? '🚚' : '📦'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.miniClientName, font.semibold(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{mission.client?.name || mission.clientNom || '—'}</Text>
                    <Text style={[styles.miniAddress, font.regular(isRTL)]} numberOfLines={1} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
                      {addr?.address || addr?.fullAddress || '—'}
                    </Text>
                  </View>
                  {isDelivery ? (
                    <Text style={[styles.miniAmount, { color: C.success }, font.bold(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{mission.montantTotal} DH</Text>
                  ) : (
                    <Text style={[styles.miniAmount, { color: C.warning }, font.bold(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
                      {t('livreur.items_count', { count: mission.commandeTapis?.length || 0 })}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}

            {allMissions.length > 3 && (
              <TouchableOpacity
                style={{ alignItems: 'center', marginTop: 8 }}
                onPress={() => router.push('/(livreur)/missions')}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: C.primary }}>
                  {t('livreur.more_missions', { count: allMissions.length - 3 })}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {loading && allMissions.length === 0 && (
          <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 20, paddingBottom: 18, paddingTop: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  greeting: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  userName: { fontSize: 22, color: 'white', fontWeight: '800', marginTop: 2 },
  logoutBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  statsRow: { flexDirection: 'row', gap: 10 },
  statChip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  chipNumber: { fontSize: 24, fontWeight: '800', color: 'white' },
  chipAmount: { fontSize: 16, fontWeight: '800', color: 'white', marginBottom: 4 },
  chipLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  scroll: { flex: 1 },
  sectionPad: { paddingHorizontal: 16, marginTop: 16 },
  missionCard: {
    borderRadius: 20, padding: 20,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15, shadowRadius: 16, elevation: 8,
  },
  missionCircle: {
    position: 'absolute', top: -30,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  missionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  missionBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999, paddingVertical: 4, paddingHorizontal: 12,
  },
  missionBadgeText: { fontSize: 11, fontWeight: '700' },
  missionLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '700', letterSpacing: 1.5 },
  missionClientName: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  missionInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  missionInfoText: { fontSize: 13, color: 'rgba(255,255,255,0.85)', flex: 1 },
  financialRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 10, padding: 10, paddingHorizontal: 14, marginTop: 14,
  },
  finLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginBottom: 2 },
  finValue: { fontSize: 16, color: 'white', fontWeight: '800' },
  finDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)' },
  itemsText: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 10 },
  missionActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  callBtn: {
    flex: 1, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  callBtnText: { fontSize: 14, color: 'white', fontWeight: '600' },
  startBtn: {
    flex: 2, height: 44, borderRadius: 12,
    backgroundColor: 'white',
    alignItems: 'center', justifyContent: 'center',
  },
  startBtnText: { fontSize: 14, fontWeight: '700' },
  quickCard: {
    flex: 1, backgroundColor: C.surface, borderRadius: 16,
    padding: 14, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  quickIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(13,115,119,0.08)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  quickLabel: { fontSize: 11, fontWeight: '600', color: C.textPrimary, textAlign: 'center' },
  quickBadge: {
    position: 'absolute',
    minWidth: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  quickBadgeText: { fontSize: 10, fontWeight: '800', color: 'white' },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, marginTop: 20, marginBottom: 10,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: C.textPrimary },
  seeAll: { fontSize: 13, fontWeight: '600', color: C.primary },
  miniCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surface, borderRadius: 14,
    marginHorizontal: 16, marginBottom: 8, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  miniAccent: { width: 4, height: 40, borderRadius: 2 },
  miniIconCircle: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  miniClientName: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  miniAddress: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  miniAmount: { fontSize: 14, fontWeight: '700' },
});
