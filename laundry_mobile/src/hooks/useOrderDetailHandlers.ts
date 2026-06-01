import { useState, useCallback, useEffect, useRef } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useRouter, useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { randomUUID } from '../utils/uuid';
import { pendingMapResult } from '../utils/pendingMapResult';
import { uploadManager } from '../services/uploads';
import { ordersApi } from '../services/api/ordersApi';
import { adminApi } from '../services/adminApi';
import { queryKeys } from '../services/query/queryKeys';
import { WorkflowAction } from '../../constants/orderWorkflow';
import {
  useUpdateOrderStatus,
  useAddPayment,
} from './query/useOrder';
import {
  useAssignDeliveryDriver,
  useAssignPickupDriver,
} from './query/useDrivers';
import { useDeleteOrder } from './query/useOrders';
import { useReceiptActions } from './useReceiptActions';

// ─── Phone helpers (pure, no hook needed) ────────────────────────────────────
export function getClientPhone(client: any): string {
  if (!client) return '';
  if (client.phone) return client.phone;
  if (Array.isArray(client.phones) && client.phones.length > 0) return client.phones[0].phoneNumber;
  return '';
}

export function toWhatsAppNumber(phone: string): string {
  let n = phone.replace(/[\s\-().]/g, '');
  if (n.startsWith('+')) n = n.slice(1);
  if (n.startsWith('0')) n = '212' + n.slice(1);
  return n;
}

