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
import { useFormStyles } from '../../src/hooks/useFormStyles';
import DateTimePicker from '@react-native-community/datetimepicker';
import { calculateOrderFinancials } from '../../src/utils/orderFinancials';
import PaymentModal from '../../components/orders/modals/PaymentModal';
import DeliveryConfirmModal from '../../components/orders/modals/DeliveryConfirmModal';
import useOrderPermissions from '../../src/hooks/useOrderPermissions';
import ArticlesTab from '../../components/orders/tabs/ArticlesTab';
import ClientTab from '../../components/orders/tabs/ClientTab';
import SuiviTab from '../../components/orders/tabs/SuiviTab';
import { getWorkflowAction, OrderStatus, WorkflowAction, isDelivered } from '../../constants/orderWorkflow';
import { useOrder, useUpdateOrderStatus, useAddPayment, useAddOrderImages } from '../../src/hooks/query/useOrder';
import { useDriversList, usePickupDriversList, useAssignDeliveryDriver, useAssignPickupDriver } from '../../src/hooks/query/useDrivers';
import { useDeleteOrder } from '../../src/hooks/query/useOrders';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams();
  const currentUser = useSelector((state: any) => state.auth.user);
  const authToken = useSelector((state: any) => state.auth.token);
  const { order, loading } = useOrder(id as string);

  if (loading || !order) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (currentUser?.role === 'LIVREUR') {
    return <DriverOrderDetail order={order} />;
  }

  return <AdminOrderDetail order={order} id={id as string} currentUser={currentUser} />;
}

