import React, { useState, useCallback, useEffect } from 'react';
import { randomUUID } from '../../src/utils/uuid';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Linking, Platform, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { AdminColors as Colors, AdminShadows } from '../../constants/AdminColors';
import { useTranslation } from 'react-i18next';
import { formatOrderItemsSummary } from '../../src/utils/orderSummary';
import DeliveryConfirmModal from '../../components/orders/modals/DeliveryConfirmModal';
import ReceiptActionsModal from '../../components/orders/modals/ReceiptActionsModal';
import { useReceiptActions } from '../../src/hooks/useReceiptActions';
import { isScheduledToday, isScheduledOverdue } from '../../src/utils/deliveryDateUtils';
import { useReadyDeliveries, usePendingPickups, useUpdateOrderStatusMission } from '../../src/hooks/queries/useLivreur';
import { ordersApi } from '../../src/services/api';
import { uploadManager } from '../../src/services/uploads';
import { useOrderCreation } from '../../src/context/OrderCreationContext';

const C = Colors; // alias — all values sourced from AdminColors design tokens

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

// ─── FailedAttemptModal ───────────────────────────────────────────────────────
function FailedAttemptModal({ visible, order, attemptType, onClose, onSuccess }: any) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const reasons = [
    { id: 'CLIENT_ABSENT',     label: t('livreur.reason_absent') },
    { id: 'CLIENT_UNREACHABLE',label: t('livreur.reason_unreachable') },
    { id: 'WRONG_ADDRESS',     label: t('livreur.reason_address') },
    { id: 'OTHER',             label: t('common.other') },
  ];

  const submit = async () => {
    if (!reason) return Alert.alert(t('common.error'), t('livreur.select_reason'));
    setLoading(true);
    try {
      await ordersApi.reportFailedAttempt(order.id, { attemptType, reason });
      onSuccess();
      onClose();
    } catch (e) {
      Alert.alert(t('common.error'), t('livreur.action_failed'));
    } finally {
      setLoading(false);
    }
  };

  if (!order) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>{t('livreur.refuse_title')}</Text>
          {reasons.map(r => (
            <TouchableOpacity key={r.id} style={[styles.reasonItem, reason === r.id && { borderColor: C.primary, backgroundColor: '#F0F9F9' }]} onPress={() => setReason(r.id)}>
              <Text style={[styles.reasonText, reason === r.id && { color: C.primary, fontWeight: '700' }]}>{r.label}</Text>
              {reason === r.id && <Ionicons name="checkmark-circle" size={20} color={C.primary} />}
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: C.danger, marginTop: 24 }]} onPress={submit} disabled={loading}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.confirmBtnText}>{t('common.confirm')}</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={{ marginTop: 12 }} onPress={onClose}><Text style={{ textAlign: 'center', color: Colors.textMuted }}>{t('common.cancel')}</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}


