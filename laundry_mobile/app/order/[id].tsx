import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { Ionicons, Feather, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { adminApi } from '../../src/services/adminApi';
import { useOrderCreation } from '../../src/context/OrderCreationContext';
import { BASE_URL } from '../../src/services/api/client';
import { Colors, Shadows, StatusColors } from '../../constants/theme';
import { format } from 'date-fns';
import { fr, ar } from 'date-fns/locale';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { uploadManager } from '../../src/services/uploads';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import { compressImage } from '../../src/utils/imageCompression';
import { calculateOrderFinancials } from '../../src/utils/orderFinancials';
import PaymentModal from '../../components/orders/modals/PaymentModal';
import DeliveryConfirmModal from '../../components/orders/modals/DeliveryConfirmModal';
import useOrderPermissions from '../../src/hooks/useOrderPermissions';
import ArticlesTab from '../../components/orders/tabs/ArticlesTab';
import ClientTab from '../../components/orders/tabs/ClientTab';
import SuiviTab from '../../components/orders/tabs/SuiviTab';
import { getWorkflowAction, OrderStatus, WorkflowAction, isDelivered } from '../../constants/orderWorkflow';
import { useOrder, useUpdateOrderStatus, useAddPayment, useAddOrderImages } from '../../src/hooks/query/useOrder';
import { useDriversList, useAssignDeliveryDriver } from '../../src/hooks/query/useDrivers';
import { useDeleteOrder } from '../../src/hooks/query/useOrders';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: 'white', ...Shadows.sm, zIndex: 10 },
  headerContent: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  headerActions: { flexDirection: 'row', gap: 8 },
  deleteBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.dangerBg, justifyContent: 'center', alignItems: 'center' },
  editBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 40 },
  card: { backgroundColor: 'white', margin: 16, borderRadius: 24, padding: 24, alignItems: 'center', ...Shadows.md },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginBottom: 16 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  orderLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1, marginBottom: 4 },
  orderRef: { fontSize: 24, fontWeight: '800', color: Colors.primary, marginBottom: 20 },
  paidStamp: { position: 'absolute', top: 20, right: 20, borderWidth: 2, borderColor: Colors.success, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, transform: [{ rotate: '15deg' }], opacity: 0.6 },
  paidStampText: { color: Colors.success, fontSize: 12, fontWeight: '900' },
  financialRow: { flexDirection: 'row', width: '100%', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 20 },
  financialCol: { flex: 1, alignItems: 'center' },
  verticalDivider: { width: 1, backgroundColor: '#F1F5F9' },
  financialLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, marginBottom: 4 },
  totalValue: { fontSize: 18, fontWeight: '800' },
  paidValue: { fontSize: 18, fontWeight: '800', color: Colors.success },
  currency: { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
  remainingText: { fontSize: 12, fontWeight: '700', color: Colors.warning, marginTop: 4 },
  tabsContainer: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: 'white', borderRadius: 16, padding: 4, ...Shadows.sm },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, minWidth: 100 },
  tabBtnActive: { backgroundColor: Colors.primary100 },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  tabTextActive: { color: Colors.primary },
  tabContent: { marginTop: 16 },
  infoCard: { backgroundColor: 'white', marginHorizontal: 16, borderRadius: 20, padding: 20, ...Shadows.sm, marginBottom: 16 },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: Colors.textMuted, marginBottom: 16, letterSpacing: 1 },
  actionBtn: { marginHorizontal: 16, height: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 20 },
  actionBtnText: { fontSize: 16, fontWeight: '700' },
  quickActionsGrid: { paddingHorizontal: 16, marginBottom: 20 },
  gridRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  gridBtn: { flex: 1, height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  gridBtnText: { fontSize: 14, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,18,25,0.6)', justifyContent: 'flex-end' },
  modalDismiss: { flex: 1 },
  modalSheet: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  modalHandle: { width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 10, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
  modalBody: { marginTop: 10 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 8 },
  amountInput: { height: 56, backgroundColor: '#F8FAFC', borderRadius: 16, paddingHorizontal: 20, fontSize: 18, fontWeight: '700', color: Colors.primary, marginBottom: 16 },
  noteInput: { minHeight: 100, backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, fontSize: 15, textAlignVertical: 'top', marginBottom: 20 },
  galleryImg: { width: 100, height: 100, borderRadius: 16, backgroundColor: '#F1F5F9' },
  imgBadge: { position: 'absolute', bottom: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  imgBadgeText: { color: 'white', fontSize: 9, fontWeight: '700' },
  imagePreviewOverlay: { flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
  imagePreviewClose: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  fullImage: { width: SCREEN_WIDTH, height: '80%' },
  editDeliveryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginBottom: 16, paddingVertical: 12, borderRadius: 14, backgroundColor: Colors.primary100, borderDash: [5, 5], borderWidth: 1, borderColor: Colors.primary, borderStyle: 'dashed' },
  editDeliveryText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  dateSelectorBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  dateSelectorText: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  driverOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, marginBottom: 8, backgroundColor: 'white', borderWidth: 1, borderColor: '#E2E8F0' },
  driverOptionSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  driverAvatarSmall: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  driverAvatarText: { fontSize: 14, fontWeight: '800' },
  driverOptionName: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  modalActions: { flexDirection: 'row', gap: 12 },
  primaryModalBtn: { height: 52, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadows.teal },
  primaryModalBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },
  secondaryModalBtn: { height: 52, borderRadius: 14, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  secondaryModalBtnText: { color: Colors.textSecondary, fontSize: 15, fontWeight: '600' },
});