function AdminOrderDetail({ order, id, currentUser }: { order: any, id: string, currentUser: any }) {
  const { t } = useTranslation();
  const f = useFormStyles();
  const isArabic = f.isArabic;
  const router = useRouter();
  const { loadOrderForEditing, clearOrder } = useOrderCreation();

  // Queries
  const { payments, history, refetch, isRefreshing } = useOrder(id as string);
  const { data: drivers = [], isLoading: driversLoading, isError: driversError } = useDriversList();
  const { data: pickupDrivers = [], isLoading: pickupDriversLoading } = usePickupDriversList();

  // Mutations
  const updateStatusMutation = useUpdateOrderStatus();
  const addPaymentMutation = useAddPayment();
  const assignDriverMutation = useAssignDeliveryDriver();
  const assignPickupDriverMutation = useAssignPickupDriver();
  const deleteOrderMutation = useDeleteOrder();

  const [activeTab, setActiveTab] = useState<'articles' | 'client' | 'suivi'>('articles');
  const [viewImage, setViewImage] = useState<string | null>(null);

  const permissions = useOrderPermissions(currentUser, order);
  const {
    canEdit,
    canDelete,
    canAddLaboPhoto,
    canAddReceptionPhoto,
    canAddPayment,
    canAssignPickupDriver,
    canAssignDriver
  } = permissions;

  const [deliveryDate, setDeliveryDate] = useState<Date>(new Date());
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  // Pickup driver assignment state
  const [showPickupDriverModal, setShowPickupDriverModal] = useState(false);
  const [selectedPickupDriverId, setSelectedPickupDriverId] = useState<string | null>(null);

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
      if (order?.deliveryDriver && order.deliveryDriver.id !== currentUser?.id) {
        // Driver is assigned AND it's not the current admin — they are responsible for confirming delivery and payment.
        // Admin should not intercept; show informational alert instead.
        Alert.alert(
          t('common.info'),
          t('admin.orders.driver_responsible_msg', { name: order.deliveryDriver.name })
        );
        return;
      }
      // No driver assigned OR it's the current admin — handle delivery themselves.
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
      // Build local-timezone ISO string to avoid UTC midnight shifting the date (UTC+1 issue)
      const y = deliveryDate.getFullYear();
      const mo = String(deliveryDate.getMonth() + 1).padStart(2, '0');
      const d = String(deliveryDate.getDate()).padStart(2, '0');
      const isoDate = `${y}-${mo}-${d}T00:00:00`;

      await assignDriverMutation.mutateAsync({
        id: id as string,
        driverId: selectedDriverId,
        scheduledDeliveryDate: isoDate,
      });
      // Only advance status when the order is not already READY_FOR_DELIVERY.
      // Re-sending the same status triggers a workflow validation error on the backend.
      if (order?.status !== 'READY_FOR_DELIVERY') {
        await performStatusUpdate('READY_FOR_DELIVERY', {});
      }
      setShowDriverModal(false);
    } catch (error) {
      Alert.alert(t('common.error'), t('common.error_msg'));
    }
  }, [id, selectedDriverId, deliveryDate, order?.status, assignDriverMutation, performStatusUpdate, t]);

  const handleAssignPickupDriver = useCallback(async () => {
    if (!selectedPickupDriverId) {
      Alert.alert(t('common.error'), t('admin.orders.filter_driver'));
      return;
    }
    try {
      await assignPickupDriverMutation.mutateAsync({ id: id as string, livreurId: selectedPickupDriverId });
      setShowPickupDriverModal(false);
    } catch (error) {
      Alert.alert(t('common.error'), t('common.error_msg'));
    }
  }, [id, selectedPickupDriverId, assignPickupDriverMutation, t]);

  const handleAddPhotos = useCallback(async (type: 'reception' | 'apres_traitement') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7
    });

    if (result.canceled) return;

    setUploadingImage(true);
    try {
      await Promise.all(result.assets.map(async (a) => {
        return uploadManager.addImage(a.uri, id as string, type);
      }));

      Alert.alert(
        t('common.info'), 
        t('admin.orders.upload_queued')
      );
    } catch (e) {
      console.error('Photo queue error:', e);
      Alert.alert(t('common.error'), t('common.error_msg'));
    } finally {
      setUploadingImage(false);
    }
  }, [id, t]);

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
      const pdfUrl = delivered
        ? adminApi.getDeliveryPdfUrl(id as string)
        : adminApi.getOrderPdfUrl(id as string);
      const localUri = `${FileSystem.cacheDirectory}receipt_${id}_share.pdf`;
      const download = await FileSystem.downloadAsync(pdfUrl, localUri,
        authToken ? { headers: { Authorization: `Bearer ${authToken}` } } : undefined);
      if (download.status !== 200) throw new Error('download_failed');
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert(t('common.error'), t('common.sharing_unavailable', { defaultValue: 'Le partage n\'est pas disponible sur cet appareil.' }));
        return;
      }
      await Sharing.shareAsync(download.uri, {
        mimeType: 'application/pdf',
        dialogTitle: t('admin.orders.create.confirmation.view_pdf', { defaultValue: 'Reçu' }),
        UTI: 'com.adobe.pdf',
      });
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
      const download = await FileSystem.downloadAsync(pdfUrl, localUri,
        authToken ? { headers: { Authorization: `Bearer ${authToken}` } } : undefined);
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
      return Alert.alert(t('common.error'), `${t('admin.unpaid.payment_exceeds_remaining')} (${remaining.toFixed(2)} DH)`);
    }

    try {
      await updateStatusMutation.mutateAsync({
        id: id as string,
        status: 'DELIVERED',
        data: { amount: amount, notesPaiement: deliveryNotes }
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
      return Alert.alert(t('common.error'), `${t('admin.unpaid.payment_exceeds_remaining')} (${remaining.toFixed(2)} DH)`);
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

  // Only show edit when order hasn't been picked up yet (still in pickup phase)
  const canEditOrder = canEdit && order.status === 'PENDING_PICKUP';

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <SafeAreaView style={styles.header}>
        <View style={[styles.headerContent, isArabic && { flexDirection: 'row-reverse' }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name={isArabic ? "arrow-forward" : "arrow-back"} size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.headerTitle}>#{order.numeroCommande?.slice(-10)}</Text>
            {order.client?.name && (
              <Text style={styles.headerSubtitle} numberOfLines={1}>{order.client.name}</Text>
            )}
          </View>
          <View style={[styles.headerActions, isArabic && { flexDirection: 'row-reverse' }]}>
            {canDelete && (
              <TouchableOpacity onPress={handleDeleteOrder} style={styles.deleteBtn}>
                <Feather name="trash-2" size={18} color={Colors.danger} />
              </TouchableOpacity>
            )}
            {canEditOrder && (
              <TouchableOpacity onPress={handleEditOrder} style={styles.editBtn}>
                <Feather name="edit-2" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}>

        {/* ── Status Banner ── */}
        <View style={[styles.statusBanner, { backgroundColor: StatusColors[order.status]?.bg || Colors.primary50, borderColor: StatusColors[order.status]?.dot || Colors.primary }]}>
          <View style={[styles.statusDot, { backgroundColor: StatusColors[order.status]?.dot || Colors.primary }]} />
          <Text style={[styles.statusBannerText, { color: StatusColors[order.status]?.text || Colors.primary }]}>
            {t(`status.${order.status}`, { defaultValue: order.status })}
          </Text>
        </View>

        {/* ── Financial Summary ── */}
        <View style={styles.financialCard}>
          <View style={[styles.financialRow, isArabic && { flexDirection: 'row-reverse' }]}>
            <View style={[styles.financialCol, isArabic && { alignItems: 'flex-end' }]}>
              <Text style={styles.financialLabel}>{t('financial.total')}</Text>
              <Text style={styles.totalValue}>{totalAmount.toFixed(2)} <Text style={styles.currency}>{t('common.dh')}</Text></Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={[styles.financialCol, isArabic && { alignItems: 'flex-end' }]}>
              <Text style={styles.financialLabel}>{t('financial.paid')}</Text>
              <Text style={[styles.paidValue, { color: fullyPaid ? Colors.success : Colors.warning }]}>
                {paidAmount.toFixed(2)} <Text style={styles.currency}>{t('common.dh')}</Text>
              </Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={[styles.financialCol, isArabic && { alignItems: 'flex-end' }]}>
              <Text style={styles.financialLabel}>{t('financial.remaining')}</Text>
              {fullyPaid ? (
                <View style={styles.paidBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                  <Text style={styles.paidBadgeText}>{t('livreur.already_paid', { defaultValue: 'Soldé' })}</Text>
                </View>
              ) : (
                <Text style={[styles.paidValue, { color: Colors.danger }]}>
                  {remaining.toFixed(2)} <Text style={styles.currency}>{t('common.dh')}</Text>
                </Text>
              )}
            </View>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercentage}%`, backgroundColor: fullyPaid ? Colors.success : Colors.warning }]} />
          </View>
        </View>

        {/* ── Main Action Section ── */}
        <View style={styles.actionSection}>

          {/* ── Delivered + fully paid ── */}
          {isDelivered(order.status) && fullyPaid && (
            <View style={styles.settledBanner}>
              <Ionicons name="checkmark-done-circle" size={26} color={Colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.settledTitle, isArabic && { textAlign: 'right' }]}>{t('dashboard.all_settled')}</Text>
                <Text style={[styles.settledSub, isArabic && { textAlign: 'right' }]}>{totalAmount.toFixed(2)} {t('common.dh')}</Text>
              </View>
            </View>
          )}

          {/* ── Delivered + unpaid — prompt payment ── */}
          {isDelivered(order.status) && !fullyPaid && (
            <TouchableOpacity
              style={[styles.bigActionBtn, { backgroundColor: Colors.danger, paddingHorizontal: 20 }]}
              onPress={() => canAddPayment && setShowPaymentModal(true)}
              disabled={!canAddPayment}
              activeOpacity={0.85}
            >
              <Ionicons name="cash-outline" size={24} color="white" />
              <View style={[{ flex: 1 }, isArabic && { alignItems: 'flex-end' }]}>
                <Text style={styles.bigActionBtnTitle}>{t('admin.unpaid.add_payment')}</Text>
                <Text style={styles.bigActionBtnSub}>{t('financial.remaining')}: {remaining.toFixed(2)} {t('common.dh')}</Text>
              </View>
              <View style={styles.actionChevron}>
                <Ionicons name={isArabic ? 'chevron-back' : 'chevron-forward'} size={20} color="rgba(255,255,255,0.7)" />
              </View>
            </TouchableOpacity>
          )}

          {/* ── Not yet delivered ── */}
          {!isDelivered(order.status) && (() => {
            const isReady = order.status === 'READY_FOR_DELIVERY';
            const isOther = isReady && order.deliveryDriver && order.deliveryDriver.id !== currentUser?.id;
            const isMe    = isReady && order.deliveryDriver && order.deliveryDriver.id === currentUser?.id;
            const isReadyNoDriver = isReady && !order.deliveryDriver;

            const showWorkflowBtn = statusAction && !statusAction.disabled && (!isReady || !isOther);

            return (
              <>
                {/* Workflow action button */}
                {showWorkflowBtn && !permissions.isEmploye && (
                  <TouchableOpacity
                    style={[styles.bigActionBtn, { backgroundColor: statusAction!.bg }]}
                    onPress={() => handleUpdateStatus(statusAction!)}
                    disabled={updateStatusMutation.isPending}
                    activeOpacity={0.85}
                  >
                    {updateStatusMutation.isPending
                      ? <ActivityIndicator color="white" size="large" />
                      : <>
                          <FontAwesome5 name={statusAction!.icon as any} size={22} color={statusAction!.textColor || 'white'} />
                          <Text style={[styles.bigActionBtnTitle, { color: statusAction!.textColor || 'white', flex: 1 }, isArabic && { textAlign: 'right' }]}>
                            {t(statusAction!.labelKey)}
                          </Text>
                          <View style={styles.actionChevron}>
                            <Ionicons name={isArabic ? 'chevron-back' : 'chevron-forward'} size={20} color="rgba(255,255,255,0.7)" />
                          </View>
                        </>
                    }
                  </TouchableOpacity>
                )}

                {/* Employé workflow (PICKED_UP / IN_PROCESS only) */}
                {permissions.isEmploye && (order.status === 'PICKED_UP' || order.status === 'IN_PROCESS') && statusAction && (
                  <TouchableOpacity
                    style={[styles.bigActionBtn, { backgroundColor: order.status === 'PICKED_UP' ? '#3B82F6' : '#C9A84C' }]}
                    onPress={() => handleUpdateStatus(statusAction)}
                    disabled={updateStatusMutation.isPending}
                    activeOpacity={0.85}
                  >
                    {updateStatusMutation.isPending
                      ? <ActivityIndicator color="white" size="large" />
                      : <>
                          <FontAwesome5 name={statusAction.icon as any} size={22} color={order.status === 'IN_PROCESS' ? '#0D1B2A' : 'white'} />
                          <Text style={[styles.bigActionBtnTitle, { color: order.status === 'IN_PROCESS' ? '#0D1B2A' : 'white', flex: 1 }, isArabic && { textAlign: 'right' }]}>
                            {t(statusAction.labelKey)}
                          </Text>
                          <View style={[styles.actionChevron, { backgroundColor: order.status === 'IN_PROCESS' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.2)' }]}>
                            <Ionicons name={isArabic ? 'chevron-back' : 'chevron-forward'} size={20} color={order.status === 'IN_PROCESS' ? '#0D1B2A' : 'white'} />
                          </View>
                        </>
                    }
                  </TouchableOpacity>
                )}

                {/* Ready for delivery — driver assigned: tappable card merges info + change action */}
                {isReady && order.deliveryDriver && (
                  <TouchableOpacity
                    style={styles.driverAssignedCard}
                    onPress={canAssignDriver ? () => {
                      setSelectedDriverId(order.deliveryDriver?.id || null);
                      setDeliveryDate(order.dateLivraisonPrevue ? new Date(order.dateLivraisonPrevue) : new Date());
                      setShowDriverModal(true);
                    } : undefined}
                    activeOpacity={canAssignDriver ? 0.75 : 1}
                  >
                    <View style={styles.driverAssignedAvatar}>
                      <Text style={styles.driverAssignedAvatarText}>
                        {order.deliveryDriver.name?.[0]?.toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.driverAssignedLabel, f.label]}>
                        {t('admin.orders.filter_driver')}
                      </Text>
                      <Text style={[styles.driverAssignedName, isArabic && { textAlign: 'right' }]}>
                        {isMe ? t('common.me', { defaultValue: 'Moi' }) : order.deliveryDriver.name}
                      </Text>
                      {order.scheduledDeliveryDate && (
                        <Text style={[styles.driverAssignedDate, isArabic && { textAlign: 'right' }]}>
                          {format(new Date(order.scheduledDeliveryDate), 'dd MMM yyyy', { locale: isArabic ? ar : fr })}
                        </Text>
                      )}
                    </View>
                    {canAssignDriver ? (
                      <View style={styles.driverChangeChip}>
                        <Feather name="edit-2" size={12} color={Colors.primary} />
                        <Text style={styles.driverChangeChipText}>{t('common.change', { defaultValue: 'Modifier' })}</Text>
                      </View>
                    ) : (
                      <View style={styles.driverAssignedBadge}>
                        <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                        <Text style={styles.driverAssignedBadgeText}>{t('common.assigned', { defaultValue: 'Assigné' })}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}

                {/* Ready — no driver: employé waiting banner */}
                {isReadyNoDriver && permissions.isEmploye && (
                  <View style={styles.waitingBanner}>
                    <Ionicons name="time-outline" size={22} color="#0284C7" />
                    <Text style={[styles.waitingText, isArabic && { textAlign: 'right' }]}>
                      {t('admin.orders.actions.waiting_driver')}
                    </Text>
                  </View>
                )}
              </>
            );
          })()}

          {/* ── Assign driver button — only when no driver yet ── */}
          {canAssignDriver && !order.deliveryDriver && (
            <TouchableOpacity
              style={styles.assignDriverBtn}
              onPress={() => {
                setSelectedDriverId(null);
                setDeliveryDate(new Date());
                setShowDriverModal(true);
              }}
            >
              <Feather name="truck" size={16} color={Colors.primary} />
              <Text style={styles.assignDriverText}>
                {t('admin.orders.assign_driver', { defaultValue: 'Assigner un livreur de livraison' })}
              </Text>
            </TouchableOpacity>
          )}

          {/* ── Pickup Driver Assignment ── */}
          {canAssignPickupDriver && (
            <TouchableOpacity
              style={[styles.assignDriverBtn, order.livreur && { borderColor: '#D97706', backgroundColor: '#FFFBEB' }]}
              onPress={() => {
                setSelectedPickupDriverId(order.livreur?.id ? String(order.livreur.id) : null);
                setShowPickupDriverModal(true);
              }}
            >
              <Feather name="package" size={16} color={order.livreur ? '#D97706' : Colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.assignDriverText, order.livreur && { color: '#D97706' }]}>
                  {order.livreur
                    ? t('orders.reassign_pickup_driver', { defaultValue: 'Changer le livreur de collecte' })
                    : t('orders.assign_pickup_driver', { defaultValue: 'Assigner un livreur de collecte' })}
                </Text>
                {order.livreur && (
                  <Text style={{ fontSize: 12, color: '#92400E', marginTop: 1 }}>{order.livreur.name}</Text>
                )}
              </View>
              <Feather name="edit-2" size={14} color={order.livreur ? '#D97706' : Colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Tabs ── */}
        <View style={[styles.tabsContainer, isArabic && { flexDirection: 'row-reverse' }]}>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'articles' && styles.tabBtnActive]} onPress={() => setActiveTab('articles')}>
            <Ionicons name="layers-outline" size={18} color={activeTab === 'articles' ? Colors.primary : Colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'articles' && styles.tabTextActive]}>{t('admin.orders.title')}</Text>
            {(order.commandeTapis?.length > 0) && (
              <View style={[styles.tabBadge, { backgroundColor: activeTab === 'articles' ? Colors.primary : Colors.textMuted }]}>
                <Text style={styles.tabBadgeText}>{order.commandeTapis.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'client' && styles.tabBtnActive]} onPress={() => setActiveTab('client')}>
            <Ionicons name="person-outline" size={18} color={activeTab === 'client' ? Colors.primary : Colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'client' && styles.tabTextActive]}>{t('tabs.clients')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'suivi' && styles.tabBtnActive]} onPress={() => setActiveTab('suivi')}>
            <Ionicons name="time-outline" size={18} color={activeTab === 'suivi' ? Colors.primary : Colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'suivi' && styles.tabTextActive]}>{t('admin.orders.history')}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Tab Content ── */}
        <View style={styles.tabContent}>
          {activeTab === 'articles' && (
            <>
              {(order.images && order.images.length > 0) && (
                <View style={styles.infoCard}>
                  <Text style={[styles.sectionLabel, f.sectionLabel]}>{t('admin.orders.create.items.photos')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[isArabic && { flexDirection: 'row-reverse' }, { gap: 10 }]}>
                    {order.images.map((img: any, idx: number) => (
                      <TouchableOpacity key={idx} onPress={() => setViewImage(`${BASE_URL}${img.imageUrl}`)}>
                        <Image source={{ uri: `${BASE_URL}${img.imageUrl}` }} style={styles.galleryImg} />
                        <View style={[styles.imgBadge, isArabic ? { left: 6, right: undefined } : { right: 6 }]}>
                          <Text style={styles.imgBadgeText}>{img.photoType === 'reception' ? t('common.photo_reception') : img.photoType === 'livraison' ? t('status.DELIVERED') : t('common.photo_lab')}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <ArticlesTab order={order} isArabic={isArabic} t={t} setViewImage={setViewImage} BASE_URL={BASE_URL} />
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

      {/* ── Sticky Bottom Bar ── */}
      {(permissions.isAdmin || permissions.isEmploye) && (
        <View style={[styles.bottomBar, isArabic && { flexDirection: 'row-reverse' }]}>
          <TouchableOpacity style={styles.bottomBarBtn} onPress={handleShareReceipt} disabled={sharing}>
            {sharing
              ? <ActivityIndicator size="small" color="#25D366" />
              : <Ionicons name="logo-whatsapp" size={22} color="#25D366" />}
            <Text style={[styles.bottomBarBtnText, { color: '#25D366' }]}>{t('common.whatsapp')}</Text>
          </TouchableOpacity>
          <View style={styles.bottomBarDivider} />
          <TouchableOpacity style={styles.bottomBarBtn} onPress={handleViewPdf}>
            <Ionicons name="document-text-outline" size={22} color={Colors.primary} />
            <Text style={[styles.bottomBarBtnText, { color: Colors.primary }]}>{t('admin.orders.create.confirmation.view_pdf')}</Text>
          </TouchableOpacity>
          {(canAddLaboPhoto || canAddReceptionPhoto) && (
            <>
              <View style={styles.bottomBarDivider} />
              <TouchableOpacity
                style={styles.bottomBarBtn}
                onPress={() => handleAddPhotos(canAddLaboPhoto ? 'apres_traitement' : 'reception')}
                disabled={uploadingImage}
              >
                {uploadingImage
                  ? <ActivityIndicator size="small" color={Colors.info} />
                  : <Feather name="camera" size={22} color={Colors.info} />}
                <Text style={[styles.bottomBarBtnText, { color: Colors.info }]}>{t('common.photo_lab')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* ── Driver & Date Assignment Modal ── */}
      <Modal visible={showDriverModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismiss} activeOpacity={1} onPress={() => setShowDriverModal(false)} />
          <View style={[styles.modalSheet, { height: '82%' }]}>
            <View style={styles.modalHandle} />

            {/* Header */}
            <View style={[styles.modalHeaderRow, isArabic && { flexDirection: 'row-reverse' }]}>
              <View style={styles.modalIconBadge}>
                <Feather name="truck" size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, isArabic && { textAlign: 'right' }]}>
                  {t('admin.orders.assign_driver')}
                </Text>
                <Text style={[styles.modalSubtitle, isArabic && { textAlign: 'right' }]}>
                  #{order.numeroCommande}
                </Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              <View style={styles.modalBody}>

                {/* Date picker — inline calendar (same style as orders filter) */}
                <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }, isArabic && { flexDirection: 'row-reverse' }]}>
                  <Text style={[styles.inputLabel, { marginBottom: 0 }, isArabic && { textAlign: 'right' }]}>
                    {t('admin.orders.create.delivery_date')}
                  </Text>
                  <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: 13 }}>
                    {format(deliveryDate, 'dd MMM yyyy', { locale: isArabic ? ar : fr })}
                  </Text>
                </View>
                <DateTimePicker
                  value={deliveryDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  themeVariant="light"
                  onChange={(event, date) => {
                    if (Platform.OS === 'android') {
                      if (event.type === 'set' && date) setDeliveryDate(date);
                    } else {
                      if (date) setDeliveryDate(date);
                    }
                  }}
                />

                {/* Driver list */}
                <Text style={[styles.inputLabel, { marginTop: 24 }, isArabic && { textAlign: 'right' }]}>
                  {t('admin.orders.filter_driver')}
                </Text>
                {driversLoading && (
                  <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 16 }} />
                )}
                {!driversLoading && driversError && (
                  <View style={styles.emptyDrivers}>
                    <Feather name="alert-circle" size={24} color="#EF4444" />
                    <Text style={[styles.emptyDriversText, { color: '#EF4444' }]}>
                      {t('common.error_msg')}
                    </Text>
                  </View>
                )}
                {!driversLoading && !driversError && drivers.length === 0 && (
                  <View style={styles.emptyDrivers}>
                    <Feather name="users" size={24} color={Colors.textMuted} />
                    <Text style={styles.emptyDriversText}>
                      {t('admin.orders.no_drivers')}
                    </Text>
                  </View>
                )}
                {drivers.map((driver: any) => {
                  const selected = selectedDriverId === driver.id;
                  return (
                    <TouchableOpacity
                      key={driver.id}
                      style={[styles.driverOption, selected && styles.driverOptionSelected, isArabic && { flexDirection: 'row-reverse' }]}
                      onPress={() => setSelectedDriverId(driver.id)}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.driverAvatarSmall, { backgroundColor: selected ? 'rgba(255,255,255,0.25)' : Colors.primary100 }]}>
                        <Text style={[styles.driverAvatarText, { color: selected ? 'white' : Colors.primaryDark }]}>
                          {driver.name?.[0]?.toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.driverOptionName, selected && { color: 'white' }]}>
                          {driver.name}
                        </Text>
                        {driver.phone && (
                          <Text style={[{ fontSize: 12, color: selected ? 'rgba(255,255,255,0.75)' : Colors.textMuted, marginTop: 2 }]}>
                            {driver.phone}
                          </Text>
                        )}
                      </View>
                      {selected
                        ? <Ionicons name="checkmark-circle" size={22} color="white" />
                        : <View style={styles.driverRadioEmpty} />
                      }
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={[styles.modalActions, isArabic && { flexDirection: 'row-reverse' }]}>
              <TouchableOpacity
                style={[styles.secondaryModalBtn, { flex: 1 }]}
                onPress={() => setShowDriverModal(false)}
              >
                <Text style={styles.secondaryModalBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryModalBtn, { flex: 1.5 }, !selectedDriverId && { opacity: 0.5 }]}
                onPress={handleAssignAndMarkReady}
                disabled={!selectedDriverId || assignDriverMutation.isPending || updateStatusMutation.isPending}
              >
                {(assignDriverMutation.isPending || updateStatusMutation.isPending)
                  ? <ActivityIndicator color="white" size="small" />
                  : <Text style={styles.primaryModalBtnText}>{t('common.confirm')}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      {/* ── Pickup Driver Assignment Modal ── */}
      <Modal visible={showPickupDriverModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismiss} activeOpacity={1} onPress={() => setShowPickupDriverModal(false)} />
          <View style={[styles.modalSheet, { height: '70%' }]}>
            <View style={styles.modalHandle} />
            <View style={[styles.modalHeaderRow, isArabic && { flexDirection: 'row-reverse' }]}>
              <View style={[styles.modalIconBadge, { backgroundColor: '#FEF3C7' }]}>
                <Feather name="package" size={20} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, isArabic && { textAlign: 'right' }]}>
                  {t('orders.assign_pickup_driver', { defaultValue: 'Livreur de collecte' })}
                </Text>
                <Text style={[styles.modalSubtitle, isArabic && { textAlign: 'right' }]}>
                  #{order.numeroCommande}
                </Text>
              </View>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              <View style={styles.modalBody}>
                <Text style={[styles.inputLabel, isArabic && { textAlign: 'right' }]}>
                  {t('admin.orders.filter_driver')}
                </Text>
                {pickupDriversLoading && (
                  <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 16 }} />
                )}
                {!pickupDriversLoading && pickupDrivers.length === 0 && (
                  <View style={styles.emptyDrivers}>
                    <Feather name="users" size={24} color={Colors.textMuted} />
                    <Text style={styles.emptyDriversText}>{t('admin.orders.no_drivers')}</Text>
                  </View>
                )}
                {pickupDrivers.map((driver: any) => {
                  const selected = selectedPickupDriverId === String(driver.id);
                  return (
                    <TouchableOpacity
                      key={driver.id}
                      style={[styles.driverOption, selected && styles.driverOptionSelected, isArabic && { flexDirection: 'row-reverse' }]}
                      onPress={() => setSelectedPickupDriverId(String(driver.id))}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.driverAvatarSmall, { backgroundColor: selected ? 'rgba(255,255,255,0.25)' : Colors.primary100 }]}>
                        <Text style={[styles.driverAvatarText, { color: selected ? 'white' : Colors.primaryDark }]}>
                          {driver.name?.[0]?.toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.driverOptionName, selected && { color: 'white' }]}>{driver.name}</Text>
                        {driver.phone && (
                          <Text style={{ fontSize: 12, color: selected ? 'rgba(255,255,255,0.75)' : Colors.textMuted, marginTop: 2 }}>{driver.phone}</Text>
                        )}
                      </View>
                      {selected
                        ? <Ionicons name="checkmark-circle" size={22} color="white" />
                        : <View style={styles.driverRadioEmpty} />
                      }
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            <View style={[styles.modalActions, isArabic && { flexDirection: 'row-reverse' }]}>
              <TouchableOpacity style={[styles.secondaryModalBtn, { flex: 1 }]} onPress={() => setShowPickupDriverModal(false)}>
                <Text style={styles.secondaryModalBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryModalBtn, { flex: 1.5, backgroundColor: '#D97706' }, !selectedPickupDriverId && { opacity: 0.5 }]}
                onPress={handleAssignPickupDriver}
                disabled={!selectedPickupDriverId || assignPickupDriverMutation.isPending}
              >
                {assignPickupDriverMutation.isPending
                  ? <ActivityIndicator color="white" size="small" />
                  : <Text style={styles.primaryModalBtnText}>{t('common.confirm')}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
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

function DriverOrderDetail({ order }: { order: any }) {
  const router = useRouter();
  const { t } = useTranslation();
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const client = order.client || {};
  const phone = client.phone || (client.phones?.[0]?.phoneNumber);
  const addr = client.addresses?.[0]?.address || order.clientAdresse;

  const total = parseFloat(order.montantTotal ?? 0);
  const paid = parseFloat(order.montantPaye ?? 0);
  const remaining = Math.max(0, total - paid);
  const fullyPaid = total > 0 && remaining < 0.05;
  const progress = total > 0 ? Math.min(100, (paid / total) * 100) : 0;

  const handleAddReceptionPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7
    });
    if (result.canceled) return;
    setUploadingImage(true);
    try {
      await Promise.all(result.assets.map((a) => uploadManager.addImage(a.uri, order.id?.toString(), 'reception')));
      Alert.alert(t('common.info'), t('admin.orders.upload_queued'));
    } catch (e) {
      Alert.alert(t('common.error'), t('common.error_msg'));
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.headerTitle}>#{order.numeroCommande?.slice(-10)}</Text>
            {client.name && <Text style={styles.headerSubtitle}>{client.name}</Text>}
          </View>
          <View style={{ width: 44 }} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}>

        {/* Financial hero card */}
        <View style={styles.financialCard}>
          <View style={styles.financialRow}>
            <View style={[styles.financialCol]}>
              <Text style={styles.financialLabel}>{t('financial.total')}</Text>
              <Text style={styles.totalValue}>{total.toFixed(2)} <Text style={styles.currency}>{t('common.dh')}</Text></Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={[styles.financialCol]}>
              <Text style={styles.financialLabel}>{t('financial.paid')}</Text>
              <Text style={[styles.paidValue, { color: fullyPaid ? Colors.success : Colors.warning }]}>
                {paid.toFixed(2)} <Text style={styles.currency}>{t('common.dh')}</Text>
              </Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={[styles.financialCol]}>
              <Text style={styles.financialLabel}>{t('financial.remaining')}</Text>
              {fullyPaid ? (
                <View style={styles.paidBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                  <Text style={styles.paidBadgeText}>{t('livreur.already_paid', { defaultValue: 'Soldé' })}</Text>
                </View>
              ) : (
                <Text style={[styles.paidValue, { color: Colors.danger }]}>
                  {remaining.toFixed(2)} <Text style={styles.currency}>{t('common.dh')}</Text>
                </Text>
              )}
            </View>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: fullyPaid ? Colors.success : Colors.warning }]} />
          </View>
        </View>

        {/* Contact actions */}
        <View style={{ paddingHorizontal: 16, gap: 10, marginTop: 4 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              style={[driverStyles.actionBtn, { flex: 1, backgroundColor: Colors.successBg, borderColor: Colors.success + '40' }]}
              onPress={() => phone && Linking.openURL(`tel:${phone}`)}
            >
              <Ionicons name="call" size={20} color={Colors.success} />
              <Text style={[driverStyles.actionBtnText, { color: Colors.success }]}>{phone || t('common.no_phone', { defaultValue: 'Pas de numéro' })}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[driverStyles.actionBtn, { flex: 1, backgroundColor: Colors.primary50, borderColor: Colors.primary + '30' }]}
              onPress={() => addr && Linking.openURL(`geo:0,0?q=${encodeURIComponent(addr)}`)}
            >
              <Ionicons name="navigate" size={20} color={Colors.primary} />
              <Text style={[driverStyles.actionBtnText, { color: Colors.primary }]} numberOfLines={1}>{addr || t('common.no_address', { defaultValue: "Pas d'adresse" })}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[driverStyles.actionBtn, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
            onPress={handleAddReceptionPhoto}
            disabled={uploadingImage}
          >
            {uploadingImage
              ? <ActivityIndicator color={Colors.info} size="small" />
              : <Feather name="camera" size={20} color={Colors.info} />}
            <Text style={[driverStyles.actionBtnText, { color: Colors.info }]}>{t('admin.orders.create.items.photos')}</Text>
          </TouchableOpacity>
        </View>

        {/* Articles */}
        <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
          <Text style={driverStyles.sectionTitle}>
            {t('admin.orders.title')} ({order.commandeTapis?.length || 0})
          </Text>
        </View>

        {order.commandeTapis?.map((item: any, index: number) => (
          <View key={item.id} style={[styles.financialCard, { marginTop: 10 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <View style={driverStyles.tagBadge}>
                <Text style={driverStyles.tagText}>TAG-{String(index + 1).padStart(3, '0')}</Text>
              </View>
              <Text style={driverStyles.itemName} numberOfLines={1}>{item.productNom || 'Tapis'}</Text>
              <Text style={driverStyles.itemPrice}>{parseFloat(item.prixFinal || 0).toFixed(2)} {t('common.dh')}</Text>
            </View>

            {item.modeTarification === 'PER_M2' && (
              <Text style={driverStyles.itemMeta}>
                {item.largeur}m × {item.hauteur || item.longueur}m = {(parseFloat(item.largeur) * parseFloat(item.hauteur || item.longueur)).toFixed(2)} m²
              </Text>
            )}
            {item.modeTarification === 'PER_UNIT' && (
              <Text style={driverStyles.itemMeta}>{t('admin.orders.create.items.pieces')}: {item.quantite}</Text>
            )}

            {item.images && item.images.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} contentContainerStyle={{ gap: 8 }}>
                {item.images.map((img: any, i: number) => (
                  <TouchableOpacity key={i} onPress={() => setViewImage(`${BASE_URL}${img.imageUrl}`)}>
                    <Image source={{ uri: `${BASE_URL}${img.imageUrl}` }} style={driverStyles.itemImg} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        ))}

        {(order.images && order.images.length > 0) && (
          <View style={[styles.financialCard, { marginTop: 10 }]}>
            <Text style={[styles.sectionLabel, f.sectionLabel, { marginBottom: 12 }]}>{t('common.order_photos', { defaultValue: 'Photos' })}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {order.images.map((img: any, idx: number) => (
                <TouchableOpacity key={idx} onPress={() => setViewImage(`${BASE_URL}${img.imageUrl}`)}>
                  <Image source={{ uri: `${BASE_URL}${img.imageUrl}` }} style={driverStyles.itemImg} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      <Modal visible={!!viewImage} transparent animationType="fade" onRequestClose={() => setViewImage(null)}>
        <View style={styles.imagePreviewOverlay}>
          <TouchableOpacity style={styles.imagePreviewClose} onPress={() => setViewImage(null)}>
            <Ionicons name="close" size={30} color="white" />
          </TouchableOpacity>
          {viewImage && <Image source={{ uri: viewImage }} style={styles.fullImage} resizeMode="contain" />}
        </View>
      </Modal>
    </View>
  );
}

const driverStyles = StyleSheet.create({
  callBtn: { height: 56, backgroundColor: Colors.success, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 12, ...Shadows.md },
  callBtnText: { color: 'white', fontSize: 18, fontWeight: '700' },
  navBtn: { height: 52, backgroundColor: 'white', borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24, borderWidth: 1, borderColor: '#E2E8F0' },
  navBtnText: { color: Colors.textSecondary, fontSize: 15, fontWeight: '500', flex: 1, textAlign: 'center', paddingHorizontal: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1 },
  actionBtnText: { fontSize: 14, fontWeight: '700', flex: 1 },
  sectionHeader: { marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  itemCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12, ...Shadows.sm },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  tagBadge: { backgroundColor: Colors.primary50, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tagText: { color: Colors.primary, fontSize: 12, fontWeight: '800' },
  itemName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  itemPrice: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  itemMeta: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  itemImg: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#F1F5F9', marginRight: 8 },
  cameraBtn: { height: 48, backgroundColor: Colors.primary, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20, ...Shadows.sm },
  cameraBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: { backgroundColor: 'white', ...Shadows.sm, zIndex: 10 },
  headerContent: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.primary, letterSpacing: 0.5 },
  headerActions: { flexDirection: 'row', gap: 8 },
  deleteBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.dangerBg, justifyContent: 'center', alignItems: 'center' },
  editBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },

  scrollContent: { paddingBottom: 40 },

  // Status banner — full-width pill at top
  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 16, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 16, borderWidth: 1.5 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusBannerText: { fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },

  // Financial card
  financialCard: { backgroundColor: 'white', marginHorizontal: 16, marginTop: 12, borderRadius: 20, padding: 20, ...Shadows.sm },
  financialRow: { flexDirection: 'row' },
  financialCol: { flex: 1, alignItems: 'center' },
  verticalDivider: { width: 1, backgroundColor: '#F1F5F9' },
  financialLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, marginBottom: 6 },
  totalValue: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  paidValue: { fontSize: 17, fontWeight: '800' },
  currency: { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
  remainingText: { fontSize: 13, fontWeight: '700', color: Colors.warning, marginTop: 4 },
  progressBar: { height: 6, borderRadius: 3, backgroundColor: '#F1F5F9', marginTop: 14, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: Colors.warning },

  // Action section
  actionSection: { paddingHorizontal: 16, marginTop: 16, gap: 10 },
  bigActionBtn: { height: 68, borderRadius: 20, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 14, ...Shadows.md },
  bigActionBtnTitle: { fontSize: 18, fontWeight: '800', color: 'white' },
  bigActionBtnSub: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  settledBanner: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Colors.successBg, borderRadius: 18, padding: 18, borderWidth: 1.5, borderColor: Colors.success + '40' },
  settledTitle: { fontSize: 15, fontWeight: '800', color: Colors.success },
  settledSub: { fontSize: 13, fontWeight: '600', color: Colors.success, opacity: 0.75, marginTop: 2 },
  waitingBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F0F9FF', borderRadius: 16, padding: 18, borderWidth: 1.5, borderColor: '#BAE6FD' },
  waitingText: { fontSize: 15, fontWeight: '700', color: '#0284C7', flex: 1 },
  assignDriverBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 16, backgroundColor: Colors.primary100, borderWidth: 1.5, borderColor: Colors.primary, borderStyle: 'dashed' },
  assignDriverText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  actionChevron: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  driverAssignedCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'white', borderRadius: 18, padding: 16, borderWidth: 1.5, borderColor: Colors.success + '50', ...Shadows.sm },
  driverAssignedAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  driverAssignedAvatarText: { fontSize: 18, fontWeight: '800', color: 'white' },
  driverAssignedLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted },
  driverAssignedName: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  driverAssignedDate: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginTop: 2 },
  driverAssignedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.successBg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  driverAssignedBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.success },
  driverChangeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary100, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: Colors.primary + '40' },
  driverChangeChipText: { fontSize: 11, fontWeight: '700', color: Colors.primary },

  // Header subtitle
  headerSubtitle: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, marginTop: 1 },

  // Paid badge (Soldé indicator in financial card)
  paidBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.successBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  paidBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.success },

  // Tabs
  tabsContainer: { flexDirection: 'row', marginHorizontal: 16, marginTop: 20, backgroundColor: 'white', borderRadius: 18, padding: 5, ...Shadows.sm },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 14 },
  tabBtnActive: { backgroundColor: Colors.primary100 },
  tabText: { fontSize: 13, fontWeight: '700', color: Colors.textMuted },
  tabTextActive: { color: Colors.primary },
  tabBadge: { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabBadgeText: { fontSize: 10, fontWeight: '800', color: 'white' },
  tabContent: { marginTop: 16 },

  // Sticky bottom bar
  bottomBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingBottom: Platform.OS === 'ios' ? 28 : 12, paddingTop: 10, paddingHorizontal: 8, ...Shadows.sm },
  bottomBarBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 4 },
  bottomBarBtnText: { fontSize: 11, fontWeight: '700' },
  bottomBarDivider: { width: 1, height: 36, backgroundColor: '#F1F5F9' },

  // Content cards
  infoCard: { backgroundColor: 'white', marginHorizontal: 16, borderRadius: 20, padding: 20, ...Shadows.sm, marginBottom: 16 },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: Colors.textMuted, marginBottom: 16 },
  galleryImg: { width: 100, height: 100, borderRadius: 16, backgroundColor: '#F1F5F9' },
  imgBadge: { position: 'absolute', bottom: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  imgBadgeText: { color: 'white', fontSize: 9, fontWeight: '700' },

  // Quick actions grid (admin only)
  quickActionsGrid: { paddingHorizontal: 16, marginBottom: 20, gap: 12 },
  gridRow: { flexDirection: 'row', gap: 12 },
  gridBtn: { flex: 1, height: 62, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  gridBtnText: { fontSize: 14, fontWeight: '700' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,18,25,0.6)', justifyContent: 'flex-end' },
  modalDismiss: { flex: 1 },
  modalSheet: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  modalHandle: { width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 10, alignSelf: 'center', marginBottom: 20 },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  modalIconBadge: { width: 46, height: 46, borderRadius: 14, backgroundColor: Colors.primary100, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  modalSubtitle: { fontSize: 13, fontWeight: '600', color: Colors.textMuted, marginTop: 2 },
  modalBody: { paddingBottom: 8 },
  emptyDrivers: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  emptyDriversText: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  driverRadioEmpty: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#CBD5E1' },
  inputLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 8 },
  amountInput: { height: 56, backgroundColor: '#F8FAFC', borderRadius: 16, paddingHorizontal: 20, fontSize: 18, fontWeight: '700', color: Colors.primary, marginBottom: 16 },
  noteInput: { minHeight: 100, backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, fontSize: 15, textAlignVertical: 'top', marginBottom: 20 },
  driverOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, marginBottom: 8, backgroundColor: 'white', borderWidth: 1, borderColor: '#E2E8F0' },
  driverOptionSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  driverAvatarSmall: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  driverAvatarText: { fontSize: 15, fontWeight: '800' },
  driverOptionName: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  modalActions: { flexDirection: 'row', gap: 12 },
  primaryModalBtn: { height: 54, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadows.teal },
  primaryModalBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  secondaryModalBtn: { height: 54, borderRadius: 14, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  secondaryModalBtnText: { color: Colors.textSecondary, fontSize: 15, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16, marginTop: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },

  // Image viewer
  imagePreviewOverlay: { flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
  imagePreviewClose: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  fullImage: { width: SCREEN_WIDTH, height: '80%' },
});
