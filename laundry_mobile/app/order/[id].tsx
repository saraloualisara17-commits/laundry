import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Linking, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '../../src/store/store';
import { Ionicons } from '@expo/vector-icons';
import { useOrderCreation } from '../../src/context/OrderCreationContext';
import { Colors, Shadows, StatusColors } from '../../constants/theme';
import { format } from 'date-fns';
import { fr, arDZ as ar } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useFormStyles } from '../../src/hooks/useFormStyles';
import { calculateOrderFinancials } from '../../src/utils/orderFinancials';
import { row } from '../../src/utils/rtl';
import { getWorkflowAction, OrderStatus, isDelivered } from '../../constants/orderWorkflow';
import { useOrder } from '../../src/hooks/query/useOrder';
import { useDriversList, usePickupDriversList } from '../../src/hooks/query/useDrivers';
import useOrderPermissions from '../../src/hooks/useOrderPermissions';
import { BASE_URL } from '../../src/services/api/client';
import {
  useOrderDetailHandlers,
  toWhatsAppNumber,
  toCallNumber,
} from '../../src/hooks/useOrderDetailHandlers';
import { useLogCall } from '../../src/hooks/query/useCallLogs';

import PaymentModal from '../../components/orders/modals/PaymentModal';
import DeliveryConfirmModal from '../../components/orders/modals/DeliveryConfirmModal';
import AssignDriverModal from '../../components/orders/modals/AssignDriverModal';
import AssignPickupDriverModal from '../../components/orders/modals/AssignPickupDriverModal';
import EditDateModal from '../../components/orders/modals/EditDateModal';
import EditAddressModal from '../../components/orders/modals/EditAddressModal';
import RemiseModal from '../../components/orders/modals/RemiseModal';
import ImageViewerModal from '../../components/orders/modals/ImageViewerModal';
import OrderFinancialCard from '../../components/orders/sections/OrderFinancialCard';
import OrderWorkflowArea from '../../components/orders/sections/OrderWorkflowArea';
import OrderActionGrid from '../../components/orders/sections/OrderActionGrid';
import OrderPhotoGallery from '../../components/orders/sections/OrderPhotoGallery';
import OrderAddressMap from '../../components/orders/sections/OrderAddressMap';
import ArticlesTab from '../../components/orders/tabs/ArticlesTab';
import HistoriqueTab from '../../components/orders/tabs/HistoriqueTab';

// ─── Entry point ─────────────────────────────────────────────────────────────
export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const { order, loading } = useOrder(id as string);

  if (loading || !order) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return <OrderDetail order={order} id={id as string} currentUser={currentUser} />;
}

