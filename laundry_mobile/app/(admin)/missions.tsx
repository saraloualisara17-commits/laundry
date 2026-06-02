import React, { useState, useMemo, useCallback } from 'react';
import { randomUUID } from '../../src/utils/uuid';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Linking, Modal,
} from 'react-native';
import { row, textAlign } from '../../src/utils/rtl';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AdminColors, AdminShadows } from '../../constants/AdminColors';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { useSelector } from 'react-redux';
import { RootState } from '../../src/store/store';
import { formatOrderItemsSummary } from '../../src/utils/orderSummary';
import { useOrderCreation } from '../../src/context/OrderCreationContext';
import DeliveryConfirmModal from '../../components/orders/modals/DeliveryConfirmModal';
import ReceiptActionsModal from '../../components/orders/modals/ReceiptActionsModal';
import { useReceiptActions } from '../../src/hooks/useReceiptActions';
import { useReadyDeliveries, usePendingPickups, useUpdateOrderStatusMission } from '../../src/hooks/queries/useLivreur';
import { uploadManager } from '../../src/services/uploads';
import { openMapsNavigation } from '../../src/utils/mapsNavigation';
import { ordersApi } from '../../src/services/api';

// --- Constants ---
const C = {
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  primary: '#0D7377',
};

// ─── FailedAttemptModal ───────────────────────────────────────────────────────
function FailedAttemptModal({ visible, order, attemptType, onClose, onSuccess }: any) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const reasons = [
    { id: 'CLIENT_ABSENT',      label: t('livreur.reason_absent') },
    { id: 'CLIENT_UNREACHABLE', label: t('livreur.reason_unreachable') },
    { id: 'WRONG_ADDRESS',      label: t('livreur.reason_address') },
    { id: 'OTHER',              label: t('common.other') },
  ];

  const submit = async () => {
    if (!reason) return Alert.alert(t('common.error'), t('livreur.select_reason'));
    setLoading(true);
    try {
      await ordersApi.reportFailedAttempt(order.id, { attemptType, reason });
      onSuccess();
      onClose();
    } catch {
      Alert.alert(t('common.error'), t('livreur.action_failed'));
    } finally {
      setLoading(false);
    }
  };

  if (!order) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          <Text style={modalStyles.title}>{t('livreur.refuse_title')}</Text>
          {reasons.map(r => (
            <TouchableOpacity
              key={r.id}
              style={[modalStyles.reasonItem, reason === r.id && { borderColor: C.primary, backgroundColor: '#F0F9F9' }]}
              onPress={() => setReason(r.id)}
            >
              <Text style={[modalStyles.reasonText, reason === r.id && { color: C.primary, fontWeight: '700' }]}>{r.label}</Text>
              {reason === r.id && <Ionicons name="checkmark-circle" size={20} color={C.primary} />}
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[modalStyles.confirmBtn, { backgroundColor: C.danger, marginTop: 24 }]}
            onPress={submit}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="white" /> : <Text style={modalStyles.confirmBtnText}>{t('common.confirm')}</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={{ marginTop: 12 }} onPress={onClose}>
            <Text style={{ textAlign: 'center', color: AdminColors.textMuted }}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,18,25,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: 40 },
  title: { fontSize: 18, fontWeight: '700', color: AdminColors.textPrimary, marginBottom: 20, textAlign: 'center' },
  confirmBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  confirmBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  reasonItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 10 },
  reasonText: { fontSize: 15, color: AdminColors.textPrimary },
});

const keyById = (item: { id: any }) => String(item.id);

