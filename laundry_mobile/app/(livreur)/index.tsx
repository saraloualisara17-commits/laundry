import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchLivreurDashboardStats, fetchReadyDeliveries, fetchReadyOrders, fetchCanceledDeliveries } from '../../src/store/livreurThunks';
import { RootState, AppDispatch } from '../../src/store/store';
import { MaterialIcons, Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Shadows, Typography, Radius } from '../../constants/theme';

export default function LivreurDashboard() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { dashboardStats, readyDeliveries, readyOrders, loading, error } = useSelector((state: RootState) => state.livreur);

  const [activeTab, setActiveTab] = useState<'deliveries' | 'collections'>('deliveries');

  const loadData = () => {
    dispatch(fetchLivreurDashboardStats());
    dispatch(fetchReadyDeliveries());
    dispatch(fetchReadyOrders());
    dispatch(fetchCanceledDeliveries());
  };

  useEffect(() => {
    loadData();
  }, [dispatch]);

  const filteredMissions = useMemo(() => {
    return activeTab === 'deliveries' ? readyDeliveries : readyOrders;
  }, [activeTab, readyOrders, readyDeliveries]);

  const nextMission = useMemo(() => {
    if (readyDeliveries.length > 0) return readyDeliveries[0];
    if (readyOrders.length > 0) return readyOrders[0];
    return null;
  }, [readyOrders, readyDeliveries]);

  const todayDate = useMemo(() => {
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    return new Date().toLocaleDateString('fr-FR', options);
  }, []);

  const getClientDisplayName = (mission: any) => {
    return mission?.client?.name || mission?.clientNom || mission?.client?.nom || 'Client Inconnu';
  };

  const getClientPhone = (client: any) => {
    if (!client) return '—';
    if (client.phone) return client.phone;
    if (client.telephone) return client.telephone;
    if (Array.isArray(client.phones) && client.phones.length > 0) return client.phones[0].phoneNumber || client.phones[0].phone || '—';
    if (Array.isArray(client.telephones) && client.telephones.length > 0) return client.telephones[0].numero || client.telephones[0].phone || '—';
    return '—';
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} colors={[Colors.primary]} />}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bonjour,</Text>
          <Text style={styles.userName}>{user?.name || 'Livreur'}</Text>
          <View style={styles.underlineDecoration} />
        </View>
        <View style={styles.dateChip}>
          <Text style={styles.dateText}>{todayDate}</Text>
        </View>
      </View>

      {/* KPI GRID */}
      <View style={styles.kpiGrid}>
        <TouchableOpacity 
          style={[styles.kpiCard, activeTab === 'deliveries' && styles.kpiCardActive]} 
          onPress={() => setActiveTab('deliveries')}
          activeOpacity={0.8}
        >
          <View style={[styles.kpiIconWrapper, { backgroundColor: Colors.successBg }]}>
            <Feather name="truck" size={20} color={Colors.success} />
          </View>
          <Text style={styles.kpiValue}>{dashboardStats?.readyOrdersCount || 0}</Text>
          <Text style={styles.kpiLabel}>À LIVRER</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.kpiCard, activeTab === 'collections' && styles.kpiCardActive]} 
          onPress={() => setActiveTab('collections')}
          activeOpacity={0.8}
        >
          <View style={[styles.kpiIconWrapper, { backgroundColor: Colors.primary100 }]}>
            <Feather name="package" size={20} color={Colors.primary} />
          </View>
          <Text style={styles.kpiValue}>{dashboardStats?.pendingPickupCount || 0}</Text>
          <Text style={styles.kpiLabel}>À RÉCUPÉRER</Text>
        </TouchableOpacity>
      </View>

      {/* NEXT MISSION SPOTLIGHT */}
      {nextMission && (
        <View style={styles.spotlightCard}>
          <View style={styles.heroCircleLarge} />
          <View style={styles.heroCircleSmall} />
          
          <View style={styles.spotlightHeader}>
            <Text style={styles.spotlightTag}>PROCHAINE MISSION</Text>
            <TouchableOpacity onPress={loadData}>
              <Ionicons name="refresh" size={18} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.spotlightContent}>
            <View style={styles.spotlightAvatar}>
              <Text style={styles.spotlightAvatarText}>
                {getClientDisplayName(nextMission).charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.spotlightInfo}>
              <Text style={styles.spotlightOrderNo}>#{nextMission.numeroCommande}</Text>
              <Text style={styles.spotlightClientName} numberOfLines={1}>{getClientDisplayName(nextMission)}</Text>
              <Text style={styles.spotlightAddress} numberOfLines={1}>
                {nextMission.client?.addresses?.[0]?.fullAddress || nextMission.client?.address || nextMission.client?.adresse || 'Pas d\'adresse'}
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.spotlightButton} 
            onPress={() => router.push(`/order/${nextMission.id}`)}
          >
            <Feather name="navigation" size={18} color={Colors.primary} />
            <Text style={styles.spotlightButtonText}>
              {activeTab === 'deliveries' ? 'COMMENCER LA LIVRAISON' : 'COMMENCER LA RÉCUPÉRATION'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* MISSIONS LIST */}
      <View style={styles.missionsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Missions</Text>
          <View style={styles.tabSelector}>
            <TouchableOpacity 
              style={[styles.tabMini, activeTab === 'deliveries' && styles.tabMiniActive]}
              onPress={() => setActiveTab('deliveries')}
            >
              <Text style={[styles.tabMiniText, activeTab === 'deliveries' && styles.tabMiniTextActive]}>
                Livraisons
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabMini, activeTab === 'collections' && styles.tabMiniActive]}
              onPress={() => setActiveTab('collections')}
            >
              <Text style={[styles.tabMiniText, activeTab === 'collections' && styles.tabMiniTextActive]}>
                Récupérations
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading && filteredMissions.length === 0 ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : filteredMissions.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="check-circle" size={52} color="#CBD5E1" />
            <Text style={styles.emptyStateTitle}>Tout est à jour</Text>
            <Text style={styles.emptyStateDesc}>Aucune mission en attente pour le moment.</Text>
          </View>
        ) : (
          filteredMissions.map((mission: any) => {
            const isDelivery = mission.status === 'DELIVERED' || mission.status === 'READY_FOR_DELIVERY' || mission.status === 'IN_PROCESS';
            return (
              <TouchableOpacity 
                key={mission.id} 
                style={styles.missionCard}
                onPress={() => router.push(`/order/${mission.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.missionCardHeader}>
                  <Text style={styles.missionOrderNo}>#{mission.numeroCommande}</Text>
                  <View style={[
                    styles.missionBadge, 
                    { 
                      backgroundColor: isDelivery ? Colors.infoBg : Colors.warningBg,
                      borderColor: isDelivery ? 'rgba(59,130,246,0.20)' : 'rgba(245,158,11,0.20)'
                    }
                  ]}>
                    <Text style={[
                      styles.missionBadgeText, 
                      { color: isDelivery ? Colors.info : Colors.warning }
                    ]}>
                      {isDelivery ? 'LIVRAISON' : 'COLLECTE'}
                    </Text>
                  </View>
                </View>

                <View style={styles.missionCardBody}>
                  <View style={styles.missionAvatar}>
                    <Text style={styles.missionAvatarText}>{getClientDisplayName(mission).charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.missionInfo}>
                    <Text style={styles.missionClientName} numberOfLines={1}>{getClientDisplayName(mission)}</Text>
                    <View style={styles.missionLocationRow}>
                      <Feather name="map-pin" size={12} color={Colors.primary} />
                      <Text style={styles.missionAddress} numberOfLines={1}>
                        {mission.client?.addresses?.[0]?.fullAddress || mission.client?.address || mission.client?.adresse || 'Pas d\'adresse'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.missionCardFooter}>
                  <View style={styles.missionPhoneRow}>
                    <Feather name="phone" size={14} color={Colors.success} />
                    <Text style={styles.missionPhoneText}>{getClientPhone(mission.client)}</Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsText}>DÉTAILS</Text>
                    <Feather name="chevron-right" size={16} color={Colors.primary} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
  },
  greeting: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.regular,
    color: Colors.textMuted,
  },
  userName: {
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
    letterSpacing: -0.02,
  },
  underlineDecoration: {
    width: 32,
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    marginTop: 4,
  },
  dateChip: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 6,
    paddingHorizontal: 12,
    ...Shadows.xs,
  },
  dateText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.medium,
    color: Colors.textSecondary,
  },
  kpiGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  kpiCardActive: {
    borderColor: Colors.primary200,
    backgroundColor: Colors.primary50,
  },
  kpiIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  kpiValue: {
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.textMuted,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  spotlightCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    padding: 24,
    marginBottom: 28,
    ...Shadows.teal,
    overflow: 'hidden',
    position: 'relative',
  },
  heroCircleLarge: {
    width: 160,
    height: 160,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 80,
    position: 'absolute',
    top: -40,
    right: -40,
  },
  heroCircleSmall: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 40,
    position: 'absolute',
    bottom: -20,
    left: -20,
  },
  spotlightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  spotlightTag: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    letterSpacing: 1,
  },
  spotlightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  spotlightAvatar: {
    width: 60,
    height: 60,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  spotlightAvatarText: {
    color: 'white',
    fontSize: 24,
    fontWeight: Typography.weight.bold,
  },
  spotlightInfo: {
    flex: 1,
  },
  spotlightOrderNo: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    marginBottom: 2,
  },
  spotlightClientName: {
    color: 'white',
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    marginBottom: 4,
  },
  spotlightAddress: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: Typography.size.sm,
  },
  spotlightButton: {
    backgroundColor: 'white',
    borderRadius: Radius.md,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    ...Shadows.sm,
  },
  spotlightButtonText: {
    color: Colors.primary,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
  },
  missionsSection: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.surface2,
    borderRadius: Radius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabMini: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  tabMiniActive: {
    backgroundColor: Colors.surface,
    ...Shadows.xs,
  },
  tabMiniText: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: Colors.textMuted,
  },
  tabMiniTextActive: {
    color: Colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.semibold,
    color: Colors.textSecondary,
    marginTop: 16,
  },
  emptyStateDesc: {
    fontSize: Typography.size.base,
    color: Colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  missionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  missionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  missionOrderNo: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: Colors.textMuted,
  },
  missionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  missionBadgeText: {
    fontSize: 9,
    fontWeight: Typography.weight.bold,
  },
  missionCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  missionAvatar: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  missionAvatarText: {
    fontSize: 18,
    fontWeight: Typography.weight.bold,
    color: Colors.primary,
  },
  missionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  missionClientName: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
  },
  missionLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  missionAddress: {
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 12,
  },
  missionCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  missionPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  missionPhoneText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.textPrimary,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailsText: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: Colors.primary,
  },
});