// ─── Main component ───────────────────────────────────────────────────────────
function OrderDetail({ order, id, currentUser }: { order: any; id: string; currentUser: any }) {
  const { t } = useTranslation();
  const f = useFormStyles();
  const isArabic = f.isArabic;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { clearOrder, loadOrderForEditing } = useOrderCreation();

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { payments, refetch, isRefreshing } = useOrder(id as string);

  // ── Permissions ───────────────────────────────────────────────────────────────
  const permissions = useOrderPermissions(currentUser, order);
  const { canDelete, canAddPayment, canAssignDriver, canChangeStatus } = permissions;

  // ── Financials ────────────────────────────────────────────────────────────────
  const { totalAmount, paidAmount, remaining, progressPercentage, fullyPaid } = useMemo(
    () => calculateOrderFinancials(order?.montantTotal, order?.montantPaye),
    [order?.montantTotal, order?.montantPaye]
  );

  // ── Workflow ──────────────────────────────────────────────────────────────────
  const statusAction = useMemo(
    () => getWorkflowAction(order?.status as OrderStatus),
    [order?.status]
  );

  // ── All handlers + modal state ────────────────────────────────────────────────
  const h = useOrderDetailHandlers({ id, order, currentUser, remaining, t });
  const { mutate: logCall } = useLogCall();

  const handleCall = (phone: string) => {
    Alert.alert(
      t('call_confirm.title'),
      `${t('call_confirm.msg')} ${phone}?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.call'),
          onPress: () => {
            logCall({ clientId: order.client.id, orderId: order.id, phoneNumber: phone, callType: 'PHONE' });
            Linking.openURL(`tel:${toCallNumber(phone)}`);
          },
        },
      ]
    );
  };

  const handleWhatsApp = (phone: string) => {
    Alert.alert(
      t('call_confirm.wa_title'),
      `${t('call_confirm.wa_msg')} ${phone}?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'WhatsApp',
          onPress: () => {
            logCall({ clientId: order.client.id, orderId: order.id, phoneNumber: phone, callType: 'WHATSAPP' });
            Linking.openURL(`https://wa.me/${toWhatsAppNumber(phone)}`);
          },
        },
      ]
    );
  };

  // Driver lists are lazy — only fetched when the respective modal opens (React Query caches the result)
  const { data: drivers = [], isLoading: driversLoading, isError: driversError } = useDriversList(h.showDriverModal);
  const { data: pickupDrivers = [], isLoading: pickupDriversLoading } = usePickupDriversList(h.showPickupDriverModal);

  // ── Derived display values ────────────────────────────────────────────────────
  const { lat, lng, displayAddress, canAct, isReadyForDelivery, isLocked, dateLabel, timeLabel } = useMemo(() => {
    const _lat = order.deliveryLatitude ? parseFloat(order.deliveryLatitude)
      : order.client?.addresses?.[0]?.latitude ? parseFloat(order.client.addresses[0].latitude) : null;
    const _lng = order.deliveryLongitude ? parseFloat(order.deliveryLongitude)
      : order.client?.addresses?.[0]?.longitude ? parseFloat(order.client.addresses[0].longitude) : null;
    const _isReadyForDelivery = order.status === 'READY_FOR_DELIVERY';
    return {
      lat: _lat,
      lng: _lng,
      displayAddress: order.deliveryAddress || order.client?.addresses?.[0]?.address || '',
      canAct: permissions.isAdmin || permissions.isEmploye || permissions.isLivreur,
      isReadyForDelivery: _isReadyForDelivery,
      isLocked: order.status !== 'PENDING_PICKUP' && !_isReadyForDelivery,
      dateLabel: _isReadyForDelivery
        ? t('orders.edit_delivery_date', { defaultValue: 'تعديل تاريخ التوصيل' })
        : t('orders.edit_pickup_date', { defaultValue: 'تعديل تاريخ الاستلام' }),
      timeLabel: _isReadyForDelivery
        ? t('orders.edit_delivery_time', { defaultValue: 'تعديل وقت التوصيل' })
        : t('orders.edit_pickup_time', { defaultValue: 'تعديل وقت الاستلام' }),
    };
  }, [order.deliveryLatitude, order.deliveryLongitude, order.deliveryAddress, order.status,
      order.client, permissions.isAdmin, permissions.isEmploye, permissions.isLivreur, t]);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* Header */}
      <SafeAreaView style={styles.header}>
        <View style={[styles.headerContent, row(isArabic)]}>
          <TouchableOpacity onPress={h.handleBack} style={styles.backBtn}>
            <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, alignItems: 'center' }}
            onPress={() => order.client?.id && router.push(`/client/${order.client.id}` as any)}
          >
            <Text style={[styles.headerTitle, { textDecorationLine: 'underline' }]} numberOfLines={1}>
              {order.client?.name || `#${order.numeroCommande?.slice(-8)}`}
            </Text>
            <Text style={styles.headerSubtitle}>#{order.numeroCommande?.slice(-10)}</Text>
          </TouchableOpacity>
          <View style={[styles.headerActions, row(isArabic)]}>
            {!!lat && !!lng && (
              <TouchableOpacity
                style={styles.mapDirBtn}
                onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`)}
              >
                <Ionicons name="navigate" size={18} color="white" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refetch} />}
      >
        {/* Status + phone + date row */}
        <View style={[styles.metaRow, row(isArabic)]}>
          <View style={[styles.statusPill, { backgroundColor: StatusColors[order.status]?.bg || Colors.primary50, borderColor: StatusColors[order.status]?.dot || Colors.primary }]}>
            <View style={[styles.statusDot, { backgroundColor: StatusColors[order.status]?.dot || Colors.primary }]} />
            <Text style={[styles.statusPillText, { color: StatusColors[order.status]?.text || Colors.primary }]}>
              {t(`status.${order.status}`, { defaultValue: order.status })}
            </Text>
          </View>
          {!!h.clientPhone && (
            <TouchableOpacity style={styles.phoneChip} onPress={() => handleCall(h.clientPhone)}>
              <Text style={styles.phoneChipText}>{h.clientPhone}</Text>
            </TouchableOpacity>
          )}
          {order.dateCreation && (
            <Text style={styles.metaDate}>
              {format(new Date(order.dateCreation), 'dd MMM · HH:mm', { locale: isArabic ? ar : fr })}
            </Text>
          )}
        </View>

        {/* Financial summary */}
        <OrderFinancialCard
          order={order} isArabic={isArabic} t={t}
          totalAmount={totalAmount} paidAmount={paidAmount} remaining={remaining}
          progressPercentage={progressPercentage} fullyPaid={fullyPaid}
        />

        {/* Order-level notes */}
        {!!order.notes && (
          <View style={[styles.orderNotesBadge, row(isArabic)]}>
            <Ionicons name="document-text-outline" size={15} color="#92400E" />
            <Text style={[styles.orderNotesText, isArabic && { textAlign: 'right', flex: 1 }]}>{order.notes}</Text>
          </View>
        )}

        {/* Workflow banners + driver info */}
        <OrderWorkflowArea
          order={order} isArabic={isArabic} t={t}
          fullyPaid={fullyPaid} totalAmount={totalAmount} permissions={permissions}
        />

        {/* Date edit buttons */}
        {canAct && !isDelivered(order.status) && order.status !== 'CANCELLED' && (
          <View style={[styles.twoColRow, { marginHorizontal: 16, marginTop: 10 }]}>
            <TouchableOpacity
              style={[styles.secondaryActionBtn, { flex: 1 }, isLocked && { opacity: 0.45 }]}
              onPress={() => h.openDateEdit('date')}
            >
              <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
              <Text style={styles.secondaryActionBtnText}>{dateLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryActionBtn, { flex: 1 }, isLocked && { opacity: 0.45 }]}
              onPress={() => h.openDateEdit('time')}
            >
              <Ionicons name="time-outline" size={16} color={Colors.primary} />
              <Text style={styles.secondaryActionBtnText}>{timeLabel}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Section header: Articles */}
        <View style={[styles.sectionHeader, row(isArabic), { marginTop: 20 }]}>
          <Text style={[styles.sectionTitle, f.sectionLabel]}>{t('admin.orders.title')}</Text>
          <Ionicons name="cart-outline" size={18} color={Colors.textMuted} />
        </View>

        {/* Action grid */}
        <OrderActionGrid
          order={order} t={t} permissions={permissions}
          canAddPayment={canAddPayment} canChangeStatus={canChangeStatus} canAssignDriver={canAssignDriver}
          statusAction={statusAction}
          statusUpdating={h.updateStatusMutation.isPending}
          sharingAction={h.sharingAction}
          clientPhone={h.clientPhone}
          onEditOrder={() => { clearOrder(); loadOrderForEditing(order); router.push('/(admin)/order-items'); }}
          onChangeStatus={() => statusAction && h.handleUpdateStatus(statusAction)}
          onEditAddress={h.openAddressModal}
          onAddPayment={() => h.setShowPaymentModal(true)}
          onRemise={h.openRemiseModal}
          onSendSms={h.handleSendSms}
          onCamera={h.handleCamera}
          onGallery={h.handleGallery}
          onWhatsAppReceipt={h.pickLangAndShare}
          onPrint={() => h.handlePrint()}
          onEditResponsible={() => {
            if (order.status === 'PENDING_PICKUP') {
              h.setSelectedPickupDriverId(order.livreur?.id ? String(order.livreur.id) : null);
              h.setShowPickupDriverModal(true);
            } else {
              h.setSelectedDriverId(order.deliveryDriver?.id || null);
              h.setDeliveryDate(order.dateLivraisonPrevue ? new Date(order.dateLivraisonPrevue) : new Date());
              h.setShowDriverModal(true);
            }
          }}
        />

        {/* Photo gallery */}
        {order.images?.length > 0 && (
          <>
            <View style={[styles.sectionHeader, row(isArabic), { marginTop: 20 }]}>
              <Text style={[styles.sectionTitle, f.sectionLabel]}>{t('orders.photo_gallery', { defaultValue: 'معرض الصور' })}</Text>
              <Ionicons name="images-outline" size={18} color={Colors.textMuted} />
            </View>
            <OrderPhotoGallery
              images={order.images} isArabic={isArabic} t={t}
              onImagePress={h.setViewImage}
            />
          </>
        )}

        {/* Articles */}
        {order.commandeTapis?.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <ArticlesTab order={order} isArabic={isArabic} t={t} setViewImage={h.setViewImage} BASE_URL={BASE_URL} />
          </View>
        )}

        {/* Address + map */}
        {(displayAddress || (lat && lng)) && (
          <>
            <View style={[styles.sectionHeader, row(isArabic), { marginTop: 20 }]}>
              <Text style={[styles.sectionTitle, f.sectionLabel]}>{t('admin.clients.address')}</Text>
              <Ionicons name="location-outline" size={18} color={Colors.textMuted} />
            </View>
            <OrderAddressMap address={displayAddress} lat={lat} lng={lng} isArabic={isArabic} t={t} />
          </>
        )}

        {/* History — admin and employe only */}
        {(permissions.isAdmin || permissions.isEmploye) && (
          <>
            <View style={[styles.sectionHeader, row(isArabic), { marginTop: 20 }]}>
              <Text style={[styles.sectionTitle, f.sectionLabel]}>{t('admin.orders.history')}</Text>
              <Ionicons name="time-outline" size={18} color={Colors.textMuted} />
            </View>
            <HistoriqueTab orderId={id} />
          </>
        )}

        {/* Delete */}
        {canDelete && (
          <TouchableOpacity style={styles.deleteFullBtn} onPress={h.handleDeleteOrder}>
            <Ionicons name="trash-outline" size={18} color="white" />
            <Text style={styles.deleteFullBtnText}>{t('common.supprimer')}</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={[styles.bottomBarInner, row(isArabic)]}>
          <TouchableOpacity
            style={[styles.bottomBarBtn, { backgroundColor: '#25D366' }]}
            onPress={() => h.clientPhone && handleWhatsApp(h.clientPhone)}
            disabled={!h.clientPhone}
          >
            <Ionicons name="logo-whatsapp" size={22} color="white" />
            <Text style={styles.bottomBarBtnText}>{t('common.whatsapp')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bottomBarBtn, { backgroundColor: '#0F172A' }]}
            onPress={() => h.clientPhone && handleCall(h.clientPhone)}
            disabled={!h.clientPhone}
          >
            <Ionicons name="call-outline" size={22} color="white" />
            <Text style={styles.bottomBarBtnText}>{t('common.call')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Modals ── */}

      <AssignDriverModal
        visible={h.showDriverModal}
        onClose={() => h.setShowDriverModal(false)}
        onConfirm={h.handleAssignAndMarkReady}
        numeroCommande={order.numeroCommande}
        isArabic={isArabic} t={t}
        drivers={drivers} driversLoading={driversLoading} driversError={driversError}
        selectedDriverId={h.selectedDriverId} setSelectedDriverId={h.setSelectedDriverId}
        confirming={h.assignDriverMutation.isPending || h.updateStatusMutation.isPending}
      />

      <AssignPickupDriverModal
        visible={h.showPickupDriverModal}
        onClose={() => h.setShowPickupDriverModal(false)}
        onConfirm={h.handleAssignPickupDriver}
        numeroCommande={order.numeroCommande}
        isArabic={isArabic} t={t}
        drivers={pickupDrivers} driversLoading={pickupDriversLoading}
        selectedDriverId={h.selectedPickupDriverId} setSelectedDriverId={h.setSelectedPickupDriverId}
        confirming={h.assignPickupDriverMutation.isPending}
      />

      <EditDateModal
        visible={h.showPickupDateModal}
        onClose={() => h.setShowPickupDateModal(false)}
        onSave={h.handleSavePickupDate}
        numeroCommande={order.numeroCommande}
        isArabic={isArabic} t={t}
        mode={h.pickupEditMode} variant="pickup"
        dateValue={h.pickupEditMode === 'date' ? h.pickupEditDate : h.pickupEditTime}
        setDateValue={h.pickupEditMode === 'date' ? h.setPickupEditDate : h.setPickupEditTime}
        saving={h.savingPickupDate}
      />

      <EditDateModal
        visible={h.showDeliveryEditModal}
        onClose={() => h.setShowDeliveryEditModal(false)}
        onSave={h.handleSaveDeliveryDate}
        numeroCommande={order.numeroCommande}
        isArabic={isArabic} t={t}
        mode={h.deliveryEditMode} variant="delivery"
        dateValue={h.deliveryEditMode === 'date' ? h.deliveryEditDate : h.deliveryEditTime}
        setDateValue={h.deliveryEditMode === 'date' ? h.setDeliveryEditDate : h.setDeliveryEditTime}
        saving={h.savingDeliveryDate}
      />

      <EditAddressModal
        visible={h.showAddressModal}
        onClose={() => h.setShowAddressModal(false)}
        onSave={h.handleSaveAddress}
        onOpenMapPicker={() => {
          h.setShowAddressModal(false);
          router.push({ pathname: '/(admin)/map-picker', params: { returnTo: 'order-address' } } as any);
        }}
        onCaptureGps={h.handleCaptureLocation}
        clientName={order.client?.name || `#${order.numeroCommande}`}
        isArabic={isArabic} t={t}
        addressText={h.editAddressText} setAddressText={h.setEditAddressText}
        regionText={h.editRegionText} setRegionText={h.setEditRegionText}
        gpsCoords={h.editGpsCoords}
        capturingGps={h.capturingLocation}
        saving={h.savingAddress}
      />

      <RemiseModal
        visible={h.showRemiseModal}
        onClose={() => h.setShowRemiseModal(false)}
        onSave={h.handleSaveRemise}
        numeroCommande={order.numeroCommande}
        isArabic={isArabic} t={t}
        items={order.commandeTapis || []}
        remiseForms={h.remiseForms} setRemiseForms={h.setRemiseForms}
        saving={h.savingRemise}
      />

      <PaymentModal
        visible={h.showPaymentModal}
        onClose={() => h.setShowPaymentModal(false)}
        onSubmit={h.handleAddPayment}
        remaining={remaining}
        loading={h.addPaymentMutation.isPending}
        paymentAmount={h.paymentAmount} setPaymentAmount={h.setPaymentAmount}
        paymentNote={h.paymentNote} setPaymentNote={h.setPaymentNote}
        isArabic={isArabic} t={t}
      />

      <DeliveryConfirmModal
        visible={h.showDeliveryModal}
        onClose={() => h.setShowDeliveryModal(false)}
        onConfirm={h.confirmDelivery}
        totalAmount={totalAmount} remainingAmount={remaining}
        collectedAmount={h.collectedAmount} setCollectedAmount={h.setCollectedAmount}
        deliveryNotes={h.deliveryNotes} setDeliveryNotes={h.setDeliveryNotes}
        confirmingDelivery={h.updateStatusMutation.isPending}
        isArabic={isArabic} t={t}
      />

      <ImageViewerModal uri={h.viewImage} onClose={() => h.setViewImage(null)} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { backgroundColor: 'white', ...Shadows.sm, zIndex: 10 },
  headerContent: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  headerSubtitle: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, marginTop: 1 },
  headerActions: { flexDirection: 'row', gap: 8 },
  mapDirBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },

  scrollContent: { paddingBottom: 40 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginTop: 14, flexWrap: 'wrap' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusPillText: { fontSize: 13, fontWeight: '800' },
  phoneChip: { backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: '#86EFAC' },
  phoneChipText: { fontSize: 13, fontWeight: '700', color: '#15803D' },
  metaDate: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, marginLeft: 'auto' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  orderNotesBadge: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: 16, marginTop: 12, backgroundColor: '#FEF3C7', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#FDE68A' },
  orderNotesText: { fontSize: 13, fontWeight: '600', color: '#92400E', flex: 1 },

  twoColRow: { flexDirection: 'row', gap: 10 },
  secondaryActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: 12, backgroundColor: Colors.primary100, borderWidth: 1, borderColor: Colors.primary + '40' },
  secondaryActionBtnText: { fontSize: 12, fontWeight: '700', color: Colors.primary },

  deleteFullBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginTop: 24, height: 50, borderRadius: 14, backgroundColor: Colors.danger },
  deleteFullBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },

  bottomBar: { backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12, paddingHorizontal: 16 },
  bottomBarInner: { flexDirection: 'row', gap: 12 },
  bottomBarBtn: { flex: 1, height: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  bottomBarBtnText: { color: 'white', fontSize: 14, fontWeight: '700' },
});
