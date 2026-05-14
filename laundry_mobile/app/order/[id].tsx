import React, { useEffect, useState, useCallback, useRef } from 'react';
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
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { adminApi } from '../../src/services/adminApi';
import { useOrderCreation } from '../../src/context/OrderCreationContext';
import { BASE_URL } from '../../src/api/axios';
import { Colors, Shadows, Typography, Radius, StatusColors } from '../../constants/theme';
import { format } from 'date-fns';
import { fr, ar } from 'date-fns/locale';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import { compressImage } from '../../src/utils/imageCompression';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Status Action Configuration
const getStatusActions = (t: any) => ({
  PENDING_PICKUP: {
    label: t('admin.orders.actions.confirm_received'),
    bg: Colors.primary,
    next: 'PICKED_UP',
    icon: 'check-circle'
  },
  PICKED_UP: {
    label: t('admin.orders.actions.start_processing'),
    bg: Colors.info,
    next: 'IN_PROCESS',
    icon: 'broom'
  },
  IN_PROCESS: {
    label: t('admin.orders.actions.mark_ready'),
    bg: Colors.accent,
    next: 'READY_FOR_DELIVERY',
    icon: 'check-circle',
    textColor: '#0D1B2A'
  },
  READY_FOR_DELIVERY: {
    label: t('admin.orders.actions.mark_delivered'),
    bg: Colors.success,
    next: 'DELIVERED',
    icon: 'truck'
  },
  DELIVERED: {
    label: t('status.DELIVERED'),
    bg: Colors.success,
    disabled: true,
    icon: 'check-double'
  },
  CANCELLED: {
    label: t('status.CANCELLED'),
    bg: Colors.danger,
    disabled: true,
    icon: 'times-circle'
  }
});

import * as Haptics from 'expo-haptics';