export function toCallNumber(phone: string): string {
  return phone.replace(/[\s\-().]/g, '');
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useOrderDetailHandlers({
  id,
  order,
  currentUser,
  remaining,
  t,
}: {
  id: string;
  order: any;
  currentUser: any;
  remaining: number;
  t: (key: string, options?: any) => string;
}) {
  const router = useRouter();
  const qc = useQueryClient();

  // ── Mutations ────────────────────────────────────────────────────────────────
  const updateStatusMutation = useUpdateOrderStatus();
  const addPaymentMutation = useAddPayment();
  const assignDriverMutation = useAssignDeliveryDriver();
  const assignPickupDriverMutation = useAssignPickupDriver();
  const deleteOrderMutation = useDeleteOrder();

  // ── Image upload ──────────────────────────────────────────────────────────────
  const [uploadingImage, setUploadingImage] = useState(false);
  const [viewImage, setViewImage] = useState<string | null>(null);

  // ── Delivery driver modal ─────────────────────────────────────────────────────
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [deliveryDate, setDeliveryDate] = useState<Date>(new Date());
  const [showDeliveryDatePicker, setShowDeliveryDatePicker] = useState(false);

  // ── Pickup driver modal ───────────────────────────────────────────────────────
  const [showPickupDriverModal, setShowPickupDriverModal] = useState(false);
  const [selectedPickupDriverId, setSelectedPickupDriverId] = useState<string | null>(null);

  // ── Payment modal ─────────────────────────────────────────────────────────────
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  // ── Remise modal ──────────────────────────────────────────────────────────────
  const [showRemiseModal, setShowRemiseModal] = useState(false);
  const [remiseForms, setRemiseForms] = useState<Record<number, { montant: string; raison: string }>>({});
  const [savingRemise, setSavingRemise] = useState(false);

  // ── Delivery confirm modal ────────────────────────────────────────────────────
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [collectedAmount, setCollectedAmount] = useState('0');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // ── Edit pickup date modal ────────────────────────────────────────────────────
  const [showPickupDateModal, setShowPickupDateModal] = useState(false);
  const [pickupEditMode, setPickupEditMode] = useState<'date' | 'time'>('date');
  const [pickupEditDate, setPickupEditDate] = useState<Date>(new Date());
  const [pickupEditTime, setPickupEditTime] = useState<Date>(new Date());
  const [savingPickupDate, setSavingPickupDate] = useState(false);

  // ── Edit delivery date modal ──────────────────────────────────────────────────
  const [showDeliveryEditModal, setShowDeliveryEditModal] = useState(false);
  const [deliveryEditMode, setDeliveryEditMode] = useState<'date' | 'time'>('date');
  const [deliveryEditDate, setDeliveryEditDate] = useState<Date>(new Date());
  const [deliveryEditTime, setDeliveryEditTime] = useState<Date>(new Date());
  const [savingDeliveryDate, setSavingDeliveryDate] = useState(false);

  // ── Edit address modal ────────────────────────────────────────────────────────
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editAddressText, setEditAddressText] = useState('');
  const [editRegionText, setEditRegionText] = useState('');
  const [editGpsCoords, setEditGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [capturingLocation, setCapturingLocation] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  // ── Client phone ──────────────────────────────────────────────────────────────
  const clientPhone = getClientPhone(order.client);

  // ── Receipt actions ───────────────────────────────────────────────────────────
  const { sharingAction, handleShareWhatsApp, handlePrint } = useReceiptActions(
    id, order?.status, order?.numeroCommande, t, clientPhone, order
  );

  const pickLangAndShare = useCallback(() => {
    Alert.alert(t('receipt.choose_language', { defaultValue: 'Langue du reçu' }), '', [
      { text: '🇫🇷 Français', onPress: () => handleShareWhatsApp('fr') },
      { text: '🇲🇦 العربية', onPress: () => handleShareWhatsApp('ar') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }, [handleShareWhatsApp, t]);

  // ── Navigate away if order deleted ───────────────────────────────────────────
  const hadOrderRef = useRef(!!order);
  useEffect(() => {
    if (hadOrderRef.current && !order) {
      Alert.alert(
        t('common.deleted', { defaultValue: 'Supprimée' }),
        t('order.deleted_notice', { defaultValue: 'Cette commande a été supprimée.' }),
        [{ text: 'OK', onPress: () => router.back() }],
      );
    }
    if (order) hadOrderRef.current = true;
  }, [order, router, t]);

  // ── Consume map-picker result ─────────────────────────────────────────────────
  useFocusEffect(useCallback(() => {
    const result = pendingMapResult.consume();
    if (result) {
      setEditAddressText(result.address);
      setEditRegionText(result.region);
      setEditGpsCoords({ lat: result.lat, lng: result.lng });
      setShowAddressModal(true);
    }
  }, []));

  // ── Navigation ────────────────────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else {
      const role = currentUser?.role?.toLowerCase();
      if (role === 'livreur') router.replace('/(livreur)');
      else if (role === 'employe') router.replace('/(employe)');
      else router.replace('/(admin)/(tabs)');
    }
  }, [router, currentUser?.role]);

  // ── Status update ─────────────────────────────────────────────────────────────
  const performStatusUpdate = useCallback(async (nextStatus: string, extraData?: any) => {
    try {
      await updateStatusMutation.mutateAsync({ id, status: nextStatus, data: extraData });
    } catch {
      Alert.alert(t('common.error'), t('common.error_msg'));
    }
  }, [id, updateStatusMutation, t]);

  const handleConfirmPickup = useCallback(async () => {
    try {
      await ordersApi.confirmPickup(id, []);
      qc.invalidateQueries({ queryKey: queryKeys.orders.all });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      qc.invalidateQueries({ queryKey: queryKeys.livreur.all });
      qc.invalidateQueries({ queryKey: queryKeys.statistics.all });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch { Alert.alert(t('common.error'), t('common.error_msg')); }
  }, [id, qc, t]);

  const handleUpdateStatus = useCallback(async (action: WorkflowAction) => {
    const nextStatus = action.nextStatus;
    if (!nextStatus) return;

    const proceed = () => {
      if (nextStatus === 'PICKED_UP') {
        if (order?.livreur && String(order.livreur.id) !== String(currentUser?.id)) {
          Alert.alert(t('orders.not_allowed'), t('orders.not_pickup_driver', { name: order.livreur.name }));
          return;
        }
        handleConfirmPickup();
        return;
      }
      if (action.requiresDriverModal) {
        setSelectedDriverId(order?.deliveryDriver?.id || null);
        setDeliveryDate(order?.dateLivraisonPrevue ? new Date(order.dateLivraisonPrevue) : new Date());
        setShowDeliveryDatePicker(false);
        setShowDriverModal(true);
        return;
      }
      if (action.requiresDeliveryModal) {
        if (order?.deliveryDriver && String(order.deliveryDriver.id) !== String(currentUser?.id)) {
          Alert.alert(t('orders.not_allowed'), t('orders.not_delivery_driver', { name: order.deliveryDriver.name }));
          return;
        }
        setCollectedAmount('0');
        setDeliveryNotes('');
        setShowDeliveryModal(true);
        return;
      }
      performStatusUpdate(nextStatus);
    };

    Alert.alert(
      t('orders.confirm_status_change_title', { defaultValue: 'Confirmer le changement' }),
      t('orders.confirm_status_change_body', {
        defaultValue: `Changer le statut vers : ${t(`status.${nextStatus}`, { defaultValue: nextStatus })} ?`,
        status: t(`status.${nextStatus}`, { defaultValue: nextStatus }),
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.confirm', { defaultValue: 'Confirmer' }), style: 'destructive', onPress: proceed },
      ]
    );
  }, [order, currentUser?.id, handleConfirmPickup, performStatusUpdate, t]);

  // ── Driver assignment ─────────────────────────────────────────────────────────
  const handleAssignAndMarkReady = useCallback(async () => {
    if (!selectedDriverId) { Alert.alert(t('common.error'), t('admin.orders.filter_driver')); return; }
    try {
      const y = deliveryDate.getFullYear();
      const mo = String(deliveryDate.getMonth() + 1).padStart(2, '0');
      const d = String(deliveryDate.getDate()).padStart(2, '0');
      await assignDriverMutation.mutateAsync({ id, driverId: selectedDriverId, scheduledDeliveryDate: `${y}-${mo}-${d}T00:00:00` });
      if (order?.status !== 'READY_FOR_DELIVERY') await performStatusUpdate('READY_FOR_DELIVERY', {});
      setShowDriverModal(false);
    } catch { Alert.alert(t('common.error'), t('common.error_msg')); }
  }, [id, selectedDriverId, deliveryDate, order?.status, assignDriverMutation, performStatusUpdate, t]);

  const handleAssignPickupDriver = useCallback(async () => {
    if (!selectedPickupDriverId) { Alert.alert(t('common.error'), t('admin.orders.filter_driver')); return; }
    try {
      await assignPickupDriverMutation.mutateAsync({ id, livreurId: selectedPickupDriverId });
      setShowPickupDriverModal(false);
    } catch { Alert.alert(t('common.error'), t('common.error_msg')); }
  }, [id, selectedPickupDriverId, assignPickupDriverMutation, t]);

  // ── Delivery confirm ──────────────────────────────────────────────────────────
  const confirmDelivery = useCallback(async () => {
    const amount = parseFloat(collectedAmount) || 0;
    if (isNaN(amount) || amount < 0) return Alert.alert(t('common.error'), t('admin.unpaid.enter_valid_amount'));
    if (amount > remaining + 0.05) return Alert.alert(t('common.error'), `${t('admin.unpaid.payment_exceeds_remaining')} (${remaining.toFixed(2)} DH)`);
    try {
      await updateStatusMutation.mutateAsync({ id, status: 'DELIVERED', data: { amount, notesPaiement: deliveryNotes, paymentIdempotencyKey: randomUUID() } });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowDeliveryModal(false);
      Alert.alert(t('delivery.delivery_success'), t('delivery.send_receipt_prompt'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: '🇫🇷 Français', onPress: () => handleShareWhatsApp('fr') },
        { text: '🇲🇦 العربية', onPress: () => handleShareWhatsApp('ar') },
      ]);
    } catch { Alert.alert(t('common.error'), t('common.error_msg')); }
  }, [id, collectedAmount, deliveryNotes, remaining, updateStatusMutation, handleShareWhatsApp, t]);

  // ── Payment ───────────────────────────────────────────────────────────────────
  const handleAddPayment = useCallback(async () => {
    const amount = parseFloat(paymentAmount);
    if (!paymentAmount || isNaN(amount) || amount <= 0) return Alert.alert(t('common.error'), t('admin.unpaid.enter_valid_amount'));
    if (amount > remaining + 0.05) return Alert.alert(t('common.error'), `${t('admin.unpaid.payment_exceeds_remaining')} (${remaining.toFixed(2)} DH)`);
    try {
      await addPaymentMutation.mutateAsync({ id, amount, note: paymentNote });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentNote('');
    } catch { Alert.alert(t('common.error'), t('common.error_msg')); }
  }, [id, paymentAmount, paymentNote, remaining, addPaymentMutation, t]);

  // ── Photos ────────────────────────────────────────────────────────────────────
  const photoType = order.status.toLowerCase();

  const handleCamera = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'] as any, quality: 1 });
    if (result.canceled) return;
    setUploadingImage(true);
    try {
      await Promise.all(result.assets.map((a: any) => uploadManager.addImage(a.uri, id, photoType)));
      Alert.alert(t('common.info'), t('admin.orders.upload_queued'));
    } catch { Alert.alert(t('common.error'), t('common.error_msg')); }
    finally { setUploadingImage(false); }
  }, [id, photoType, t]);

  const handleGallery = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] as any, allowsMultipleSelection: true, quality: 1 });
    if (result.canceled) return;
    setUploadingImage(true);
    try {
      await Promise.all(result.assets.map((a: any) => uploadManager.addImage(a.uri, id, photoType)));
      Alert.alert(t('common.info'), t('admin.orders.upload_queued'));
    } catch { Alert.alert(t('common.error'), t('common.error_msg')); }
    finally { setUploadingImage(false); }
  }, [id, photoType, t]);

  // ── Delete order ──────────────────────────────────────────────────────────────
  const handleDeleteOrder = useCallback(() => {
    Alert.alert(t('common.supprimer'), t('common.confirm_msg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.supprimer'),
        style: 'destructive',
        onPress: async () => {
          try { await deleteOrderMutation.mutateAsync(id); router.back(); }
          catch { Alert.alert(t('common.error'), t('common.error_msg')); }
        },
      },
    ]);
  }, [id, router, deleteOrderMutation, t]);

  // ── Remise ────────────────────────────────────────────────────────────────────
  const openRemiseModal = useCallback(() => {
    const initial: Record<number, { montant: string; raison: string }> = {};
    (order.commandeTapis || []).forEach((item: any) => {
      initial[item.id] = {
        montant: item.remiseMontant ? String(parseFloat(item.remiseMontant)) : '',
        raison: item.remiseRaison || '',
      };
    });
    setRemiseForms(initial);
    setShowRemiseModal(true);
  }, [order.commandeTapis]);

  const handleSaveRemise = useCallback(async () => {
    setSavingRemise(true);
    try {
      const tapis = (order.commandeTapis || []).map((item: any) => {
        const f = remiseForms[item.id];
        const montant = f ? parseFloat(f.montant) || 0 : 0;
        const imageUrls = (item.images || [])
          .filter((img: any) => !img.isArchived)
          .map((img: any) => img.imageUrl);
        return {
          productId: item.productId,
          quantite: item.quantite,
          largeur: item.largeur ?? undefined,
          hauteur: item.hauteur ?? undefined,
          longueur: item.longueur ?? undefined,
          poids: item.poids ?? undefined,
          manualPrice: item.modeTarification === 'CUSTOM' ? item.prixCalcule ?? item.prixFinal : undefined,
          tagNumero: item.tagNumero,
          notes: item.notes ?? undefined,
          couleur: item.couleur ?? undefined,
          remiseMontant: montant > 0 ? montant : null,
          remiseRaison: (montant > 0 && f?.raison?.trim()) ? f.raison.trim() : null,
          imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
        };
      });
      await ordersApi.updateOrder(id, { tapis, version: order.version });
      qc.invalidateQueries({ queryKey: queryKeys.orders.details(id) });
      setShowRemiseModal(false);
    } catch {
      Alert.alert(t('common.error'), t('common.error_msg'));
    } finally { setSavingRemise(false); }
  }, [id, order.commandeTapis, order.version, remiseForms, qc, t]);

  // ── Date edits ────────────────────────────────────────────────────────────────
  const handleSavePickupDate = useCallback(async () => {
    setSavingPickupDate(true);
    try {
      const pad = (n: number) => String(n).padStart(2, '0');
      const iso = `${pickupEditDate.getFullYear()}-${pad(pickupEditDate.getMonth() + 1)}-${pad(pickupEditDate.getDate())}T${pad(pickupEditTime.getHours())}:${pad(pickupEditTime.getMinutes())}:00`;
      await adminApi.updateOrder(id, { scheduledPickupDate: iso, version: order.version });
      qc.invalidateQueries({ queryKey: queryKeys.orders.details(id) });
      setShowPickupDateModal(false);
    } catch { Alert.alert(t('common.error'), t('common.error_msg')); }
    finally { setSavingPickupDate(false); }
  }, [id, pickupEditDate, pickupEditTime, order.version, qc, t]);

  const handleSaveDeliveryDate = useCallback(async () => {
    setSavingDeliveryDate(true);
    try {
      const pad = (n: number) => String(n).padStart(2, '0');
      const iso = `${deliveryEditDate.getFullYear()}-${pad(deliveryEditDate.getMonth() + 1)}-${pad(deliveryEditDate.getDate())}T${pad(deliveryEditTime.getHours())}:${pad(deliveryEditTime.getMinutes())}:00`;
      await adminApi.updateOrder(id, { scheduledDeliveryDate: iso, version: order.version });
      qc.invalidateQueries({ queryKey: queryKeys.orders.details(id) });
      setShowDeliveryEditModal(false);
    } catch { Alert.alert(t('common.error'), t('common.error_msg')); }
    finally { setSavingDeliveryDate(false); }
  }, [id, deliveryEditDate, deliveryEditTime, order.version, qc, t]);

  // ── GPS capture ───────────────────────────────────────────────────────────────
  const handleCaptureLocation = useCallback(async () => {
    setCapturingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('admin.orders.location_permission_denied', { defaultValue: 'Permission de localisation refusée' }));
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;
      setEditGpsCoords({ lat: latitude, lng: longitude });
      const result = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (result.length > 0) {
        const geo = result[0];
        const fullAddr = [geo.streetNumber, geo.street, geo.name].filter(Boolean).join(' ');
        setEditAddressText(fullAddr || geo.name || '');
        setEditRegionText(geo.district || geo.city || geo.region || '');
      }
    } catch { Alert.alert(t('common.error'), t('admin.orders.location_capture_error', { defaultValue: 'Impossible de récupérer la position' })); }
    finally { setCapturingLocation(false); }
  }, [t]);

  // ── Save address ──────────────────────────────────────────────────────────────
  const handleSaveAddress = useCallback(async () => {
    if (!editAddressText.trim() && !editRegionText.trim() && !editGpsCoords) return;
    setSavingAddress(true);
    const addressValue = editAddressText.trim() || editRegionText.trim() || null;
    try {
      await adminApi.updateOrder(id, {
        ...(addressValue !== null && { deliveryAddress: addressValue }),
        ...(editGpsCoords !== null && { deliveryLatitude: editGpsCoords.lat, deliveryLongitude: editGpsCoords.lng }),
        version: order.version,
      });
      setShowAddressModal(false);
      qc.invalidateQueries({ queryKey: queryKeys.orders.details(id) });
    } catch { Alert.alert(t('common.error'), t('common.error_msg')); }
    finally { setSavingAddress(false); }
  }, [id, editAddressText, editRegionText, editGpsCoords, order.version, qc, t]);

  // ── SMS ───────────────────────────────────────────────────────────────────────
  const handleSendSms = useCallback(() => {
    if (!clientPhone) return;
    const body = t('orders.sms_body', {
      defaultValue: `Bonjour, votre commande #${order.numeroCommande} est en cours de traitement. Merci de nous faire confiance — Astra Pro.`,
      numero: order.numeroCommande,
    });
    Linking.openURL(`sms:${toCallNumber(clientPhone)}${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(body)}`);
  }, [clientPhone, order.numeroCommande, t]);

  // ── Date edit button helper ───────────────────────────────────────────────────
  const openDateEdit = useCallback((mode: 'date' | 'time') => {
    const isPickupStatus = order.status === 'PENDING_PICKUP';
    const isReadyForDelivery = order.status === 'READY_FOR_DELIVERY';
    const isLocked = !isPickupStatus && !isReadyForDelivery;

    if (isLocked) {
      Alert.alert(t('common.error'), t('orders.cannot_edit_date_now', { defaultValue: 'لا يمكن تعديل التاريخ في هذه المرحلة' }));
      return;
    }
    if (isReadyForDelivery) {
      const d = order.scheduledDeliveryDate ? new Date(order.scheduledDeliveryDate) : new Date();
      setDeliveryEditDate(d);
      setDeliveryEditTime(d);
      setDeliveryEditMode(mode);
      setShowDeliveryEditModal(true);
      return;
    }
    const d = order.scheduledPickupDate ? new Date(order.scheduledPickupDate) : new Date();
    setPickupEditDate(d);
    setPickupEditTime(d);
    setPickupEditMode(mode);
    setShowPickupDateModal(true);
  }, [order.status, order.scheduledDeliveryDate, order.scheduledPickupDate, t]);

  // ── Open address modal helper ─────────────────────────────────────────────────
  const openAddressModal = useCallback(() => {
    setEditAddressText(order.deliveryAddress || order.client?.addresses?.[0]?.address || '');
    setEditRegionText('');
    setEditGpsCoords(
      order.deliveryLatitude && order.deliveryLongitude
        ? { lat: parseFloat(order.deliveryLatitude), lng: parseFloat(order.deliveryLongitude) }
        : order.client?.addresses?.[0]?.latitude && order.client?.addresses?.[0]?.longitude
          ? { lat: parseFloat(order.client.addresses[0].latitude), lng: parseFloat(order.client.addresses[0].longitude) }
          : null
    );
    setShowAddressModal(true);
  }, [order]);

  return {
    // mutations
    updateStatusMutation,
    addPaymentMutation,
    assignDriverMutation,
    assignPickupDriverMutation,
    deleteOrderMutation,

    // image state
    uploadingImage,
    viewImage,
    setViewImage,

    // driver modal state
    showDriverModal, setShowDriverModal,
    selectedDriverId, setSelectedDriverId,
    deliveryDate, setDeliveryDate,
    showDeliveryDatePicker, setShowDeliveryDatePicker,

    // pickup driver modal state
    showPickupDriverModal, setShowPickupDriverModal,
    selectedPickupDriverId, setSelectedPickupDriverId,

    // payment modal state
    showPaymentModal, setShowPaymentModal,
    paymentAmount, setPaymentAmount,
    paymentNote, setPaymentNote,

    // remise modal state
    showRemiseModal, setShowRemiseModal,
    remiseForms, setRemiseForms,
    savingRemise,

    // delivery confirm modal state
    showDeliveryModal, setShowDeliveryModal,
    collectedAmount, setCollectedAmount,
    deliveryNotes, setDeliveryNotes,

    // pickup date modal state
    showPickupDateModal, setShowPickupDateModal,
    pickupEditMode,
    pickupEditDate, setPickupEditDate,
    pickupEditTime, setPickupEditTime,
    savingPickupDate,

    // delivery date modal state
    showDeliveryEditModal, setShowDeliveryEditModal,
    deliveryEditMode,
    deliveryEditDate, setDeliveryEditDate,
    deliveryEditTime, setDeliveryEditTime,
    savingDeliveryDate,

    // address modal state
    showAddressModal, setShowAddressModal,
    editAddressText, setEditAddressText,
    editRegionText, setEditRegionText,
    editGpsCoords,
    capturingLocation,
    savingAddress,

    // derived
    clientPhone,
    sharingAction,
    handlePrint,

    // handlers
    handleBack,
    handleUpdateStatus,
    handleAssignAndMarkReady,
    handleAssignPickupDriver,
    confirmDelivery,
    handleAddPayment,
    handleCamera,
    handleGallery,
    handleDeleteOrder,
    openRemiseModal,
    handleSaveRemise,
    handleSavePickupDate,
    handleSaveDeliveryDate,
    handleCaptureLocation,
    handleSaveAddress,
    handleSendSms,
    openDateEdit,
    openAddressModal,
    pickLangAndShare,
  };
}