// ─── DeliveryCard ─────────────────────────────────────────────────────────────
function DeliveryCard({ order, onDeliver, onReportProblem }: any) {
  const { t } = useTranslation();
  const addr = order.client?.addresses?.[0]?.address || order.clientAdresse;
  const phone = order.client?.phones?.[0]?.phoneNumber || order.clientPhone;
  const remaining = parseFloat(order.montantRestant ?? 0);
  
  const itemsSummary = formatOrderItemsSummary(order.commandeTapis || order.tapis, t);

  return (
    <View style={styles.cardContainer}>
      <View style={[styles.card, { borderLeftColor: C.success }]}>
        <TouchableOpacity style={styles.cardTop} activeOpacity={0.7} onPress={() => router.push(`/order/${order.id}`)}>
          <Text style={[styles.cardRef, { color: C.success }]}>#{order.id}</Text>
          <Text style={styles.cardClient}>{order.client?.name || order.clientNom}</Text>
          {addr ? <Text style={styles.cardAddress} numberOfLines={1}>{addr}</Text> : null}

          <View style={[styles.infoRowSmall, { marginTop: 8 }]}>
            <Ionicons name="cube-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.infoTextSmall}>{itemsSummary}</Text>
          </View>

          <View style={[styles.cardStatusRow, { marginTop: 8 }]}>
            {remaining > 0 ? (
              <View style={styles.amberPill}>
                <Text style={styles.amberPillText}>{t('livreur.to_collect_pill', { amount: remaining })}</Text>
              </View>
            ) : (
              <View style={styles.greenPill}>
                <Text style={styles.greenPillText}>{t('livreur.already_paid')}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.divider} />

        <View style={styles.actionsBox}>
          <View style={styles.utilRow}>
            <TouchableOpacity
              style={[styles.utilBtn, { backgroundColor: 'rgba(16,185,129,0.10)', borderColor: 'rgba(16,185,129,0.2)' }]}
              onPress={() => phone && Linking.openURL(`tel:${phone}`)}
            >
              <Ionicons name="call" size={18} color={C.success} />
              <Text style={[styles.utilBtnText, { color: C.success }]}>{t('common.call')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.utilBtn, { backgroundColor: 'rgba(13,115,119,0.10)', borderColor: Colors.primary200 }]}
              onPress={() => openMapsNavigation(null, null, addr)}
            >
              <Ionicons name="navigate" size={18} color={C.primary} />
              <Text style={[styles.utilBtnText, { color: C.primary }]}>{t('common.navigate')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.utilBtn, { backgroundColor: 'rgba(0,0,0,0.04)', borderColor: 'rgba(0,0,0,0.08)' }]}
              onPress={() => router.push(`/order/${order.id}` as any)}
            >
              <Ionicons name="list" size={18} color={Colors.textSecondary} />
              <Text style={[styles.utilBtnText, { color: Colors.textSecondary }]}>{t('common.details')}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.utilRow, { marginTop: 8 }]}>
            <TouchableOpacity
              style={[styles.mainActionBtn, { flex: 3, backgroundColor: C.success }]}
              onPress={() => onDeliver(order)}
            >
              <Text style={styles.mainActionText}>{t('livreur.deliver_btn')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.refusBtn, { flex: 1 }]}
              onPress={() => onReportProblem(order)}
            >
              <Text style={styles.refusBtnText}>{t('livreur.refuse_btn')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── PickupCard ───────────────────────────────────────────────────────────────
function PickupCard({ order, onCollect, onReportProblem }: any) {
  const { t } = useTranslation();
  const addr = order.client?.addresses?.[0]?.address || order.clientAdresse;
  const phone = order.client?.phones?.[0]?.phoneNumber || order.clientPhone;

  const itemsSummary = formatOrderItemsSummary(order.commandeTapis || order.tapis, t);

  return (
    <View style={styles.cardContainer}>
      <View style={[styles.card, { borderLeftColor: C.warning }]}>
        <TouchableOpacity style={styles.cardTop} activeOpacity={0.7} onPress={() => router.push(`/order/${order.id}`)}>
          <Text style={[styles.cardRef, { color: C.warning }]}>#{order.id}</Text>
          <Text style={styles.cardClient}>{order.client?.name || order.clientNom}</Text>
          {addr ? <Text style={styles.cardAddress} numberOfLines={1}>{addr}</Text> : null}

          <View style={[styles.infoRowSmall, { marginTop: 8 }]}>
            <Ionicons name="cube-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.infoTextSmall}>{itemsSummary}</Text>
          </View>

          <View style={[styles.cardStatusRow, { marginTop: 8 }]}>
            <View style={styles.warningPill}>
              <Text style={styles.warningPillText}>{t('status.PENDING_PICKUP')}</Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.divider} />

        <View style={styles.actionsBox}>
          <View style={styles.utilRow}>
            <TouchableOpacity
              style={[styles.utilBtn, { backgroundColor: 'rgba(16,185,129,0.10)', borderColor: 'rgba(16,185,129,0.2)' }]}
              onPress={() => phone && Linking.openURL(`tel:${phone}`)}
            >
              <Ionicons name="call" size={18} color={C.success} />
              <Text style={[styles.utilBtnText, { color: C.success }]}>{t('common.call')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.utilBtn, { backgroundColor: 'rgba(13,115,119,0.10)', borderColor: Colors.primary200 }]}
              onPress={() => openMapsNavigation(null, null, addr)}
            >
              <Ionicons name="navigate" size={18} color={C.primary} />
              <Text style={[styles.utilBtnText, { color: C.primary }]}>{t('common.navigate')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.utilBtn, { backgroundColor: 'rgba(0,0,0,0.04)', borderColor: 'rgba(0,0,0,0.08)' }]}
              onPress={() => router.push(`/order/${order.id}` as any)}
            >
              <Ionicons name="list" size={18} color={Colors.textSecondary} />
              <Text style={[styles.utilBtnText, { color: Colors.textSecondary }]}>{t('common.details')}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.utilRow, { marginTop: 8 }]}>
            <TouchableOpacity
              style={[styles.mainActionBtn, { flex: 3, backgroundColor: C.warning }]}
              onPress={() => onCollect(order)}
            >
              <Text style={styles.mainActionText}>{t('livreur.collect_btn')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.refusBtn, { flex: 1 }]}
              onPress={() => onReportProblem(order)}
            >
              <Text style={styles.refusBtnText}>{t('livreur.refuse_btn')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function LivreurMissionsScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const { tab } = useLocalSearchParams<{ tab?: string }>();

  const [activeTab, setActiveTab] = useState<'delivery' | 'pickup'>('delivery');

  useEffect(() => {
    if (tab === 'pickup' || tab === 'delivery') {
      setActiveTab(tab);
    }
  }, [tab]);
  const [deliverySubTab, setDeliverySubTab] = useState<'today' | 'overdue'>('today');
  const [selOrder, setSelOrder] = useState<any>(null);

  // Unified modal state matching Admin
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showProb, setShowProb] = useState(false);
  const [probType, setProbType] = useState<'PICKUP' | 'DELIVERY'>('PICKUP');

  // Delivery flow state
  const [collectedAmount, setCollectedAmount] = useState('0');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [deliveryPhotoUris, setDeliveryPhotoUris] = useState<string[]>([]);


  const { driverLocalImages, clearDriverLocalImages } = useOrderCreation();

  const { data: pickupOrders = [], isLoading: loadingPickups, isFetching: fetchingPickups, refetch: refetchPickups } = usePendingPickups();
  const { data: deliveryOrders = [], isLoading: loadingDeliveries, isFetching: fetchingDeliveries, refetch: refetchDeliveries } = useReadyDeliveries();
  const updateStatusMutation = useUpdateOrderStatusMission();

  // isLoading = true only on the very first fetch (no cached data yet)
  // isFetching = true on any refetch including background — used for pull-to-refresh indicator
  const loading = loadingPickups || loadingDeliveries;
  const refreshing = (fetchingPickups || fetchingDeliveries) && !loading;
  const updating = updateStatusMutation.isPending;

  const { sharingAction, handleShareWhatsApp, handlePrint } = useReceiptActions(
    selOrder?.id,
    selOrder?.status,
    selOrder?.numeroCommande,
    t,
    selOrder?.client?.phones?.[0]?.phoneNumber || selOrder?.clientPhone,
    selOrder
  );

  const onRefresh = useCallback(async () => {
    await Promise.all([refetchPickups(), refetchDeliveries()]);
  }, [refetchPickups, refetchDeliveries]);

  const handleStatusUpdate = (orderId: number, status: 'PICKED_UP' | 'DELIVERED', extraData?: any) => {
    const photosAtConfirm = [...deliveryPhotoUris];
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
        onSuccess: async (res) => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setShowPaymentModal(false);
          setDeliveryPhotoUris([]);
          const updatedOrder = (res as any).data ?? selOrder;
          setSelOrder(updatedOrder);

          // Upload delivery proof photos from the modal
          photosAtConfirm.forEach(uri => {
            uploadManager.addImage(uri, orderId, 'livraison', 'standard')
              .catch(() => {});
          });

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

  const handleCollect = (order: any) => {
    handleStatusUpdate(order.id, 'PICKED_UP');
  };

  const todayOrders = deliveryOrders.filter(o => isScheduledToday(o.scheduledDeliveryDate));
  const overdueOrders = deliveryOrders.filter(o => isScheduledOverdue(o.scheduledDeliveryDate));
  const activeDeliveryList = deliverySubTab === 'today' ? todayOrders : overdueOrders;

  const tabs: Array<{ key: 'delivery' | 'pickup'; label: string; badge?: number; badgeColor?: string }> = [
    { key: 'delivery', label: t('livreur.deliveries_tab'), badge: (todayOrders.length + overdueOrders.length) || undefined, badgeColor: C.danger },
    { key: 'pickup',   label: t('livreur.pickups_tab'),   badge: pickupOrders.length || undefined,                         badgeColor: C.warning },
  ];

  const emptyIcon  = activeTab === 'delivery' ? '🎉' : '📭';
  const emptyTitle = activeTab === 'delivery'
    ? (deliverySubTab === 'today' ? t('livreur.no_delivery') : t('livreur.no_overdue'))
    : t('livreur.no_pickup');
  const emptySub = activeTab === 'delivery'
    ? (deliverySubTab === 'today' ? t('livreur.no_delivery_sub') : t('livreur.no_overdue_sub'))
    : t('livreur.no_pickup_sub');

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: 'white' }}>
        <View style={styles.tabsContainer}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {tab.badge != null && (
                <View style={[styles.tabBadge, { backgroundColor: tab.badgeColor }]}>
                  <Text style={styles.tabBadgeText}>{tab.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      {activeTab === 'delivery' ? (
        <>
          {/* Sub-filter buttons */}
          <View style={styles.subTabsContainer}>
            <TouchableOpacity
              style={[styles.subTab, deliverySubTab === 'today' && styles.subTabActiveToday]}
              onPress={() => setDeliverySubTab('today')}
            >
              <Text style={[styles.subTabText, deliverySubTab === 'today' && { color: C.success, fontWeight: '700' }]}>
                {t('livreur.section_today')}
              </Text>
              {todayOrders.length > 0 && (
                <View style={[styles.subTabBadge, { backgroundColor: C.success }]}>
                  <Text style={styles.subTabBadgeText}>{todayOrders.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.subTab, deliverySubTab === 'overdue' && styles.subTabActiveOverdue]}
              onPress={() => setDeliverySubTab('overdue')}
            >
              <Text style={[styles.subTabText, deliverySubTab === 'overdue' && { color: C.danger, fontWeight: '700' }]}>
                {t('livreur.section_overdue')}
              </Text>
              {overdueOrders.length > 0 && (
                <View style={[styles.subTabBadge, { backgroundColor: C.danger }]}>
                  <Text style={styles.subTabBadgeText}>{overdueOrders.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <FlatList
            data={activeDeliveryList}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ paddingVertical: 16 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
            renderItem={({ item }) => (
              <DeliveryCard
                order={item}
                onDeliver={(o: any) => {
                  setSelOrder(o);
                  setCollectedAmount(String(o.montantRestant || 0));
                  setDeliveryNotes('');
                  setDeliveryPhotoUris([]);
                  setShowPaymentModal(true);
                }}
                onReportProblem={(o: any) => { setSelOrder(o); setProbType('DELIVERY'); setShowProb(true); }}
              />
            )}
            ListEmptyComponent={
              loading
                ? <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
                : (
                  <View style={styles.emptyContainer}>
                    <Text style={{ fontSize: 52 }}>{emptyIcon}</Text>
                    <Text style={styles.emptyTitle}>{emptyTitle}</Text>
                    <Text style={styles.emptySub}>{emptySub}</Text>
                  </View>
                )
            }
            removeClippedSubviews={true}
            maxToRenderPerBatch={8}
            windowSize={5}
            initialNumToRender={10}
          />
        </>
      ) : (
        <FlatList
          data={pickupOrders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingVertical: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          renderItem={({ item }) => (
            <PickupCard
              order={item}
              onCollect={handleCollect}
              onReportProblem={(o: any) => { setSelOrder(o); setProbType('PICKUP'); setShowProb(true); }}
            />
          )}
          ListEmptyComponent={
            loading
              ? <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
              : (
                <View style={styles.emptyContainer}>
                  <Text style={{ fontSize: 52 }}>{emptyIcon}</Text>
                  <Text style={styles.emptyTitle}>{emptyTitle}</Text>
                  <Text style={styles.emptySub}>{emptySub}</Text>
                </View>
              )
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={8}
          windowSize={5}
          initialNumToRender={10}
        />
      )}

      {/* --- Standardized Modals --- */}
      {selOrder && (
        <DeliveryConfirmModal
          visible={showPaymentModal}
          onClose={() => {
            setDeliveryPhotoUris([]);
            setShowPaymentModal(false);
          }}
          onConfirm={() => handleStatusUpdate(selOrder.id, 'DELIVERED', {
            amount: parseFloat(collectedAmount),
            notesPaiement: deliveryNotes,
          })}
          totalAmount={selOrder.montantTotal || 0}
          remainingAmount={parseFloat(selOrder.montantRestant ?? selOrder.montantTotal ?? 0)}
          collectedAmount={collectedAmount}
          setCollectedAmount={setCollectedAmount}
          deliveryNotes={deliveryNotes}
          setDeliveryNotes={setDeliveryNotes}
          confirmingDelivery={updating}
          photoUris={deliveryPhotoUris}
          setPhotoUris={setDeliveryPhotoUris}
          isArabic={isArabic}
          t={t}
        />
      )}

      <FailedAttemptModal visible={showProb} order={selOrder} attemptType={probType} onClose={() => setShowProb(false)} onSuccess={onRefresh} />

      <ReceiptActionsModal
        visible={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        confirmedStatus={selOrder?.status}
        sharingAction={sharingAction}
        onWhatsApp={handleShareWhatsApp}
        onPrint={handlePrint}
        t={t}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tabsContainer: { flexDirection: 'row', padding: 12, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.bg },
  subTabsContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 10, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.bg },
  subTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface2 },
  subTabActiveToday: { borderColor: Colors.success, backgroundColor: Colors.successBg },
  subTabActiveOverdue: { borderColor: Colors.danger, backgroundColor: Colors.dangerBg },
  subTabText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  subTabBadge: { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  subTabBadgeText: { color: 'white', fontSize: 10, fontWeight: '800' },
  tab: { flex: 1, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 12, position: 'relative' },
  tabActive: { backgroundColor: Colors.bg },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  tabTextActive: { color: Colors.primary, fontWeight: '700' },
  tabBadge: { position: 'absolute', top: 4, right: 12, minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  tabBadgeText: { color: 'white', fontSize: 10, fontWeight: '800' },
  cardContainer: { paddingHorizontal: 16, marginBottom: 14 },
  card: { backgroundColor: Colors.surface, borderRadius: 20, borderLeftWidth: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  cardTop: { padding: 16 },
  cardRef: { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  cardClient: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  cardAddress: { fontSize: 14, color: Colors.textSecondary, marginBottom: 12 },
  cardStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amberPill: { backgroundColor: Colors.warningBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  amberPillText: { color: Colors.warning, fontSize: 12, fontWeight: '700' },
  greenPill: { backgroundColor: Colors.successBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  greenPillText: { color: Colors.success, fontSize: 12, fontWeight: '700' },
  warningPill: { backgroundColor: Colors.warningBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  warningPillText: { color: Colors.warning, fontSize: 12, fontWeight: '700' },
  infoRowSmall: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoTextSmall: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500', flex: 1 },
  divider: { height: 1, backgroundColor: Colors.bg },
  actionsBox: { padding: 16 },
  utilRow: { flexDirection: 'row', gap: 8 },
  utilBtn: { flex: 1, height: 42, borderRadius: 10, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  utilBtnText: { fontSize: 12, fontWeight: '700' },
  mainActionBtn: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  mainActionText: { color: 'white', fontSize: 16, fontWeight: '800' },
  refusBtn: { height: 48, backgroundColor: Colors.bg, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  refusBtnText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginTop: 16 },
  emptySub: { fontSize: 15, color: Colors.textMuted, marginTop: 4, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,18,25,0.6)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 40, height: 5, backgroundColor: Colors.border, borderRadius: 10, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 20, textAlign: 'center' },
  confirmBtn: { backgroundColor: Colors.primary, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 32 },
  confirmBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  reasonItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: 10 },
  reasonText: { fontSize: 15, color: Colors.textPrimary },
});
