import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert
} from 'react-native';
import { row, textAlign } from '../../src/utils/rtl';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { adminApi } from '../../src/services/adminApi';
import { AdminColors, AdminShadows } from '../../constants/AdminColors';
import { StatusBadge } from '../../components/admin/StatusBadge';
import AddPaymentModal from '../../components/admin/AddPaymentModal';
import { useTranslation } from 'react-i18next';
import { logger } from '../../src/lib/logger';

const log = logger.ns('client-debt');

export default function ClientDebtDetailScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const { clientId, clientName } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clientData, setClientData] = useState<any>(null);
  
  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedOrderAmount, setSelectedOrderAmount] = useState<number>(0);
  const [selectedOrderRestant, setSelectedOrderRestant] = useState<number>(0);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getClientDebtDetail(clientId as string);
      setClientData(res.data);
    } catch (error: any) {
      // If we get a 404, it means the client no longer has any debt
      // which is a success state in this context.
      if (error?.status === 404) {
        setClientData(null);
        Alert.alert(
          t('common.success'),
          t('admin.unpaid.all_settled_msg'),
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        log.error('Error fetching client debt detail', { err: String(error) });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (clientId) fetchData();
  }, [clientId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [clientId]);

  const openWhatsApp = async () => {
    if (!clientData?.clientPhone) return;
    
    let waPhone = clientData.clientPhone.replace(/\D/g, '');
    if (clientData.clientPhone.startsWith('0')) {
      waPhone = '212' + clientData.clientPhone.slice(1).replace(/\D/g, '');
    }
    
    const text = t('admin.unpaid.whatsapp_msg', {
      clientName: clientData.clientName,
      amount: clientData.totalRemaining,
      orderCount: clientData.orderCount,
    });
    const encodedText = encodeURIComponent(text);
    
    try {
      await Linking.openURL(`https://wa.me/${waPhone}?text=${encodedText}`);
    } catch (e) {
      Alert.alert(t('common.error'), t('admin.unpaid.whatsapp_error'));
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    Alert.alert(
      t('common.success'),
      t('admin.unpaid.payment_recorded_msg')
    );
    fetchData();
  };

  const getDebtColorLevel = (amount: number) => {
    if (amount > 1000) return { main: '#EF4444', bg: 'rgba(239,68,68,0.15)' };
    if (amount >= 200) return { main: '#F59E0B', bg: 'rgba(245,158,11,0.15)' };
    return { main: '#C9A84C', bg: 'rgba(201,168,76,0.15)' };
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={AdminColors.primary} />
      </SafeAreaView>
    );
  }

  if (!clientData) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>{t('common.no_data')}</Text>
      </SafeAreaView>
    );
  }

  const debtColor = getDebtColorLevel(clientData.totalRemaining);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={[styles.headerTop, row(isArabic)]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name={isArabic ? "arrow-forward" : "arrow-back"} size={24} color={AdminColors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('admin.unpaid.client_details')}</Text>
          <TouchableOpacity onPress={openWhatsApp}>
            <Ionicons name="logo-whatsapp" size={26} color="#25D366" />
          </TouchableOpacity>
        </View>

        <View style={styles.clientProfileBox}>
           <View style={[styles.profileMain, row(isArabic)]}>
              <View style={[styles.avatar, { backgroundColor: debtColor.bg, borderColor: debtColor.main }]}>
                <Text style={[styles.avatarText, { color: debtColor.main }]}>{clientData.clientName.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={[styles.profileInfo, isArabic && { alignItems: 'flex-end', marginLeft: 0, marginRight: 16 }]}>
                <Text style={styles.clientNameLarge}>{clientData.clientName}</Text>
                <Text style={styles.clientPhoneLarge}>{clientData.clientPhone || t('admin.clients.no_phone')}</Text>
              </View>
           </View>

           <View style={[styles.debtStatsRow, row(isArabic)]}>
              <View style={styles.debtStat}>
                <Text style={[styles.debtStatValue, { color: debtColor.main }]}>{clientData.totalRemaining} {t('common.dh')}</Text>
                <Text style={styles.debtStatLabel}>{t('financial.remaining')}</Text>
              </View>
              <View style={styles.debtStatDivider} />
              <View style={styles.debtStat}>
                <Text style={styles.debtStatValue}>{clientData.orderCount}</Text>
                <Text style={styles.debtStatLabel}>{t('dashboard.orders')}</Text>
              </View>
           </View>
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={[styles.sectionTitle, isArabic && { textAlign: 'right' }]}>{t('admin.unpaid.unpaid_orders_list')}</Text>
        
        {clientData.orders?.map((order: any, index: number) => (
          <TouchableOpacity 
            key={order.orderId?.toString() || `order-${index}`} 
            style={styles.orderCard}
            onPress={() => router.push(`/order/${order.orderId}`)}
            activeOpacity={0.7}
          >
            <View style={[styles.orderHeader, row(isArabic)]}>
              <View>
                <Text style={[styles.orderRef, isArabic && { textAlign: 'right' }]}>#{order.reference}</Text>
                <Text style={[styles.orderDate, isArabic && { textAlign: 'right' }]}>{new Date(order.dateCreation).toLocaleDateString(isArabic ? 'fr-FR' : 'fr-FR')}</Text>
              </View>
              <StatusBadge status={order.status} />
            </View>

            <View style={[styles.financialBar, row(isArabic)]}>
               <View style={styles.finItem}>
                 <Text style={styles.finLabel}>{t('common.total')}</Text>
                 <Text style={styles.finValue}>{order.montantTotal} {t('common.dh')}</Text>
               </View>
               <View style={styles.finItem}>
                 <Text style={styles.finLabel}>{t('financial.paid')}</Text>
                 <Text style={[styles.finValue, { color: '#059669' }]}>{order.montantPaye || 0} {t('common.dh')}</Text>
               </View>
               <View style={styles.finItem}>
                 <Text style={styles.finLabel}>{t('financial.remaining')}</Text>
                 <Text style={[styles.finValue, { color: AdminColors.danger }]}>{order.montantRestant} {t('common.dh')}</Text>
               </View>
            </View>

            <TouchableOpacity 
              style={[styles.payBtn, row(isArabic)]}
              onPress={(e) => {
                e.stopPropagation();
                setSelectedOrderId(order.orderId);
                setSelectedOrderAmount(order.montantTotal);
                setSelectedOrderRestant(order.montantRestant);
                setShowPaymentModal(true);
              }}
            >
              <Ionicons name="card-outline" size={18} color="white" />
              <Text style={styles.payBtnText}>{t('admin.unpaid.pay')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selectedOrderId && (
        <AddPaymentModal
          visible={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
          orderId={selectedOrderId}
          totalAmount={selectedOrderAmount}
          remainingAmount={selectedOrderRestant}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    backgroundColor: 'white',
    ...AdminShadows.shadowSmall,
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
  clientProfileBox: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  profileMain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  clientNameLarge: {
    fontSize: 22,
    fontWeight: '800',
    color: AdminColors.textPrimary,
  },
  clientPhoneLarge: {
    fontSize: 15,
    color: AdminColors.textMuted,
    marginTop: 2,
  },
  debtStatsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  debtStat: {
    flex: 1,
    alignItems: 'center',
  },
  debtStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: AdminColors.textPrimary,
  },
  debtStatLabel: {
    fontSize: 11,
    color: AdminColors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  debtStatDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#E2E8F0',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: AdminColors.textSecondary,
    marginBottom: 16,
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...AdminShadows.shadowSmall,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  orderRef: {
    fontSize: 15,
    fontWeight: '700',
    color: AdminColors.textPrimary,
  },
  orderDate: {
    fontSize: 12,
    color: AdminColors.textMuted,
    marginTop: 2,
  },
  financialBar: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  finItem: {
    flex: 1,
    alignItems: 'center',
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
  payBtn: {
    backgroundColor: AdminColors.primary,
    borderRadius: 12,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...AdminShadows.shadowTeal,
  },
  payBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
});
