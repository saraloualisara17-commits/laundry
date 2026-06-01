import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Linking, Alert
} from 'react-native';
import { row } from '../../src/utils/rtl';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { adminApi } from '../../src/services/adminApi';
import { AdminColors, AdminShadows } from '../../constants/AdminColors';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { useTranslation } from 'react-i18next';
import { useFormStyles } from '../../src/hooks/useFormStyles';
import { StatusColors } from '../../constants/StatusColors';
import { logger } from '../../src/lib/logger';

const log = logger.ns('livreur-unpaid');

export default function LivreurUnpaidScreen() {
  const { t } = useTranslation();
  const f = useFormStyles();
  const isArabic = f.isArabic;
  const [activeTab, setActiveTab] = useState<'client' | 'commande'>('client');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overview, setOverview] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const overviewRes = await adminApi.getUnpaidOverview();
      setOverview(overviewRes.data);
      if (activeTab === 'client') {
        const r = await adminApi.getClientDebtList();
        setClients(r.data);
      } else {
        const r = await adminApi.getAllUnpaidOrders();
        setOrders(r.data);
      }
    } catch (e) {
      log.error('Livreur unpaid error', { err: String(e) });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchData(); }, [activeTab]);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, [fetchData]);

  const openWhatsApp = useCallback(async (phone: string, name: string, amount: number, count: number) => {
    if (!phone) return;
    let waPhone = phone.startsWith('0') ? '212' + phone.slice(1).replace(/\D/g, '') : phone.replace(/\D/g, '');
    const text = t('admin.unpaid.whatsapp_msg', { clientName: name, amount, orderCount: count });
    try {
      await Linking.openURL(`https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`);
    } catch {
      Alert.alert(t('common.error'), t('admin.unpaid.whatsapp_error'));
    }
  }, [t]);

  const getDebtColor = useCallback((amount: number) => {
    if (amount > 1000) return { main: '#EF4444', bg: 'rgba(239,68,68,0.12)' };
    if (amount >= 200) return { main: '#F59E0B', bg: 'rgba(245,158,11,0.12)' };
    return { main: AdminColors.accent, bg: 'rgba(201,168,76,0.12)' };
  }, []);

  const renderClient = useCallback(({ item }: { item: any }) => {
    const dc = getDebtColor(item.totalRemaining);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push({ pathname: '/(admin)/client-debt-detail', params: { clientId: item.clientId, clientName: item.clientName } })}
      >
        <View style={[isArabic ? styles.accentAr : styles.accent, { backgroundColor: dc.main }]} />
        <View style={[styles.cardTop, row(isArabic)]}>
          <View style={[styles.avatar, { backgroundColor: dc.bg, borderColor: dc.main }]}>
            <Text style={[styles.avatarText, { color: dc.main }]}>
              {item.clientName?.charAt(0)?.toUpperCase()}
            </Text>
          </View>
          <View style={[styles.clientInfo, isArabic && { alignItems: 'flex-end', marginLeft: 0, marginRight: 12 }]}>
            <Text style={[styles.clientName, isArabic && { textAlign: 'right' }]}>{item.clientName}</Text>
            {item.clientPhone ? (
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.clientPhone}`)}>
                <Text style={styles.clientPhone}>{item.clientPhone}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.clientPhone}>{t('admin.clients.no_phone')}</Text>
            )}
          </View>
          <View style={isArabic && { alignItems: 'flex-start' }}>
            <Text style={[styles.debtAmount, { color: dc.main }]}>{item.totalRemaining} {t('common.dh')}</Text>
            <Text style={styles.orderCount}>{item.orderCount} {t('dashboard.orders')}</Text>
          </View>
        </View>
        <View style={[styles.footer, row(isArabic)]}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => openWhatsApp(item.clientPhone, item.clientName, item.totalRemaining, item.orderCount)}
          >
            <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
            <Text style={styles.actionText}>{t('admin.unpaid.remind')}</Text>
          </TouchableOpacity>
          <View style={styles.footerDiv} />
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push({ pathname: '/(admin)/client-debt-detail', params: { clientId: item.clientId, clientName: item.clientName } })}
          >
            <Ionicons name="list" size={16} color={AdminColors.primary} />
            <Text style={[styles.actionText, { color: AdminColors.primary }]}>{t('common.details')}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }, [isArabic, t, getDebtColor, openWhatsApp]);

  const renderOrder = useCallback(({ item }: { item: any }) => {
    const statusDot = (StatusColors[item.status] || { dot: '#94A3B8' }).dot;
    return (
    <TouchableOpacity style={styles.orderCard} onPress={() => router.push(`/order/${item.orderId}`)}>
      <View style={[styles.orderHeader, row(isArabic)]}>
        <View>
          <Text style={[styles.orderRef, isArabic && { textAlign: 'right' }, { color: statusDot, fontSize: 17, fontWeight: '800' }]}>#{item.orderId}</Text>
          <Text style={[styles.orderClient, isArabic && { textAlign: 'right' }]}>{item.clientName}</Text>
        </View>
        <StatusBadge status={item.status} />
      </View>
      <View style={[styles.financials, row(isArabic)]}>
        <View style={styles.finCol}>
          <Text style={[styles.finLabel, f.chipLabel]}>{t('common.total')}</Text>
          <Text style={styles.finValue}>{item.montantTotal} {t('common.dh')}</Text>
        </View>
        <View style={styles.finCol}>
          <Text style={[styles.finLabel, f.chipLabel]}>{t('financial.paid')}</Text>
          <Text style={[styles.finValue, { color: AdminColors.success }]}>{item.montantPaye || 0} {t('common.dh')}</Text>
        </View>
        <View style={styles.finCol}>
          <Text style={[styles.finLabel, f.chipLabel]}>{t('financial.remaining')}</Text>
          <Text style={[styles.finValue, { color: AdminColors.danger }]}>{item.montantRestant} {t('common.dh')}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
  }, [isArabic, t, f]);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <Text style={styles.headerTitle}>{t('dashboard.unpaid_balance')}</Text>

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
          <TouchableOpacity style={[styles.tab, activeTab === 'client' && styles.tabActive]} onPress={() => setActiveTab('client')}>
            <Text style={[styles.tabText, activeTab === 'client' && styles.tabTextActive]}>{t('tabs.clients')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'commande' && styles.tabActive]} onPress={() => setActiveTab('commande')}>
            <Text style={[styles.tabText, activeTab === 'commande' && styles.tabTextActive]}>{t('dashboard.orders')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <FlatList
        data={activeTab === 'client' ? clients : orders}
        renderItem={activeTab === 'client' ? renderClient : renderOrder}
        keyExtractor={(item, i) => activeTab === 'client' ? item.clientId?.toString() || i.toString() : item.orderId?.toString() || i.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AdminColors.primary} />}
        ListEmptyComponent={
          loading
            ? <ActivityIndicator style={{ marginTop: 40 }} color={AdminColors.primary} />
            : (
              <View style={styles.emptyBox}>
                <Text style={{ fontSize: 44 }}>🎉</Text>
                <Text style={styles.emptyTitle}>{t('dashboard.all_settled')}</Text>
              </View>
            )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  header: { backgroundColor: 'white', ...AdminShadows.shadowSmall, paddingBottom: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: AdminColors.textPrimary, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  summaryBox: {
    flexDirection: 'row', backgroundColor: AdminColors.primary,
    marginHorizontal: 16, borderRadius: 14, padding: 18, marginBottom: 14, ...AdminShadows.shadowMedium,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 20, fontWeight: '800', color: 'white', marginBottom: 4 },
  summaryLabel: { fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
  summaryDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 8 },
  tab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10, backgroundColor: '#F1F5F9' },
  tabActive: { backgroundColor: AdminColors.primary100 },
  tabText: { fontSize: 13, fontWeight: '600', color: AdminColors.textSecondary },
  tabTextActive: { color: AdminColors.primary },
  list: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: 'white', borderRadius: 14, marginBottom: 10, ...AdminShadows.shadowSmall, overflow: 'hidden' },
  accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  accentAr: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 4 },
  cardTop: { flexDirection: 'row', padding: 14, alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800' },
  clientInfo: { flex: 1, marginStart: 10 },
  clientName: { fontSize: 15, fontWeight: '700', color: AdminColors.textPrimary },
  clientPhone: { fontSize: 12, color: AdminColors.textMuted, marginTop: 2 },
  debtAmount: { fontSize: 16, fontWeight: '800', textAlign: 'right' },
  orderCount: { fontSize: 11, color: AdminColors.textSecondary, textAlign: 'right', marginTop: 2 },
  footer: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F1F5F9', backgroundColor: '#F8FAFC' },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 11, gap: 6 },
  actionText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  footerDiv: { width: 1, backgroundColor: '#F1F5F9' },
  orderCard: { backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 10, ...AdminShadows.shadowSmall },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  orderRef: { fontSize: 13, fontWeight: '700', color: AdminColors.textPrimary },
  orderClient: { fontSize: 12, color: AdminColors.textMuted, marginTop: 2 },
  financials: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 8, padding: 10, gap: 10 },
  finCol: { flex: 1 },
  finLabel: { fontSize: 9, color: AdminColors.textMuted, fontWeight: '600', marginBottom: 3 },
  finValue: { fontSize: 13, fontWeight: '700', color: AdminColors.textPrimary },
  emptyBox: { alignItems: 'center', marginTop: 70, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: AdminColors.textPrimary },
});
