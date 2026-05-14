import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Animated, Linking, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../src/store/store';
import { logOut } from '../../src/store/authSlice';
import { fetchLivreurDashboardStats, fetchReadyDeliveries, fetchReadyOrders } from '../../src/store/livreurThunks';
import * as SecureStore from 'expo-secure-store';
import { api } from '../../src/api/axios';

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
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((s: RootState) => s.auth);
  const { dashboardStats, readyDeliveries, readyOrders, loading } = useSelector((s: RootState) => s.livreur);

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

  const loadData = useCallback(() => {
    dispatch(fetchLivreurDashboardStats());
    dispatch(fetchReadyDeliveries());
    dispatch(fetchReadyOrders());
  }, [dispatch]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = () => { setRefreshing(true); loadData(); setTimeout(() => setRefreshing(false), 1200); };

  const handleLogout = async () => {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnecter', style: 'destructive',
        onPress: async () => {
          try { await api.post('/auth/logout'); } catch { }
          await SecureStore.deleteItemAsync('user');
          await SecureStore.deleteItemAsync('accessToken');
          await SecureStore.deleteItemAsync('refreshToken');
          dispatch(logOut());
        },
      },
    ]);
  };

  // Build "next mission" from existing data
  const allMissions = [...(readyDeliveries || []), ...(readyOrders || [])];
  const deliveryCount = readyDeliveries?.length || 0;
  const pickupCount = readyOrders?.length || 0;
  const totalCollected = dashboardStats?.totalCollectedToday || 0;

  const nextMission = allMissions.length > 0 ? (() => {
    const first = readyDeliveries?.[0] || readyOrders?.[0];
    const isDelivery = readyDeliveries?.length > 0;
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
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greeting}>Bonjour,</Text>
              <Text style={styles.userName}>{user?.name || 'Livreur'}</Text>
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="white" />
            </TouchableOpacity>
          </View>

          {/* Stats chips */}
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <View style={styles.chipRow}>
                <Animated.View style={[styles.dot, { backgroundColor: C.success, opacity: pulseAnim }]} />
                <Text style={styles.chipNumber}>{deliveryCount}</Text>
              </View>
              <Text style={styles.chipLabel}>livraisons</Text>
            </View>
            <View style={styles.statChip}>
              <View style={styles.chipRow}>
                <Animated.View style={[styles.dot, { backgroundColor: C.warning, opacity: pulseAnim }]} />
                <Text style={styles.chipNumber}>{pickupCount}</Text>
              </View>
              <Text style={styles.chipLabel}>collectes</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={styles.chipAmount}>{totalCollected} DH</Text>
              <Text style={styles.chipLabel}>encaissé</Text>
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
              <View style={styles.missionCircle} />

              <View style={styles.missionTop}>
                <View style={styles.missionBadge}>
                  <Text style={[styles.missionBadgeText, { color: missionTextColor }]}>
                    {nextMission.type === 'delivery' ? '🚚 LIVRAISON' : '📦 COLLECTE'}
                  </Text>
                </View>
                <Text style={styles.missionLabel}>PROCHAINE MISSION</Text>
              </View>

              <Text style={[styles.missionClientName, { color: 'white' }]}>{nextMission.clientName}</Text>

              <View style={styles.missionInfoRow}>
                <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.7)" />
                <Text style={styles.missionInfoText} numberOfLines={1}>{nextMission.clientAddress}</Text>
              </View>
              {nextMission.clientPhone ? (
                <View style={styles.missionInfoRow}>
                  <Ionicons name="call-outline" size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.missionInfoText}>{nextMission.clientPhone}</Text>
                </View>
              ) : null}

              {nextMission.type === 'delivery' && (
                <View style={styles.financialRow}>
                  <View>
                    <Text style={styles.finLabel}>Total</Text>
                    <Text style={styles.finValue}>{nextMission.montantTotal} DH</Text>
                  </View>
                  <View style={styles.finDivider} />
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.finLabel}>Reste à encaisser</Text>
                    <Text style={[styles.finValue, { fontSize: 18 }]}>{nextMission.montantRestant} DH</Text>
                  </View>
                </View>
              )}

              {nextMission.type === 'pickup' && (
                <Text style={styles.itemsText}>{nextMission.itemCount} article(s) à collecter</Text>
              )}

              <View style={styles.missionActions}>
                {nextMission.clientPhone ? (
                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => Linking.openURL(`tel:${nextMission.clientPhone}`)}
                  >
                    <Ionicons name="call" size={16} color="white" />
                    <Text style={styles.callBtnText}>Appeler</Text>
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
                    Démarrer la mission →
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={[styles.missionCard, { backgroundColor: C.primary, alignItems: 'center', paddingVertical: 32 }]}>
              <Text style={{ fontSize: 28 }}>✅</Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: 'white', marginTop: 10, textAlign: 'center' }}>
                Toutes les missions sont terminées!
              </Text>
              <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 6 }}>Bonne journée</Text>
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
            <Text style={styles.quickLabel}>Voir la carte</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push({ pathname: '/(livreur)/missions', params: { tab: 'delivery' } })}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIcon, { backgroundColor: C.successBg }]}>
              <Text style={{ fontSize: 26 }}>🚚</Text>
            </View>
            <Text style={styles.quickLabel}>Livraisons</Text>
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
            <Text style={styles.quickLabel}>Collectes</Text>
            {pickupCount > 0 && (
              <View style={[styles.quickBadge, { backgroundColor: C.warning }]}>
                <Text style={styles.quickBadgeText}>{pickupCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* TODAY'S MISSIONS PREVIEW */}
        {previewMissions.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Missions du jour</Text>
              <TouchableOpacity onPress={() => router.push('/(livreur)/missions')}>
                <Text style={styles.seeAll}>Voir tout →</Text>
              </TouchableOpacity>
            </View>

            {previewMissions.map((mission: any, idx: number) => {
              const isDelivery = readyDeliveries?.some((d: any) => d.id === mission.id);
              const addr = mission.client?.addresses?.[0];
              return (
                <TouchableOpacity
                  key={mission.id}
                  style={styles.miniCard}
                  onPress={() => router.push(`/order/${mission.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.miniAccent, { backgroundColor: isDelivery ? C.success : C.warning }]} />
                  <View style={[styles.miniIconCircle, { backgroundColor: isDelivery ? C.successBg : C.warningBg }]}>
                    <Text style={{ fontSize: 18 }}>{isDelivery ? '🚚' : '📦'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.miniClientName}>{mission.client?.name || mission.clientNom || '—'}</Text>
                    <Text style={styles.miniAddress} numberOfLines={1}>
                      {addr?.address || addr?.fullAddress || '—'}
                    </Text>
                  </View>
                  {isDelivery ? (
                    <Text style={[styles.miniAmount, { color: C.success }]}>{mission.montantTotal} DH</Text>
                  ) : (
                    <Text style={[styles.miniAmount, { color: C.warning }]}>
                      {mission.commandeTapis?.length || 0} art.
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
                  + {allMissions.length - 3} autres missions
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
    position: 'absolute', right: -30, top: -30,
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
    position: 'absolute', top: 8, right: 8,
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
