import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  RefreshControl,
  Animated
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
import { router } from 'expo-router';

interface DashboardStats {
  ordersToday: number;
  revenueToday: number;
  pendingCount: number;
  processingCount: number;
  readyCount: number;
  clientsCount: number;
}

export default function AdminDashboard() {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
        clientsCount: rawStats.totalClients || 0
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

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
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
              <Text style={styles.gridLabel}>REVENUS</Text>
              <Text style={[styles.gridValue, { color: '#E2C06E' }]}>
                {stats?.revenueToday?.toLocaleString() || 0} DH
              </Text>
            </View>
            <View style={styles.gridDivider} />
            <View style={styles.heroGridItem}>
              <Text style={styles.gridLabel}>EN ATTENTE</Text>
              <Text style={[styles.gridValue, { color: '#FCD34D' }]}>
                {stats?.pendingCount || 0}
              </Text>
            </View>
            <View style={styles.gridDivider} />
            <View style={styles.heroGridItem}>
              <Text style={styles.gridLabel}>PRÊTES</Text>
              <Text style={[styles.gridValue, { color: '#6EE7B7' }]}>
                {stats?.readyCount || 0}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions Grid */}
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
});
