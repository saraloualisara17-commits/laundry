import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  RefreshControl,
  Animated,
  Dimensions
} from 'react-native';
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

const { width: screenWidth } = Dimensions.get('window');

interface DashboardStats {
  ordersToday: number;
  revenueToday: number;
  pendingCount: number;
  processingCount: number;
  readyCount: number;
  clientsCount: number;
  unpaid?: {
    count: number;
    clientsCount: number;
    amount: number;
  };
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
}

interface UnpaidOverview {
  totalRemaining: number;
  totalOrders: number;
  clientsWithDebt: number;
}

export default function AdminDashboard() {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // New state for Overview
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [unpaidOverview, setUnpaidOverview] = useState<UnpaidOverview | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);
  const [overviewError, setOverviewError] = useState(false);

  const readyPulsingAnim = useRef(new Animated.Value(1)).current;
  const unpaidPulseAnim = useRef(new Animated.Value(0)).current;

  const loadOverview = async () => {
    setIsLoadingOverview(true);
    setOverviewError(false);
    try {
      const [ovRes, unovRes] = await Promise.all([
        adminApi.getStatusOverview(),
        adminApi.getUnpaidOverview()
      ]);
      setOverview(ovRes.data.data);
      setUnpaidOverview(unovRes.data);
      setLastUpdated(
        new Date().toLocaleTimeString('fr-FR', {
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

  useEffect(() => {
    loadOverview();
    const interval = setInterval(() => {
      loadOverview();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOverview();
      fetchData();
    }, [])
  );

  // READY_FOR_DELIVERY pulsing
  useEffect(() => {
    if (overview?.READY_FOR_DELIVERY?.count && overview.READY_FOR_DELIVERY.count > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(readyPulsingAnim, {
            toValue: 0.3,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(readyPulsingAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          })
        ])
      ).start();
    } else {
      readyPulsingAnim.setValue(1);
    }
  }, [overview?.READY_FOR_DELIVERY?.count]);

  // Unpaid card pulsing
  useEffect(() => {
    const unpaidAmount = unpaidOverview?.totalRemaining ?? 0;
    if (unpaidAmount > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(unpaidPulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(unpaidPulseAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      unpaidPulseAnim.setValue(0);
    }
  }, [unpaidOverview?.totalRemaining]);

  const fetchData = async () => {
    if (!user) return;
    
    try {
      const [statsRes, ordersRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getRecentOrders()
      ]);
      
      const rawStats = statsRes.data;
      setStats({
        ordersToday: rawStats.totalCommandesToday || 0,
        revenueToday: rawStats.revenuesToday || 0,
        pendingCount: rawStats.commandesEnAttente || 0,
        processingCount: rawStats.commandesEnTraitement || 0,
        readyCount: rawStats.commandesPretes || 0,
        clientsCount: rawStats.totalClients || 0,
        unpaid: rawStats.unpaid || { count: 0, clientsCount: 0, amount: 0 }
      });
      
      const orders = ordersRes.data.content || ordersRes.data || [];
      setRecentOrders(Array.isArray(orders) ? orders : []);
    } catch (error: any) {
      if (error.message !== 'Session expired') {
        console.error('Dashboard fetch error:', error);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
    loadOverview();
  }, []);

  const handleLogout = async () => {
    dispatch(logOut());
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('user');
    router.replace('/(auth)/login');
  };

  const renderQuickAction = (icon: any, title: string, path: any, color: string = AdminColors.primary) => (
    <TouchableOpacity 
      style={styles.actionCard} 
      onPress={() => router.push(path)}
      activeOpacity={0.7}
    >
      <View style={[styles.actionIconCircle, { backgroundColor: AdminColors.primary100 }]}>
        <Ionicons name={icon} size={24} color={AdminColors.primary} />
      </View>
      <Text style={styles.actionTitle}>{title}</Text>
      <Ionicons name="chevron-forward" size={18} color={AdminColors.textMuted} />
    </TouchableOpacity>
  );

  const renderStatusCard = (status: keyof OverviewData, label: string, emoji: string, borderTopColor: string, countColor: string) => {
    const data = overview?.[status] ?? { count: 0, total: 0 };
    
    return (
      <TouchableOpacity 
        style={[styles.statusCard, { borderTopColor }]}
        onPress={() => router.push({
          pathname: '/(admin)/orders-by-status',
          params: { status }
        })}
        activeOpacity={0.8}
      >
        <View style={[styles.cardDecoration, { backgroundColor: borderTopColor }]} />
        
        <View style={styles.cardTopRow}>
          <Text style={styles.cardEmoji}>{emoji}</Text>
          <Text style={[styles.cardCount, { color: countColor }]}>{data.count}</Text>
        </View>
        
        <Text style={styles.cardLabel}>{label}</Text>
        
        <View style={styles.cardAmountRow}>
          <Text 
            style={[styles.cardAmount, { color: countColor }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {data.total.toLocaleString()} DH
          </Text>
        </View>

        {status === 'READY_FOR_DELIVERY' && data.count > 0 && (
          <Animated.View style={[styles.attentionDot, { opacity: readyPulsingAnim }]} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.headerContent}>
          <View style={styles.greetingCol}>
            <Text style={styles.greetingText}>Bonjour,</Text>
            <Text style={styles.adminName}>{user?.name || 'Administrateur'}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.notificationBtn}>
              <Ionicons name="notifications-outline" size={22} color="white" />
              <View style={styles.unreadBadge} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.notificationBtn, { marginLeft: 10 }]} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={22} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AdminColors.primary} />}
      >
        {/* Hero Stats Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroDecoration} />
          <Text style={styles.heroLabel}>AUJOURD'HUI</Text>
          <View style={styles.heroMainRow}>
            <Text style={styles.heroValue}>{stats?.ordersToday || 0}</Text>
            <Text style={styles.heroUnit}>commandes</Text>
          </View>
          
          <View style={styles.heroDivider} />
          
          <View style={styles.heroGrid}>
            <View style={styles.heroGridItem}>
              <Text style={styles.gridLabel}>REVENUS ENCAISSÉS</Text>
              <Text style={[styles.gridValue, { color: '#6EE7B7' }]}>
                {stats?.revenueToday?.toLocaleString() || 0} DH
              </Text>
            </View>
            <View style={styles.gridDivider} />
            <View style={styles.heroGridItem}>
              <Text style={styles.gridLabel}>TOTAL CLIENTS</Text>
              <Text style={[styles.gridValue, { color: 'white' }]}>
                {stats?.clientsCount || 0}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions Grid - Top Part */}
        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            style={styles.mainCreateBtn}
            onPress={() => router.push('/(admin)/create-order')}
            activeOpacity={0.9}
          >
            <View style={styles.mainCreateIcon}>
              <Text style={styles.plusSign}>+</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.mainCreateTitle}>Créer une commande</Text>
              <Text style={styles.mainCreateSub}>Client présent ou téléphonique</Text>
            </View>
            <View style={styles.arrowCircle}>
              <Ionicons name="arrow-forward" size={18} color="white" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Vue d'ensemble Section */}
        <View style={styles.sectionOverviewHeader}>
          <Text style={styles.sectionOverviewTitle}>Vue d'ensemble</Text>
          <Text style={styles.lastUpdatedText}>{lastUpdated}</Text>
        </View>

        {isLoadingOverview ? (
          <View style={styles.overviewLoadingContainer}>
            <View style={styles.statusCardsRow}>
              <SkeletonCard style={styles.statusSkeleton} />
              <SkeletonCard style={styles.statusSkeleton} />
            </View>
            <View style={styles.statusCardsRow}>
              <SkeletonCard style={styles.statusSkeleton} />
              <SkeletonCard style={styles.statusSkeleton} />
            </View>
            <SkeletonCard style={styles.unpaidSkeleton} />
          </View>
        ) : overviewError ? (
          <TouchableOpacity 
            style={styles.errorContainer}
            onPress={loadOverview}
          >
            <Text style={styles.errorText}>⚠️ Impossible de charger les statistiques</Text>
            <Text style={styles.retryText}>Appuyez pour réessayer</Text>
          </TouchableOpacity>
        ) : (
          <View>
            <View style={styles.statusCardsContainer}>
              {renderStatusCard('PENDING_PICKUP', 'En attente', '⏳', '#F59E0B', '#D97706')}
              {renderStatusCard('PICKED_UP', 'Récupérées', '📥', '#3B82F6', '#2563EB')}
              {renderStatusCard('READY_FOR_DELIVERY', 'Prêtes à livrer', '✅', '#C9A84C', '#92400E')}
              {renderStatusCard('DELIVERED', 'Livrées', '🚚', '#10B981', '#065F46')}
            </View>

            {/* Unpaid Overview Card */}
            {unpaidOverview && (
              <View style={styles.unpaidOverviewWrapper}>
                <TouchableOpacity 
                  style={[
                    styles.unpaidOverviewCard,
                    unpaidOverview.totalRemaining === 0 && styles.unpaidSuccessBg
                  ]}
                  onPress={() => router.push('/(admin)/unpaid-orders')}
                  activeOpacity={0.8}
                >
                  {unpaidOverview.totalRemaining > 0 ? (
                    <Animated.View style={[
                      styles.unpaidAnimatedBorder,
                      { borderColor: unpaidPulseAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['rgba(239,68,68,0.2)', 'rgba(239,68,68,0.6)']
                      })}
                    ]}>
                      <View style={styles.unpaidOverviewMain}>
                        <View style={styles.unpaidOverviewIcon}>
                          <Text style={styles.unpaidOverviewEmoji}>💰</Text>
                        </View>
                        <View style={styles.unpaidOverviewTextCol}>
                          <Text style={styles.unpaidOverviewTitle}>Soldes impayés</Text>
                          <View style={styles.unpaidPillsRow}>
                            <View style={styles.unpaidPillClients}>
                              <Text style={styles.unpaidPillClientsText}>{unpaidOverview.clientsWithDebt} client(s)</Text>
                            </View>
                            <View style={styles.unpaidPillOrders}>
                              <Text style={styles.unpaidPillOrdersText}>{unpaidOverview.totalOrders} commande(s)</Text>
                            </View>
                          </View>
                        </View>
                        <View style={styles.unpaidOverviewAmountCol}>
                          <Text style={styles.unpaidOverviewAmount}>
                            {unpaidOverview.totalRemaining.toLocaleString()} DH
                          </Text>
                          <Text style={styles.unpaidOverviewAmountLabel}>à encaisser</Text>
                        </View>
                      </View>
                      <View style={styles.unpaidOverviewBottom}>
                        <Text style={styles.unpaidOverviewBottomText}>Voir tous les impayés</Text>
                        <Text style={styles.unpaidOverviewBottomArrow}>→</Text>
                      </View>
                    </Animated.View>
                  ) : (
                    <View style={[styles.unpaidOverviewMain, { padding: 16 }]}>
                      <View style={[styles.unpaidOverviewIcon, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
                        <Text style={styles.unpaidOverviewEmoji}>✅</Text>
                      </View>
                      <View style={styles.unpaidOverviewTextCol}>
                        <Text style={styles.unpaidOverviewTitle}>Tout est à jour</Text>
                      </View>
                      <View style={styles.unpaidOverviewAmountCol}>
                        <Text style={[styles.unpaidOverviewAmount, { color: '#10B981' }]}>0 DH</Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Quick Actions Grid - Bottom Part */}
        <View style={[styles.actionsGrid, { marginTop: 0 }]}>
          <View style={styles.actionsRow}>
            {renderQuickAction('list-outline', 'Voir commandes', '/(admin)/orders')}
            {renderQuickAction('people-outline', 'Clients', '/(admin)/clients')}
          </View>
          <View style={styles.actionsRow}>
            {renderQuickAction('layers-outline', 'Catalogue', '/(admin)/catalog')}
            {renderQuickAction('people-circle-outline', 'Équipe', '/(admin)/users')}
          </View>
        </View>

        {/* Recent Orders */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Commandes récentes</Text>
          <TouchableOpacity onPress={() => router.push('/(admin)/orders')}>
            <Text style={styles.seeAllText}>Voir tout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.ordersList}>
          {loading ? (
            Array(3).fill(0).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            recentOrders.map((order) => (
              <TouchableOpacity 
                key={order.id} 
                style={styles.orderCard}
                onPress={() => router.push(`/order/${order.id}`)}
              >
                <View style={[styles.statusAccent, { backgroundColor: (require('../../../constants/StatusColors').StatusColors[order.status] || require('../../../constants/StatusColors').StatusColors.PENDING_PICKUP).dot }]} />
                <View style={styles.orderTop}>
                  <Text style={styles.orderRef}>#{order.numeroCommande}</Text>
                  <StatusBadge status={order.status} />
                </View>
                <Text style={styles.clientName}>{order.client?.name || order.clientNom}</Text>
                <View style={styles.orderBottom}>
                  <Text style={styles.orderAmount}>{order.montantTotal} DH</Text>
                  <Text style={styles.orderDate}>
                    {new Date(order.dateCreation).toLocaleDateString()}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AdminColors.bg,
  },
  headerSafe: {
    backgroundColor: AdminColors.primary,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greetingCol: {
    flex: 1,
  },
  greetingText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  adminName: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginTop: 2,
  },
  notificationBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 8,
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AdminColors.danger,
    borderWidth: 1.5,
    borderColor: AdminColors.primary,
  },
  content: {
    flex: 1,
  },
  heroCard: {
    margin: 16,
    borderRadius: 20,
    backgroundColor: AdminColors.primary,
    padding: 22,
    overflow: 'hidden',
    ...AdminShadows.shadowTeal,
  },
  heroDecoration: {
    position: 'absolute',
    right: -40,
    top: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 1.5,
  },
  heroMainRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
    gap: 8,
  },
  heroValue: {
    fontSize: 52,
    fontWeight: '800',
    color: 'white',
  },
  heroUnit: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginVertical: 16,
  },
  heroGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroGridItem: {
    flex: 1,
  },
  gridLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
  },
  gridValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  gridDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 10,
  },
  actionsGrid: {
    paddingHorizontal: 16,
    gap: 12,
  },
  mainCreateBtn: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 2,
    borderColor: AdminColors.primary,
    marginBottom: 8,
    ...AdminShadows.shadowMedium,
  },
  mainCreateIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: AdminColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusSign: {
    fontSize: 36,
    fontWeight: '300',
    color: 'white',
  },
  mainCreateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AdminColors.textPrimary,
  },
  mainCreateSub: {
    fontSize: 13,
    color: AdminColors.textSecondary,
    marginTop: 4,
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AdminColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    ...AdminShadows.shadowSmall,
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: AdminColors.textPrimary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: AdminColors.textPrimary,
  },
  seeAllText: {
    fontSize: 13,
    color: AdminColors.primary,
    fontWeight: '600',
  },
  ordersList: {
    paddingHorizontal: 16,
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    position: 'relative',
    overflow: 'hidden',
    ...AdminShadows.shadowSmall,
  },
  statusAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  orderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderRef: {
    fontSize: 11,
    fontWeight: '600',
    color: AdminColors.textMuted,
    textTransform: 'uppercase',
  },
  clientName: {
    fontSize: 16,
    fontWeight: '700',
    color: AdminColors.textPrimary,
    marginBottom: 10,
  },
  orderBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderAmount: {
    fontSize: 17,
    fontWeight: '700',
    color: AdminColors.primary,
  },
  orderDate: {
    fontSize: 12,
    color: AdminColors.textMuted,
    fontWeight: '500',
  },
  unpaidCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    ...AdminShadows.shadowSmall,
  },
  unpaidTop: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  unpaidIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(239,68,68,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unpaidIconEmoji: {
    fontSize: 22,
  },
  unpaidTextCol: {
    flex: 1,
  },
  unpaidTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: AdminColors.textPrimary,
  },
  unpaidSubtitle: {
    fontSize: 13,
    color: AdminColors.textSecondary,
    marginTop: 2,
  },
  unpaidAmountCol: {
    alignItems: 'flex-end',
  },
  unpaidAmountValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  unpaidAmountLabel: {
    fontSize: 11,
    color: AdminColors.textMuted,
    marginTop: 2,
  },
  unpaidBottom: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(239,68,68,0.04)',
    borderTopWidth: 1,
    borderColor: 'rgba(239,68,68,0.10)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unpaidBottomText: {
    fontSize: 12,
    color: AdminColors.textSecondary,
  },
  unpaidBottomAction: {
    fontSize: 12,
    fontWeight: '700',
    color: AdminColors.danger,
  },
  // New Styles
  sectionOverviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionOverviewTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0D1B2A',
  },
  lastUpdatedText: {
    fontSize: 11,
    color: AdminColors.textMuted,
  },
  statusCardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 12,
    gap: 10,
    marginBottom: 10,
  },
  statusCard: {
    width: (screenWidth - 44) / 2,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    borderTopWidth: 3,
    overflow: 'hidden',
    position: 'relative',
    ...AdminShadows.shadowSmall,
  },
  cardDecoration: {
    position: 'absolute',
    right: -10,
    bottom: -10,
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: 0.06,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardEmoji: {
    fontSize: 22,
  },
  cardCount: {
    fontSize: 28,
    fontWeight: '800',
  },
  cardLabel: {
    fontSize: 12,
    color: AdminColors.textMuted,
    marginTop: 8,
  },
  cardAmountRow: {
    marginTop: 4,
  },
  cardAmount: {
    fontSize: 13,
    fontWeight: '600',
  },
  attentionDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#C9A84C',
  },
  unpaidOverviewWrapper: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  unpaidOverviewCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    ...AdminShadows.shadowSmall,
  },
  unpaidAnimatedBorder: {
    borderWidth: 1.5,
    borderRadius: 16,
  },
  unpaidOverviewMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  unpaidOverviewIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(239,68,68,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unpaidOverviewEmoji: {
    fontSize: 22,
  },
  unpaidOverviewTextCol: {
    flex: 1,
  },
  unpaidOverviewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: AdminColors.textPrimary,
  },
  unpaidPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  unpaidPillClients: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  unpaidPillClientsText: {
    fontSize: 11,
    fontWeight: '600',
    color: AdminColors.danger,
  },
  unpaidPillOrders: {
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  unpaidPillOrdersText: {
    fontSize: 11,
    fontWeight: '600',
    color: AdminColors.warning,
  },
  unpaidOverviewAmountCol: {
    alignItems: 'flex-end',
  },
  unpaidOverviewAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#EF4444',
  },
  unpaidOverviewAmountLabel: {
    fontSize: 11,
    color: AdminColors.textMuted,
  },
  unpaidOverviewBottom: {
    backgroundColor: 'rgba(239,68,68,0.04)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(239,68,68,0.08)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unpaidOverviewBottomText: {
    fontSize: 12,
    color: AdminColors.textSecondary,
  },
  unpaidOverviewBottomArrow: {
    fontSize: 14,
    fontWeight: '700',
    color: AdminColors.danger,
  },
  unpaidSuccessBg: {
    backgroundColor: 'rgba(16,185,129,0.04)',
  },
  overviewLoadingContainer: {
    paddingHorizontal: 16,
    gap: 10,
  },
  statusCardsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statusSkeleton: {
    flex: 1,
    height: 120,
  },
  unpaidSkeleton: {
    width: '100%',
    height: 100,
    marginTop: 10,
    marginBottom: 20,
  },
  errorContainer: {
    backgroundColor: 'rgba(239,68,68,0.05)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 13,
    color: AdminColors.textMuted,
  },
  retryText: {
    fontSize: 13,
    color: AdminColors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
});
