import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, Platform, ScrollView, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { logOut } from '../../src/store/authSlice';
import { fetchLivreurDashboardStats, fetchReadyDeliveries, fetchPendingPickups } from '../../src/store/livreurThunks';
import { RootState, AppDispatch } from '../../src/store/store';
import { useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { authApi } from '../../src/services/api';
import { changeLanguage } from '../../src/i18n';
import { useTranslation } from 'react-i18next';

const C = {
  primary: '#0D7377',
  success: '#10B981',
  successBg: 'rgba(16,185,129,0.1)',
  warning: '#F59E0B',
  warningBg: 'rgba(245,158,11,0.1)',
  danger: '#EF4444',
  dangerBg: 'rgba(239,68,68,0.08)',
  bg: '#F4F6F8',
  surface: '#FFFFFF',
  textPrimary: '#0D1B2A',
  textSecondary: '#4A5568',
  textMuted: '#94A3B8',
};

export default function LivreurProfile() {
  const { i18n } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((s: RootState) => s.auth);
  const { dashboardStats, readyDeliveries, readyOrders } = useSelector((s: RootState) => s.livreur);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => {
    dispatch(fetchLivreurDashboardStats());
    dispatch(fetchReadyDeliveries());
    dispatch(fetchPendingPickups());
  }, [dispatch]));

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([
      dispatch(fetchLivreurDashboardStats()),
      dispatch(fetchReadyDeliveries()),
      dispatch(fetchPendingPickups()),
    ]).finally(() => setRefreshing(false));
  };

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnecter', style: 'destructive',
        onPress: async () => {
          try { await authApi.logout(); } catch {}
          await SecureStore.deleteItemAsync('user');
          await SecureStore.deleteItemAsync('accessToken');
          await SecureStore.deleteItemAsync('refreshToken');
          dispatch(logOut());
        },
      },
    ]);
  };

  const deliveriesCount = readyDeliveries?.length || 0;
  const pickupsCount = readyOrders?.length || 0;
  const totalCollected = dashboardStats?.totalCollectedToday || 0;
  const initials = (user?.name || 'L').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.primary }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mon Profil</Text>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
      >
        {/* Avatar card */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.userName}>{user?.name || 'Livreur'}</Text>
          {user?.email && <Text style={styles.userEmail}>{user.email}</Text>}
          <View style={styles.roleBadge}>
            <Ionicons name="car-outline" size={13} color={C.primary} />
            <Text style={styles.roleText}>LIVREUR</Text>
          </View>
        </View>

        {/* Today's summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 Résumé du jour</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryVal, { color: C.success }]}>{deliveriesCount}</Text>
              <Text style={styles.summaryLabel}>Livraisons</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryVal, { color: C.warning }]}>{pickupsCount}</Text>
              <Text style={styles.summaryLabel}>Collectes</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryVal, { color: C.primary }]}>{totalCollected} DH</Text>
              <Text style={styles.summaryLabel}>Encaissé</Text>
            </View>
          </View>
        </View>

        {/* Language */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🌐 Langue</Text>
          <View style={styles.langRow}>
            <TouchableOpacity
              style={[styles.langBtn, i18n.language === 'fr' && styles.langBtnActive]}
              onPress={() => changeLanguage('fr')}
            >
              <Text style={[styles.langText, i18n.language === 'fr' && styles.langTextActive]}>Français</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langBtn, i18n.language === 'ar' && styles.langBtnActive]}
              onPress={() => changeLanguage('ar')}
            >
              <Text style={[styles.langText, i18n.language === 'ar' && styles.langTextActive]}>العربية</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Info rows */}
        {user?.email && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>ℹ️ Informations</Text>
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={16} color={C.textMuted} />
              <Text style={styles.infoText}>{user.email}</Text>
            </View>
            {user.phone && (
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={16} color={C.textMuted} />
                <Text style={styles.infoText}>{user.phone}</Text>
              </View>
            )}
          </View>
        )}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color={C.danger} />
          <Text style={styles.logoutText}>Déconnexion</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: 'white' },
  avatarSection: { alignItems: 'center', backgroundColor: C.surface, paddingVertical: 28, marginBottom: 12 },
  avatarCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: 'white' },
  userName: { fontSize: 22, fontWeight: '700', color: C.textPrimary, marginBottom: 4 },
  userEmail: { fontSize: 14, color: C.textMuted, marginBottom: 10 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(13,115,119,0.1)', paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1, borderColor: 'rgba(13,115,119,0.2)',
  },
  roleText: { fontSize: 12, fontWeight: '700', color: C.primary },
  card: {
    backgroundColor: C.surface, borderRadius: 16,
    marginHorizontal: 16, marginBottom: 12, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryVal: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  summaryLabel: { fontSize: 11, color: C.textMuted, fontWeight: '600' },
  summaryDivider: { width: 1, height: 36, backgroundColor: '#E2E8F0' },
  langRow: { flexDirection: 'row', gap: 12 },
  langBtn: {
    flex: 1, height: 44, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC',
  },
  langBtnActive: { backgroundColor: 'rgba(13,115,119,0.08)', borderColor: C.primary },
  langText: { fontSize: 14, fontWeight: '600', color: C.textSecondary },
  langTextActive: { color: C.primary },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  infoText: { fontSize: 14, color: C.textSecondary },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)',
    marginHorizontal: 16, marginTop: 4, paddingVertical: 16, borderRadius: 14,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
});
