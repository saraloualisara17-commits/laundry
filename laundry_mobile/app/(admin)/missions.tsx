import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Linking, Platform,
  Modal, TextInput, ScrollView, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { adminApi } from '../../src/services/adminApi';
import { AdminColors, AdminShadows } from '../../constants/AdminColors';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../src/store/store';
import { formatOrderItemsSummary } from '../../src/utils/orderSummary';
import DeliveryConfirmModal from '../../components/orders/modals/DeliveryConfirmModal';

// --- Constants ---
const C = {
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  primary: '#0D7377',
};

// --- Helpers ---
function openMapsNavigation(lat?: any, lng?: any, address?: string) {
  const url = Platform.select({
    ios: lat && lng
      ? `maps://?daddr=${lat},${lng}`
      : `maps://?daddr=${encodeURIComponent(address || '')}`,
    android: lat && lng
      ? `geo:${lat},${lng}?q=${lat},${lng}`
      : `geo:0,0?q=${encodeURIComponent(address || '')}`,
  });
  Linking.openURL(url || '').catch(() =>
    Linking.openURL(`https://maps.google.com/?daddr=${lat},${lng}`)
  );
}

export default function AdminMissionsScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [activeTab, setActiveTab] = useState<'delivery' | 'pickup'>('pickup');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);

  // Modals state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  
  // Payment states
  const [collectedAmount, setCollectedAmount] = useState('0');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [sharingAction, setSharingAction] = useState<'whatsapp' | 'print' | null>(null);

  const fetchMissions = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const res = await adminApi.getOrders({
        size: 100,
        livreurId: user.id,
      });
      setOrders(res.data.content || []);
    } catch (e) {
      console.error('Fetch admin missions error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchMissions();
    }, [fetchMissions])
  );

  const filteredMissions = useMemo(() => {
    return orders.filter(o => {
      if (activeTab === 'pickup') return o.status === 'PENDING_PICKUP';
      // Delivery tab: only show READY_FOR_DELIVERY orders where no other driver
      // has been assigned, OR the admin assigned it to themselves.
      if (o.status !== 'READY_FOR_DELIVERY') return false;
      const assignedDriverId = o.deliveryDriver?.id;
      return !assignedDriverId || Number(assignedDriverId) === Number(user?.id);
    });
  }, [orders, activeTab, user?.id]);

  const stats = useMemo(() => {
    return {
      pickups: orders.filter(o => o.status === 'PENDING_PICKUP').length,
      deliveries: orders.filter(o => {
        if (o.status !== 'READY_FOR_DELIVERY') return false;
        const assignedDriverId = o.deliveryDriver?.id;
        return !assignedDriverId || Number(assignedDriverId) === Number(user?.id);
      }).length,
    };
  }, [orders, user?.id]);

  const handleStatusUpdate = async (orderId: number, status: string, extraData?: any) => {
    try {
      setUpdating(true);
      const res = await adminApi.updateOrderStatus(orderId, status, extraData);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Close payment modal if open
      setShowPaymentModal(false);
      
      // Fetch the updated order data to pass to the receipt modal
      const updatedOrder = res.data.data || res.data;
      setSelectedOrder(updatedOrder);
      setShowReceiptModal(true);
      
      fetchMissions();
    } catch (e) {
      Alert.alert(t('common.error'), t('livreur.action_failed'));
    } finally {
      setUpdating(false);
    }
  };

  const handleShareWhatsApp = async () => {
    if (!selectedOrder) return;
    setSharingAction('whatsapp');
    try {
      const isDelivery = selectedOrder.status === 'DELIVERED';
      const pdfUrl = isDelivery 
        ? adminApi.getDeliveryPdfUrl(selectedOrder.id)
        : adminApi.getOrderPdfUrl(selectedOrder.id);
        
      const localUri = `${FileSystem.cacheDirectory}recu_${selectedOrder.id}.pdf`;
      
      const { store } = require('../../src/store/store');
      const token = store.getState().auth.token;
      
      const download = await FileSystem.downloadAsync(pdfUrl, localUri, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      if (download.status !== 200) throw new Error('Download failed');

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert(t('common.error'), t('admin.orders.create.confirmation.sharing_not_available'));
        return;
      }

      await Sharing.shareAsync(download.uri, {
        mimeType: 'application/pdf',
        dialogTitle: `${t('admin.orders.create.confirmation.send_receipt')} #${selectedOrder.numeroCommande}`,
        UTI: 'com.adobe.pdf',
      });
      setShowReceiptModal(false);
    } catch (e) {
      Alert.alert(t('common.error'), t('common.error_msg'));
    } finally {
      setSharingAction(null);
    }
  };

  const handlePrintReceipt = async () => {
    if (!selectedOrder) return;
    setSharingAction('print');
    try {
      const isDelivery = selectedOrder.status === 'DELIVERED';
      const pdfUrl = isDelivery 
        ? adminApi.getDeliveryPdfUrl(selectedOrder.id)
        : adminApi.getOrderPdfUrl(selectedOrder.id);
        
      const localUri = `${FileSystem.cacheDirectory}receipt_${selectedOrder.id}.pdf`;
      
      const { store } = require('../../src/store/store');
      const token = store.getState().auth.token;
      
      const download = await FileSystem.downloadAsync(pdfUrl, localUri, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      if (download.status !== 200) {
        console.error('Print download failed with status:', download.status, 'URL:', pdfUrl);
        throw new Error(`Download failed: ${download.status}`);
      }

      await Print.printAsync({ uri: download.uri });
      setShowReceiptModal(false);
    } catch (e) {
      console.error('Admin print error:', e);
      Alert.alert(t('common.error'), t('livreur.print_failed'));
    } finally {
      setSharingAction(null);
    }
  };

  const renderMissionCard = ({ item }: { item: any }) => {
    const addr = item.clientAddress || item.client?.addresses?.[0]?.address;
    const phone = item.clientPhone || item.client?.phones?.[0]?.phoneNumber;
    const isPickup = item.status === 'PENDING_PICKUP';
    
    const itemsSummary = formatOrderItemsSummary(item.commandeTapis, t);

    return (
      <View style={styles.cardContainer}>
        <View style={[styles.card, { borderLeftColor: isPickup ? C.warning : C.success }, isArabic && { borderLeftWidth: 0, borderRightWidth: 5, borderRightColor: isPickup ? C.warning : C.success }]}>
          <TouchableOpacity 
            style={styles.cardTop} 
            onPress={() => router.push(`/order/${item.id}`)}
            activeOpacity={0.7}
          >
            <View style={[styles.cardHeaderRow, isArabic && { flexDirection: 'row-reverse' }]}>
              <Text style={styles.cardRef}>#{item.numeroCommande}</Text>
              <View style={[styles.cardHeaderRight, isArabic && { flexDirection: 'row-reverse' }]}>
                {item.montantTotal > 0 && (
                  <Text style={styles.cardPrice}>{item.montantTotal} {t('common.dh')}</Text>
                )}
                <View style={[styles.typeBadge, { backgroundColor: isPickup ? '#FFFBEB' : '#ECFDF5' }]}>
                  <Text style={[styles.typeBadgeText, { color: isPickup ? '#B45309' : '#059669' }]}>
                    {isPickup ? t('status.PENDING_PICKUP') : t('status.READY_FOR_DELIVERY')}
                  </Text>
                </View>
              </View>
            </View>
            
            <Text style={[styles.cardClient, isArabic && { textAlign: 'right' }]}>{item.clientName || item.client?.name}</Text>
            
            <View style={[styles.infoRowSmall, isArabic && { flexDirection: 'row-reverse' }]}>
              <Ionicons name="cube-outline" size={14} color={AdminColors.textSecondary} />
              <Text style={styles.infoTextSmall}>{itemsSummary}</Text>
            </View>

            {addr && (
              <View style={[styles.addressRow, isArabic && { flexDirection: 'row-reverse' }]}>
                <Ionicons name="location-outline" size={14} color={AdminColors.textMuted} />
                <Text style={[styles.cardAddress, isArabic && { textAlign: 'right' }]} numberOfLines={1}>{addr}</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.actionsBox}>
            <View style={[styles.utilRow, isArabic && { flexDirection: 'row-reverse' }]}>
              <TouchableOpacity
                style={[styles.utilBtn, { backgroundColor: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.1)' }]}
                onPress={() => phone && Linking.openURL(`tel:${phone}`)}
              >
                <Ionicons name="call" size={18} color={C.success} />
                <Text style={[styles.utilBtnText, { color: C.success }]}>{t('common.call')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.utilBtn, { backgroundColor: 'rgba(13,115,119,0.08)', borderColor: 'rgba(13,115,119,0.1)' }]}
                onPress={() => openMapsNavigation(item.clientLatitude, item.clientLongitude, addr)}
              >
                <Ionicons name="navigate" size={18} color={AdminColors.primary} />
                <Text style={[styles.utilBtnText, { color: AdminColors.primary }]}>{t('common.navigate')}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.mainActionBtn, { backgroundColor: isPickup ? C.warning : C.success }]}
              onPress={() => {
                setSelectedOrder(item);
                if (isPickup) {
                   handleStatusUpdate(item.id, 'PICKED_UP');
                } else {
                   setCollectedAmount(String(item.montantRestant || 0));
                   setDeliveryNotes('');
                   setShowPaymentModal(true);
                }
              }}
              disabled={updating}
            >
              {updating && selectedOrder?.id === item.id ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.mainActionText}>
                  {isPickup ? t('livreur.collect_btn') : t('livreur.deliver_btn')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={[styles.header, isArabic && { flexDirection: 'row-reverse' }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name={isArabic ? "arrow-forward" : "arrow-back"} size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('livreur.map_title', { defaultValue: 'Ma Tournée' })}</Text>
          <TouchableOpacity 
            style={styles.mapBtn} 
            onPress={() => router.push({ pathname: '/(admin)/all-orders-map', params: { livreurId: user.id } })}
          >
            <Ionicons name="map-outline" size={22} color="white" />
          </TouchableOpacity>
        </View>

        <View style={[styles.tabsContainer, isArabic && { flexDirection: 'row-reverse' }]}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'pickup' && styles.tabActive]}
            onPress={() => setActiveTab('pickup')}
          >
            <Ionicons name="cube-outline" size={20} color={activeTab === 'pickup' ? 'white' : 'rgba(255,255,255,0.6)'} />
            <Text style={[styles.tabText, activeTab === 'pickup' && styles.tabTextActive]}>{t('livreur.pickups_tab')}</Text>
            {stats.pickups > 0 && (
              <View style={styles.tabBadge}>
                <Text style={stats.pickups > 99 ? [styles.tabBadgeText, { fontSize: 8 }] : styles.tabBadgeText}>{stats.pickups}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'delivery' && styles.tabActive]}
            onPress={() => setActiveTab('delivery')}
          >
            <Ionicons name="car-outline" size={20} color={activeTab === 'delivery' ? 'white' : 'rgba(255,255,255,0.6)'} />
            <Text style={[styles.tabText, activeTab === 'delivery' && styles.tabTextActive]}>{t('livreur.deliveries_tab')}</Text>
            {stats.deliveries > 0 && (
              <View style={styles.tabBadge}>
                <Text style={stats.deliveries > 99 ? [styles.tabBadgeText, { fontSize: 8 }] : styles.tabBadgeText}>{stats.deliveries}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <FlatList
        data={filteredMissions}
        renderItem={renderMissionCard}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={{ paddingVertical: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMissions(); }} tintColor={AdminColors.primary} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Ionicons name={activeTab === 'pickup' ? "checkmark-circle-outline" : "star-outline"} size={80} color="#E2E8F0" />
              <Text style={styles.emptyTitle}>{activeTab === 'pickup' ? t('livreur.no_pickup') : t('livreur.no_delivery')}</Text>
              <Text style={styles.emptySub}>{t('livreur.all_done')}</Text>
            </View>
          ) : (
            <ActivityIndicator size="large" color={AdminColors.primary} style={{ marginTop: 50 }} />
          )
        }
      />

      {/* --- Delivery Confirmation Modal --- */}
      {selectedOrder && (
        <DeliveryConfirmModal
          visible={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onConfirm={() => handleStatusUpdate(selectedOrder.id, 'DELIVERED', { 
            amount: parseFloat(collectedAmount), 
            notesPaiement: deliveryNotes 
          })}
          totalAmount={selectedOrder.montantTotal || 0}
          collectedAmount={collectedAmount}
          setCollectedAmount={setCollectedAmount}
          deliveryNotes={deliveryNotes}
          setDeliveryNotes={setDeliveryNotes}
          confirmingDelivery={updating}
          isArabic={isArabic}
          t={t}
        />
      )}

      {/* --- Receipt Actions Modal (Success Modal) --- */}
      <Modal visible={showReceiptModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowReceiptModal(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            
            <View style={styles.successIconBox}>
              <Ionicons name="checkmark-circle" size={60} color={C.success} />
            </View>
            
            <Text style={styles.receiptTitle}>
              {selectedOrder?.status === 'PICKED_UP' 
                ? t('livreur.confirm_pickup_title', { defaultValue: 'Collecte confirmée !' })
                : t('livreur.confirm_delivery_title', { defaultValue: 'Livraison confirmée !' })
              }
            </Text>
            
            <Text style={styles.receiptSub}>
              {t('livreur.send_receipt_prompt', { defaultValue: 'Voulez-vous envoyer le reçu au client ?' })}
            </Text>

            <View style={styles.receiptActions}>
              <TouchableOpacity 
                style={[styles.receiptBtn, { backgroundColor: '#E8F5E9' }]} 
                onPress={handleShareWhatsApp}
                disabled={!!sharingAction}
              >
                {sharingAction === 'whatsapp' ? <ActivityIndicator color="#2E7D32" /> : (
                  <>
                    <Ionicons name="logo-whatsapp" size={24} color="#2E7D32" />
                    <Text style={[styles.receiptBtnText, { color: '#2E7D32' }]}>WhatsApp</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.receiptBtn, { backgroundColor: '#F3E5F5' }]} 
                onPress={handlePrintReceipt}
                disabled={!!sharingAction}
              >
                {sharingAction === 'print' ? <ActivityIndicator color="#7B1FA2" /> : (
                  <>
                    <Ionicons name="print" size={24} color="#7B1FA2" />
                    <Text style={[styles.receiptBtnText, { color: '#7B1FA2' }]}>{t('common.print')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.closeModalBtn} 
              onPress={() => setShowReceiptModal(false)}
            >
              <Text style={styles.closeModalText}>{t('common.done', { defaultValue: 'Terminé' })}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerSafe: { backgroundColor: AdminColors.primary, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: 'white' },
  mapBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12 },
  
  tabsContainer: { flexDirection: 'row', padding: 12, gap: 12 },
  tab: {
    flex: 1, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    position: 'relative',
  },
  tabActive: { backgroundColor: 'white' },
  tabText: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  tabTextActive: { color: AdminColors.primary },
  tabBadge: {
    position: 'absolute', top: -6, right: -6, minWidth: 20, height: 20,
    borderRadius: 10, backgroundColor: C.danger, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: AdminColors.primary,
  },
  tabBadgeText: { fontSize: 10, fontWeight: '800', color: 'white' },

  cardContainer: { paddingHorizontal: 16, marginBottom: 14 },
  card: { backgroundColor: 'white', borderRadius: 20, borderLeftWidth: 5, ...AdminShadows.shadowMedium, overflow: 'hidden' },
  cardTop: { padding: 16 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardPrice: { fontSize: 14, fontWeight: '800', color: AdminColors.primary },
  cardRef: { fontSize: 12, fontWeight: '700', color: AdminColors.textMuted },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  typeBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  cardClient: { fontSize: 18, fontWeight: '800', color: AdminColors.textPrimary, marginBottom: 4 },
  infoRowSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  infoTextSmall: {
    fontSize: 13,
    color: AdminColors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardAddress: { fontSize: 13, color: AdminColors.textSecondary, flex: 1 },
  
  divider: { height: 1, backgroundColor: '#F1F5F9' },
  
  actionsBox: { padding: 16, gap: 12 },
  utilRow: { flexDirection: 'row', gap: 10 },
  utilBtn: {
    flex: 1, height: 44, borderRadius: 12, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  utilBtnText: { fontSize: 13, fontWeight: '700' },
  mainActionBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', ...AdminShadows.shadowSmall },
  mainActionText: { fontSize: 15, fontWeight: '800', color: 'white' },

  emptyState: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: AdminColors.textPrimary, marginTop: 16 },
  emptySub: { fontSize: 15, color: AdminColors.textMuted, marginTop: 4, textAlign: 'center' },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,18,25,0.6)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 10, alignSelf: 'center', marginBottom: 20 },
  successIconBox: { alignItems: 'center', marginBottom: 12 },
  receiptTitle: { fontSize: 22, fontWeight: '800', color: AdminColors.textPrimary, textAlign: 'center', marginBottom: 8 },
  receiptSub: { fontSize: 15, color: AdminColors.textSecondary, textAlign: 'center', marginBottom: 32 },
  receiptActions: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  receiptBtn: { flex: 1, height: 80, borderRadius: 20, alignItems: 'center', justifyContent: 'center', gap: 8, ...AdminShadows.shadowSmall },
  receiptBtnText: { fontSize: 13, fontWeight: '700' },
  closeModalBtn: { height: 56, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  closeModalText: { fontSize: 16, fontWeight: '700', color: AdminColors.textSecondary },
});