export default function OrderDetailsScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const STATUS_ACTIONS = getStatusActions(t);
  
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const currentUser = useSelector((state: any) => state.auth.user);
  const { loadOrderForEditing, clearOrder } = useOrderCreation();

  const [order, setOrder] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'articles' | 'client' | 'suivi'>('articles');
  const [viewImage, setViewImage] = useState<string | null>(null);

  const isAdmin = currentUser?.role?.toUpperCase() === 'ADMIN';
  const isEmploye = currentUser?.role?.toUpperCase() === 'EMPLOYE';
  const isLivreur = currentUser?.role?.toUpperCase() === 'LIVREUR';

  const canDelete = isAdmin;
  const canEdit = (isAdmin || isEmploye || (isLivreur && ['PENDING_PICKUP', 'PICKED_UP'].includes(order?.status))) && order?.status !== 'DELIVERED';
  const canAddLaboPhoto = isAdmin || isEmploye;
  const canAddReceptionPhoto = isAdmin || isEmploye || isLivreur;

  const [deliveryDate, setDeliveryDate] = useState<Date>(new Date());
  const [showDeliveryDatePicker, setShowDeliveryDatePicker] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  const handleEditOrder = () => {
    if (!order) return;
    clearOrder();
    loadOrderForEditing(order);
    router.push('/(admin)/order-items');
  };

  const [payments, setPayments] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [sharing, setSharing] = useState(false);

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Delivery Payment Modal State
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [collectedAmount, setCollectedAmount] = useState('0');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [confirmingDelivery, setConfirmingDelivery] = useState(false);

  // Driver Assignment State
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [drivers, setDrivers] = useState<any[]>([]);

  const [uploadingImage, setUploadingImage] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [orderRes, paymentsRes, historyRes, usersRes] = await Promise.all([
        adminApi.getOrder(id as string),
        adminApi.getOrderPayments(id as string).catch(() => ({ data: [] })),
        adminApi.getOrderHistory(id as string).catch(() => ({ data: [] })),
        adminApi.getUsers().catch(() => ({ data: [] }))
      ]);
      setOrder(orderRes.data);
      setPayments(paymentsRes.data);
      setHistory(historyRes.data);
      setDrivers(usersRes.data.filter((u: any) => u.role?.toLowerCase() === 'livreur'));
    } catch (error) {
      console.error('Error fetching order details:', error);
      Alert.alert(t('common.error'), t('common.error_msg'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const performStatusUpdate = async (nextStatus: string) => {
    setUpdating(true);
    try {
      await adminApi.updateOrderStatus(id as string, nextStatus);
      fetchData();
    } catch (error) {
      Alert.alert(t('common.error'), t('common.error_msg'));
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateStatus = async (nextStatus: string) => {
    if (nextStatus === 'READY_FOR_DELIVERY') {
      setSelectedDriverId(order?.deliveryDriver?.id || null);
      setDeliveryDate(order?.dateLivraisonPrevue ? new Date(order.dateLivraisonPrevue) : new Date());
      setShowDriverModal(true);
      return;
    }

    if (nextStatus === 'DELIVERED') {
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
  };

  const handleAssignAndMarkReady = async () => {
    if (!selectedDriverId) {
      Alert.alert(t('common.error'), t('admin.orders.filter_driver'));
      return;
    }

    setUpdating(true);
    try {
      await adminApi.assignDeliveryDriver(id as string, selectedDriverId);
      await adminApi.updateOrderStatus(id as string, 'READY_FOR_DELIVERY', {
        dateLivraisonPrevue: deliveryDate.toISOString()
      });
      setShowDriverModal(false);
      fetchData();
    } catch (error) {
      Alert.alert(t('common.error'), t('common.error_msg'));
    } finally {
      setUpdating(false);
    }
  };

  const handleAddPhotos = async (type: 'reception' | 'apres_traitement') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7
    });

    if (result.canceled) return;

    setUploadingImage(true);
    try {
      // Compress each image before uploading
      const localFiles = await Promise.all(result.assets.map(async (a) => {
        const compressedUri = await compressImage(a.uri);
        return {
          uri: compressedUri,
          name: `extra_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`,
          type: 'image/jpeg'
        };
      }));

      const uploadRes = await adminApi.uploadFiles(localFiles);
      await adminApi.addOrderImages(id as string, uploadRes.data, type);
      await fetchData();
      Alert.alert(t('common.success'), t('common.success_msg'));
    } catch (e) {
      console.error('Photo add error:', e);
      Alert.alert(t('common.error'), t('common.error_msg'));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteOrder = () => {
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
              await adminApi.deleteOrder(id as string);
              router.back();
            } catch (error) {
              Alert.alert(t('common.error'), t('common.error_msg'));
            }
          }
        }
      ]
    );
  };

  const handleShareReceipt = async () => {
    setSharing(true);
    try {
      const isDelivered = order.status === 'DELIVERED';
      const res = isDelivered
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
  };

  const handleViewPdf = async () => {
    const isDelivered = order.status === 'DELIVERED';
    const pdfUrl = isDelivered ? adminApi.getDeliveryPdfUrl(id as string) : adminApi.getOrderPdfUrl(id as string);
    const localUri = `${FileSystem.cacheDirectory}receipt_${id}.pdf`;
    try {
      const download = await FileSystem.downloadAsync(pdfUrl, localUri);
      if (download.status !== 200) throw new Error(t('common.error_msg'));
      await Print.printAsync({ uri: download.uri });
    } catch (e) {
      WebBrowser.openBrowserAsync(pdfUrl);
    }
  };

  const getClientPhone = (client: any) => {
    if (!client) return '';
    if (client.phone) return client.phone;
    if (Array.isArray(client.phones) && client.phones.length > 0) return client.phones[0].phoneNumber;
    return '';
  };

  if (loading || !order) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        {!loading && <Text style={{ marginTop: 10, color: Colors.textMuted }}>{t('common.no_data')}</Text>}
      </View>
    );
  }

  const statusAction = order?.status ? STATUS_ACTIONS[order.status as keyof typeof STATUS_ACTIONS] : null;
  const totalAmount = parseFloat(order?.montantTotal || 0);
  const paidAmount = parseFloat(order?.montantPaye || 0);
  const remaining = totalAmount - paidAmount;

  const renderArticlesTab = () => (
    <View>
      <View style={[styles.sectionHeader, isArabic && { flexDirection: 'row-reverse' }]}>
        <Text style={styles.sectionTitle}>{t('admin.orders.title').toUpperCase()} ({order.commandeTapis?.length || 0})</Text>
      </View>

      {order.commandeTapis?.map((item: any, index: number) => {
        const area = item.largeur && (item.hauteur || item.longueur)
          ? (parseFloat(item.largeur) * parseFloat(item.hauteur || item.longueur)).toFixed(2)
          : null;

        return (
          <View key={item.id} style={styles.itemCard}>
            <View style={[styles.itemHeader, isArabic && { flexDirection: 'row-reverse' }]}>
              <View style={[styles.itemTitleRow, isArabic && { flexDirection: 'row-reverse' }]}>
                <View style={styles.tagBadge}>
                  <Text style={styles.tagText}>TAG-{String(index + 1).padStart(3, '0')}</Text>
                </View>
                <Text style={[styles.itemName, isArabic && { textAlign: 'right', marginRight: 10, marginLeft: 0 }]}>{isArabic && item.productNomAr ? item.productNomAr : item.productNom || 'Tapis'}</Text>
              </View>
              <Text style={styles.itemPrice}>{parseFloat(item.prixFinal || 0).toFixed(2)} {t('common.dh')}</Text>
            </View>

            {item.images && item.images.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }} contentContainerStyle={[isArabic && { flexDirection: 'row-reverse' }, { gap: 8 }]}>
                {item.images.map((img: any, i: number) => (
                  <TouchableOpacity key={i} onPress={() => setViewImage(`${BASE_URL}${img.imageUrl}`)}>
                    <Image source={{ uri: `${BASE_URL}${img.imageUrl}` }} style={styles.itemGalleryImg} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {item.modeTarification === 'PER_M2' && (
              <View style={[styles.chipsRow, isArabic && { flexDirection: 'row-reverse' }]}>
                <View style={[styles.dimensionChip, isArabic && { alignItems: 'flex-end' }]}>
                  <Text style={styles.chipLabel}>{t('admin.orders.create.items.dimensions').toUpperCase()}</Text>
                  <Text style={styles.chipValue}>{item.largeur || '—'} × {item.hauteur || item.longueur || '—'} m</Text>
                </View>
                <View style={[styles.dimensionChip, isArabic && { alignItems: 'flex-end' }]}>
                  <Text style={styles.chipLabel}>{t('admin.orders.create.items.area').toUpperCase()}</Text>
                  <Text style={styles.chipValue}>{area ? `${area} m²` : '— m²'}</Text>
                </View>
              </View>
            )}

            {item.modeTarification === 'PER_UNIT' && (
              <View style={[styles.dimensionChip, { marginTop: 12, alignSelf: isArabic ? 'flex-end' : 'flex-start' }, isArabic && { alignItems: 'flex-end' }]}>
                <Text style={styles.chipLabel}>{t('admin.orders.create.items.pieces').toUpperCase()}</Text>
                <Text style={styles.chipValue}>{item.quantite}</Text>
              </View>
            )}

            {item.notes && (
              <View style={[styles.noteContainer, isArabic && { flexDirection: 'row-reverse' }]}>
                <Feather name="info" size={14} color={Colors.textSecondary} style={{ marginTop: 2 }} />
                <Text style={[styles.itemNotes, isArabic && { textAlign: 'right', marginRight: 0, marginLeft: 8 }, !isArabic && { marginLeft: 8 }]}>{item.notes}</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );

  const renderClientTab = () => (
    <View>
      <View style={styles.infoCard}>
        <Text style={[styles.sectionLabel, isArabic && { textAlign: 'right' }]}>{t('admin.orders.create.client_info').toUpperCase()}</Text>

        <View style={[styles.infoRow, isArabic && { flexDirection: 'row-reverse' }]}>
          <View style={[styles.infoIconCircle, { backgroundColor: Colors.primary100 }]}>
            <Ionicons name="person" size={20} color={Colors.primary} />
          </View>
          <TouchableOpacity 
            style={[styles.infoCol, isArabic && { alignItems: 'flex-end' }]}
            onPress={() => router.push(`/client/${order.client?.id}`)}
          >
            <Text style={styles.infoLabel}>{t('tabs.clients').toUpperCase()}</Text>
            <Text style={[styles.infoValue, { color: Colors.primary, textDecorationLine: 'underline' }]}>{order.client?.name}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.infoRow, isArabic && { flexDirection: 'row-reverse' }]} onPress={() => Linking.openURL(`tel:${getClientPhone(order.client)}`)}>
          <View style={[styles.infoIconCircle, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
            <Ionicons name="call" size={20} color={Colors.success} />
          </View>
          <View style={[styles.infoCol, isArabic && { alignItems: 'flex-end' }]}>
            <Text style={styles.infoLabel}>{t('admin.clients.phone').toUpperCase()}</Text>
            <Text style={styles.infoValue}>{getClientPhone(order.client)}</Text>
          </View>
          <Feather name="external-link" size={14} color={Colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.infoRow, isArabic && { flexDirection: 'row-reverse' }]} onPress={handleShareReceipt} disabled={sharing}>
          <View style={[styles.infoIconCircle, { backgroundColor: 'rgba(37,211,102,0.1)' }]}>
            <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
          </View>
          <View style={[styles.infoCol, isArabic && { alignItems: 'flex-end' }]}>
            <Text style={styles.infoLabel}>WHATSAPP</Text>
            <Text style={styles.infoValue}>{sharing ? t('common.loading') : t('admin.orders.create.confirmation.send_receipt')}</Text>
          </View>
          {sharing ? <ActivityIndicator size="small" color="#25D366" /> : <Feather name={isArabic ? "chevron-left" : "chevron-right"} size={14} color={Colors.textMuted} />}
        </TouchableOpacity>

        {order.livreur && (
          <View style={[styles.infoRow, isArabic && { flexDirection: 'row-reverse' }]}>
            <View style={[styles.infoIconCircle, { backgroundColor: 'rgba(201,168,76,0.1)' }]}>
              <MaterialIcons name="local-shipping" size={20} color={Colors.accent} />
            </View>
            <View style={[styles.infoCol, isArabic && { alignItems: 'flex-end' }]}>
              <Text style={styles.infoLabel}>{t('admin.orders.driver_pickup').toUpperCase()}</Text>
              <Text style={styles.infoValue}>{order.livreur.name}</Text>
            </View>
          </View>
        )}

        {order.deliveryDriver && (
          <View style={[styles.infoRow, isArabic && { flexDirection: 'row-reverse' }]}>
            <View style={[styles.infoIconCircle, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
              <MaterialIcons name="local-shipping" size={20} color={Colors.success} />
            </View>
            <View style={[styles.infoCol, isArabic && { alignItems: 'flex-end' }]}>
              <Text style={styles.infoLabel}>{t('admin.orders.driver_delivery').toUpperCase()}</Text>
              <Text style={styles.infoValue}>{order.deliveryDriver.name}</Text>
            </View>
          </View>
        )}

        {order.status !== 'DELIVERED' && !order.deliveryDriver && (
          <TouchableOpacity style={[styles.infoRow, isArabic && { flexDirection: 'row-reverse' }]} onPress={() => setShowDriverModal(true)}>
            <View style={[styles.infoIconCircle, { backgroundColor: Colors.primary100 }]}>
              <Feather name="plus" size={20} color={Colors.primary} />
            </View>
            <View style={[styles.infoCol, isArabic && { alignItems: 'flex-end' }]}>
              <Text style={styles.infoLabel}>{t('admin.orders.driver_delivery').toUpperCase()}</Text>
              <Text style={[styles.infoValue, { color: Colors.primary }]}>{t('admin.orders.filter_driver')}</Text>
            </View>
            <Feather name={isArabic ? "chevron-left" : "chevron-right"} size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {order.client?.addresses?.[0]?.latitude && (
        <View style={styles.mapSection}>
          <View style={[styles.mapHeaderRow, isArabic && { flexDirection: 'row-reverse' }]}>
             <Ionicons name="location" size={16} color={Colors.primary} />
             <Text style={styles.mapTitle}>{t('admin.clients.address')}</Text>
          </View>
          <Text style={[styles.addressText, isArabic && { textAlign: 'right' }]}>{order.client.addresses[0].address}</Text>

          <View style={styles.mapWrapper}>
            <MapView
              provider={PROVIDER_DEFAULT}
              style={styles.map}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
              initialRegion={{
                latitude: parseFloat(order.client.addresses[0].latitude),
                longitude: parseFloat(order.client.addresses[0].longitude),
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
            >
              <Marker
                coordinate={{
                  latitude: parseFloat(order.client.addresses[0].latitude),
                  longitude: parseFloat(order.client.addresses[0].longitude),
                }}
              >
                <View style={styles.markerContainer}><View style={styles.markerPin} /></View>
              </Marker>
            </MapView>
            <TouchableOpacity
              style={[styles.openMapBtn, isArabic ? { left: 12, right: undefined } : { right: 12 }]}
              onPress={() => Linking.openURL(`https://maps.google.com/?q=${order.client.addresses[0].latitude},${order.client.addresses[0].longitude}`)}
            >
              <Text style={styles.openMapText}>{t('admin.clients.map')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  const renderSuiviTab = () => (
    <View>
      <View style={[styles.sectionHeader, { flexDirection: isArabic ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <Text style={styles.sectionTitle}>{t('financial.details').toUpperCase()}</Text>
        {isAdmin && order.status === 'DELIVERED' ? (
          <TouchableOpacity onPress={() => setShowPaymentModal(true)}>
            <Text style={styles.addPaymentLink}>+ {t('common.new')}</Text>
          </TouchableOpacity>
        ) : order.status !== 'DELIVERED' ? (
          <Text style={{ fontSize: 12, color: Colors.textMuted, fontStyle: 'italic' }}>
            {t('admin.orders.payment_at_delivery')}
          </Text>
        ) : null}
      </View>

      <View style={styles.paymentSummaryCard}>
        <View style={[styles.paymentRow, isArabic && { flexDirection: 'row-reverse' }]}>
          <Text style={styles.paymentLabel}>{t('financial.total')}</Text>
          <Text style={[styles.paymentValue, { color: Colors.primary }]}>{totalAmount.toFixed(2)} {t('common.dh')}</Text>
        </View>
        <View style={[styles.paymentRow, isArabic && { flexDirection: 'row-reverse' }]}>
          <Text style={styles.paymentLabel}>{t('financial.paid')}</Text>
          <Text style={[styles.paymentValue, { color: Colors.success }]}>{paidAmount.toFixed(2)} {t('common.dh')}</Text>
        </View>
        <View style={[styles.paymentRow, { borderBottomWidth: 0, paddingBottom: 0 }, isArabic && { flexDirection: 'row-reverse' }]}>
          <Text style={styles.paymentLabel}>{t('financial.remaining')}</Text>
          <Text style={[styles.paymentValue, remaining > 0 ? { color: Colors.warning } : { color: Colors.textMuted }]}>
            {remaining.toFixed(2)} {t('common.dh')}
          </Text>
        </View>

        {payments.length > 0 && (
          <View style={styles.paymentsList}>
            <View style={styles.listDivider} />
            {payments.map((p) => (
              <View key={p.id} style={styles.paymentHistoryItem}>
                <View style={[styles.historyTop, isArabic && { flexDirection: 'row-reverse' }]}>
                  <Text style={styles.historyAmount}>{parseFloat(p.montant).toFixed(2)} {t('common.dh')}</Text>
                  <Text style={styles.historyDate}>{format(new Date(p.datePaiement), 'dd/MM/yy HH:mm')}</Text>
                </View>
                {p.note && (
                  <View style={[styles.historyNoteBox, isArabic && { flexDirection: 'row-reverse' }]}>
                    <Feather name="info" size={10} color={Colors.textMuted} />
                    <Text style={[styles.historyNote, isArabic && { textAlign: 'right', marginLeft: 0, marginRight: 6 }, !isArabic && { marginLeft: 6 }]}>{p.note}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={[styles.sectionHeader, isArabic && { flexDirection: 'row-reverse' }]}>
        <Text style={styles.sectionTitle}>{t('admin.orders.history').toUpperCase()}</Text>
      </View>
      <View style={styles.historyTimeline}>
        {history.map((event, index) => (
          <View key={event.id} style={[styles.timelineItem, isArabic && { flexDirection: 'row-reverse' }]}>
            <View style={styles.timelineLeft}>
              <View style={[styles.timelineDot, { backgroundColor: StatusColors[event.nouveauStatut]?.dot || Colors.primary }]} />
              {index !== history.length - 1 && <View style={styles.timelineLine} />}
            </View>
            <View style={[styles.timelineRight, isArabic ? { paddingLeft: 0, paddingRight: 12 } : { paddingLeft: 12 }]}>
              <Text style={[styles.timelineStatus, isArabic && { textAlign: 'right' }]}>{StatusColors[event.nouveauStatut]?.label ? t(`status.${event.nouveauStatut}`) : event.nouveauStatut}</Text>
              <Text style={[styles.timelineMeta, isArabic && { textAlign: 'right' }]}>{t('common.by')} {event.user?.name || 'Système'} • {format(new Date(event.createdAt), 'dd MMM, HH:mm', { locale: isArabic ? ar : fr })}</Text>
              {event.commentaire && (
                <View style={[styles.timelineCommentBox, isArabic && { flexDirection: 'row-reverse' }]}>
                   <Text style={[styles.timelineComment, isArabic && { textAlign: 'right' }]}>{event.commentaire}</Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const confirmDelivery = async () => {
    const amount = parseFloat(collectedAmount) || 0;
    if (isNaN(amount) || amount < 0) return Alert.alert(t('common.error'), t('admin.unpaid.enter_valid_amount'));
    
    if (amount > remaining + 0.05) {
      return Alert.alert(t('common.error'), `${t('admin.unpaid.payment_exceeds_remaining', { defaultValue: 'Le montant dépasse le reste' })} (${remaining.toFixed(2)} DH)`);
    }

    setConfirmingDelivery(true);
    try {
      await adminApi.updateOrderStatus(id as string, 'DELIVERED', { montantCollecte: amount, notesPaiement: deliveryNotes });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowDeliveryModal(false);
      await fetchData();
      Alert.alert(t('delivery.delivery_success'), t('delivery.send_receipt_prompt'), [{ text: t('common.cancel'), style: 'cancel' }, { text: '📱 WhatsApp', onPress: () => handleShareReceipt() }]);
    } catch (e) {
      Alert.alert(t('common.error'), t('common.error_msg'));
    } finally {
      setConfirmingDelivery(false);
    }
  };

  const handleAddPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (!paymentAmount || isNaN(amount) || amount <= 0) return Alert.alert(t('common.error'), t('admin.unpaid.enter_valid_amount'));
    
    if (amount > remaining + 0.05) {
      return Alert.alert(t('common.error'), `${t('admin.unpaid.payment_exceeds_remaining', { defaultValue: 'Le montant dépasse le reste' })} (${remaining.toFixed(2)} DH)`);
    }

    setSubmittingPayment(true);
    try {
      await adminApi.addOrderPayment(id as string, amount, paymentNote);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentNote('');
      fetchData();
    } catch (error) {
      Alert.alert(t('common.error'), t('common.error_msg'));
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(admin)/(tabs)');
    }
  };

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

      <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.card}>
          <View style={[styles.statusBadge, { backgroundColor: StatusColors[order.status]?.bg || Colors.primary50 }, isArabic && { flexDirection: 'row-reverse' }]}>
            <View style={[styles.statusDot, { backgroundColor: StatusColors[order.status]?.dot || Colors.primary }]} />
            <Text style={[styles.statusText, { color: StatusColors[order.status]?.text || Colors.primary }]}>{StatusColors[order.status]?.label ? t(`status.${order.status}`) : order.status}</Text>
          </View>
          <Text style={styles.orderLabel}>{t('admin.orders.title').toUpperCase()}</Text>
          <Text style={styles.orderRef}>#{order.numeroCommande}</Text>
          {remaining <= 0 && <View style={[styles.paidStamp, isArabic ? { left: 20, right: undefined } : { right: 20 }]}><Text style={styles.paidStampText}>{t('dashboard.all_settled').toUpperCase()}</Text></View>}
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
              {order.status === 'DELIVERED' ? (
                <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
                  {remaining <= 0 ? (
                    <View style={[{ backgroundColor: Colors.successBg, borderRadius: 14, padding: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }, isArabic && { flexDirection: 'row-reverse' }]}><Ionicons name="checkmark-done-circle" size={20} color={Colors.success} /><Text style={[{ fontSize: 15, fontWeight: '700', color: Colors.success }, isArabic && { flex: 1, textAlign: 'right' }]}>{t('dashboard.all_settled')}</Text><Text style={[{ fontSize: 15, fontWeight: '700', color: Colors.success }, !isArabic && { marginLeft: 'auto' }]}>{totalAmount.toFixed(2)} {t('common.dh')}</Text></View>
                  ) : (
                    <>
                      {paidAmount > 0 ? (
                        <View style={{ backgroundColor: Colors.warningBg, borderRadius: 14, padding: 14, paddingHorizontal: 16 }}><View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, isArabic && { flexDirection: 'row-reverse' }]}><Text style={{ fontSize: 14, fontWeight: '700', color: Colors.warning }}>{t('delivery.partial_payment')}</Text>{isAdmin && <TouchableOpacity onPress={() => setShowPaymentModal(true)}><Text style={{ fontSize: 14, fontWeight: '600', color: Colors.primary }}>+ {t('common.new')}</Text></TouchableOpacity>}</View><View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.08)', marginTop: 10, overflow: 'hidden' }}><View style={{ height: 6, borderRadius: 3, backgroundColor: Colors.warning, width: `${(paidAmount / totalAmount) * 100}%`, alignSelf: isArabic ? 'flex-end' : 'flex-start' }} /></View><View style={[{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }, isArabic && { flexDirection: 'row-reverse' }]}><Text style={{ fontSize: 13, color: Colors.success }}>{t('financial.paid')}: {paidAmount.toFixed(2)} {t('common.dh')}</Text><Text style={{ fontSize: 13, fontWeight: '700', color: Colors.warning }}>{t('financial.remaining')}: {remaining.toFixed(2)} {t('common.dh')}</Text></View></View>
                      ) : (
                        <View style={[{ backgroundColor: Colors.dangerBg, borderRadius: 14, padding: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }, isArabic && { flexDirection: 'row-reverse' }]}><Text style={[{ fontSize: 14, fontWeight: '700', color: Colors.danger, flex: 1 }, isArabic && { textAlign: 'right' }]}>{t('delivery.unpaid_warning')}</Text>{isAdmin && <TouchableOpacity style={{ backgroundColor: Colors.danger, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 }} onPress={() => setShowPaymentModal(true)}><Text style={{ fontSize: 12, fontWeight: '600', color: 'white' }}>{t('admin.unpaid.add_payment')}</Text></TouchableOpacity>}</View>
                      )}
                    </>
                  )}
                </View>
              ) : statusAction && (
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: statusAction.bg }, statusAction.disabled && { opacity: 0.8 }, !statusAction.disabled && { ...Shadows.md, shadowColor: statusAction.bg }, isArabic && { flexDirection: 'row-reverse' }]} onPress={() => !statusAction.disabled && statusAction.next && handleUpdateStatus(statusAction.next)} disabled={statusAction.disabled || updating}>{updating ? <ActivityIndicator color="white" /> : <><FontAwesome5 name={statusAction.icon as any} size={18} color={statusAction.textColor || 'white'} /><Text style={[styles.actionBtnText, { color: statusAction.textColor || 'white' }]}>{statusAction.label}</Text></>}</TouchableOpacity>
              )}

              {(order.status === 'READY_FOR_DELIVERY' && (isAdmin || isEmploye)) && (
                <TouchableOpacity style={styles.editDeliveryBtn} onPress={() => { setSelectedDriverId(order.deliveryDriver?.id || null); setDeliveryDate(order.dateLivraisonPrevue ? new Date(order.dateLivraisonPrevue) : new Date()); setShowDriverModal(true); }}><Feather name="truck" size={14} color={Colors.primary} /><Text style={styles.editDeliveryText}>{t('admin.orders.filter_driver')} / {t('common.date')}</Text></TouchableOpacity>
              )}

              {(order.images && order.images.length > 0) && (
                <View style={styles.infoCard}><Text style={[styles.sectionLabel, isArabic && { textAlign: 'right' }]}>{t('admin.orders.create.items.photos').toUpperCase()}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[isArabic && { flexDirection: 'row-reverse' }, { gap: 10 }]}>{order.images.map((img: any, idx: number) => (<TouchableOpacity key={idx} onPress={() => setViewImage(`${BASE_URL}${img.imageUrl}`)}><Image source={{ uri: `${BASE_URL}${img.imageUrl}` }} style={styles.galleryImg} /><View style={[styles.imgBadge, isArabic ? { left: 6, right: undefined } : { right: 6 }]}><Text style={styles.imgBadgeText}>{img.photoType === 'reception' ? 'Récep.' : img.photoType === 'livraison' ? 'Livraison' : 'Labo'}</Text></View></TouchableOpacity>))}</ScrollView></View>
              )}

              {renderArticlesTab()}

              <View style={[styles.sectionHeader, isArabic && { flexDirection: 'row-reverse' }]}><Text style={styles.sectionTitle}>{t('dashboard.quick_actions')}</Text></View>
              <View style={styles.quickActionsGrid}><View style={[styles.gridRow, isArabic && { flexDirection: 'row-reverse' }]}><TouchableOpacity style={[styles.gridBtn, { backgroundColor: 'rgba(37,211,102,0.1)' }, isArabic && { flexDirection: 'row-reverse' }]} onPress={handleShareReceipt}><Ionicons name="logo-whatsapp" size={20} color="#25D366" /><Text style={[styles.gridBtnText, { color: '#25D366' }]}>WhatsApp</Text></TouchableOpacity><TouchableOpacity style={[styles.gridBtn, { backgroundColor: Colors.primary100 }, isArabic && { flexDirection: 'row-reverse' }]} onPress={handleViewPdf}><Ionicons name="document-text" size={20} color={Colors.primary} /><Text style={[styles.gridBtnText, { color: Colors.primary }]}>{t('admin.orders.create.confirmation.view_pdf')}</Text></TouchableOpacity></View><View style={[styles.gridRow, isArabic && { flexDirection: 'row-reverse' }]}>{canAddLaboPhoto && (<TouchableOpacity style={[styles.gridBtn, { backgroundColor: 'rgba(59,130,246,0.1)' }, isArabic && { flexDirection: 'row-reverse' }]} onPress={() => handleAddPhotos('apres_traitement')} disabled={uploadingImage}><Feather name="camera" size={20} color={Colors.info} /><Text style={[styles.gridBtnText, { color: Colors.info }]}>Photo Labo</Text></TouchableOpacity>)}{canAddReceptionPhoto && (<TouchableOpacity style={[styles.gridBtn, { backgroundColor: Colors.primary100 }, isArabic && { flexDirection: 'row-reverse' }]} onPress={() => handleAddPhotos('reception')} disabled={uploadingImage}><Ionicons name="images" size={20} color={Colors.primary} /><Text style={[styles.gridBtnText, { color: Colors.primary }]}>Photo Récep.</Text></TouchableOpacity>)}</View></View>
            </>
          )}

          {activeTab === 'client' && renderClientTab()}
          {activeTab === 'suivi' && renderSuiviTab()}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Driver & Date Modal */}
      <Modal visible={showDriverModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismiss} activeOpacity={1} onPress={() => setShowDriverModal(false)} />
          <View style={[styles.modalSheet, { height: '80%' }]}><View style={styles.modalHandle} /><Text style={[styles.modalTitle, isArabic && { textAlign: 'right' }]}>{t('delivery.confirm_title')}</Text><ScrollView showsVerticalScrollIndicator={false}><View style={styles.modalBody}><Text style={[styles.inputLabel, isArabic && { textAlign: 'right' }]}>{t('admin.orders.pickup_date')}</Text><TouchableOpacity style={[styles.dateSelectorBtn, isArabic && { flexDirection: 'row-reverse' }]} onPress={() => setShowDeliveryDatePicker(true)}><Ionicons name="calendar-outline" size={20} color={Colors.primary} /><Text style={styles.dateSelectorText}>{format(deliveryDate, 'PPPP', { locale: isArabic ? ar : fr })}</Text></TouchableOpacity>{showDeliveryDatePicker && (<DateTimePicker value={deliveryDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(event, date) => { setShowDeliveryDatePicker(false); if (date) setDeliveryDate(date); }} />)}<Text style={[styles.inputLabel, { marginTop: 20 }, isArabic && { textAlign: 'right' }]}>{t('admin.orders.filter_driver')}</Text>{drivers.map(driver => (<TouchableOpacity key={driver.id} style={[styles.driverOption, selectedDriverId === driver.id && styles.driverOptionSelected, isArabic && { flexDirection: 'row-reverse' }]} onPress={() => setSelectedDriverId(driver.id)}><View style={[styles.driverAvatarSmall, { backgroundColor: selectedDriverId === driver.id ? 'white' : Colors.primary100 }]}><Text style={[styles.driverAvatarText, { color: selectedDriverId === driver.id ? Colors.primary : Colors.primaryDark }]}>{driver.name?.[0]?.toUpperCase()}</Text></View><Text style={[styles.driverOptionName, selectedDriverId === driver.id && { color: 'white' }]}>{driver.name}</Text>{selectedDriverId === driver.id && (<Ionicons name="checkmark-circle" size={20} color="white" />)}</TouchableOpacity>))}</View></ScrollView><View style={[styles.modalActions, { marginTop: 20 }, isArabic && { flexDirection: 'row-reverse' }]}><TouchableOpacity style={[styles.secondaryModalBtn, { flex: 1 }]} onPress={() => setShowDriverModal(false)}><Text style={styles.secondaryModalBtnText}>{t('common.cancel')}</Text></TouchableOpacity><TouchableOpacity style={[styles.primaryModalBtn, { flex: 2 }]} onPress={handleAssignAndMarkReady} disabled={updating}>{updating ? <ActivityIndicator color="white" /> : <Text style={styles.primaryModalBtnText}>{t('common.confirm')}</Text>}</TouchableOpacity></View></View>
        </View>
      </Modal>

      {/* Single Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity style={styles.modalDismiss} activeOpacity={1} onPress={() => setShowPaymentModal(false)} />
          <View style={[styles.modalSheet, { maxHeight: '90%' }]}>
            <View style={styles.modalHandle} />
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
              <Text style={[styles.modalTitle, isArabic && { textAlign: 'right' }]}>{t('admin.unpaid.add_payment')}</Text>
              
              <View style={styles.modalBody}>
              <View style={[styles.remainingInfo, isArabic && { flexDirection: 'row-reverse' }]}>
                 <Text style={styles.remainingLabel}>{t('financial.remaining')}:</Text>
                 <Text style={styles.remainingValue}>{remaining.toFixed(2)} {t('common.dh')}</Text>
              </View>

              <Text style={[styles.inputLabel, isArabic && { textAlign: 'right' }]}>{t('admin.catalog.price_dh')}</Text>
              <View style={styles.amountInputContainer}>
                <TextInput
                  style={[
                    styles.amountInput, 
                    { fontSize: 28, fontWeight: '800', textAlign: 'center' }, 
                    isArabic && { textAlign: 'right' },
                    parseFloat(paymentAmount) > remaining + 0.05 && { color: Colors.danger }
                  ]}
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  autoFocus
                />
                <TouchableOpacity 
                  style={styles.fullAmountBtn}
                  onPress={() => {
                    setPaymentAmount(remaining.toFixed(2));
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }}
                >
                  <Text style={styles.fullAmountBtnText}>{t('common.all')}</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.inputLabel, isArabic && { textAlign: 'right' }]}>{t('common.notes')}</Text>
              <TextInput
                style={[styles.noteInput, isArabic && { textAlign: 'right' }]}
                value={paymentNote}
                onChangeText={setPaymentNote}
                placeholder={t('delivery.notes_placeholder')}
                multiline
              />

              <View style={[styles.modalActions, isArabic && { flexDirection: 'row-reverse' }]}>
                <TouchableOpacity 
                  style={[styles.secondaryModalBtn, { flex: 1 }]} 
                  onPress={() => setShowPaymentModal(false)}
                >
                  <Text style={styles.secondaryModalBtnText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.primaryModalBtn, 
                    { flex: 2 }, 
                    (submittingPayment || parseFloat(paymentAmount) > remaining + 0.05) && { opacity: 0.5 }
                  ]}
                  onPress={handleAddPayment}
                  disabled={submittingPayment || parseFloat(paymentAmount) > remaining + 0.05}
                >
                  {submittingPayment ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.primaryModalBtnText}>{t('common.confirm')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal 
        visible={showDeliveryModal} 
        animationType="slide" 
        transparent 
        onRequestClose={() => setShowDeliveryModal(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity style={styles.modalDismiss} activeOpacity={1} onPress={() => setShowDeliveryModal(false)} />
          <View style={[styles.modalSheet, { maxHeight: '90%' }]}>
            <View style={styles.modalHandle} />
            <ScrollView 
              showsVerticalScrollIndicator={false} 
              bounces={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 24 }}
            ><Text style={[styles.modalTitle, isArabic && { textAlign: 'right' }]}>{t('delivery.confirm_title')}</Text><Text style={[{ fontSize: 14, color: Colors.textSecondary, marginBottom: 20 }, isArabic && { textAlign: 'right' }]}>{t('delivery.declare_amount')}</Text><View style={[{ backgroundColor: Colors.primary50, borderRadius: 14, padding: 16, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, isArabic && { flexDirection: 'row-reverse' }]}><Text style={{ fontSize: 13, color: Colors.textSecondary }}>{t('delivery.order_total')}</Text><Text style={{ fontSize: 18, fontWeight: '700', color: Colors.primary }}>{totalAmount.toFixed(2)} {t('common.dh')}</Text></View><View style={styles.modalBody}><Text style={[styles.inputLabel, isArabic && { textAlign: 'right' }]}>{t('delivery.collected_amount')}</Text><TextInput style={[styles.amountInput, { height: 60, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.12)', borderRadius: 14, borderBottomWidth: 1.5, fontSize: 24, textAlign: 'center' }]} value={collectedAmount} onChangeText={setCollectedAmount} keyboardType="decimal-pad" placeholder="0" autoFocus /><View style={[{ flexDirection: 'row', gap: 8, marginTop: 10 }, isArabic && { flexDirection: 'row-reverse' }]}><TouchableOpacity style={{ flex: 1, height: 38, borderRadius: 10, backgroundColor: Colors.primary100, justifyContent: 'center', alignItems: 'center' }} onPress={() => setCollectedAmount('0')}><Text style={{ fontSize: 13, fontWeight: '600', color: Colors.primary }}>0 {t('common.dh')}</Text></TouchableOpacity><TouchableOpacity style={{ flex: 1, height: 38, borderRadius: 10, backgroundColor: Colors.primary100, justifyContent: 'center', alignItems: 'center' }} onPress={() => setCollectedAmount(totalAmount.toString())}><Text style={{ fontSize: 13, fontWeight: '600', color: Colors.primary }}>{totalAmount.toFixed(0)} {t('common.dh')}</Text></TouchableOpacity></View><View style={{ marginTop: 16, borderRadius: 12, padding: 14, backgroundColor: parseFloat(collectedAmount) === 0 ? Colors.dangerBg : parseFloat(collectedAmount) < totalAmount ? '#FFF7ED' : Colors.successBg, borderWidth: 1, borderColor: parseFloat(collectedAmount) === 0 ? 'rgba(239,68,68,0.2)' : parseFloat(collectedAmount) < totalAmount ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)' }}><Text style={[{ fontSize: 14, fontWeight: '600', color: parseFloat(collectedAmount) === 0 ? Colors.danger : parseFloat(collectedAmount) < totalAmount ? '#D97706' : Colors.success }, isArabic && { textAlign: 'right' }]}>{parseFloat(collectedAmount) === 0 ? t('delivery.unpaid_warning') : parseFloat(collectedAmount) < totalAmount ? t('delivery.partial_payment') : t('delivery.full_payment')}</Text><Text style={[{ fontSize: 12, color: parseFloat(collectedAmount) === 0 ? Colors.danger : parseFloat(collectedAmount) < totalAmount ? '#D97706' : Colors.success, opacity: 0.8 }, isArabic && { textAlign: 'right' }]}>{parseFloat(collectedAmount) === 0 ? `${t('delivery.unpaid_sub')} (${totalAmount.toFixed(2)} ${t('common.dh')})` : parseFloat(collectedAmount) < totalAmount ? `${t('delivery.partial_sub')}: ${(totalAmount - parseFloat(collectedAmount)).toFixed(2)} ${t('common.dh')}` : t('delivery.full_sub')}</Text></View><Text style={[styles.inputLabel, { marginTop: 16 }, isArabic && { textAlign: 'right' }]}>{t('delivery.notes_label')}</Text><TextInput style={[styles.noteInput, { minHeight: 60 }, isArabic && { textAlign: 'right' }]} value={deliveryNotes} onChangeText={setDeliveryNotes} placeholder={t('delivery.notes_placeholder')} multiline /><View style={[{ flexDirection: 'row', gap: 10, marginTop: 24, paddingBottom: 20 }, isArabic && { flexDirection: 'row-reverse' }]}><TouchableOpacity style={{ flex: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setShowDeliveryModal(false)}><Text style={{ color: Colors.textSecondary, fontWeight: '600' }}>{t('common.cancel')}</Text></TouchableOpacity><TouchableOpacity style={{ flex: 2, height: 52, borderRadius: 14, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', ...Shadows.teal }} onPress={confirmDelivery} disabled={confirmingDelivery}>{confirmingDelivery ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontSize: 15, fontWeight: '700' }}>{t('common.confirm')} — {parseFloat(collectedAmount) || 0} {t('common.dh')}</Text>}</TouchableOpacity></View></View></ScrollView></View></KeyboardAvoidingView></Modal>

      <Modal visible={!!viewImage} transparent animationType="fade" onRequestClose={() => setViewImage(null)}><View style={styles.imagePreviewOverlay}><TouchableOpacity style={styles.imagePreviewClose} onPress={() => setViewImage(null)}><Ionicons name="close" size={30} color="white" /></TouchableOpacity>{viewImage && (<Image source={{ uri: viewImage }} style={styles.fullImage} resizeMode="contain" />)}</View></Modal>
    </View>
  );
}

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
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16, marginTop: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, letterSpacing: 0.5 },
  itemCard: { backgroundColor: 'white', marginHorizontal: 16, marginBottom: 12, borderRadius: 20, padding: 16, ...Shadows.sm },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  tagBadge: { backgroundColor: Colors.primary50, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tagText: { color: Colors.primary, fontSize: 10, fontWeight: '800' },
  itemName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  itemPrice: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  itemGalleryImg: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#F1F5F9' },
  chipsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  dimensionChip: { backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  chipLabel: { fontSize: 9, fontWeight: '700', color: Colors.textMuted, marginBottom: 2 },
  chipValue: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  itemNotes: { fontSize: 13, color: Colors.textSecondary, fontStyle: 'italic' },
  itemStatusContainer: { marginTop: 12, alignItems: 'flex-end' },
  itemStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  itemStatusText: { fontSize: 11, fontWeight: '800' },
  infoCard: { backgroundColor: 'white', marginHorizontal: 16, borderRadius: 20, padding: 20, ...Shadows.sm, marginBottom: 16 },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: Colors.textMuted, marginBottom: 16, letterSpacing: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  infoIconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  infoCol: { flex: 1 },
  infoLabel: { fontSize: 10, fontWeight: '600', color: Colors.textMuted, marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  mapSection: { marginHorizontal: 16, marginBottom: 24 },
  mapTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  addressText: { fontSize: 14, color: Colors.textSecondary, marginBottom: 12, marginLeft: 4 },
  mapWrapper: { height: 200, borderRadius: 24, overflow: 'hidden', ...Shadows.md },
  map: { flex: 1 },
  markerContainer: { padding: 4, backgroundColor: 'white', borderRadius: 20, ...Shadows.md },
  markerPin: { width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.primary, borderWidth: 2, borderColor: 'white' },
  openMapBtn: { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, ...Shadows.sm },
  openMapText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  paymentSummaryCard: { backgroundColor: 'white', marginHorizontal: 16, borderRadius: 20, padding: 20, ...Shadows.sm },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  paymentLabel: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  paymentValue: { fontSize: 15, fontWeight: '700' },
  addPaymentLink: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  paymentsList: { marginTop: 8 },
  listDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  paymentHistoryItem: { marginBottom: 12 },
  historyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyAmount: { fontSize: 15, fontWeight: '700', color: Colors.success },
  historyDate: { fontSize: 12, color: Colors.textMuted },
  historyNote: { fontSize: 13, color: Colors.textSecondary, fontStyle: 'italic' },
  historyTimeline: { marginHorizontal: 24, marginTop: 8 },
  timelineItem: { flexDirection: 'row', minHeight: 70 },
  timelineLeft: { width: 30, alignItems: 'center' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, zIndex: 1, borderWidth: 2, borderColor: 'white', marginTop: 4 },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#E2E8F0', marginVertical: -4 },
  timelineRight: { flex: 1, paddingLeft: 12, paddingBottom: 20 },
  timelineStatus: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  timelineMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  timelineComment: { fontSize: 13, color: Colors.textSecondary },
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
  confirmBtn: { backgroundColor: Colors.primary, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 12, ...Shadows.teal },
  confirmBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  galleryImg: { width: 100, height: 100, borderRadius: 16, backgroundColor: '#F1F5F9' },
  imgBadge: { position: 'absolute', bottom: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  imgBadgeText: { color: 'white', fontSize: 9, fontWeight: '700' },
  imagePreviewOverlay: { flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
  imagePreviewClose: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  fullImage: { width: SCREEN_WIDTH, height: '80%' },
  noteContainer: { flexDirection: 'row', marginTop: 12, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  mapHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, marginLeft: 4 },
  historyNoteBox: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  timelineCommentBox: { marginTop: 6, backgroundColor: '#F8FAFC', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#F1F5F9' },
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
  
  amountInputContainer: { position: 'relative', justifyContent: 'center', marginBottom: 16 },
  fullAmountBtn: { position: 'absolute', right: 12, top: '25%', backgroundColor: Colors.primary100, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  fullAmountBtnText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  
  remainingInfo: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC', paddingVertical: 8, borderRadius: 12, gap: 8, marginBottom: 12 },
  remainingLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  remainingValue: { fontSize: 14, color: Colors.primary, fontWeight: '700' },
});
