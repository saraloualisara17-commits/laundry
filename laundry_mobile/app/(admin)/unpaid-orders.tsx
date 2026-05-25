import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert
} from 'react-native';
import { row, textAlign } from '../../src/utils/rtl';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { adminApi } from '../../src/services/adminApi';
import { AdminColors, AdminShadows } from '../../constants/AdminColors';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { useTranslation } from 'react-i18next';
import { formatOrderItemsSummary } from '../../src/utils/orderSummary';
import { logger } from '../../src/lib/logger';

const log = logger.ns('unpaid-orders');

export default function UnpaidOrdersScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
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
      log.error('Error fetching unpaid data', { err: String(error) });
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
    
    const text = t('admin.unpaid.whatsapp_msg', { clientName, amount, orderCount });
    const encodedText = encodeURIComponent(text);
    
    try {
      await Linking.openURL(`https://wa.me/${waPhone}?text=${encodedText}`);
    } catch (e) {
      Alert.alert(t('common.error'), t('admin.unpaid.whatsapp_error'));
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
      <TouchableOpacity 
        style={styles.clientCard}
        onPress={() => router.push({ pathname: '/(admin)/client-debt-detail', params: { clientId: item.clientId, clientName: item.clientName } })}
      >
        <View style={[isArabic ? styles.accentBarAr : styles.accentBar, { backgroundColor: debtColor.main }]} />
        
        <View style={[styles.clientTop, row(isArabic)]}>
          <View style={[styles.avatar, { backgroundColor: debtColor.bg, borderColor: debtColor.main }]}>
            <Text style={[styles.avatarText, { color: debtColor.main }]}>
              {item.clientName?.charAt(0)?.toUpperCase()}
            </Text>
          </View>
          
          <View style={[styles.clientInfo, isArabic && { alignItems: 'flex-end', marginLeft: 0, marginRight: 12 }]}>
            <Text style={[styles.clientName, isArabic && { textAlign: 'right' }]}>{item.clientName}</Text>
            {item.clientPhone ? (
              <TouchableOpacity style={isArabic && { flexDirection: 'row-reverse', gap: 4 }} onPress={() => Linking.openURL(`tel:${item.clientPhone}`)}>
                <Text style={styles.clientPhone}>{item.clientPhone}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.clientPhone}>{t('admin.clients.no_phone')}</Text>
            )}
          </View>
          
          <View style={isArabic && { alignItems: 'flex-start' }}>
            <Text style={[styles.debtAmount, { color: debtColor.main }]}>{item.totalRemaining} {t('common.dh')}</Text>
            <Text style={[styles.orderCount, isArabic && { textAlign: 'left' }]}>{item.orderCount} {t('dashboard.orders')}</Text>
          </View>
        </View>

        <View style={[styles.cardFooter, row(isArabic)]}>
          <TouchableOpacity 
            style={[styles.actionBtn, row(isArabic)]}
            onPress={() => openWhatsApp(item.clientPhone, item.clientName, item.totalRemaining, item.orderCount)}
          >
            <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
            <Text style={styles.actionBtnText}>{t('admin.unpaid.remind')}</Text>
          </TouchableOpacity>
          
          <View style={styles.footerDivider} />
          
          <TouchableOpacity 
            style={[styles.actionBtn, row(isArabic)]}
            onPress={() => router.push({ pathname: '/(admin)/client-debt-detail', params: { clientId: item.clientId, clientName: item.clientName } })}
          >
            <Ionicons name="list" size={18} color={AdminColors.primary} />
            <Text style={[styles.actionBtnText, { color: AdminColors.primary }]}>{t('common.details')}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderOrderCard = ({ item }: { item: any }) => {
    const itemsSummary = formatOrderItemsSummary(item.commandeTapis, t);

    return (
      <TouchableOpacity 
        style={styles.orderCard}
        onPress={() => router.push(`/order/${item.orderId || item.id}`)}
      >
        <View style={[styles.orderHeader, row(isArabic)]}>
          <View>
            <Text style={[styles.orderRef, isArabic && { textAlign: 'right' }]}>#{item.reference || item.numeroCommande}</Text>
            <Text style={[styles.orderClient, isArabic && { textAlign: 'right' }]}>{item.clientName || item.clientNom || item.client?.name}</Text>
          </View>
          <StatusBadge status={item.status} />
        </View>

        <View style={[styles.infoRow, isArabic && { flexDirection: 'row-reverse', justifyContent: 'flex-start' }]}>
          <Ionicons name="cube-outline" size={14} color={AdminColors.textMuted} />
          <Text style={styles.infoText}>{itemsSummary}</Text>
        </View>
        
        <View style={[styles.orderFinancials, row(isArabic)]}>
          <View style={styles.finCol}>
            <Text style={styles.finLabel}>{t('common.total')}</Text>
            <Text style={styles.finValue}>{item.montantTotal} {t('common.dh')}</Text>
          </View>
          <View style={styles.finCol}>
            <Text style={styles.finLabel}>{t('financial.paid')}</Text>
            <Text style={[styles.finValue, { color: '#059669' }]}>{item.montantPaye || 0} {t('common.dh')}</Text>
          </View>
          <View style={styles.finCol}>
            <Text style={styles.finLabel}>{t('financial.remaining')}</Text>
            <Text style={[styles.finValue, styles.orderFinDanger]}>{item.montantRestant || item.resteAPayer} {t('common.dh')}</Text>
          </View>
        </View>
        
        <Text style={[styles.orderDate, isArabic && { textAlign: 'left' }]}>
          {new Date(item.dateCreation).toLocaleDateString(isArabic ? 'fr-FR' : 'fr-FR')}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={[styles.headerTop, row(isArabic)]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name={isArabic ? "arrow-forward" : "arrow-back"} size={24} color={AdminColors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('dashboard.unpaid_balance')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={[styles.summaryBox, row(isArabic)]}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{overview?.totalRemaining || 0} <Text style={{ fontSize: 14 }}>{t('common.dh')}</Text></Text>
            <Text style={styles.summaryLabel}>{t('dashboard.unpaid_balance')}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{overview?.clientsWithDebt || 0}</Text>
            <Text style={styles.summaryLabel}>{t('tabs.clients')}</Text>
          </View>
        </View>

        <View style={[styles.tabs, row(isArabic)]}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'client' && styles.activeTab]}
            onPress={() => setActiveTab('client')}
          >
            <Text style={[styles.tabText, activeTab === 'client' && styles.activeTabText]}>{t('tabs.clients')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'commande' && styles.activeTab]}
            onPress={() => setActiveTab('commande')}
          >
            <Text style={[styles.tabText, activeTab === 'commande' && styles.activeTabText]}>{t('dashboard.orders')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <FlatList
        data={activeTab === 'client' ? clients : orders}
        renderItem={activeTab === 'client' ? renderClientCard : renderOrderCard}
        keyExtractor={(item, index) => activeTab === 'client' ? item.clientId?.toString() || index.toString() : item.id?.toString() || index.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={AdminColors.primary} />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 48 }}>🎉</Text>
              <Text style={styles.emptyTitle}>{t('dashboard.all_settled')}</Text>
              <Text style={styles.emptySubtitle}>{t('admin.unpaid.no_unpaid_msg')}</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: 'white',
    ...AdminShadows.shadowSmall,
    paddingBottom: 4,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AdminColors.textPrimary,
  },
  summaryBox: {
    flexDirection: 'row',
    backgroundColor: AdminColors.primary,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...AdminShadows.shadowMedium,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: 'white',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  summaryDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  activeTab: {
    backgroundColor: AdminColors.primary100,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: AdminColors.textSecondary,
  },
  activeTabText: {
    color: AdminColors.primary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  clientCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 12,
    ...AdminShadows.shadowSmall,
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  accentBarAr: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  clientTop: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
  },
  clientInfo: {
    flex: 1,
    marginStart: 12,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '700',
    color: AdminColors.textPrimary,
  },
  clientPhone: {
    fontSize: 13,
    color: AdminColors.textMuted,
    marginTop: 2,
  },
  debtAmount: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'right',
  },
  orderCount: {
    fontSize: 12,
    color: AdminColors.textSecondary,
    textAlign: 'right',
    marginTop: 2,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  footerDivider: {
    width: 1,
    backgroundColor: '#F1F5F9',
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    ...AdminShadows.shadowSmall,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  orderRef: {
    fontSize: 14,
    fontWeight: '700',
    color: AdminColors.textPrimary,
  },
  orderClient: {
    fontSize: 13,
    color: AdminColors.textMuted,
    marginTop: 1,
  },
  orderFinancials: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    gap: 12,
  },
  finCol: {
    flex: 1,
  },
  finLabel: {
    fontSize: 10,
    color: AdminColors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  finValue: {
    fontSize: 13,
    fontWeight: '700',
    color: AdminColors.textPrimary,
  },
  orderFinDanger: {
    color: AdminColors.danger,
  },
  orderDate: {
    fontSize: 11,
    color: AdminColors.textMuted,
    marginTop: 12,
    textAlign: 'right',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: AdminColors.textPrimary,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: AdminColors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
});
