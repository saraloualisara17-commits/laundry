import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { adminApi } from '../../src/services/adminApi';
import { AdminColors, AdminShadows } from '../../constants/AdminColors';
import { StatusBadge } from '../../components/admin/StatusBadge';

export default function UnpaidOrdersScreen() {
  const [activeTab, setActiveTab] = useState<'client' | 'commande'>('client');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [overview, setOverview] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const overviewRes = await adminApi.getUnpaidOverview();
      setOverview(overviewRes.data);
      
      if (activeTab === 'client') {
        const clientsRes = await adminApi.getClientDebtList();
        setClients(clientsRes.data);
      } else {
        const ordersRes = await adminApi.getAllUnpaidOrders();
        setOrders(ordersRes.data);
      }
    } catch (error) {
      console.error('Error fetching unpaid data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [activeTab]);

  const openWhatsApp = async (phone: string, clientName: string, amount: number, orderCount: number) => {
    if (!phone) return;
    
    // Format phone for WhatsApp wa.me (digits only)
    let waPhone = phone.replace(/\D/g, '');
    if (phone.startsWith('0')) {
      waPhone = '212' + phone.slice(1).replace(/\D/g, '');
    }
    
    const text = `Bonjour ${clientName},\nVous avez un solde restant de ${amount} DH sur ${orderCount} commande(s).\nMerci de régulariser votre situation.`;
    const encodedText = encodeURIComponent(text);
    
    try {
      await Linking.openURL(`https://wa.me/${waPhone}?text=${encodedText}`);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible d\'ouvrir WhatsApp');
    }
  };

  const getDebtColorLevel = (amount: number) => {
    if (amount > 1000) return { main: '#EF4444', bg: 'rgba(239,68,68,0.15)' };
    if (amount >= 200) return { main: '#F59E0B', bg: 'rgba(245,158,11,0.15)' };
    return { main: '#C9A84C', bg: 'rgba(201,168,76,0.15)' };
  };

  const renderClientCard = ({ item }: { item: any }) => {
    const debtColor = getDebtColorLevel(item.totalRemaining);
    
    return (
      <View style={styles.clientCard}>
        <View style={[styles.accentBar, { backgroundColor: debtColor.main }]} />
        
        <View style={styles.clientTop}>
          <View style={[styles.avatar, { backgroundColor: debtColor.bg, borderColor: debtColor.main }]}>
            <Text style={[styles.avatarText, { color: debtColor.main }]}>
              {item.clientName?.charAt(0)?.toUpperCase()}
            </Text>
          </View>
          
          <View style={styles.clientInfo}>
            <Text style={styles.clientName}>{item.clientName}</Text>
            {item.clientPhone ? (
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.clientPhone}`)}>
                <Text style={styles.clientPhone}>{item.clientPhone}</Text>
              </TouchableOpacity>
            ) : null}
            <Text style={styles.clientOrderCount}>
              {item.orderCount} commande(s) impayée(s)
            </Text>
          </View>
          
          <View style={styles.clientAmount}>
            <Text style={[styles.amountValue, { color: debtColor.main }]}>
              {item.totalRemaining} DH
            </Text>
            <Text style={styles.amountLabel}>restant</Text>
          </View>
        </View>

        <View style={styles.financialBreakdown}>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>Total commandé</Text>
            <Text style={styles.finValuePrimary}>{item.totalAmount} DH</Text>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>Déjà payé</Text>
            <Text style={styles.finValueSuccess}>{item.totalPaid} DH</Text>
          </View>
          <View style={[styles.finRow, styles.finRowTopBorder]}>
            <Text style={styles.finLabelBold}>Reste à payer</Text>
            <Text style={styles.finValueDanger}>{item.totalRemaining} DH</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          {item.clientPhone && (
            <TouchableOpacity 
              style={styles.waBtn}
              onPress={() => openWhatsApp(item.clientPhone, item.clientName, item.totalRemaining, item.orderCount)}
            >
              <Text style={styles.waBtnText}>💬 WhatsApp</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.detailsBtn}
            onPress={() => router.push({
              pathname: '/(admin)/client-debt-detail',
              params: { clientId: item.clientId, clientName: item.clientName }
            })}
          >
            <Text style={styles.detailsBtnText}>Voir détails →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderOrderCard = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.orderCard}
      onPress={() => router.push(`/order/${item.orderId}`)}
      activeOpacity={0.7}
    >
      <View style={[styles.accentBar, { backgroundColor: AdminColors.danger }]} />
      
      <View style={styles.orderTop}>
        <Text style={styles.orderRef}>#{item.reference}</Text>
        <View style={styles.remainingBadge}>
          <Text style={styles.remainingBadgeText}>{item.montantRestant} DH restant</Text>
        </View>
      </View>
      
      <Text style={styles.orderClientName}>{item.livreurName ? `Livré par: ${item.livreurName}` : 'Sans livreur'}</Text>
      
      <View style={{ alignSelf: 'flex-start', marginTop: 4 }}>
        <StatusBadge status={item.status} />
      </View>
      
      <View style={styles.orderFinRow}>
        <View style={styles.orderFinCol}>
          <Text style={styles.orderFinLabel}>Total</Text>
          <Text style={styles.orderFinValue}>{item.montantTotal} DH</Text>
        </View>
        <View style={styles.orderFinCol}>
          <Text style={styles.orderFinLabel}>Payé</Text>
          <Text style={styles.orderFinSuccess}>{item.montantPaye} DH</Text>
        </View>
        <View style={styles.orderFinCol}>
          <Text style={styles.orderFinLabel}>Reste</Text>
          <Text style={styles.orderFinDanger}>{item.montantRestant} DH</Text>
        </View>
      </View>
      
      <Text style={styles.orderDate}>
        Créée le {new Date(item.dateCreation).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={AdminColors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.headerTitle}>Impayés</Text>
          <Text style={{ fontSize: 11, color: AdminColors.textSecondary }}>Commandes livrées avec solde restant</Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>
            {overview?.totalRemaining || 0} DH
          </Text>
        </View>
      </View>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>CLIENTS</Text>
            <Text style={styles.summaryDangerValue}>{overview?.clientsWithDebt || 0}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>COMMANDES</Text>
            <Text style={styles.summaryWarningValue}>{overview?.totalOrders || 0}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>TOTAL DÛ</Text>
            <Text style={styles.summaryLargeDangerValue}>{overview?.totalRemaining || 0} DH</Text>
          </View>
        </View>
        
        <View style={styles.summaryHDivider} />
        
        <View style={styles.summaryBottom}>
          <Text style={styles.summaryBottomText}>Total facturé : {overview?.totalAmount || 0} DH</Text>
          <Text style={styles.summaryBottomSuccess}>Total encaissé : {overview?.totalPaid || 0} DH</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'client' && styles.activeTab]}
          onPress={() => setActiveTab('client')}
        >
          <Text style={[styles.tabText, activeTab === 'client' && styles.activeTabText]}>Par client</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'commande' && styles.activeTab]}
          onPress={() => setActiveTab('commande')}
        >
          <Text style={[styles.tabText, activeTab === 'commande' && styles.activeTabText]}>Par commande</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={AdminColors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={activeTab === 'client' ? clients : orders}
          keyExtractor={(item) => (activeTab === 'client' ? item.clientId.toString() : item.orderId.toString())}
          renderItem={activeTab === 'client' ? renderClientCard : renderOrderCard}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AdminColors.primary} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 60, paddingHorizontal: 40 }}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>🎉</Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: AdminColors.textPrimary, textAlign: 'center' }}>
                Tous les paiements sont à jour
              </Text>
              <Text style={{ fontSize: 14, color: AdminColors.textSecondary, textAlign: 'center', marginTop: 8 }}>
                Aucune commande livrée avec solde impayé
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    ...AdminShadows.shadowSmall,
    zIndex: 10,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AdminColors.textPrimary,
  },
  headerBadge: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  headerBadgeText: {
    color: AdminColors.danger,
    fontWeight: '700',
    fontSize: 13,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    margin: 16,
    padding: 16,
    ...AdminShadows.shadowSmall,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: AdminColors.textSecondary,
    marginBottom: 4,
  },
  summaryDangerValue: {
    fontSize: 18,
    fontWeight: '700',
    color: AdminColors.danger,
  },
  summaryWarningValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F59E0B',
  },
  summaryLargeDangerValue: {
    fontSize: 20,
    fontWeight: '800',
    color: AdminColors.danger,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  summaryHDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginVertical: 12,
  },
  summaryBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryBottomText: {
    fontSize: 12,
    color: AdminColors.textPrimary,
    fontWeight: '500',
  },
  summaryBottomSuccess: {
    fontSize: 12,
    color: AdminColors.success,
    fontWeight: '500',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 4,
    ...AdminShadows.shadowSmall,
  },
  tab: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: AdminColors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: AdminColors.textMuted,
  },
  activeTabText: {
    color: 'white',
  },
  listContainer: {
    paddingBottom: 24,
  },
  clientCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 18,
    position: 'relative',
    overflow: 'hidden',
    ...AdminShadows.shadowSmall,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  clientTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  clientInfo: {
    flex: 1,
    marginLeft: 12,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '700',
    color: AdminColors.textPrimary,
  },
  clientPhone: {
    fontSize: 13,
    color: AdminColors.primary,
    marginTop: 2,
  },
  clientOrderCount: {
    fontSize: 12,
    color: AdminColors.textMuted,
    marginTop: 4,
  },
  clientAmount: {
    alignItems: 'flex-end',
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  amountLabel: {
    fontSize: 11,
    color: AdminColors.textMuted,
    marginTop: 2,
  },
  financialBreakdown: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  finRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  finRowTopBorder: {
    borderTopWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    marginTop: 4,
    paddingTop: 8,
  },
  finLabel: {
    fontSize: 13,
    color: AdminColors.textSecondary,
  },
  finLabelBold: {
    fontSize: 13,
    fontWeight: '700',
    color: AdminColors.textPrimary,
  },
  finValuePrimary: {
    fontSize: 13,
    fontWeight: '600',
    color: AdminColors.textPrimary,
  },
  finValueSuccess: {
    fontSize: 13,
    fontWeight: '600',
    color: AdminColors.success,
  },
  finValueDanger: {
    fontSize: 14,
    fontWeight: '800',
    color: AdminColors.danger,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  waBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(37,211,102,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(37,211,102,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#25D366',
  },
  detailsBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: AdminColors.primary100,
    borderWidth: 1,
    borderColor: AdminColors.primary200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: AdminColors.primary,
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
    ...AdminShadows.shadowSmall,
  },
  orderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderRef: {
    fontSize: 12,
    fontWeight: '600',
    color: AdminColors.textMuted,
  },
  remainingBadge: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  remainingBadgeText: {
    color: AdminColors.danger,
    fontSize: 11,
    fontWeight: '700',
  },
  orderClientName: {
    fontSize: 15,
    fontWeight: '600',
    color: AdminColors.textPrimary,
  },
  orderFinRow: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  orderFinCol: {
    flex: 1,
    alignItems: 'center',
  },
  orderFinLabel: {
    fontSize: 11,
    color: AdminColors.textMuted,
    marginBottom: 2,
  },
  orderFinValue: {
    fontSize: 13,
    fontWeight: '600',
    color: AdminColors.textPrimary,
  },
  orderFinSuccess: {
    fontSize: 13,
    fontWeight: '600',
    color: AdminColors.success,
  },
  orderFinDanger: {
    fontSize: 13,
    fontWeight: '700',
    color: AdminColors.danger,
  },
  orderDate: {
    fontSize: 12,
    color: AdminColors.textMuted,
    marginTop: 10,
    textAlign: 'right',
  },
});