export default function AdminMissionsScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  
  const { user } = useSelector((state: RootState) => state.auth);
  const { clearOrder, setPickupOrderId, setOrderNotes, driverLocalImages, clearDriverLocalImages } = useOrderCreation();

  const [activeTab, setActiveTab] = useState<'delivery' | 'pickup'>('pickup');

  // Modals state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showProb, setShowProb] = useState(false);
  const [probType, setProbType] = useState<'PICKUP' | 'DELIVERY'>('PICKUP');

  // Payment states
  const [collectedAmount, setCollectedAmount] = useState('0');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  const { data: readyDeliveries = [], isLoading: loadingDeliveries, isFetching: fetchingDeliveries, refetch: refetchDeliveries } = useReadyDeliveries();
  const { data: pendingPickups = [], isLoading: loadingPickups, isFetching: fetchingPickups, refetch: refetchPickups } = usePendingPickups();
  const updateStatusMutation = useUpdateOrderStatusMission();

  const loading = loadingDeliveries || loadingPickups;
  const refreshing = (fetchingDeliveries || fetchingPickups) && !loading;

  const filteredMissions = useMemo(() => {
    if (activeTab === 'pickup') return pendingPickups;
    return readyDeliveries;
  }, [pendingPickups, readyDeliveries, activeTab]);

  const stats = useMemo(() => ({
    pickups: pendingPickups.length,
    deliveries: readyDeliveries.length,
  }), [pendingPickups, readyDeliveries]);

  const { sharingAction, handleShareWhatsApp, handlePrint } = useReceiptActions(
    selectedOrder?.id,
    selectedOrder?.status,
    selectedOrder?.numeroCommande,
    t
  );

  const handleStatusUpdate = (orderId: number, status: 'PICKED_UP' | 'DELIVERED', extraData?: any) => {
    const pendingDetailImages = [...(driverLocalImages[String(orderId)] ?? [])];
    updateStatusMutation.mutate(
      {
        orderId,
        status,
        amount: extraData?.amount,
        notesPaiement: extraData?.notesPaiement,
        paymentIdempotencyKey: status === 'DELIVERED' ? randomUUID() : undefined,
      },
      {
        onSuccess: async (res: any) => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setShowPaymentModal(false);
          const updatedOrder = res?.data ?? selectedOrder;
          setSelectedOrder(updatedOrder);

          // Upload images added on the order detail page before confirming delivery
          if (status === 'DELIVERED' && pendingDetailImages.length > 0) {
            clearDriverLocalImages(String(orderId));
            pendingDetailImages.forEach(uri => {
              uploadManager.addImage(uri, orderId, 'livraison', 'standard')
                .catch(() => {});
            });
          }

          setShowReceiptModal(true);
        },
        onError: () => Alert.alert(t('common.error'), t('livreur.action_failed')),
      }
    );
  };

  const updating = updateStatusMutation.isPending;

  const renderMissionCard = useCallback(({ item }: { item: any }) => {
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
            <View style={[styles.cardHeaderRow, row(isArabic)]}>
              <Text style={[styles.cardRef, { color: isPickup ? C.warning : C.success, fontSize: 17, fontWeight: '800' }]}>#{item.id}</Text>
              <View style={[styles.cardHeaderRight, row(isArabic)]}>
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
            
            <View style={[styles.infoRowSmall, row(isArabic)]}>
              <Ionicons name="cube-outline" size={14} color={AdminColors.textSecondary} />
              <Text style={styles.infoTextSmall}>{itemsSummary}</Text>
            </View>

            {addr && (
              <View style={[styles.addressRow, row(isArabic)]}>
                <Ionicons name="location-outline" size={14} color={AdminColors.textMuted} />
                <Text style={[styles.cardAddress, isArabic && { textAlign: 'right' }]} numberOfLines={1}>{addr}</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.actionsBox}>
            <View style={[styles.utilRow, row(isArabic)]}>
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

              <TouchableOpacity
                style={[styles.utilBtn, { backgroundColor: 'rgba(0,0,0,0.04)', borderColor: 'rgba(0,0,0,0.08)' }]}
                onPress={() => router.push(`/order/${item.id}` as any)}
              >
                <Ionicons name="list" size={18} color={AdminColors.textSecondary} />
                <Text style={[styles.utilBtnText, { color: AdminColors.textSecondary }]}>{t('common.details')}</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.utilRow, { marginTop: 8 }]}>
              <TouchableOpacity
                style={[styles.mainActionBtn, { flex: 3, backgroundColor: isPickup ? C.warning : C.success }]}
                onPress={() => {
                  setSelectedOrder(item);
                  if (isPickup) {
                    clearOrder();
                    setPickupOrderId(String(item.id));
                    setOrderNotes(item.notes || '');
                    router.push('/(admin)/order-items');
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
              <TouchableOpacity
                style={[styles.refusBtn, { flex: 1 }]}
                onPress={() => { setSelectedOrder(item); setProbType(isPickup ? 'PICKUP' : 'DELIVERY'); setShowProb(true); }}
              >
                <Text style={styles.refusBtnText}>{t('livreur.refuse_btn')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }, [t, isArabic, updating, updateStatusMutation]);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={[styles.header, row(isArabic)]}>
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

        <View style={[styles.tabsContainer, row(isArabic)]}>
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
        keyExtractor={keyById}
        contentContainerStyle={{ paddingVertical: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { refetchPickups(); refetchDeliveries(); }} tintColor={AdminColors.primary} />
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
          remainingAmount={parseFloat(selectedOrder.montantRestant ?? selectedOrder.montantTotal ?? 0)}
          collectedAmount={collectedAmount}
          setCollectedAmount={setCollectedAmount}
          deliveryNotes={deliveryNotes}
          setDeliveryNotes={setDeliveryNotes}
          confirmingDelivery={updating}
          isArabic={isArabic}
          t={t}
        />
      )}

      <ReceiptActionsModal
        visible={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        confirmedStatus={selectedOrder?.status}
        sharingAction={sharingAction}
        onWhatsApp={handleShareWhatsApp}
        onPrint={handlePrint}
        t={t}
      />

      <FailedAttemptModal
        visible={showProb}
        order={selectedOrder}
        attemptType={probType}
        onClose={() => setShowProb(false)}
        onSuccess={() => { refetchPickups(); refetchDeliveries(); }}
      />
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
  refusBtn: { height: 50, backgroundColor: '#F1F5F9', borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginLeft: 0 },
  refusBtnText: { color: AdminColors.textSecondary, fontSize: 13, fontWeight: '600' },

  emptyState: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: AdminColors.textPrimary, marginTop: 16 },
  emptySub: { fontSize: 15, color: AdminColors.textMuted, marginTop: 4, textAlign: 'center' },

  // Modal styles
});