export default function OrderDetailsScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const currentUser = useSelector((state: any) => state.auth.user);
  const { loadOrderForEditing, clearOrder } = useOrderCreation();

  // Queries
  const { order, payments, history, loading, refetch, isRefreshing } = useOrder(id as string);
  const { data: drivers = [] } = useDriversList();

  // Mutations
  const updateStatusMutation = useUpdateOrderStatus();
  const addPaymentMutation = useAddPayment();
  const addImagesMutation = useAddOrderImages();
  const assignDriverMutation = useAssignDeliveryDriver();
  const deleteOrderMutation = useDeleteOrder();

  const [activeTab, setActiveTab] = useState<'articles' | 'client' | 'suivi'>('articles');
  const [viewImage, setViewImage] = useState<string | null>(null);

  const permissions = useOrderPermissions(currentUser, order);
  const { 
    isAdmin, 
    canEdit, 
    canDelete, 
    canAddLaboPhoto, 
    canAddReceptionPhoto,
    canAddPayment,
    canAssignDriver
  } = permissions;

  const [deliveryDate, setDeliveryDate] = useState<Date>(new Date());
  const [showDeliveryDatePicker, setShowDeliveryDatePicker] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  const handleClientPress = useCallback((clientId: number | string) => {
    router.push(`/client/${clientId}`);
  }, [router]);

  const handleEditOrder = useCallback(() => {
    if (!order) return;
    clearOrder();
    loadOrderForEditing(order);
    router.push('/(admin)/order-items');
  }, [order, clearOrder, loadOrderForEditing, router]);

  const [sharing, setSharing] = useState(false);

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  // Delivery Payment Modal State
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [collectedAmount, setCollectedAmount] = useState('0');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Driver Assignment State
  const [showDriverModal, setShowDriverModal] = useState(false);

  const [uploadingImage, setUploadingImage] = useState(false);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const performStatusUpdate = useCallback(async (nextStatus: string, extraData?: any) => {
    try {
      await updateStatusMutation.mutateAsync({ id: id as string, status: nextStatus, data: extraData });
    } catch (error) {
      Alert.alert(t('common.error'), t('common.error_msg'));
    }
  }, [id, updateStatusMutation, t]);

  const handleUpdateStatus = useCallback(async (action: WorkflowAction) => {
    const nextStatus = action.nextStatus;
    if (!nextStatus) return;

    if (action.requiresDriverModal) {
      setSelectedDriverId(order?.deliveryDriver?.id || null);
      setDeliveryDate(order?.dateLivraisonPrevue ? new Date(order.dateLivraisonPrevue) : new Date());
      setShowDriverModal(true);
      return;
    }

    if (action.requiresDeliveryModal) {
      if (!order?.deliveryDriver) {
        Alert.alert(t('common.error'), t('admin.orders.assign_driver_msg'));
        return;
      }
      setCollectedAmount('0');
      setDeliveryNotes('');
      setShowDeliveryModal(true);
      return;
    }

    performStatusUpdate(nextStatus);
  }, [order, performStatusUpdate, t]);

  const handleAssignAndMarkReady = useCallback(async () => {
    if (!selectedDriverId) {
      Alert.alert(t('common.error'), t('admin.orders.filter_driver'));
      return;
    }

    try {
      await assignDriverMutation.mutateAsync({ id: id as string, driverId: selectedDriverId });
      await performStatusUpdate('READY_FOR_DELIVERY', {
        dateLivraisonPrevue: deliveryDate.toISOString()
      });
      setShowDriverModal(false);
    } catch (error) {
      Alert.alert(t('common.error'), t('common.error_msg'));
    }
  }, [id, selectedDriverId, deliveryDate, assignDriverMutation, performStatusUpdate, t]);

  const handleAddPhotos = useCallback(async (type: 'reception' | 'apres_traitement') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7
    });

    if (result.canceled) return;

    setUploadingImage(true);
    try {
      // Use uploadManager for scalable background uploads with retries
      await Promise.all(result.assets.map(async (a) => {
        return uploadManager.addImage(a.uri, id as string, type);
      }));

      Alert.alert(
        t('common.info'), 
        t('admin.orders.upload_queued', { defaultValue: 'Images ajoutées à la file d\'attente. Elles seront téléchargées en arrière-plan.' })
      );
    } catch (e) {
      console.error('Photo queue error:', e);
      Alert.alert(t('common.error'), t('common.error_msg'));
    } finally {
      setUploadingImage(false);
    }
  }, [id, addImagesMutation, t]);

  const handleDeleteOrder = useCallback(() => {
    Alert.alert(
      t('common.supprimer'),
      t('common.confirm_msg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.supprimer'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteOrderMutation.mutateAsync(id as string);
              router.back();
            } catch (error) {
              Alert.alert(t('common.error'), t('common.error_msg'));
            }
          }
        }
      ]
    );
  }, [id, router, deleteOrderMutation, t]);

  const handleShareReceipt = useCallback(async () => {
    setSharing(true);
    try {
      const delivered = isDelivered(order.status);
      const res = delivered
        ? await adminApi.getDeliveryReceipt(id as string)
        : await adminApi.getOrderReceipt(id as string);

      const { phone, message } = res.data.data;
      const waPhone = phone ? phone.replace(/\D/g, '') : '';
      const encoded = encodeURIComponent(message);
      const waUrl = waPhone ? `https://wa.me/${waPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
      await Linking.openURL(waUrl);
    } catch (e) {
      Alert.alert(t('common.error'), t('common.error_msg'));
    } finally {
      setSharing(false);
    }
  }, [id, order, t]);

  const handleViewPdf = useCallback(async () => {
    const delivered = isDelivered(order.status);
    const pdfUrl = delivered ? adminApi.getDeliveryPdfUrl(id as string) : adminApi.getOrderPdfUrl(id as string);
    const localUri = `${FileSystem.cacheDirectory}receipt_${id}.pdf`;
    try {
      const download = await FileSystem.downloadAsync(pdfUrl, localUri);
      if (download.status !== 200) throw new Error(t('common.error_msg'));
      await Print.printAsync({ uri: download.uri });
    } catch (e) {
      WebBrowser.openBrowserAsync(pdfUrl);
    }
  }, [id, order, t]);

  const getClientPhone = useCallback((client: any) => {
    if (!client) return '';
    if (client.phone) return client.phone;
    if (Array.isArray(client.phones) && client.phones.length > 0) return client.phones[0].phoneNumber;
    return '';
  }, []);

  const financials = useMemo(() => calculateOrderFinancials(order?.montantTotal, order?.montantPaye), [order?.montantTotal, order?.montantPaye]);
  const { totalAmount, paidAmount, remaining, progressPercentage, fullyPaid } = financials;

  const statusAction = useMemo(() => getWorkflowAction(order?.status as OrderStatus), [order?.status]);

  const confirmDelivery = useCallback(async () => {
    const amount = parseFloat(collectedAmount) || 0;
    if (isNaN(amount) || amount < 0) return Alert.alert(t('common.error'), t('admin.unpaid.enter_valid_amount'));
    
    if (amount > remaining + 0.05) {
      return Alert.alert(t('common.error'), `${t('admin.unpaid.payment_exceeds_remaining', { defaultValue: 'Le montant dépasse le reste' })} (${remaining.toFixed(2)} DH)`);
    }

    try {
      await updateStatusMutation.mutateAsync({ 
        id: id as string, 
        status: 'DELIVERED', 
        data: { montantCollecte: amount, notesPaiement: deliveryNotes } 
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowDeliveryModal(false);
      Alert.alert(t('delivery.delivery_success'), t('delivery.send_receipt_prompt'), [{ text: t('common.cancel'), style: 'cancel' }, { text: '📱 WhatsApp', onPress: () => handleShareReceipt() }]);
    } catch (e) {
      Alert.alert(t('common.error'), t('common.error_msg'));
    }
  }, [id, collectedAmount, deliveryNotes, remaining, updateStatusMutation, handleShareReceipt, t]);

  const handleAddPayment = useCallback(async () => {
    const amount = parseFloat(paymentAmount);
    if (!paymentAmount || isNaN(amount) || amount <= 0) return Alert.alert(t('common.error'), t('admin.unpaid.enter_valid_amount'));
    
    if (amount > remaining + 0.05) {
      return Alert.alert(t('common.error'), `${t('admin.unpaid.payment_exceeds_remaining', { defaultValue: 'Le montant dépasse le reste' })} (${remaining.toFixed(2)} DH)`);
    }

    try {
      await addPaymentMutation.mutateAsync({ id: id as string, amount, note: paymentNote });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentNote('');
    } catch (error) {
      Alert.alert(t('common.error'), t('common.error_msg'));
    }
  }, [id, paymentAmount, paymentNote, remaining, addPaymentMutation, t]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(admin)/(tabs)');
    }
  }, [router]);

  if (loading || !order) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        {!loading && <Text style={{ marginTop: 10, color: Colors.textMuted }}>{t('common.no_data')}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header}>
        <View style={[styles.headerContent, isArabic && { flexDirection: 'row-reverse' }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name={isArabic ? "arrow-forward" : "arrow-back"} size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('admin.orders.title')}</Text>
          <View style={[styles.headerActions, isArabic && { flexDirection: 'row-reverse' }]}>
            {canDelete && <TouchableOpacity onPress={handleDeleteOrder} style={styles.deleteBtn}><Feather name="trash-2" size={16} color={Colors.danger} /></TouchableOpacity>}
            {canEdit && <TouchableOpacity onPress={handleEditOrder} style={styles.editBtn}><Feather name="edit-2" size={16} color={Colors.textSecondary} /></TouchableOpacity>}
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}>
        <View style={styles.card}>
          <View style={[styles.statusBadge, { backgroundColor: StatusColors[order.status]?.bg || Colors.primary50 }, isArabic && { flexDirection: 'row-reverse' }]}>
            <View style={[styles.statusDot, { backgroundColor: StatusColors[order.status]?.dot || Colors.primary }]} />
            <Text style={[styles.statusText, { color: StatusColors[order.status]?.text || Colors.primary }]}>{StatusColors[order.status]?.label ? t(`status.${order.status}`) : order.status}</Text>
          </View>
          <Text style={styles.orderLabel}>{t('admin.orders.title').toUpperCase()}</Text>
          <Text style={styles.orderRef}>#{order.numeroCommande}</Text>
          {fullyPaid && <View style={[styles.paidStamp, isArabic ? { left: 20, right: undefined } : { right: 20 }]}><Text style={styles.paidStampText}>{t('dashboard.all_settled').toUpperCase()}</Text></View>}
          <View style={[styles.financialRow, isArabic && { flexDirection: 'row-reverse' }]}>
           <View style={styles.financialCol}><Text style={styles.financialLabel}>{t('financial.total')}</Text><Text style={styles.totalValue}>{totalAmount.toFixed(2)} <Text style={styles.currency}>{t('common.dh')}</Text></Text></View>
           <View style={styles.verticalDivider} /><View style={styles.financialCol}><Text style={styles.financialLabel}>{t('financial.paid')}</Text><Text style={styles.paidValue}>{paidAmount.toFixed(2)} <Text style={styles.currency}>{t('common.dh')}</Text></Text>{remaining > 0 && <Text style={styles.remainingText}>{t('financial.remaining')}: {remaining.toFixed(2)} {t('common.dh')}</Text>}</View>
          </View>
          </View>

          <View style={[styles.tabsContainer, isArabic && { flexDirection: 'row-reverse' }]}>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'articles' && styles.tabBtnActive]} onPress={() => setActiveTab('articles')}><Ionicons name="layers-outline" size={18} color={activeTab === 'articles' ? Colors.primary : Colors.textMuted} /><Text style={[styles.tabText, activeTab === 'articles' && styles.tabTextActive]}>{t('admin.orders.title')}</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'client' && styles.tabBtnActive]} onPress={() => setActiveTab('client')}><Ionicons name="person-outline" size={18} color={activeTab === 'client' ? Colors.primary : Colors.textMuted} /><Text style={[styles.tabText, activeTab === 'client' && styles.tabTextActive]}>{t('tabs.clients')}</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'suivi' && styles.tabBtnActive]} onPress={() => setActiveTab('suivi')}><Ionicons name="time-outline" size={18} color={activeTab === 'suivi' ? Colors.primary : Colors.textMuted} /><Text style={[styles.tabText, activeTab === 'suivi' && styles.tabTextActive]}>{t('admin.orders.history')}</Text></TouchableOpacity>
          </View>

          <View style={styles.tabContent}>
            {activeTab === 'articles' && (
              <>
                {isDelivered(order.status) ? (
                  <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
                    {fullyPaid ? (
                      <View style={[{ backgroundColor: Colors.successBg, borderRadius: 14, padding: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }, isArabic && { flexDirection: 'row-reverse' }]}><Ionicons name="checkmark-done-circle" size={20} color={Colors.success} /><Text style={[{ fontSize: 15, fontWeight: '700', color: Colors.success }, isArabic && { flex: 1, textAlign: 'right' }]}>{t('dashboard.all_settled')}</Text><Text style={[{ fontSize: 15, fontWeight: '700', color: Colors.success }, !isArabic && { marginLeft: 'auto' }]}>{totalAmount.toFixed(2)} {t('common.dh')}</Text></View>
                    ) : (
                      <>
                        {paidAmount > 0 ? (
                          <View style={{ backgroundColor: Colors.warningBg, borderRadius: 14, padding: 14, paddingHorizontal: 16 }}><View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, isArabic && { flexDirection: 'row-reverse' }]}><Text style={{ fontSize: 14, fontWeight: '700', color: Colors.warning }}>{t('delivery.partial_payment')}</Text>{canAddPayment && <TouchableOpacity onPress={() => setShowPaymentModal(true)}><Text style={{ fontSize: 14, fontWeight: '600', color: Colors.primary }}>+ {t('common.new')}</Text></TouchableOpacity>}</View><View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.08)', marginTop: 10, overflow: 'hidden' }}><View style={{ height: 6, borderRadius: 3, backgroundColor: Colors.warning, width: `${progressPercentage}%`, alignSelf: isArabic ? 'flex-end' : 'flex-start' }} /></View><View style={[{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }, isArabic && { flexDirection: 'row-reverse' }]}><Text style={{ fontSize: 13, color: Colors.success }}>{t('financial.paid')}: {paidAmount.toFixed(2)} {t('common.dh')}</Text><Text style={{ fontSize: 13, fontWeight: '700', color: Colors.warning }}>{t('financial.remaining')}: {remaining.toFixed(2)} {t('common.dh')}</Text></View></View>
                        ) : (
                          <View style={[{ backgroundColor: Colors.dangerBg, borderRadius: 14, padding: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }, isArabic && { flexDirection: 'row-reverse' }]}><Text style={[{ fontSize: 14, fontWeight: '700', color: Colors.danger, flex: 1 }, isArabic && { textAlign: 'right' }]}>{t('delivery.unpaid_warning')}</Text>{canAddPayment && <TouchableOpacity style={{ backgroundColor: Colors.danger, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 }} onPress={() => setShowPaymentModal(true)}><Text style={{ fontSize: 12, fontWeight: '600', color: 'white' }}>{t('admin.unpaid.add_payment')}</Text></TouchableOpacity>}</View>
                        )}
                      </>
                    )}
                  </View>
                ) : statusAction && (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: statusAction.bg }, statusAction.disabled && { opacity: 0.8 }, !statusAction.disabled && { ...Shadows.md, shadowColor: statusAction.bg }, isArabic && { flexDirection: 'row-reverse' }]} onPress={() => !statusAction.disabled && handleUpdateStatus(statusAction)} disabled={statusAction.disabled || updateStatusMutation.isPending}>{updateStatusMutation.isPending ? <ActivityIndicator color="white" /> : <><FontAwesome5 name={statusAction.icon as any} size={18} color={statusAction.textColor || 'white'} /><Text style={[styles.actionBtnText, { color: statusAction.textColor || 'white' }]}>{t(statusAction.labelKey)}</Text></>}</TouchableOpacity>
                )}

                {canAssignDriver && (
                  <TouchableOpacity style={styles.editDeliveryBtn} onPress={() => { setSelectedDriverId(order.deliveryDriver?.id || null); setDeliveryDate(order.dateLivraisonPrevue ? new Date(order.dateLivraisonPrevue) : new Date()); setShowDriverModal(true); }}><Feather name="truck" size={14} color={Colors.primary} /><Text style={styles.editDeliveryText}>{t('admin.orders.filter_driver')} / {t('common.date')}</Text></TouchableOpacity>
                )}

                {(order.images && order.images.length > 0) && (
                  <View style={styles.infoCard}><Text style={[styles.sectionLabel, isArabic && { textAlign: 'right' }]}>{t('admin.orders.create.items.photos').toUpperCase()}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[isArabic && { flexDirection: 'row-reverse' }, { gap: 10 }]}>{order.images.map((img: any, idx: number) => (<TouchableOpacity key={idx} onPress={() => setViewImage(`${BASE_URL}${img.imageUrl}`)}><Image source={{ uri: `${BASE_URL}${img.imageUrl}` }} style={styles.galleryImg} /><View style={[styles.imgBadge, isArabic ? { left: 6, right: undefined } : { right: 6 }]}><Text style={styles.imgBadgeText}>{img.photoType === 'reception' ? 'Récep.' : img.photoType === 'livraison' ? 'Livraison' : 'Labo'}</Text></View></TouchableOpacity>))}</ScrollView></View>
                )}

                <ArticlesTab order={order} isArabic={isArabic} t={t} setViewImage={setViewImage} BASE_URL={BASE_URL} />

                <View style={[styles.sectionHeader, isArabic && { flexDirection: 'row-reverse' }]}><Text style={styles.sectionTitle}>{t('dashboard.quick_actions')}</Text></View>
                <View style={styles.quickActionsGrid}><View style={[styles.gridRow, isArabic && { flexDirection: 'row-reverse' }]}><TouchableOpacity style={[styles.gridBtn, { backgroundColor: 'rgba(37,211,102,0.1)' }, isArabic && { flexDirection: 'row-reverse' }]} onPress={handleShareReceipt}><Ionicons name="logo-whatsapp" size={20} color="#25D366" /><Text style={[styles.gridBtnText, { color: '#25D366' }]}>WhatsApp</Text></TouchableOpacity><TouchableOpacity style={[styles.gridBtn, { backgroundColor: Colors.primary100 }, isArabic && { flexDirection: 'row-reverse' }]} onPress={handleViewPdf}><Ionicons name="document-text" size={20} color={Colors.primary} /><Text style={[styles.gridBtnText, { color: Colors.primary }]}>{t('admin.orders.create.confirmation.view_pdf')}</Text></TouchableOpacity></View><View style={[styles.gridRow, isArabic && { flexDirection: 'row-reverse' }]}>{canAddLaboPhoto && (<TouchableOpacity style={[styles.gridBtn, { backgroundColor: 'rgba(59,130,246,0.1)' }, isArabic && { flexDirection: 'row-reverse' }]} onPress={() => handleAddPhotos('apres_traitement')} disabled={uploadingImage}><Feather name="camera" size={20} color={Colors.info} /><Text style={[styles.gridBtnText, { color: Colors.info }]}>Photo Labo</Text></TouchableOpacity>)}{canAddReceptionPhoto && (<TouchableOpacity style={[styles.gridBtn, { backgroundColor: Colors.primary100 }, isArabic && { flexDirection: 'row-reverse' }]} onPress={() => handleAddPhotos('reception')} disabled={uploadingImage}><Ionicons name="images" size={20} color={Colors.primary} /><Text style={[styles.gridBtnText, { color: Colors.primary }]}>Photo Récep.</Text></TouchableOpacity>)}</View></View>
              </>
            )}

            {activeTab === 'client' && (
              <ClientTab 
                order={order} 
                isArabic={isArabic} 
                t={t} 
                onClientPress={handleClientPress}
                handleShareReceipt={handleShareReceipt}
                sharing={sharing}
                getClientPhone={getClientPhone}
                setShowDriverModal={setShowDriverModal}
              />
            )}

            {activeTab === 'suivi' && (
              <SuiviTab 
                order={order}
                isArabic={isArabic}
                t={t}
                totalAmount={totalAmount}
                paidAmount={paidAmount}
                remaining={remaining}
                payments={payments}
                history={history}
                canAddPayment={canAddPayment}
                setShowPaymentModal={setShowPaymentModal}
              />
            )}
          </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Driver & Date Modal */}
      <Modal visible={showDriverModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismiss} activeOpacity={1} onPress={() => setShowDriverModal(false)} />
          <View style={[styles.modalSheet, { height: '80%' }]}><View style={styles.modalHandle} /><Text style={[styles.modalTitle, isArabic && { textAlign: 'right' }]}>{t('delivery.confirm_title')}</Text><ScrollView showsVerticalScrollIndicator={false}><View style={styles.modalBody}><Text style={[styles.inputLabel, isArabic && { textAlign: 'right' }]}>{t('admin.orders.pickup_date')}</Text><TouchableOpacity style={[styles.dateSelectorBtn, isArabic && { flexDirection: 'row-reverse' }]} onPress={() => setShowDeliveryDatePicker(true)}><Ionicons name="calendar-outline" size={20} color={Colors.primary} /><Text style={styles.dateSelectorText}>{format(deliveryDate, 'PPPP', { locale: isArabic ? ar : fr })}</Text></TouchableOpacity>{showDeliveryDatePicker && (<DateTimePicker value={deliveryDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(event, date) => { setShowDeliveryDatePicker(false); if (date) setDeliveryDate(date); }} />)}<Text style={[styles.inputLabel, { marginTop: 20 }, isArabic && { textAlign: 'right' }]}>{t('admin.orders.filter_driver')}</Text>{drivers.map((driver: any) => (<TouchableOpacity key={driver.id} style={[styles.driverOption, selectedDriverId === driver.id && styles.driverOptionSelected, isArabic && { flexDirection: 'row-reverse' }]} onPress={() => setSelectedDriverId(driver.id)}><View style={[styles.driverAvatarSmall, { backgroundColor: selectedDriverId === driver.id ? 'white' : Colors.primary100 }]}><Text style={[styles.driverAvatarText, { color: selectedDriverId === driver.id ? Colors.primary : Colors.primaryDark }]}>{driver.name?.[0]?.toUpperCase()}</Text></View><Text style={[styles.driverOptionName, selectedDriverId === driver.id && { color: 'white' }]}>{driver.name}</Text>{selectedDriverId === driver.id && (<Ionicons name="checkmark-circle" size={20} color="white" />)}</TouchableOpacity>))}</View></ScrollView><View style={[styles.modalActions, { marginTop: 20 }, isArabic && { flexDirection: 'row-reverse' }]}><TouchableOpacity style={[styles.secondaryModalBtn, { flex: 1 }]} onPress={() => setShowDriverModal(false)}><Text style={styles.secondaryModalBtnText}>{t('common.cancel')}</Text></TouchableOpacity><TouchableOpacity style={[styles.primaryModalBtn, { flex: 2 }]} onPress={handleAssignAndMarkReady} disabled={assignDriverMutation.isPending}>{assignDriverMutation.isPending ? <ActivityIndicator color="white" /> : <Text style={styles.primaryModalBtnText}>{t('common.confirm')}</Text>}</TouchableOpacity></View></View>
        </View>
      </Modal>

      {/* Single Payment Modal */}
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

      {/* Delivery Confirmation Modal */}
      <DeliveryConfirmModal
        visible={showDeliveryModal}
        onClose={() => setShowDeliveryModal(false)}
        onConfirm={confirmDelivery}
        totalAmount={totalAmount}
        collectedAmount={collectedAmount}
        setCollectedAmount={setCollectedAmount}
        deliveryNotes={deliveryNotes}
        setDeliveryNotes={setDeliveryNotes}
        confirmingDelivery={updateStatusMutation.isPending}
        isArabic={isArabic}
        t={t}
      />

      <Modal visible={!!viewImage} transparent animationType="fade" onRequestClose={() => setViewImage(null)}><View style={styles.imagePreviewOverlay}><TouchableOpacity style={styles.imagePreviewClose} onPress={() => setViewImage(null)}><Ionicons name="close" size={30} color="white" /></TouchableOpacity>{viewImage && (<Image source={{ uri: viewImage }} style={styles.fullImage} resizeMode="contain" />)}</View></Modal>
    </View>
  );
}
