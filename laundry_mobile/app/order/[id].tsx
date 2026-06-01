import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { randomUUID } from '../../src/utils/uuid';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  Platform,
  Modal,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';
import * as Location from 'expo-location';
import { Image } from 'expo-image';
import { row, textAlign } from '../../src/utils/rtl';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { pendingMapResult } from '../../src/utils/pendingMapResult';
import { useSelector } from 'react-redux';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useOrderCreation } from '../../src/context/OrderCreationContext';
import { BASE_URL } from '../../src/services/api/client';
import { Colors, Shadows, StatusColors } from '../../constants/theme';
import { format } from 'date-fns';
import { fr, arDZ as ar } from 'date-fns/locale';
import * as ImagePicker from 'expo-image-picker';
import { useReceiptActions } from '../../src/hooks/useReceiptActions';
import { uploadManager } from '../../src/services/uploads';
import { useTranslation } from 'react-i18next';
import { useFormStyles } from '../../src/hooks/useFormStyles';
import DateTimePicker from '@react-native-community/datetimepicker';
import { calculateOrderFinancials } from '../../src/utils/orderFinancials';
import PaymentModal from '../../components/orders/modals/PaymentModal';
import DeliveryConfirmModal from '../../components/orders/modals/DeliveryConfirmModal';
import useOrderPermissions from '../../src/hooks/useOrderPermissions';
import ArticlesTab from '../../components/orders/tabs/ArticlesTab';
import HistoriqueTab from '../../components/orders/tabs/HistoriqueTab';
import { getWorkflowAction, OrderStatus, WorkflowAction, isDelivered } from '../../constants/orderWorkflow';
import { useOrder, useUpdateOrderStatus, useAddPayment, useAddOrderImages } from '../../src/hooks/query/useOrder';
import { useDriversList, usePickupDriversList, useAssignDeliveryDriver, useAssignPickupDriver } from '../../src/hooks/query/useDrivers';
import { useDeleteOrder } from '../../src/hooks/query/useOrders';
import { ordersApi } from '../../src/services/api/ordersApi';
import { adminApi } from '../../src/services/adminApi';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../src/services/query/queryKeys';
import * as Haptics from 'expo-haptics';
import { logger } from '../../src/lib/logger';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const log = logger.ns('order-detail');
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Entry point ─────────────────────────────────────────────────────────────
export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams();
  const currentUser = useSelector((state: any) => state.auth.user);
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
  const qc = useQueryClient();
  const { clearOrder, setPickupOrderId, setOrderNotes, setPickupImagesOnly, loadOrderForEditing } = useOrderCreation();

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { payments, history, refetch, isRefreshing } = useOrder(id as string);
  const { data: drivers = [], isLoading: driversLoading, isError: driversError } = useDriversList();
  const { data: pickupDrivers = [], isLoading: pickupDriversLoading } = usePickupDriversList();

  // ── Mutations ────────────────────────────────────────────────────────────────
  const updateStatusMutation = useUpdateOrderStatus();
  const addPaymentMutation = useAddPayment();
  const assignDriverMutation = useAssignDeliveryDriver();
  const assignPickupDriverMutation = useAssignPickupDriver();
  const deleteOrderMutation = useDeleteOrder();

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Delivery driver modal
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [deliveryDate, setDeliveryDate] = useState<Date>(new Date());
  const [showDeliveryDatePicker, setShowDeliveryDatePicker] = useState(false);

  // Pickup driver modal
  const [showPickupDriverModal, setShowPickupDriverModal] = useState(false);
  const [selectedPickupDriverId, setSelectedPickupDriverId] = useState<string | null>(null);

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  // Remise modal
  const [showRemiseModal, setShowRemiseModal] = useState(false);
  const [remiseForms, setRemiseForms] = useState<Record<number, { montant: string; raison: string }>>({});
  const [savingRemise, setSavingRemise] = useState(false);

  // Delivery confirm modal
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [collectedAmount, setCollectedAmount] = useState('0');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // ── Edit pickup date/time modal ──────────────────────────────────────────────
  const [showPickupDateModal, setShowPickupDateModal] = useState(false);
  const [pickupEditMode, setPickupEditMode] = useState<'date' | 'time'>('date');
  const [pickupEditDate, setPickupEditDate] = useState<Date>(new Date());
  const [pickupEditTime, setPickupEditTime] = useState<Date>(new Date());
  const [savingPickupDate, setSavingPickupDate] = useState(false);

  // ── Edit delivery date/time modal ────────────────────────────────────────────
  const [showDeliveryEditModal, setShowDeliveryEditModal] = useState(false);
  const [deliveryEditMode, setDeliveryEditMode] = useState<'date' | 'time'>('date');
  const [deliveryEditDate, setDeliveryEditDate] = useState<Date>(new Date());
  const [deliveryEditTime, setDeliveryEditTime] = useState<Date>(new Date());
  const [savingDeliveryDate, setSavingDeliveryDate] = useState(false);

  // ── Edit address modal ───────────────────────────────────────────────────────
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editAddressText, setEditAddressText] = useState('');
  const [editRegionText, setEditRegionText] = useState('');
  const [editGpsCoords, setEditGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [capturingLocation, setCapturingLocation] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  // ── Navigate away if order deleted ──────────────────────────────────────────
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

  // ── Consume map-picker result when returning from map screen ─────────────────
  useFocusEffect(useCallback(() => {
    const result = pendingMapResult.consume();
    if (result) {
      setEditAddressText(result.address);
      setEditRegionText(result.region);
      setEditGpsCoords({ lat: result.lat, lng: result.lng });
      setShowAddressModal(true);
    }
  }, []));

  // ── Permissions ──────────────────────────────────────────────────────────────
  const permissions = useOrderPermissions(currentUser, order);
  const { canEdit, canDelete, canAddPayment, canAssignPickupDriver, canAssignDriver, canChangeStatus } = permissions;
  const canEditOrder = canEdit && order.status === 'PENDING_PICKUP';

  // ── Financials ───────────────────────────────────────────────────────────────
  const financials = useMemo(() => calculateOrderFinancials(order?.montantTotal, order?.montantPaye), [order?.montantTotal, order?.montantPaye]);
  const { totalAmount, paidAmount, remaining, progressPercentage, fullyPaid } = financials;

  // ── Workflow ─────────────────────────────────────────────────────────────────
  const statusAction = useMemo(() => getWorkflowAction(order?.status as OrderStatus), [order?.status]);

  // ── Client helpers ───────────────────────────────────────────────────────────
  const getClientPhone = useCallback((client: any) => {
    if (!client) return '';
    if (client.phone) return client.phone;
    if (Array.isArray(client.phones) && client.phones.length > 0) return client.phones[0].phoneNumber;
    return '';
  }, []);

  const toWhatsAppNumber = useCallback((phone: string) => {
    let n = phone.replace(/[\s\-().]/g, '');
    if (n.startsWith('+')) n = n.slice(1);
    if (n.startsWith('0')) n = '212' + n.slice(1);
    return n;
  }, []);

  // Strips spaces/dashes so tel: URL is valid on iOS
  const toCallNumber = useCallback((phone: string) => {
    return phone.replace(/[\s\-().]/g, '');
  }, []);

  const clientPhone = getClientPhone(order.client);

  // ── Receipt actions ──────────────────────────────────────────────────────────
  const { sharingAction, handleShareWhatsApp, handlePrint } = useReceiptActions(id, order?.status, order?.numeroCommande, t, clientPhone, order);

  const pickLangAndShare = useCallback(() => {
    Alert.alert(t('receipt.choose_language', { defaultValue: 'Langue du reçu' }), '', [
      { text: '🇫🇷 Français', onPress: () => handleShareWhatsApp('fr') },
      { text: '🇲🇦 العربية', onPress: () => handleShareWhatsApp('ar') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }, [handleShareWhatsApp, t]);

  // ── Navigation ───────────────────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else {
      const role = currentUser?.role?.toLowerCase();
      if (role === 'livreur') router.replace('/(livreur)');
      else if (role === 'employe') router.replace('/(employe)');
      else router.replace('/(admin)/(tabs)');
    }
  }, [router, currentUser?.role]);

  // ── Status update ────────────────────────────────────────────────────────────
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

  // ── Driver assignment ────────────────────────────────────────────────────────
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

  // ── Delivery confirm ─────────────────────────────────────────────────────────
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

  // ── Payment ──────────────────────────────────────────────────────────────────
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

  // ── Photos ───────────────────────────────────────────────────────────────────
  const handleAddPhotos = useCallback(async (type: 'reception' | 'apres_traitement' | 'livraison') => {
    Alert.alert(t('common.add_photo', { defaultValue: 'Ajouter une photo' }), '', [
      {
        text: t('common.camera', { defaultValue: 'Caméra' }),
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') return;
          const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
          if (result.canceled) return;
          setUploadingImage(true);
          try {
            await Promise.all(result.assets.map(a => uploadManager.addImage(a.uri, id, type)));
            Alert.alert(t('common.info'), t('admin.orders.upload_queued'));
          } catch { Alert.alert(t('common.error'), t('common.error_msg')); }
          finally { setUploadingImage(false); }
        },
      },
      {
        text: t('common.gallery', { defaultValue: 'Galerie' }),
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') return;
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 1 });
          if (result.canceled) return;
          setUploadingImage(true);
          try {
            await Promise.all(result.assets.map(a => uploadManager.addImage(a.uri, id, type)));
            Alert.alert(t('common.info'), t('admin.orders.upload_queued'));
          } catch { Alert.alert(t('common.error'), t('common.error_msg')); }
          finally { setUploadingImage(false); }
        },
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }, [id, t]);

  // ── Delete order ─────────────────────────────────────────────────────────────
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

  // ── Open remise modal ────────────────────────────────────────────────────────
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

  // ── Save remise ───────────────────────────────────────────────────────────────
  const handleSaveRemise = useCallback(async () => {
    setSavingRemise(true);
    try {
      const tapis = (order.commandeTapis || []).map((item: any) => {
        const f = remiseForms[item.id];
        const montant = f ? parseFloat(f.montant) || 0 : 0;
        // Preserve existing item images so the backend doesn't archive them
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
    } finally {
      setSavingRemise(false);
    }
  }, [id, order.commandeTapis, order.version, remiseForms, qc, t]);

  // ── Save pickup date ─────────────────────────────────────────────────────────
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

  // ── Save delivery date ───────────────────────────────────────────────────────
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

  // ── Capture GPS for address modal ────────────────────────────────────────────
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

  // ── Save address ─────────────────────────────────────────────────────────────
  const handleSaveAddress = useCallback(async () => {
    if (!editAddressText.trim() && !editRegionText.trim() && !editGpsCoords) return;
    setSavingAddress(true);
    const addressValue = editAddressText.trim() || editRegionText.trim() || null;
    try {
      await adminApi.updateOrder(id, {
        ...(addressValue !== null && { deliveryAddress: addressValue }),
        ...(editGpsCoords !== null && {
          deliveryLatitude: editGpsCoords.lat,
          deliveryLongitude: editGpsCoords.lng,
        }),
        version: order.version,
      });
      setShowAddressModal(false);
      qc.invalidateQueries({ queryKey: queryKeys.orders.details(id) });
    } catch {
      Alert.alert(t('common.error'), t('common.error_msg'));
    } finally { setSavingAddress(false); }
  }, [id, editAddressText, editRegionText, editGpsCoords, order.version, qc, t]);

  // ── SMS ──────────────────────────────────────────────────────────────────────
  const handleSendSms = useCallback(() => {
    if (!clientPhone) return;
    const body = t('orders.sms_body', {
      defaultValue: `Bonjour, votre commande #${order.numeroCommande} est en cours de traitement. Merci de nous faire confiance — Astra Pro.`,
      numero: order.numeroCommande,
    });
    Linking.openURL(`sms:${toCallNumber(clientPhone)}${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(body)}`);
  }, [clientPhone, order.numeroCommande, t]);

  // ── Address+map section ──────────────────────────────────────────────────────
  const lat = order.deliveryLatitude ? parseFloat(order.deliveryLatitude) : order.client?.addresses?.[0]?.latitude ? parseFloat(order.client.addresses[0].latitude) : null;
  const lng = order.deliveryLongitude ? parseFloat(order.deliveryLongitude) : order.client?.addresses?.[0]?.longitude ? parseFloat(order.client.addresses[0].longitude) : null;
  const displayAddress = order.deliveryAddress || order.client?.addresses?.[0]?.address || '';

  // ── Workflow helpers ─────────────────────────────────────────────────────────
  const isReady = order.status === 'READY_FOR_DELIVERY';
  const isReadyNoDriver = isReady && !order.deliveryDriver;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* ── Header ── */}
      <SafeAreaView style={styles.header}>
        <View style={[styles.headerContent, row(isArabic)]}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={{ flex: 1, alignItems: 'center' }} onPress={() => order.client?.id && router.push(`/client/${order.client.id}` as any)}>
            <Text style={[styles.headerTitle, { textDecorationLine: 'underline' }]} numberOfLines={1}>{order.client?.name || `#${order.numeroCommande?.slice(-8)}`}</Text>
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

        {/* ── Status + phone + date row ── */}
        <View style={[styles.metaRow, row(isArabic)]}>
          <View style={[styles.statusPill, { backgroundColor: StatusColors[order.status]?.bg || Colors.primary50, borderColor: StatusColors[order.status]?.dot || Colors.primary }]}>
            <View style={[styles.statusDot, { backgroundColor: StatusColors[order.status]?.dot || Colors.primary }]} />
            <Text style={[styles.statusPillText, { color: StatusColors[order.status]?.text || Colors.primary }]}>
              {t(`status.${order.status}`, { defaultValue: order.status })}
            </Text>
          </View>
          {!!clientPhone && (
            <TouchableOpacity style={styles.phoneChip} onPress={() => Linking.openURL(`tel:${toCallNumber(clientPhone)}`)}>
              <Text style={styles.phoneChipText}>{clientPhone}</Text>
            </TouchableOpacity>
          )}
          {order.dateCreation && (
            <Text style={styles.metaDate}>
              {format(new Date(order.dateCreation), 'dd MMM · HH:mm', { locale: isArabic ? ar : fr })}
            </Text>
          )}
        </View>

        {/* ── Financial summary ── */}
        <View style={styles.financialCard}>
          {(() => {
            const totalM2 = (order.commandeTapis || []).reduce((acc: number, item: any) => acc + ((item.largeur || 0) * (item.hauteur || 0) * (item.quantite || 1)), 0);
            return [
              { label: t('orders.total_m2', { defaultValue: 'المساحة الإجمالية' }), value: `${totalM2.toFixed(2)} m²`, color: Colors.textPrimary },
              { label: t('financial.total'), value: `${totalAmount.toFixed(2)} ${t('common.dh')}`, color: Colors.textPrimary },
              { label: t('financial.paid'), value: `${paidAmount.toFixed(2)} ${t('common.dh')}`, color: fullyPaid ? Colors.success : Colors.warning },
              { label: t('financial.remaining'), value: fullyPaid ? '✓' : `${remaining.toFixed(2)} ${t('common.dh')}`, color: fullyPaid ? Colors.success : Colors.danger },
            ];
          })().map((row_, i) => (
            <View key={i} style={[styles.financialRow, row(isArabic), i < 3 && styles.financialRowBorder]}>
              <Text style={[styles.financialLabel, isArabic && { textAlign: 'right' }]}>{row_.label}</Text>
              <Text style={[styles.financialValue, { color: row_.color }]}>{row_.value}</Text>
            </View>
          ))}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercentage}%`, backgroundColor: fullyPaid ? Colors.success : Colors.warning }]} />
          </View>
        </View>

        {/* ── Workflow area ── */}
        {(() => {
          return (
            <View style={{ paddingHorizontal: 16, marginTop: 12, gap: 10 }}>
              {/* Settled banner */}
              {isDelivered(order.status) && fullyPaid && (
                <View style={styles.settledBanner}>
                  <Ionicons name="checkmark-done-circle" size={26} color={Colors.success} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.settledTitle, isArabic && { textAlign: 'right' }]}>{t('dashboard.all_settled')}</Text>
                    <Text style={[styles.settledSub, isArabic && { textAlign: 'right' }]}>{totalAmount.toFixed(2)} {t('common.dh')}</Text>
                  </View>
                </View>
              )}

              {/* Ready — no driver waiting */}
              {isReadyNoDriver && (permissions.isAdmin || permissions.isEmploye || permissions.isLivreur) && (
                <View style={styles.waitingBanner}>
                  <Ionicons name="time-outline" size={22} color="#0284C7" />
                  <Text style={[styles.waitingText, isArabic && { textAlign: 'right' }]}>{t('admin.orders.actions.waiting_driver')}</Text>
                </View>
              )}

              {/* Assign delivery driver */}
              {canAssignDriver && !order.deliveryDriver && (
                <TouchableOpacity style={styles.assignDriverBtn} onPress={() => { setSelectedDriverId(null); setDeliveryDate(new Date()); setShowDeliveryDatePicker(false); setShowDriverModal(true); }}>
                  <Feather name="truck" size={16} color={Colors.primary} />
                  <Text style={styles.assignDriverText}>{t('admin.orders.assign_driver')}</Text>
                </TouchableOpacity>
              )}

              {/* Pickup driver info row */}
              {order.livreur && (
                <View style={styles.driverInfoRow}>
                  <View style={[styles.driverInfoAvatar, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="person-outline" size={16} color="#D97706" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.driverInfoLabel}>{t('orders.pickup_driver', { defaultValue: 'Livreur de collecte' })}</Text>
                    <Text style={styles.driverInfoName}>{order.livreur.name}</Text>
                  </View>
                </View>
              )}

              {/* Delivery driver info row */}
              {order.deliveryDriver && (
                <View style={styles.driverInfoRow}>
                  <View style={[styles.driverInfoAvatar, { backgroundColor: '#DCFCE7' }]}>
                    <Ionicons name="car-outline" size={16} color="#16A34A" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.driverInfoLabel}>{t('orders.delivery_driver', { defaultValue: 'Livreur de livraison' })}</Text>
                    <Text style={styles.driverInfoName}>{order.deliveryDriver.name}</Text>
                  </View>
                </View>
              )}

            </View>
          );
        })()}

        {/* ── Date/time edit buttons ── */}
        {(permissions.isAdmin || permissions.isEmploye || permissions.isLivreur) && !isDelivered(order.status) && order.status !== 'CANCELLED' && (() => {
          const isPickup = order.status === 'PENDING_PICKUP';
          const isReadyForDelivery = order.status === 'READY_FOR_DELIVERY';
          const isLocked = !isPickup && !isReadyForDelivery;

          const openPickupDate = (mode: 'date' | 'time') => {
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
          };

          const dateLabel = isReadyForDelivery
            ? t('orders.edit_delivery_date', { defaultValue: 'تعديل تاريخ التوصيل' })
            : t('orders.edit_pickup_date', { defaultValue: 'تعديل تاريخ الاستلام' });
          const timeLabel = isReadyForDelivery
            ? t('orders.edit_delivery_time', { defaultValue: 'تعديل وقت التوصيل' })
            : t('orders.edit_pickup_time', { defaultValue: 'تعديل وقت الاستلام' });

          return (
            <View style={[styles.twoColRow, { marginHorizontal: 16, marginTop: 10 }]}>
              <TouchableOpacity
                style={[styles.secondaryActionBtn, { flex: 1 }, isLocked && { opacity: 0.45 }]}
                onPress={() => openPickupDate('date')}
              >
                <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
                <Text style={styles.secondaryActionBtnText}>{dateLabel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryActionBtn, { flex: 1 }, isLocked && { opacity: 0.45 }]}
                onPress={() => openPickupDate('time')}
              >
                <Ionicons name="time-outline" size={16} color={Colors.primary} />
                <Text style={styles.secondaryActionBtnText}>{timeLabel}</Text>
              </TouchableOpacity>
            </View>
          );
        })()}

        {/* ── سلة / Items section ── */}
        <View style={[styles.sectionHeader, row(isArabic), { marginTop: 20 }]}>
          <Text style={[styles.sectionTitle, f.sectionLabel]}>{t('admin.orders.title')}</Text>
          <Ionicons name="cart-outline" size={18} color={Colors.textMuted} />
        </View>

        {/* Action grid */}
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {/* Row 1: Edit order | Change status | Edit address */}
          <View style={[styles.twoColRow, { gap: 10 }]}>
            {(permissions.isAdmin || permissions.isEmploye || permissions.isLivreur) && (
              <TouchableOpacity
                style={[styles.gridBtn, { backgroundColor: Colors.primary, flex: 1 }]}
                onPress={() => { clearOrder(); loadOrderForEditing(order); router.push('/(admin)/order-items'); }}
              >
                <Feather name="edit-3" size={16} color="white" />
                <Text style={[styles.gridBtnText, { color: 'white' }]}>{t('orders.edit_order', { defaultValue: 'تعديل الطلبية' })}</Text>
              </TouchableOpacity>
            )}
            {canChangeStatus && statusAction && !isDelivered(order.status) && (
              <TouchableOpacity
                style={[styles.gridBtn, { backgroundColor: statusAction.bg, flex: 1 }]}
                onPress={() => handleUpdateStatus(statusAction)}
                disabled={updateStatusMutation.isPending}
              >
                <Feather name="refresh-cw" size={16} color="white" />
                <Text style={[styles.gridBtnText, { color: 'white' }]}>{t(statusAction.labelKey, { defaultValue: t('orders.change_status') })}</Text>
              </TouchableOpacity>
            )}
            {(permissions.isAdmin || permissions.isEmploye || permissions.isLivreur) && !isDelivered(order.status) && (
              <TouchableOpacity
                style={[styles.gridBtn, { backgroundColor: '#8B5CF6', flex: 1 }]}
                onPress={() => {
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
                }}
              >
                <Ionicons name="location-outline" size={16} color="white" />
                <Text style={[styles.gridBtnText, { color: 'white' }]}>{t('orders.edit_address', { defaultValue: 'تعديل العنوان' })}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Row 2: Add payment | Remise | Send SMS */}
          <View style={[styles.twoColRow, { gap: 10 }]}>
            {canAddPayment && (
              <TouchableOpacity
                style={[styles.gridBtn, { backgroundColor: Colors.success, flex: 1 }]}
                onPress={() => setShowPaymentModal(true)}
              >
                <Ionicons name="cash-outline" size={16} color="white" />
                <Text style={[styles.gridBtnText, { color: 'white' }]}>{t('orders.add_payment', { defaultValue: 'إضافة دفعة' })}</Text>
              </TouchableOpacity>
            )}
            {(permissions.isAdmin || permissions.isEmploye) && (order.commandeTapis?.length > 0) && (
              <TouchableOpacity
                style={[styles.gridBtn, { backgroundColor: '#F59E0B', flex: 1 }]}
                onPress={openRemiseModal}
              >
                <Ionicons name="pricetag-outline" size={16} color="white" />
                <Text style={[styles.gridBtnText, { color: 'white' }]}>{t('orders.remise', { defaultValue: 'Remise' })}</Text>
              </TouchableOpacity>
            )}
            {!!clientPhone && (
              <TouchableOpacity
                style={[styles.gridBtn, { backgroundColor: '#0EA5E9', flex: 1 }]}
                onPress={handleSendSms}
              >
                <Ionicons name="chatbubble-outline" size={16} color="white" />
                <Text style={[styles.gridBtnText, { color: 'white' }]}>{t('orders.send_sms', { defaultValue: 'إرسال رسالة نصية' })}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Row 3: Camera | Gallery */}
          {(permissions.isAdmin || permissions.isEmploye || permissions.isLivreur) && (() => {
            const photoType: string = order.status.toLowerCase();
            return (
              <View style={[styles.twoColRow, { gap: 10 }]}>
                <TouchableOpacity
                  style={[styles.gridBtn, { backgroundColor: '#0F172A', flex: 1 }]}
                  onPress={async () => {
                    const { status } = await ImagePicker.requestCameraPermissionsAsync();
                    if (status !== 'granted') return;
                    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
                    if (result.canceled) return;
                    setUploadingImage(true);
                    try {
                      await Promise.all(result.assets.map((a: any) => uploadManager.addImage(a.uri, id, photoType)));
                      Alert.alert(t('common.info'), t('admin.orders.upload_queued'));
                    } catch { Alert.alert(t('common.error'), t('common.error_msg')); }
                    finally { setUploadingImage(false); }
                  }}
                >
                  <Ionicons name="camera-outline" size={16} color="white" />
                  <Text style={[styles.gridBtnText, { color: 'white' }]}>{t('orders.take_photo', { defaultValue: 'التقاط صورة' })}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.gridBtn, { backgroundColor: '#475569', flex: 1 }]}
                  onPress={async () => {
                    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (status !== 'granted') return;
                    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 1 });
                    if (result.canceled) return;
                    setUploadingImage(true);
                    try {
                      await Promise.all(result.assets.map((a: any) => uploadManager.addImage(a.uri, id, photoType)));
                      Alert.alert(t('common.info'), t('admin.orders.upload_queued'));
                    } catch { Alert.alert(t('common.error'), t('common.error_msg')); }
                    finally { setUploadingImage(false); }
                  }}
                >
                  <Ionicons name="images-outline" size={16} color="white" />
                  <Text style={[styles.gridBtnText, { color: 'white' }]}>{t('orders.from_gallery', { defaultValue: 'من المعرض' })}</Text>
                </TouchableOpacity>
              </View>
            );
          })()}

          {/* Row 4: WhatsApp receipt | Print */}
          <View style={[styles.twoColRow, { gap: 10 }]}>
            <TouchableOpacity
              style={[styles.gridBtn, { backgroundColor: '#25D366', flex: 1 }]}
              onPress={pickLangAndShare}
              disabled={!!sharingAction}
            >
              {sharingAction === 'whatsapp'
                ? <ActivityIndicator size="small" color="white" />
                : <Ionicons name="logo-whatsapp" size={16} color="white" />}
              <Text style={[styles.gridBtnText, { color: 'white' }]}>{t('orders.whatsapp_receipt', { defaultValue: 'واتساب الوصل' })}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.gridBtn, { backgroundColor: '#64748B', flex: 1 }]}
              onPress={handlePrint}
              disabled={sharingAction === 'print'}
            >
              {sharingAction === 'print'
                ? <ActivityIndicator size="small" color="white" />
                : <Ionicons name="print-outline" size={16} color="white" />}
              <Text style={[styles.gridBtnText, { color: 'white' }]}>{t('orders.print', { defaultValue: 'طباعة' })}</Text>
            </TouchableOpacity>
          </View>

          {/* Row 4: Edit responsible (drivers) — full width */}
          {(permissions.isAdmin || permissions.isEmploye || permissions.isLivreur) && (
            <TouchableOpacity
              style={[styles.gridBtn, { backgroundColor: '#F59E0B', width: '100%' }]}
              onPress={() => {
                if (order.status === 'PENDING_PICKUP') {
                  setSelectedPickupDriverId(order.livreur?.id ? String(order.livreur.id) : null);
                  setShowPickupDriverModal(true);
                } else {
                  setSelectedDriverId(order.deliveryDriver?.id || null);
                  setDeliveryDate(order.dateLivraisonPrevue ? new Date(order.dateLivraisonPrevue) : new Date());
                  setShowDriverModal(true);
                }
              }}
            >
              <Ionicons name="people-outline" size={16} color="white" />
              <Text style={[styles.gridBtnText, { color: 'white' }]}>{t('orders.edit_responsible', { defaultValue: 'تعديل المسؤولين' })}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Photos section ── */}
        {(order.images && order.images.length > 0) && (
          <>
            <View style={[styles.sectionHeader, row(isArabic), { marginTop: 20 }]}>
              <Text style={[styles.sectionTitle, f.sectionLabel]}>{t('orders.photo_gallery', { defaultValue: 'معرض الصور' })}</Text>
              <Ionicons name="images-outline" size={18} color={Colors.textMuted} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[row(isArabic), { gap: 10, paddingHorizontal: 16 }]}>
              {order.images.map((img: any, idx: number) => (
                <TouchableOpacity key={idx} onPress={() => setViewImage(`${BASE_URL}${img.imageUrl}`)}>
                  <Image source={{ uri: `${BASE_URL}${img.imageUrl}` }} style={styles.galleryImg} contentFit="cover" transition={150} cachePolicy="memory-disk" recyclingKey={`${img.id}-${img.imageUrl}`} />
                  <View style={[styles.imgBadge, isArabic ? { left: 6, right: undefined } : { right: 6 }]}>
                    <Text style={styles.imgBadgeText}>
                      {(() => {
                        const statusMap: Record<string, string> = {
                          pending_pickup: t('status.PENDING_PICKUP'),
                          picked_up: t('status.PICKED_UP'),
                          reception: t('status.PICKED_UP'),
                          in_process: t('status.IN_PROCESS'),
                          apres_traitement: t('status.IN_PROCESS'),
                          ready_for_delivery: t('status.READY_FOR_DELIVERY'),
                          delivered: t('status.DELIVERED'),
                          livraison: t('status.DELIVERED'),
                          pickup_failed: t('status.PICKUP_FAILED'),
                          delivery_failed: t('status.DELIVERY_FAILED'),
                          cancelled: t('status.CANCELLED'),
                        };
                        return statusMap[img.photoType] || img.photoType;
                      })()}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* ── Articles ── */}
        {order.commandeTapis?.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <ArticlesTab order={order} isArabic={isArabic} t={t} setViewImage={setViewImage} BASE_URL={BASE_URL} />
          </View>
        )}


        {/* ── Address + Map ── */}
        {(displayAddress || (lat && lng)) && (
          <>
            <View style={[styles.sectionHeader, row(isArabic), { marginTop: 20 }]}>
              <Text style={[styles.sectionTitle, f.sectionLabel]}>{t('admin.clients.address')}</Text>
              <Ionicons name="location-outline" size={18} color={Colors.textMuted} />
            </View>
            {!!displayAddress && (
              <Text style={[styles.addressText, isArabic && { textAlign: 'right', paddingHorizontal: 16 }]}>{displayAddress}</Text>
            )}
            {lat && lng && (
              <View style={styles.mapWrapper}>
                <MapView
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  pitchEnabled={false}
                  rotateEnabled={false}
                  initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.005, longitudeDelta: 0.005 }}
                >
                  <Marker coordinate={{ latitude: lat, longitude: lng }}>
                    <View style={styles.markerContainer}>
                      <View style={styles.markerPin} />
                    </View>
                  </Marker>
                </MapView>
                <TouchableOpacity
                  style={[styles.openMapBtn, isArabic ? { left: 12, right: undefined } : { right: 12 }]}
                  onPress={() => Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`)}
                >
                  <Text style={styles.openMapText}>{t('admin.clients.map')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* ── Timeline / Audit — ADMIN and EMPLOYE only ── */}
        {(permissions.isAdmin || permissions.isEmploye) && (
          <>
            <View style={[styles.sectionHeader, row(isArabic), { marginTop: 20 }]}>
              <Text style={[styles.sectionTitle, f.sectionLabel]}>{t('admin.orders.history')}</Text>
              <Ionicons name="time-outline" size={18} color={Colors.textMuted} />
            </View>
            <HistoriqueTab orderId={id} />
          </>
        )}

        {/* ── Delete button (admin only) ── */}
        {canDelete && (
          <TouchableOpacity style={styles.deleteFullBtn} onPress={handleDeleteOrder}>
            <Ionicons name="trash-outline" size={18} color="white" />
            <Text style={styles.deleteFullBtnText}>{t('common.supprimer')}</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Sticky bottom bar ── */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={[styles.bottomBarInner, row(isArabic)]}>
          <TouchableOpacity
            style={[styles.bottomBarBtn, { backgroundColor: '#25D366' }]}
            onPress={() => clientPhone && Linking.openURL(`https://wa.me/${toWhatsAppNumber(clientPhone)}`)}
            disabled={!clientPhone}
          >
            <Ionicons name="logo-whatsapp" size={22} color="white" />
            <Text style={styles.bottomBarBtnText}>{t('common.whatsapp')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bottomBarBtn, { backgroundColor: '#0F172A' }]}
            onPress={() => clientPhone && Linking.openURL(`tel:${toCallNumber(clientPhone)}`)}
            disabled={!clientPhone}
          >
            <Ionicons name="call-outline" size={22} color="white" />
            <Text style={styles.bottomBarBtnText}>{t('common.call')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Delivery Driver Modal ── */}
      <Modal visible={showDriverModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismiss} activeOpacity={1} onPress={() => setShowDriverModal(false)} />
          <View style={[styles.modalSheet, { height: '82%' }]}>
            <View style={styles.modalHandle} />
            <View style={[styles.modalHeaderRow, row(isArabic)]}>
              <View style={styles.modalIconBadge}><Feather name="truck" size={20} color={Colors.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, isArabic && { textAlign: 'right' }]}>{t('admin.orders.assign_driver')}</Text>
                <Text style={[styles.modalSubtitle, isArabic && { textAlign: 'right' }]}>#{order.numeroCommande}</Text>
              </View>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              <View style={styles.modalBody}>
                <TouchableOpacity
                  style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: Colors.primary100, borderWidth: 1, borderColor: Colors.primary }, row(isArabic)]}
                  onPress={() => setShowDeliveryDatePicker(true)}
                >
                  <Text style={[styles.inputLabel, { marginBottom: 0 }, isArabic && { textAlign: 'right' }]}>{t('admin.orders.create.delivery_date')}</Text>
                  <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: 13 }}>{format(deliveryDate, 'dd MMM yyyy', { locale: isArabic ? ar : fr })}</Text>
                </TouchableOpacity>
                {showDeliveryDatePicker && (
                  <DateTimePicker value={deliveryDate} mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'} themeVariant="light"
                    onChange={(e, d) => { if (Platform.OS === 'android') { setShowDeliveryDatePicker(false); if (e.type === 'set' && d) setDeliveryDate(d); } else { if (d) setDeliveryDate(d); } }}
                  />
                )}
                <Text style={[styles.inputLabel, { marginTop: 24 }, isArabic && { textAlign: 'right' }]}>{t('admin.orders.filter_driver')}</Text>
                {driversLoading && <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 16 }} />}
                {!driversLoading && driversError && <Text style={{ color: Colors.danger, textAlign: 'center', padding: 16 }}>{t('common.error_msg')}</Text>}
                {!driversLoading && !driversError && drivers.length === 0 && <Text style={{ color: Colors.textMuted, textAlign: 'center', padding: 16 }}>{t('admin.orders.no_drivers')}</Text>}
                {drivers.map((driver: any) => {
                  const selected = selectedDriverId === driver.id;
                  return (
                    <TouchableOpacity key={driver.id} style={[styles.driverOption, selected && styles.driverOptionSelected, row(isArabic)]} onPress={() => setSelectedDriverId(driver.id)} activeOpacity={0.75}>
                      <View style={[styles.driverAvatarSmall, { backgroundColor: selected ? 'rgba(255,255,255,0.25)' : Colors.primary100 }]}>
                        <Text style={[styles.driverAvatarText, { color: selected ? 'white' : Colors.primaryDark }]}>{driver.name?.[0]?.toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.driverOptionName, selected && { color: 'white' }]}>{driver.name}</Text>
                        {driver.phone && <Text style={{ fontSize: 12, color: selected ? 'rgba(255,255,255,0.75)' : Colors.textMuted, marginTop: 2 }}>{driver.phone}</Text>}
                      </View>
                      {selected ? <Ionicons name="checkmark-circle" size={22} color="white" /> : <View style={styles.driverRadioEmpty} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            <View style={[styles.modalActions, row(isArabic)]}>
              <TouchableOpacity style={[styles.secondaryModalBtn, { flex: 1 }]} onPress={() => setShowDriverModal(false)}>
                <Text style={styles.secondaryModalBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryModalBtn, { flex: 1.5 }, !selectedDriverId && { opacity: 0.5 }]} onPress={handleAssignAndMarkReady} disabled={!selectedDriverId || assignDriverMutation.isPending || updateStatusMutation.isPending}>
                {(assignDriverMutation.isPending || updateStatusMutation.isPending) ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.primaryModalBtnText}>{t('common.confirm')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Pickup Driver Modal ── */}
      <Modal visible={showPickupDriverModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismiss} activeOpacity={1} onPress={() => setShowPickupDriverModal(false)} />
          <View style={[styles.modalSheet, { height: '70%' }]}>
            <View style={styles.modalHandle} />
            <View style={[styles.modalHeaderRow, row(isArabic)]}>
              <View style={[styles.modalIconBadge, { backgroundColor: '#FEF3C7' }]}><Feather name="package" size={20} color="#D97706" /></View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, isArabic && { textAlign: 'right' }]}>{t('orders.assign_pickup_driver')}</Text>
                <Text style={[styles.modalSubtitle, isArabic && { textAlign: 'right' }]}>#{order.numeroCommande}</Text>
              </View>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              <View style={styles.modalBody}>
                <Text style={[styles.inputLabel, isArabic && { textAlign: 'right' }]}>{t('admin.orders.filter_driver')}</Text>
                {pickupDriversLoading && <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 16 }} />}
                {!pickupDriversLoading && pickupDrivers.length === 0 && <Text style={{ color: Colors.textMuted, textAlign: 'center', padding: 16 }}>{t('admin.orders.no_drivers')}</Text>}
                {pickupDrivers.map((driver: any) => {
                  const selected = selectedPickupDriverId === String(driver.id);
                  return (
                    <TouchableOpacity key={driver.id} style={[styles.driverOption, selected && styles.driverOptionSelected, row(isArabic)]} onPress={() => setSelectedPickupDriverId(String(driver.id))} activeOpacity={0.75}>
                      <View style={[styles.driverAvatarSmall, { backgroundColor: selected ? 'rgba(255,255,255,0.25)' : Colors.primary100 }]}>
                        <Text style={[styles.driverAvatarText, { color: selected ? 'white' : Colors.primaryDark }]}>{driver.name?.[0]?.toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.driverOptionName, selected && { color: 'white' }]}>{driver.name}</Text>
                        {driver.phone && <Text style={{ fontSize: 12, color: selected ? 'rgba(255,255,255,0.75)' : Colors.textMuted, marginTop: 2 }}>{driver.phone}</Text>}
                      </View>
                      {selected ? <Ionicons name="checkmark-circle" size={22} color="white" /> : <View style={styles.driverRadioEmpty} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            <View style={[styles.modalActions, row(isArabic)]}>
              <TouchableOpacity style={[styles.secondaryModalBtn, { flex: 1 }]} onPress={() => setShowPickupDriverModal(false)}>
                <Text style={styles.secondaryModalBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryModalBtn, { flex: 1.5, backgroundColor: '#D97706' }, !selectedPickupDriverId && { opacity: 0.5 }]} onPress={handleAssignPickupDriver} disabled={!selectedPickupDriverId || assignPickupDriverMutation.isPending}>
                {assignPickupDriverMutation.isPending ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.primaryModalBtnText}>{t('common.confirm')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Edit Pickup Date/Time Modal ── */}
      <Modal visible={showPickupDateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismiss} activeOpacity={1} onPress={() => setShowPickupDateModal(false)} />
          <View style={[styles.modalSheet, { height: 'auto' }]}>
            <View style={styles.modalHandle} />
            <View style={[styles.modalHeaderRow, row(isArabic)]}>
              <View style={[styles.modalIconBadge, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name={pickupEditMode === 'date' ? 'calendar-outline' : 'time-outline'} size={20} color="#7C3AED" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, isArabic && { textAlign: 'right' }]}>
                  {pickupEditMode === 'date'
                    ? t('orders.edit_pickup_date', { defaultValue: 'تعديل تاريخ الاستلام' })
                    : t('orders.edit_pickup_time', { defaultValue: 'تعديل وقت الاستلام' })}
                </Text>
                <Text style={[styles.modalSubtitle, isArabic && { textAlign: 'right' }]}>#{order.numeroCommande}</Text>
              </View>
            </View>
            <View style={styles.modalBody}>
              {pickupEditMode === 'date' ? (
                <>
                  <Text style={[styles.inputLabel, { color: '#7C3AED' }, isArabic && { textAlign: 'right' }]}>
                    {format(pickupEditDate, 'dd MMM yyyy', { locale: isArabic ? ar : fr })}
                  </Text>
                  <DateTimePicker
                    value={pickupEditDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    themeVariant="light"
                    onChange={(e, d) => { if (Platform.OS === 'android') { setShowPickupDateModal(false); if (e.type === 'set' && d) setPickupEditDate(d); } else { if (d) setPickupEditDate(d); } }}
                  />
                </>
              ) : (
                <>
                  <Text style={[styles.inputLabel, { color: '#7C3AED' }, isArabic && { textAlign: 'right' }]}>
                    {format(pickupEditTime, 'HH:mm')}
                  </Text>
                  <DateTimePicker
                    value={pickupEditTime}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    themeVariant="light"
                    is24Hour
                    onChange={(e, d) => { if (Platform.OS === 'android') { setShowPickupDateModal(false); if (e.type === 'set' && d) setPickupEditTime(d); } else { if (d) setPickupEditTime(d); } }}
                  />
                </>
              )}
            </View>
            <View style={[styles.modalActions, row(isArabic), { margin: 24, marginTop: 8 }]}>
              <TouchableOpacity style={[styles.secondaryModalBtn, { flex: 1 }]} onPress={() => setShowPickupDateModal(false)}>
                <Text style={styles.secondaryModalBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryModalBtn, { flex: 1.5, backgroundColor: '#7C3AED' }]} onPress={handleSavePickupDate} disabled={savingPickupDate}>
                {savingPickupDate ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.primaryModalBtnText}>{t('common.save')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Edit Delivery Date/Time Modal ── */}
      <Modal visible={showDeliveryEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismiss} activeOpacity={1} onPress={() => setShowDeliveryEditModal(false)} />
          <View style={[styles.modalSheet, { height: 'auto' }]}>
            <View style={styles.modalHandle} />
            <View style={[styles.modalHeaderRow, row(isArabic)]}>
              <View style={[styles.modalIconBadge, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name={deliveryEditMode === 'date' ? 'calendar-outline' : 'time-outline'} size={20} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, isArabic && { textAlign: 'right' }]}>
                  {deliveryEditMode === 'date'
                    ? t('orders.edit_delivery_date', { defaultValue: 'تعديل تاريخ التوصيل' })
                    : t('orders.edit_delivery_time', { defaultValue: 'تعديل وقت التوصيل' })}
                </Text>
                <Text style={[styles.modalSubtitle, isArabic && { textAlign: 'right' }]}>#{order.numeroCommande}</Text>
              </View>
            </View>
            <View style={styles.modalBody}>
              {deliveryEditMode === 'date' ? (
                <>
                  <Text style={[styles.inputLabel, { color: '#059669' }, isArabic && { textAlign: 'right' }]}>
                    {format(deliveryEditDate, 'dd MMM yyyy', { locale: isArabic ? ar : fr })}
                  </Text>
                  <DateTimePicker
                    value={deliveryEditDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    themeVariant="light"
                    onChange={(e, d) => { if (Platform.OS === 'android') { setShowDeliveryEditModal(false); if (e.type === 'set' && d) setDeliveryEditDate(d); } else { if (d) setDeliveryEditDate(d); } }}
                  />
                </>
              ) : (
                <>
                  <Text style={[styles.inputLabel, { color: '#059669' }, isArabic && { textAlign: 'right' }]}>
                    {format(deliveryEditTime, 'HH:mm')}
                  </Text>
                  <DateTimePicker
                    value={deliveryEditTime}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    themeVariant="light"
                    is24Hour
                    onChange={(e, d) => { if (Platform.OS === 'android') { setShowDeliveryEditModal(false); if (e.type === 'set' && d) setDeliveryEditTime(d); } else { if (d) setDeliveryEditTime(d); } }}
                  />
                </>
              )}
            </View>
            <View style={[styles.modalActions, row(isArabic), { margin: 24, marginTop: 8 }]}>
              <TouchableOpacity style={[styles.secondaryModalBtn, { flex: 1 }]} onPress={() => setShowDeliveryEditModal(false)}>
                <Text style={styles.secondaryModalBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryModalBtn, { flex: 1.5, backgroundColor: '#059669' }]} onPress={handleSaveDeliveryDate} disabled={savingDeliveryDate}>
                {savingDeliveryDate ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.primaryModalBtnText}>{t('common.save')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Edit Address Modal ── */}
      <Modal visible={showAddressModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismiss} activeOpacity={1} onPress={() => setShowAddressModal(false)} />
          <View style={[styles.modalSheet, { maxHeight: '90%' }]}>
            <View style={styles.modalHandle} />
            <View style={[styles.modalHeaderRow, row(isArabic)]}>
              <View style={[styles.modalIconBadge, { backgroundColor: '#F3E8FF' }]}>
                <Ionicons name="location-outline" size={20} color="#8B5CF6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, isArabic && { textAlign: 'right' }]}>
                  {t('orders.edit_address', { defaultValue: 'تعديل العنوان' })}
                </Text>
                <Text style={[styles.modalSubtitle, isArabic && { textAlign: 'right' }]}>
                  {order.client?.name || `#${order.numeroCommande}`}
                </Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={[styles.modalBody, { gap: 12 }]}>

                {/* Region field */}
                <View>
                  <Text style={[styles.inputLabel, isArabic && { textAlign: 'right' }]}>
                    {t('admin.orders.create.region_label', { defaultValue: 'Quartier / Région' })}
                  </Text>
                  <TextInput
                    style={[styles.addrInput, isArabic && { textAlign: 'right' }]}
                    value={editRegionText}
                    onChangeText={setEditRegionText}
                    placeholder={t('admin.orders.create.region_placeholder', { defaultValue: 'Ex: Agadir, Guéliz...' })}
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                {/* Address field */}
                <View>
                  <Text style={[styles.inputLabel, isArabic && { textAlign: 'right' }]}>
                    {t('admin.clients.address', { defaultValue: 'Adresse' })}
                  </Text>
                  <TextInput
                    style={[styles.addrInput, { minHeight: 72, textAlignVertical: 'top', paddingTop: 12 }, isArabic && { textAlign: 'right' }]}
                    value={editAddressText}
                    onChangeText={setEditAddressText}
                    placeholder={t('admin.clients.address')}
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={3}
                  />
                </View>

                {/* GPS + Map buttons row */}
                <View style={[styles.twoColRow]}>
                  <TouchableOpacity
                    style={[styles.addrLocBtn, { backgroundColor: '#0D1B2A', flex: 1 }, row(isArabic)]}
                    onPress={handleCaptureLocation}
                    disabled={capturingLocation}
                  >
                    {capturingLocation
                      ? <ActivityIndicator size="small" color="white" />
                      : <Ionicons name="locate" size={18} color="white" />}
                    <Text style={styles.addrLocBtnText}>
                      {t('admin.orders.create.location_gps', { defaultValue: 'GPS' })}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.addrLocBtn, { backgroundColor: Colors.primary, flex: 1 }, row(isArabic)]}
                    onPress={() => {
                      setShowAddressModal(false);
                      router.push({ pathname: '/(admin)/map-picker', params: { returnTo: 'order-address' } } as any);
                    }}
                  >
                    <Ionicons name="map" size={18} color="white" />
                    <Text style={styles.addrLocBtnText}>
                      {t('admin.orders.create.location_map', { defaultValue: 'Carte' })}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Coords display when GPS/map result available */}
                {editGpsCoords && (
                  <View style={[styles.addrCoordsRow, row(isArabic)]}>
                    <Ionicons name="location" size={14} color="#8B5CF6" />
                    <Text style={styles.addrCoordsText}>
                      {editGpsCoords.lat.toFixed(5)}, {editGpsCoords.lng.toFixed(5)}
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={[styles.modalActions, row(isArabic), { margin: 24, marginTop: 12 }]}>
              <TouchableOpacity style={[styles.secondaryModalBtn, { flex: 1 }]} onPress={() => setShowAddressModal(false)}>
                <Text style={styles.secondaryModalBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryModalBtn, { flex: 1.5, backgroundColor: '#8B5CF6' },
                  (!editAddressText.trim() && !editRegionText.trim() && !editGpsCoords) && { opacity: 0.5 }]}
                onPress={handleSaveAddress}
                disabled={savingAddress || (!editAddressText.trim() && !editRegionText.trim() && !editGpsCoords)}
              >
                {savingAddress ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.primaryModalBtnText}>{t('common.save')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Remise Modal ── */}
      <Modal
        visible={showRemiseModal}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={() => setShowRemiseModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.remiseCenteredOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setShowRemiseModal(false)} />
          <View style={styles.remiseCenteredCard}>
            {/* Header */}
            <View style={[styles.modalHeaderRow, row(isArabic), { marginBottom: 16 }]}>
              <View style={[styles.modalIconBadge, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="pricetag-outline" size={20} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, isArabic && { textAlign: 'right' }]}>
                  {t('orders.remise', { defaultValue: 'Remise' })}
                </Text>
                <Text style={[styles.modalSubtitle, isArabic && { textAlign: 'right' }]}>#{order.numeroCommande}</Text>
              </View>
            </View>

            {/* Scrollable items */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={{ flexShrink: 1 }}
              contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
            >
              {(order.commandeTapis || []).map((item: any) => {
                const f = remiseForms[item.id] || { montant: '', raison: '' };
                const basePrice = parseFloat(item.prixFinal || 0) + parseFloat(item.remiseMontant || 0);
                return (
                  <View key={item.id} style={{ backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' }}>
                    <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }, row(isArabic)]}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.textPrimary, flex: 1 }} numberOfLines={1}>
                        {item.productNom || item.nom}
                      </Text>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: Colors.primary }}>
                        {basePrice.toFixed(2)} {t('common.dh')}
                      </Text>
                    </View>
                    <Text style={[styles.inputLabel, isArabic && { textAlign: 'right' }]}>
                      {t('admin.orders.create.items.remise_amount', { defaultValue: 'Remise' })} ({t('common.dh')})
                    </Text>
                    <TextInput
                      style={[styles.addrInput, { marginBottom: 8 }, isArabic && { textAlign: 'right' }]}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor="#94A3B8"
                      value={f.montant}
                      onChangeText={v => setRemiseForms(prev => ({ ...prev, [item.id]: { ...prev[item.id], montant: v } }))}
                    />
                    {!!f.montant && parseFloat(f.montant) > 0 && (
                      <>
                        <Text style={[styles.inputLabel, isArabic && { textAlign: 'right' }]}>
                          {t('admin.orders.create.items.remise_reason', { defaultValue: 'Raison' })}
                        </Text>
                        <TextInput
                          style={[styles.addrInput, isArabic && { textAlign: 'right' }]}
                          placeholder={t('admin.orders.create.items.remise_reason_placeholder', { defaultValue: 'Ex: client fidèle...' })}
                          placeholderTextColor="#94A3B8"
                          value={f.raison}
                          onChangeText={v => setRemiseForms(prev => ({ ...prev, [item.id]: { ...prev[item.id], raison: v } }))}
                        />
                      </>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            {/* Actions */}
            <View style={[styles.modalActions, row(isArabic), { marginTop: 16 }]}>
              <TouchableOpacity style={[styles.secondaryModalBtn, { flex: 1 }]} onPress={() => setShowRemiseModal(false)}>
                <Text style={styles.secondaryModalBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryModalBtn, { flex: 1.5, backgroundColor: '#D97706' }]}
                onPress={handleSaveRemise}
                disabled={savingRemise}
              >
                {savingRemise
                  ? <ActivityIndicator color="white" size="small" />
                  : <Text style={styles.primaryModalBtnText}>{t('common.save')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Payment Modal ── */}
      <PaymentModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSubmit={handleAddPayment}
        remaining={remaining}
        loading={addPaymentMutation.isPending}
        paymentAmount={paymentAmount}
        setPaymentAmount={setPaymentAmount}
        paymentNote={paymentNote}
        setPaymentNote={setPaymentNote}
        isArabic={isArabic}
        t={t}
      />

      {/* ── Delivery Confirm Modal ── */}
      <DeliveryConfirmModal
        visible={showDeliveryModal}
        onClose={() => setShowDeliveryModal(false)}
        onConfirm={confirmDelivery}
        totalAmount={totalAmount}
        remainingAmount={remaining}
        collectedAmount={collectedAmount}
        setCollectedAmount={setCollectedAmount}
        deliveryNotes={deliveryNotes}
        setDeliveryNotes={setDeliveryNotes}
        confirmingDelivery={updateStatusMutation.isPending}
        isArabic={isArabic}
        t={t}
      />

      {/* ── Image fullscreen viewer ── */}
      <Modal visible={!!viewImage} transparent animationType="fade" onRequestClose={() => setViewImage(null)}>
        <View style={styles.imagePreviewOverlay}>
          <TouchableOpacity style={styles.imagePreviewClose} onPress={() => setViewImage(null)}>
            <Ionicons name="close" size={30} color="white" />
          </TouchableOpacity>
          {viewImage && <Image source={{ uri: viewImage }} style={styles.fullImage} contentFit="contain" cachePolicy="memory-disk" />}
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: { backgroundColor: 'white', ...Shadows.sm, zIndex: 10 },
  headerContent: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  headerSubtitle: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, marginTop: 1 },
  headerActions: { flexDirection: 'row', gap: 8 },
  mapDirBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.dangerBg, justifyContent: 'center', alignItems: 'center' },
  editBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },

  scrollContent: { paddingBottom: 40 },

  // Status + meta row
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginTop: 14, flexWrap: 'wrap' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusPillText: { fontSize: 13, fontWeight: '800' },
  phoneChip: { backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: '#86EFAC' },
  phoneChipText: { fontSize: 13, fontWeight: '700', color: '#15803D' },
  metaDate: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, marginLeft: 'auto' },

  // Financial card (list style)
  financialCard: { backgroundColor: 'white', marginHorizontal: 16, marginTop: 12, borderRadius: 20, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, ...Shadows.sm },
  financialRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  financialRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  financialLabel: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  financialValue: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  progressBar: { height: 5, borderRadius: 3, backgroundColor: '#F1F5F9', marginTop: 10, overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 3 },

  // Workflow
  settledBanner: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Colors.successBg, borderRadius: 18, padding: 18, borderWidth: 1.5, borderColor: Colors.success + '40' },
  settledTitle: { fontSize: 15, fontWeight: '800', color: Colors.success },
  settledSub: { fontSize: 13, fontWeight: '600', color: Colors.success, opacity: 0.75, marginTop: 2 },
  waitingBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F0F9FF', borderRadius: 16, padding: 18, borderWidth: 1.5, borderColor: '#BAE6FD' },
  waitingText: { fontSize: 15, fontWeight: '700', color: '#0284C7', flex: 1 },
  assignDriverBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 16, backgroundColor: Colors.primary100, borderWidth: 1.5, borderColor: Colors.primary, borderStyle: 'dashed' },
  assignDriverText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  driverInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'white', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', ...Shadows.sm },
  driverInfoAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  driverInfoLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, marginBottom: 2 },
  driverInfoName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  // Pickup date buttons
  twoColRow: { flexDirection: 'row', gap: 10 },
  secondaryActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 14, backgroundColor: Colors.primary100, borderWidth: 1, borderColor: Colors.primary + '40' },
  secondaryActionBtnText: { fontSize: 12, fontWeight: '700', color: Colors.primary, flex: 1, textAlign: 'center' },

  // Section headers
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: Colors.textMuted, letterSpacing: 0.5 },

  // Action grid
  gridBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, paddingHorizontal: 10, borderRadius: 14, ...Shadows.sm },
  gridBtnText: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  // Photos gallery
  galleryImg: { width: 100, height: 100, borderRadius: 16, backgroundColor: '#F1F5F9' },
  imgBadge: { position: 'absolute', bottom: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  imgBadgeText: { color: 'white', fontSize: 9, fontWeight: '700' },

  // Address + map
  addressText: { fontSize: 14, color: Colors.textSecondary, paddingHorizontal: 20, marginBottom: 10 },
  mapWrapper: { height: 200, marginHorizontal: 16, borderRadius: 20, overflow: 'hidden', ...Shadows.md },
  map: { flex: 1 },
  markerContainer: { padding: 4, backgroundColor: 'white', borderRadius: 20, ...Shadows.sm },
  markerPin: { width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.primary, borderWidth: 2, borderColor: 'white' },
  openMapBtn: { position: 'absolute', bottom: 12, backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, ...Shadows.sm },
  openMapText: { fontSize: 12, fontWeight: '700', color: Colors.primary },

  // Delete button
  deleteFullBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginTop: 24, height: 52, borderRadius: 16, backgroundColor: Colors.danger, ...Shadows.sm },
  deleteFullBtnText: { fontSize: 15, fontWeight: '700', color: 'white' },

  // Bottom bar
  bottomBar: { backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12, paddingHorizontal: 16, ...Shadows.sm },
  bottomBarInner: { flexDirection: 'row', gap: 12 },
  bottomBarBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 14 },
  bottomBarBtnText: { fontSize: 15, fontWeight: '700', color: 'white' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,18,25,0.6)', justifyContent: 'flex-end' },
  modalDismiss: { flex: 1 },
  remiseCenteredOverlay: { flex: 1, backgroundColor: 'rgba(0,18,25,0.6)', justifyContent: 'center', paddingHorizontal: 20 },
  remiseCenteredCard: { backgroundColor: 'white', borderRadius: 24, padding: 20, maxHeight: '80%', elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 24 },
  modalSheet: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  modalHandle: { width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 10, alignSelf: 'center', marginBottom: 20 },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  modalIconBadge: { width: 46, height: 46, borderRadius: 14, backgroundColor: Colors.primary100, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  modalSubtitle: { fontSize: 13, fontWeight: '600', color: Colors.textMuted, marginTop: 2 },
  modalBody: { paddingBottom: 8 },
  modalActions: { flexDirection: 'row', gap: 12 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 8 },
  driverOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, marginBottom: 8, backgroundColor: 'white', borderWidth: 1, borderColor: '#E2E8F0' },
  driverOptionSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  driverAvatarSmall: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  driverAvatarText: { fontSize: 15, fontWeight: '800' },
  driverOptionName: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  driverRadioEmpty: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#CBD5E1' },
  primaryModalBtn: { height: 54, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadows.teal },
  primaryModalBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  secondaryModalBtn: { height: 54, borderRadius: 14, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  secondaryModalBtnText: { color: Colors.textSecondary, fontSize: 15, fontWeight: '600' },

  // Address modal
  addrInput: { backgroundColor: '#F8FAFC', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: Colors.textPrimary, borderWidth: 1, borderColor: '#E2E8F0' },
  addrLocBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 14 },
  addrLocBtnText: { color: 'white', fontSize: 14, fontWeight: '600' },
  addrCoordsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F3E8FF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  addrCoordsText: { fontSize: 12, color: '#8B5CF6', fontWeight: '600' },

  // Image viewer
  imagePreviewOverlay: { flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
  imagePreviewClose: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  fullImage: { width: SCREEN_WIDTH, height: '80%' },
});
