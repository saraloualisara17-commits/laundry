import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { Ionicons, Feather, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { adminApi } from '../../src/services/adminApi';
import { useOrderCreation } from '../../src/context/OrderCreationContext';
import { BASE_URL } from '../../src/api/axios';
import { Colors, Shadows, Typography, Radius, StatusColors } from '../../constants/theme';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Status Action Configuration
const STATUS_ACTIONS = {
  PENDING_PICKUP: {
    label: "✓ Confirm Order Received",
    bg: Colors.primary,
    next: 'PICKED_UP',
    icon: 'check-circle'
  },
  PICKED_UP: {
    label: "🧺 Start Processing",
    bg: Colors.info,
    next: 'IN_PROCESS',
    icon: 'broom'
  },
  IN_PROCESS: {
    label: "✓ Mark as Ready",
    bg: Colors.accent,
    next: 'READY_FOR_DELIVERY',
    icon: 'check-circle',
    textColor: '#0D1B2A'
  },
  READY_FOR_DELIVERY: {
    label: "🚚 Mark as Delivered",
    bg: Colors.success,
    next: 'DELIVERED',
    icon: 'truck'
  },
  DELIVERED: {
    label: "✓ Delivered",
    bg: Colors.success,
    disabled: true,
    icon: 'check-double'
  },
  CANCELLED: {
    label: "✗ Cancelled",
    bg: Colors.danger,
    disabled: true,
    icon: 'times-circle'
  }
};

export default function OrderDetailsScreen() {
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
  const canEdit = isAdmin || isEmploye || (isLivreur && ['PENDING_PICKUP', 'PICKED_UP'].includes(order?.status));
  const canAddLaboPhoto = isAdmin || isEmploye;
  const canAddReceptionPhoto = isAdmin || isEmploye || isLivreur;

  const handleEditOrder = () => {
    if (!order) return;
    clearOrder();
    loadOrderForEditing(order);
    // Redirect to the first step of order creation
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
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<any[]>([]);

  const handleUpdateStatus = async (nextStatus: string) => {
    if (nextStatus === 'READY_FOR_DELIVERY' && !order?.deliveryDriver) {
      Alert.alert(
        'Assignation requise',
        'Veuillez choisir le livreur qui effectuera la livraison avant de marquer comme prêt.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Choisir Livreur', onPress: () => {
            setPendingStatusUpdate(nextStatus);
            setShowDriverModal(true);
          }}
        ]
      );
      return;
    }

    if (nextStatus === 'DELIVERED') {
      setCollectedAmount('0');
      setDeliveryNotes('');
      setShowDeliveryModal(true);
      return;
    }

    Alert.alert(
      'Changer le statut',
      `Voulez-vous passer la commande au statut ${nextStatus} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', onPress: () => performStatusUpdate(nextStatus) }
      ]
    );
  };

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
      Alert.alert('Erreur', 'Impossible de charger les détails de la commande.');
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
      await fetchData();
    } catch (error) {
      Alert.alert('Erreur', 'Échec de la mise à jour du statut.');
    } finally {
      setUpdating(false);
    }
  };

  const handleAddPhotos = async (type: 'reception' | 'apres_traitement') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7
    });

    if (result.canceled) return;

    setUploadingImage(true);
    try {
      const localFiles = result.assets.map(a => ({
        uri: a.uri,
        name: `extra_${Date.now()}.jpg`,
        type: 'image/jpeg'
      }));
      const uploadRes = await adminApi.uploadFiles(localFiles);
      await adminApi.addOrderImages(id as string, uploadRes.data, type);
      await fetchData();
      Alert.alert('Succès', 'Photos ajoutées');
    } catch (e) {
      Alert.alert('Erreur', 'Échec de l\'upload');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteOrder = () => {
    Alert.alert(
      'Supprimer la commande',
      'Êtes-vous sûr de vouloir supprimer définitivement cette commande ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminApi.deleteOrder(id as string);
              router.back();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer la commande.');
            }
          }
        }
      ]
    );
  };

  const handleAssignDeliveryDriver = async (driverId: string) => {
    setUpdating(true);
    try {
      await adminApi.assignDeliveryDriver(id as string, driverId);
      
      if (pendingStatusUpdate) {
        await adminApi.updateOrderStatus(id as string, pendingStatusUpdate);
        setPendingStatusUpdate(null);
      }

      setShowDriverModal(false);
      fetchData();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'assigner le livreur');
    } finally {
      setUpdating(false);
    }
  };

  const handleShareReceipt = async () => {
    setSharing(true);
    try {
      const isDelivered = order.status === 'DELIVERED';
      const pdfUrl = isDelivered
        ? adminApi.getDeliveryPdfUrl(id as string)
        : adminApi.getOrderPdfUrl(id as string);

      const fileName = isDelivered ? `bon_livraison_${id}.pdf` : `recu_commande_${id}.pdf`;
      const localUri = `${FileSystem.cacheDirectory}${fileName}`;

      const { store } = require('../../src/store/store');
      const token = store.getState().auth.token;

      const download = await FileSystem.downloadAsync(pdfUrl, localUri, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (download.status !== 200) {
        throw new Error('Échec du téléchargement');
      }

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Erreur', 'Le partage n\'est pas disponible sur cet appareil');
        return;
      }

      await Sharing.shareAsync(download.uri, {
        mimeType: 'application/pdf',
        dialogTitle: isDelivered ? 'Partager le bon de livraison' : 'Partager le reçu',
        UTI: 'com.adobe.pdf',
      });
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de générer ou de partager le PDF');
    } finally {
      setSharing(false);
    }
  };
  const handleViewPdf = async () => {
    const isDelivered = order.status === 'DELIVERED';
    const pdfUrl = isDelivered
      ? adminApi.getDeliveryPdfUrl(id as string)
      : adminApi.getOrderPdfUrl(id as string);
    
    const localUri = `${FileSystem.cacheDirectory}receipt_${id}.pdf`;

    try {
      const { store } = require('../../src/store/store');
      const token = store.getState().auth.token;

      const download = await FileSystem.downloadAsync(pdfUrl, localUri, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (download.status !== 200) throw new Error('Download failed');
      await Print.printAsync({ uri: download.uri });
    } catch (e) {
      WebBrowser.openBrowserAsync(pdfUrl);
    }
  };

  const renderArticlesTab = () => (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>ARTICLES ({order.commandeTapis?.length || 0})</Text>
      </View>

      {order.commandeTapis?.map((item: any, index: number) => {
        const area = item.largeur && (item.hauteur || item.longueur)
          ? (parseFloat(item.largeur) * parseFloat(item.hauteur || item.longueur)).toFixed(2)
          : null;

        return (
          <View key={item.id} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <View style={styles.itemTitleRow}>
                <View style={styles.tagBadge}>
                  <Text style={styles.tagText}>TAG-{String(index + 1).padStart(3, '0')}</Text>
                </View>
                <Text style={styles.itemName}>{item.productNom || 'Tapis'}</Text>
              </View>
              <Text style={styles.itemPrice}>{parseFloat(item.prixFinal || 0).toFixed(2)} DH</Text>
            </View>

            {item.images && item.images.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }} contentContainerStyle={{ gap: 8 }}>
                {item.images.map((img: any, i: number) => (
                  <TouchableOpacity key={i} onPress={() => setViewImage(`${BASE_URL}${img.imageUrl}`)}>
                    <Image source={{ uri: `${BASE_URL}${img.imageUrl}` }} style={styles.itemGalleryImg} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {item.productPricingMethod === 'PER_M2' && (
              <View style={styles.chipsRow}>
                <View style={styles.dimensionChip}>
                  <Text style={styles.chipLabel}>DIMENSIONS</Text>
                  <Text style={styles.chipValue}>
                    {item.largeur || '—'} × {item.hauteur || item.longueur || '—'} m
                  </Text>
                </View>
                <View style={styles.dimensionChip}>
                  <Text style={styles.chipLabel}>SURFACE</Text>
                  <Text style={styles.chipValue}>{area ? `${area} m²` : '— m²'}</Text>
                </View>
              </View>
            )}

            {item.productPricingMethod === 'PER_UNIT' && (
              <View style={[styles.dimensionChip, { marginTop: 12, alignSelf: 'flex-start' }]}>
                <Text style={styles.chipLabel}>QUANTITÉ</Text>
                <Text style={styles.chipValue}>{item.quantite}</Text>
              </View>
            )}

            {item.notes && (
              <Text style={styles.itemNotes}>📝 {item.notes}</Text>
            )}

            <View style={styles.itemStatusContainer}>
              <View style={[styles.itemStatusBadge, { backgroundColor: item.etat === 'NETTOYE' ? Colors.successBg : Colors.primary100 }]}>
                <Text style={[styles.itemStatusText, { color: item.etat === 'NETTOYE' ? Colors.success : Colors.primary }]}>
                  {item.etat || 'PICKED_UP'}
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );

  const renderClientTab = () => (
    <View>
      <View style={styles.infoCard}>
        <Text style={styles.sectionLabel}>INFORMATIONS CLIENT</Text>

        <View style={styles.infoRow}>
          <View style={[styles.infoIconCircle, { backgroundColor: Colors.primary100 }]}>
            <Ionicons name="person" size={20} color={Colors.primary} />
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>CLIENT</Text>
            <Text style={styles.infoValue}>{order.client?.name}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.infoRow} onPress={() => Linking.openURL(`tel:${getClientPhone(order.client)}`)}>
          <View style={[styles.infoIconCircle, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
            <Ionicons name="call" size={20} color={Colors.success} />
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>TÉLÉPHONE</Text>
            <Text style={styles.infoValue}>{getClientPhone(order.client)}</Text>
          </View>
          <Feather name="external-link" size={14} color={Colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.infoRow} onPress={handleShareReceipt} disabled={sharing}>
          <View style={[styles.infoIconCircle, { backgroundColor: 'rgba(37,211,102,0.1)' }]}>
            <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>WHATSAPP</Text>
            <Text style={styles.infoValue}>{sharing ? 'Génération du PDF...' : 'Envoyer le reçu'}</Text>
          </View>
          {sharing ? (
            <ActivityIndicator size="small" color="#25D366" />
          ) : (
            <Feather name="chevron-right" size={14} color={Colors.textMuted} />
          )}
        </TouchableOpacity>

        {order.livreur && (
          <View style={styles.infoRow}>
            <View style={[styles.infoIconCircle, { backgroundColor: 'rgba(201,168,76,0.1)' }]}>
              <MaterialIcons name="local-shipping" size={20} color={Colors.accent} />
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>LIVREUR (COLLECTE)</Text>
              <Text style={styles.infoValue}>{order.livreur.name}</Text>
            </View>
          </View>
        )}

        {order.deliveryDriver && (
          <View style={styles.infoRow}>
            <View style={[styles.infoIconCircle, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
              <MaterialIcons name="local-shipping" size={20} color={Colors.success} />
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>LIVREUR (LIVRAISON)</Text>
              <Text style={styles.infoValue}>{order.deliveryDriver.name}</Text>
            </View>
          </View>
        )}

        {order.status !== 'DELIVERED' && !order.deliveryDriver && (
          <TouchableOpacity style={styles.infoRow} onPress={() => setShowDriverModal(true)}>
            <View style={[styles.infoIconCircle, { backgroundColor: Colors.primary100 }]}>
              <Feather name="plus" size={20} color={Colors.primary} />
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>LIVREUR (LIVRAISON)</Text>
              <Text style={[styles.infoValue, { color: Colors.primary }]}>Assigner un livreur</Text>
            </View>
            <Feather name="chevron-right" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Location Map (Original Design) */}
      {order.client?.addresses?.[0]?.latitude && (
        <View style={styles.mapSection}>
          <Text style={styles.mapTitle}>📍 Adresse & Localisation</Text>
          <Text style={styles.addressText}>{order.client.addresses[0].address}</Text>

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
                <View style={styles.markerContainer}>
                  <View style={styles.markerPin} />
                </View>
              </Marker>
            </MapView>

            <TouchableOpacity
              style={styles.openMapBtn}
              onPress={() => Linking.openURL(`https://maps.google.com/?q=${order.client.addresses[0].latitude},${order.client.addresses[0].longitude}`)}
            >
              <Text style={styles.openMapText}>Open in Maps</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  const renderSuiviTab = () => (
    <View>
      <View style={[styles.sectionHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <Text style={styles.sectionTitle}>💰 Paiements Detailés</Text>
        {isAdmin && order.status === 'DELIVERED' ? (
          <TouchableOpacity onPress={() => setShowPaymentModal(true)}>
            <Text style={styles.addPaymentLink}>+ Nouveau</Text>
          </TouchableOpacity>
        ) : order.status !== 'DELIVERED' ? (
          <Text style={{ fontSize: 12, color: Colors.textMuted, fontStyle: 'italic' }}>
            Les paiements sont enregistrés à la livraison
          </Text>
        ) : null}
      </View>

      <View style={styles.paymentSummaryCard}>
        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Total commande</Text>
          <Text style={[styles.paymentValue, { color: Colors.primary }]}>{totalAmount.toFixed(2)} DH</Text>
        </View>
        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Total payé</Text>
          <Text style={[styles.paymentValue, { color: Colors.success }]}>{paidAmount.toFixed(2)} DH</Text>
        </View>
        <View style={[styles.paymentRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
          <Text style={styles.paymentLabel}>Restant</Text>
          <Text style={[styles.paymentValue, remaining > 0 ? { color: Colors.warning } : { color: Colors.textMuted }]}>
            {remaining.toFixed(2)} DH
          </Text>
        </View>

        {payments.length > 0 && (
          <View style={styles.paymentsList}>
            <View style={styles.listDivider} />
            {payments.map((p) => (
              <View key={p.id} style={styles.paymentHistoryItem}>
                <View style={styles.historyTop}>
                  <Text style={styles.historyAmount}>{parseFloat(p.montant).toFixed(2)} DH</Text>
                  <Text style={styles.historyDate}>{format(new Date(p.datePaiement), 'dd/MM/yy HH:mm')}</Text>
                </View>
                {p.note && <Text style={styles.historyNote}>{p.note}</Text>}
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>📅 Historique d'état</Text>
      </View>
      <View style={styles.historyTimeline}>
        {history.map((event, index) => (
          <View key={event.id} style={styles.timelineItem}>
            <View style={styles.timelineLeft}>
              <View style={[styles.timelineDot, { backgroundColor: StatusColors[event.nouveauStatut]?.dot || Colors.primary }]} />
              {index !== history.length - 1 && <View style={styles.timelineLine} />}
            </View>
            <View style={styles.timelineRight}>
              <Text style={styles.timelineStatus}>{StatusColors[event.nouveauStatut]?.label || event.nouveauStatut}</Text>
              <Text style={styles.timelineMeta}>par {event.user?.name || 'Système'} • {format(new Date(event.createdAt), 'dd MMM, HH:mm', { locale: fr })}</Text>
              {event.commentaire && <Text style={styles.timelineComment}>"{event.commentaire}"</Text>}
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const confirmDelivery = async () => {
    const amount = parseFloat(collectedAmount) || 0;
    if (isNaN(amount) || amount < 0) {
      Alert.alert('Erreur', 'Veuillez saisir un montant valide.');
      return;
    }
    if (amount > totalAmount) {
      Alert.alert('Erreur', 'Le montant collecté ne peut pas dépasser le total.');
      return;
    }

    setConfirmingDelivery(true);
    try {
      await adminApi.updateOrderStatus(id as string, 'DELIVERED', {
        montantCollecte: amount,
        notesPaiement: deliveryNotes
      });
      setShowDeliveryModal(false);
      await fetchData();
      
      Alert.alert(
        'Livraison confirmée 🎉',
        'Souhaitez-vous envoyer le reçu de livraison au client ?',
        [
          { text: 'Plus tard', style: 'cancel' },
          { 
            text: '📱 WhatsApp', 
            onPress: () => handleShareReceipt() 
          }
        ]
      );
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de confirmer la livraison');
    } finally {
      setConfirmingDelivery(false);
    }
  };

  const handleAddPayment = async () => {
    if (!paymentAmount || isNaN(parseFloat(paymentAmount))) {
      Alert.alert('Erreur', 'Veuillez saisir un montant valide.');
      return;
    }

    setSubmittingPayment(true);
    try {
      await adminApi.addOrderPayment(id as string, parseFloat(paymentAmount), paymentNote);
      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentNote('');
      fetchData();
    } catch (error) {
      Alert.alert('Erreur', 'Échec de l\'enregistrement du paiement.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const getClientPhone = (client: any) => {
    if (!client) return '';
    if (client.phone) return client.phone;
    if (Array.isArray(client.phones) && client.phones.length > 0) return client.phones[0].phoneNumber;
    return '';
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const statusAction = order?.status ? STATUS_ACTIONS[order.status as keyof typeof STATUS_ACTIONS] : null;
  const totalAmount = parseFloat(order?.montantTotal || 0);
  const paidAmount = parseFloat(order?.montantPaye || 0);
  const remaining = totalAmount - paidAmount;

  return (
    <View style={styles.container}>
      {/* Fixed Header */}
      <SafeAreaView style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Détails Commande</Text>

          <View style={styles.headerActions}>
            {canDelete && (
              <TouchableOpacity onPress={handleDeleteOrder} style={styles.deleteBtn}>
                <Feather name="trash-2" size={16} color={Colors.danger} />
              </TouchableOpacity>
            )}
            {canEdit && (
              <TouchableOpacity onPress={handleEditOrder} style={styles.editBtn}>
                <Feather name="edit-2" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* SECTION 1: Order Reference Card */}
        <View style={styles.card}>
          <View style={[styles.statusBadge, { backgroundColor: StatusColors[order.status]?.bg || Colors.primary50 }]}>
            <View style={[styles.statusDot, { backgroundColor: StatusColors[order.status]?.dot || Colors.primary }]} />
            <Text style={[styles.statusText, { color: StatusColors[order.status]?.text || Colors.primary }]}>
              {StatusColors[order.status]?.label || order.status}
            </Text>
          </View>

          <Text style={styles.orderLabel}>COMMANDE</Text>
          <Text style={styles.orderRef}>#{order.numeroCommande}</Text>

          {remaining <= 0 && (
            <View style={styles.paidStamp}>
              <Text style={styles.paidStampText}>SOLDE RÉGLÉ</Text>
            </View>
          )}

          <View style={styles.financialRow}>
            <View style={styles.financialCol}>
              <Text style={styles.financialLabel}>Total</Text>
              <Text style={styles.totalValue}>{totalAmount.toFixed(2)} <Text style={styles.currency}>DH</Text></Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.financialCol}>
              <Text style={styles.financialLabel}>Payé</Text>
              <Text style={styles.paidValue}>{paidAmount.toFixed(2)} <Text style={styles.currency}>DH</Text></Text>
              {remaining > 0 && (
                <Text style={styles.remainingText}>Reste: {remaining.toFixed(2)} DH</Text>
              )}
            </View>
          </View>
        </View>

        {/* TABS NAVIGATION */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tabBtn, activeTab === 'articles' && styles.tabBtnActive]} 
            onPress={() => setActiveTab('articles')}
          >
            <Ionicons name="layers-outline" size={18} color={activeTab === 'articles' ? Colors.primary : Colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'articles' && styles.tabTextActive]}>Articles</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabBtn, activeTab === 'client' && styles.tabBtnActive]} 
            onPress={() => setActiveTab('client')}
          >
            <Ionicons name="person-outline" size={18} color={activeTab === 'client' ? Colors.primary : Colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'client' && styles.tabTextActive]}>Client</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabBtn, activeTab === 'suivi' && styles.tabBtnActive]} 
            onPress={() => setActiveTab('suivi')}
          >
            <Ionicons name="time-outline" size={18} color={activeTab === 'suivi' ? Colors.primary : Colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'suivi' && styles.tabTextActive]}>Suivi</Text>
          </TouchableOpacity>
        </View>

        {/* TAB CONTENT */}
        <View style={styles.tabContent}>
          {activeTab === 'articles' && (
            <>
              {/* Status Action Button or Payment Summary */}
              {order.status === 'DELIVERED' ? (
                <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
                  {remaining <= 0 ? (
                    <View style={{ 
                      backgroundColor: Colors.successBg, 
                      borderRadius: 14, 
                      padding: 14, 
                      paddingHorizontal: 16, 
                      flexDirection: 'row', 
                      alignItems: 'center', 
                      gap: 10 
                    }}>
                      <Text style={{ fontSize: 20 }}>✅</Text>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.success }}>Entièrement payé</Text>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.success, marginLeft: 'auto' }}>
                        {totalAmount.toFixed(2)} DH
                      </Text>
                    </View>
                  ) : (
                    <>
                      {paidAmount > 0 ? (
                        <View style={{ 
                          backgroundColor: Colors.warningBg, 
                          borderRadius: 14, 
                          padding: 14, 
                          paddingHorizontal: 16 
                        }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.warning }}>
                              ⚡ Paiement partiel
                            </Text>
                            {isAdmin && (
                              <TouchableOpacity onPress={() => setShowPaymentModal(true)}>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.primary }}>+ Ajouter</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                          
                          <View style={{ 
                            height: 6, 
                            borderRadius: 3, 
                            backgroundColor: 'rgba(0,0,0,0.08)', 
                            marginTop: 10,
                            overflow: 'hidden'
                          }}>
                            <View style={{ 
                              height: 6, 
                              borderRadius: 3, 
                              backgroundColor: Colors.warning, 
                              width: `${(paidAmount / totalAmount) * 100}%` 
                            }} />
                          </View>

                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                            <Text style={{ fontSize: 13, color: Colors.success }}>Payé: {paidAmount.toFixed(2)} DH</Text>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.warning }}>
                              Reste: {remaining.toFixed(2)} DH
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <View style={{ 
                          backgroundColor: Colors.dangerBg, 
                          borderRadius: 14, 
                          padding: 14, 
                          paddingHorizontal: 16,
                          flexDirection: 'row',
                          alignItems: 'center'
                        }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.danger, flex: 1 }}>
                            ⚠️ Non payé
                          </Text>
                          {isAdmin && (
                            <TouchableOpacity 
                              style={{ backgroundColor: Colors.danger, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 }}
                              onPress={() => setShowPaymentModal(true)}
                            >
                              <Text style={{ fontSize: 12, fontWeight: '600', color: 'white' }}>Ajouter paiement</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </>
                  )}
                </View>
              ) : statusAction && (
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    { backgroundColor: statusAction.bg },
                    statusAction.disabled && { opacity: 0.8 },
                    !statusAction.disabled && { ...Shadows.md, shadowColor: statusAction.bg }
                  ]}
                  onPress={() => !statusAction.disabled && statusAction.next && handleUpdateStatus(statusAction.next)}
                  disabled={statusAction.disabled || updating}
                >
                  {updating ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <FontAwesome5 name={statusAction.icon as any} size={18} color={statusAction.textColor || 'white'} />
                      <Text style={[styles.actionBtnText, { color: statusAction.textColor || 'white' }]}>
                        {statusAction.label}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {/* Order Images Gallery */}
              {(order.images && order.images.length > 0) && (
                <View style={styles.infoCard}>
                  <Text style={styles.sectionLabel}>PHOTOS DE LA COMMANDE</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                      {order.images.map((img: any, idx: number) => (
                        <TouchableOpacity key={idx} onPress={() => setViewImage(`${BASE_URL}${img.imageUrl}`)}>
                          <Image source={{ uri: `${BASE_URL}${img.imageUrl}` }} style={styles.galleryImg} />
                          <View style={styles.imgBadge}>
                            <Text style={styles.imgBadgeText}>
                              {img.photoType === 'reception' ? 'Récep.' : img.photoType === 'livraison' ? 'Livraison' : 'Labo'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                  </ScrollView>
                </View>
              )}

              {renderArticlesTab()}

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Actions rapides</Text>
              </View>
              <View style={styles.quickActionsGrid}>
                <View style={styles.gridRow}>
                  <TouchableOpacity 
                    style={[styles.gridBtn, { backgroundColor: 'rgba(37,211,102,0.1)' }]}
                    onPress={handleShareReceipt}
                  >
                    <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                    <Text style={[styles.gridBtnText, { color: '#25D366' }]}>WhatsApp</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.gridBtn, { backgroundColor: Colors.primary100 }]}
                    onPress={handleViewPdf}
                  >
                    <Ionicons name="document-text" size={20} color={Colors.primary} />
                    <Text style={[styles.gridBtnText, { color: Colors.primary }]}>Reçu PDF</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.gridRow}>
                  {canAddLaboPhoto && (
                    <TouchableOpacity 
                      style={[styles.gridBtn, { backgroundColor: 'rgba(59,130,246,0.1)' }]}
                      onPress={() => handleAddPhotos('apres_traitement')}
                      disabled={uploadingImage}
                    >
                      <Feather name="camera" size={20} color={Colors.info} />
                      <Text style={[styles.gridBtnText, { color: Colors.info }]}>Photo Labo</Text>
                    </TouchableOpacity>
                  )}
                  {canAddReceptionPhoto && (
                    <TouchableOpacity 
                      style={[styles.gridBtn, { backgroundColor: Colors.primary100 }]}
                      onPress={() => handleAddPhotos('reception')}
                      disabled={uploadingImage}
                    >
                      <Ionicons name="images" size={20} color={Colors.primary} />
                      <Text style={[styles.gridBtnText, { color: Colors.primary }]}>Photo Récep.</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </>
          )}

          {activeTab === 'client' && renderClientTab()}
          {activeTab === 'suivi' && renderSuiviTab()}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Driver Assignment Modal */}
      <Modal
        visible={showDriverModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDriverModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismiss} activeOpacity={1} onPress={() => setShowDriverModal(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Assigner un livreur (Livraison)</Text>
            
            <ScrollView style={{ maxHeight: 300 }}>
              {drivers.map(driver => (
                <TouchableOpacity 
                  key={driver.id} 
                  style={{ 
                    paddingVertical: 14, 
                    borderBottomWidth: 1, 
                    borderBottomColor: 'rgba(0,0,0,0.05)',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                  onPress={() => handleAssignDeliveryDriver(driver.id)}
                >
                  <Text style={{ fontSize: 16, color: Colors.textPrimary, fontWeight: '500' }}>{driver.name}</Text>
                  <Feather name="chevron-right" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              ))}
              {drivers.length === 0 && (
                <Text style={{ textAlign: 'center', marginVertical: 20, color: Colors.textMuted }}>
                  Aucun livreur disponible
                </Text>
              )}
            </ScrollView>

            <TouchableOpacity 
              style={[styles.confirmBtn, { backgroundColor: 'rgba(0,0,0,0.05)', marginTop: 20 }]} 
              onPress={() => {
                setShowDriverModal(false);
                setPendingStatusUpdate(null);
              }}
            >
              <Text style={[styles.confirmBtnText, { color: Colors.textPrimary }]}>Annuler</Text>
            </TouchableOpacity>
          </View>
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
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>💰 Ajouter un paiement</Text>
            
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Montant (DH)</Text>
              <TextInput
                style={styles.amountInput}
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                autoFocus
              />

              <Text style={styles.inputLabel}>Note (optionnelle)</Text>
              <TextInput
                style={styles.noteInput}
                value={paymentNote}
                onChangeText={setPaymentNote}
                placeholder="Virement, chèque n°..."
                multiline
              />

              <TouchableOpacity
                style={[styles.confirmBtn, submittingPayment && { opacity: 0.7 }]}
                onPress={handleAddPayment}
                disabled={submittingPayment}
              >
                {submittingPayment ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.confirmBtnText}>Confirmer le paiement</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delivery Confirmation Modal */}
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
          <View style={[styles.modalSheet, { maxHeight: '85%' }]}>
            <View style={styles.modalHandle} />
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              <Text style={styles.modalTitle}>🚚 Confirmer la livraison</Text>
              <Text style={{ fontSize: 14, color: Colors.textSecondary, marginBottom: 20 }}>
                Déclarez le montant encaissé auprès du client
              </Text>

              <View style={{ backgroundColor: Colors.primary50, borderRadius: 14, padding: 16, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: Colors.textSecondary }}>Total commande</Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.primary }}>{totalAmount.toFixed(2)} DH</Text>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.inputLabel}>Montant encaissé (DH)</Text>
                <TextInput
                  style={[styles.amountInput, { height: 60, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.12)', borderRadius: 14, borderBottomWidth: 1.5, fontSize: 24 }]}
                  value={collectedAmount}
                  onChangeText={setCollectedAmount}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  autoFocus
                />

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <TouchableOpacity 
                    style={{ flex: 1, height: 38, borderRadius: 10, backgroundColor: Colors.primary100, justifyContent: 'center', alignItems: 'center' }}
                    onPress={() => setCollectedAmount('0')}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.primary }}>0 DH</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={{ flex: 1, height: 38, borderRadius: 10, backgroundColor: Colors.primary100, justifyContent: 'center', alignItems: 'center' }}
                    onPress={() => setCollectedAmount(totalAmount.toString())}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.primary }}>{totalAmount.toFixed(0)} DH</Text>
                  </TouchableOpacity>
                </View>

                {/* Payment status preview */}
                <View style={{ 
                  marginTop: 16, 
                  borderRadius: 12, 
                  padding: 14,
                  backgroundColor: parseFloat(collectedAmount) === 0 ? Colors.dangerBg : parseFloat(collectedAmount) < totalAmount ? '#FFF7ED' : Colors.successBg,
                  borderWidth: 1,
                  borderColor: parseFloat(collectedAmount) === 0 ? 'rgba(239,68,68,0.2)' : parseFloat(collectedAmount) < totalAmount ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'
                }}>
                  <Text style={{ 
                    fontSize: 14, 
                    fontWeight: '600', 
                    color: parseFloat(collectedAmount) === 0 ? Colors.danger : parseFloat(collectedAmount) < totalAmount ? '#D97706' : Colors.success 
                  }}>
                    {parseFloat(collectedAmount) === 0 ? '⚠️ Commande non payée' : parseFloat(collectedAmount) < totalAmount ? '⚡ Paiement partiel' : '✅ Paiement complet'}
                  </Text>
                  <Text style={{ 
                    fontSize: 12, 
                    color: parseFloat(collectedAmount) === 0 ? Colors.danger : parseFloat(collectedAmount) < totalAmount ? '#D97706' : Colors.success,
                    opacity: 0.8
                  }}>
                    {parseFloat(collectedAmount) === 0 
                      ? `Le solde de ${totalAmount.toFixed(2)} DH sera à encaisser plus tard` 
                      : parseFloat(collectedAmount) < totalAmount 
                        ? `Reste à encaisser: ${(totalAmount - parseFloat(collectedAmount)).toFixed(2)} DH` 
                        : 'Commande entièrement payée'}
                  </Text>
                </View>

                <Text style={[styles.inputLabel, { marginTop: 16 }]}>Notes de paiement (optionnel)</Text>
                <TextInput
                  style={[styles.noteInput, { minHeight: 60 }]}
                  value={deliveryNotes}
                  onChangeText={setDeliveryNotes}
                  placeholder="Chèque n°..., virement, espèces..."
                  multiline
                />

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 24, paddingBottom: 20 }}>
                  <TouchableOpacity 
                    style={{ flex: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)', justifyContent: 'center', alignItems: 'center' }}
                    onPress={() => setShowDeliveryModal(false)}
                  >
                    <Text style={{ color: Colors.textSecondary, fontWeight: '600' }}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ flex: 2, height: 52, borderRadius: 14, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', ...Shadows.teal }}
                    onPress={confirmDelivery}
                    disabled={confirmingDelivery}
                  >
                    {confirmingDelivery ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={{ color: 'white', fontSize: 15, fontWeight: '700' }}>
                        🚚 Confirmer — {parseFloat(collectedAmount) || 0} DH
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Image Preview Modal */}
      <Modal visible={!!viewImage} transparent animationType="fade" onRequestClose={() => setViewImage(null)}>
        <View style={styles.imagePreviewOverlay}>
          <TouchableOpacity style={styles.imagePreviewClose} onPress={() => setViewImage(null)}>
            <Ionicons name="close" size={30} color="white" />
          </TouchableOpacity>
          {viewImage && (
            <Image source={{ uri: viewImage }} style={styles.fullImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: 'white', ...Shadows.sm, zIndex: 10 },
  headerContent: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
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
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12 },
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
  itemNotes: { marginTop: 12, fontSize: 13, color: Colors.textSecondary, fontStyle: 'italic', backgroundColor: '#F1F5F9', padding: 10, borderRadius: 10 },
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
  mapTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8, marginLeft: 4 },
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
  historyNote: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, fontStyle: 'italic' },

  historyTimeline: { marginHorizontal: 24, marginTop: 8 },
  timelineItem: { flexDirection: 'row', minHeight: 70 },
  timelineLeft: { width: 30, alignItems: 'center' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, zIndex: 1, borderWidth: 2, borderColor: 'white', marginTop: 4 },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#E2E8F0', marginVertical: -4 },
  timelineRight: { flex: 1, paddingLeft: 12, paddingBottom: 20 },
  timelineStatus: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  timelineMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  timelineComment: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, backgroundColor: '#F8FAFC', padding: 8, borderRadius: 8 },

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
});
