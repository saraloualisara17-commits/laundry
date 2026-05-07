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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, Feather, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { adminApi } from '../../src/services/adminApi';
import { Colors, Shadows, Typography, Radius, StatusColors } from '../../constants/theme';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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

  const [order, setOrder] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Driver Assignment State
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [drivers, setDrivers] = useState<any[]>([]);

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

  const handleUpdateStatus = async (nextStatus: string) => {
    Alert.alert(
      'Changer le statut',
      `Voulez-vous passer la commande au statut ${nextStatus} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            setUpdating(true);
            try {
              await adminApi.updateOrderStatus(id as string, nextStatus);
              await fetchData();
            } catch (error) {
              Alert.alert('Erreur', 'Échec de la mise à jour du statut.');
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
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
      setShowDriverModal(false);
      fetchData();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'assigner le livreur');
    } finally {
      setUpdating(false);
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

  const openWhatsApp = () => {
    if (!order?.client) return;
    const phone = getClientPhone(order.client);
    const message = `Bonjour ${order.client.name}, concernant votre commande #${order.numeroCommande} de ${order.montantTotal} DH...`;
    Linking.openURL(`whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`);
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
            <TouchableOpacity onPress={handleDeleteOrder} style={styles.deleteBtn}>
              <Feather name="trash-2" size={16} color={Colors.danger} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Alert.alert('Bientôt disponible', 'La modification des commandes sera activée prochainement.')} style={styles.editBtn}>
              <Feather name="edit-2" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
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

          {order.createdBy && (
            <View style={styles.creatorChip}>
              <Text style={styles.creatorText}>Créé par: {order.createdBy.name}</Text>
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

        {/* SECTION 2: Status Action Button */}
        {statusAction && (
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

        {/* SECTION 3: Client Information */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionLabel}>INFORMATIONS</Text>

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

          {order.deliveryDriver && ['READY_FOR_DELIVERY', 'DELIVERED'].includes(order.status) && (
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

          {order.status === 'READY_FOR_DELIVERY' && !order.deliveryDriver && (
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

          {order.scheduledPickupDate && (
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <View style={[styles.infoIconCircle, { backgroundColor: 'rgba(59,130,246,0.1)' }]}>
                <Ionicons name="calendar" size={20} color={Colors.info} />
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>DATE DE COLLECTE</Text>
                <Text style={styles.infoValue}>
                  {format(new Date(order.scheduledPickupDate), 'PPP p', { locale: fr })}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* SECTION 4: Location Map */}
        {order.client?.addresses?.[0]?.latitude && (
          <View style={styles.mapSection}>
            <Text style={styles.mapTitle}>📍 Adresse</Text>
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

        {/* SECTION 5: Items */}
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
                  <Text style={styles.itemName}>{item.tapis?.nom || 'Tapis'}</Text>
                </View>
                <Text style={styles.itemPrice}>{parseFloat(item.prixFinal || 0).toFixed(2)} DH</Text>
              </View>

              {item.modeTarification === 'PER_M2' && (
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

              {item.modeTarification === 'PER_UNIT' && (
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
                    {item.etat}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}

        {/* SECTION 6: Payments */}
        <View style={[styles.sectionHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <Text style={styles.sectionTitle}>💰 Paiements</Text>
          <TouchableOpacity onPress={() => setShowPaymentModal(true)}>
            <Text style={styles.addPaymentLink}>+ Ajouter</Text>
          </TouchableOpacity>
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

        {/* SECTION 7: Quick Actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Actions rapides</Text>
        </View>
        <View style={styles.quickActionsGrid}>
          <View style={styles.gridRow}>
            <TouchableOpacity 
              style={[styles.gridBtn, { backgroundColor: 'rgba(59,130,246,0.1)' }]}
              onPress={() => Alert.alert('Bientôt disponible', 'La modification des commandes sera activée prochainement.')}
            >
              <Feather name="edit" size={20} color={Colors.info} />
              <Text style={[styles.gridBtnText, { color: Colors.info }]}>Modifier</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.gridBtn, { backgroundColor: Colors.primary100 }]}>
              <Ionicons name="sync" size={20} color={Colors.primary} />
              <Text style={[styles.gridBtnText, { color: Colors.primary }]}>Statut</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.gridRow}>
            <TouchableOpacity style={[styles.gridBtn, { backgroundColor: Colors.successBg }]} onPress={() => setShowPaymentModal(true)}>
              <MaterialIcons name="payments" size={20} color={Colors.success} />
              <Text style={[styles.gridBtnText, { color: Colors.success }]}>Paiement</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.gridBtn, { backgroundColor: 'rgba(37,211,102,0.1)' }]} onPress={openWhatsApp}>
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
              <Text style={[styles.gridBtnText, { color: '#25D366' }]}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SECTION 8: Order History */}
        {history.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Historique</Text>
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
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
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
            <Text style={styles.modalTitle}>Ajouter un paiement</Text>

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

      {/* Driver Selection Modal */}
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
              onPress={() => setShowDriverModal(false)}
            >
              <Text style={[styles.confirmBtnText, { color: Colors.textPrimary }]}>Annuler</Text>
            </TouchableOpacity>
          </View>
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  backBtn: { padding: 4 },
  headerActions: { flexDirection: 'row', gap: 8 },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.dangerBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: { paddingBottom: 40 },

  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    padding: 20,
    ...Shadows.sm,
    position: 'relative',
    overflow: 'hidden',
  },
  statusBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 99,
    gap: 6,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  orderLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5, marginBottom: 6 },
  orderRef: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5 },
  creatorChip: {
    backgroundColor: Colors.primary50,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  creatorText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  financialRow: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    marginTop: 16,
  },
  financialCol: { flex: 1 },
  financialLabel: { fontSize: 12, color: Colors.textMuted, marginBottom: 4 },
  totalValue: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary },
  paidValue: { fontSize: 24, fontWeight: '700', color: Colors.success },
  currency: { fontSize: 14, fontWeight: '600' },
  verticalDivider: { width: 1, backgroundColor: 'rgba(0,0,0,0.05)', marginHorizontal: 16 },
  remainingText: { fontSize: 13, fontWeight: '600', color: Colors.warning, marginTop: 2 },

  actionBtn: {
    marginHorizontal: 16,
    marginBottom: 12,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  actionBtnText: { fontSize: 16, fontWeight: '700' },

  infoCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    ...Shadows.sm,
  },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  infoIconCircle: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  infoCol: { flex: 1 },
  infoLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, marginBottom: 2 },
  infoValue: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },

  mapSection: { marginBottom: 20 },
  mapTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginHorizontal: 16, marginBottom: 8 },
  addressText: { fontSize: 14, color: Colors.textSecondary, marginHorizontal: 16, marginBottom: 8 },
  mapWrapper: {
    height: 180,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    ...Shadows.md,
    position: 'relative',
  },
  map: { flex: 1 },
  markerContainer: { width: 30, height: 30, justifyContent: 'center', alignItems: 'center' },
  markerPin: { width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.primary, borderWidth: 3, borderColor: 'white' },
  openMapBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'white',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    ...Shadows.sm,
  },
  openMapText: { fontSize: 12, fontWeight: '600', color: Colors.primary },

  sectionHeader: { marginHorizontal: 16, marginBottom: 8, marginTop: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },

  itemCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 16,
    ...Shadows.sm,
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemTitleRow: { flexDirection: 'row', alignItems: 'center' },
  tagBadge: { backgroundColor: Colors.primary100, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  itemName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginLeft: 8 },
  itemPrice: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  chipsRow: { marginTop: 12, flexDirection: 'row', gap: 10 },
  dimensionChip: {
    flex: 1,
    backgroundColor: '#F4F6F8',
    borderRadius: 10,
    padding: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.07)',
  },
  chipLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  chipValue: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  itemNotes: { fontSize: 13, color: Colors.textSecondary, fontStyle: 'italic', marginTop: 8 },
  itemStatusContainer: { alignItems: 'flex-end', marginTop: 8 },
  itemStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  itemStatusText: { fontSize: 10, fontWeight: '700' },

  addPaymentLink: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  paymentSummaryCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    marginHorizontal: 16,
    padding: 16,
    ...Shadows.sm,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  paymentLabel: { fontSize: 14, color: Colors.textSecondary },
  paymentValue: { fontSize: 16, fontWeight: '700' },
  paymentsList: { marginTop: 16 },
  listDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)', marginBottom: 12 },
  paymentHistoryItem: { marginBottom: 12 },
  historyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyAmount: { fontSize: 15, fontWeight: '700', color: Colors.success },
  historyDate: { fontSize: 12, color: Colors.textMuted },
  historyNote: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },

  quickActionsGrid: { paddingHorizontal: 16 },
  gridRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  gridBtn: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  gridBtnText: { fontSize: 13, fontWeight: '600' },

  historyTimeline: { marginHorizontal: 16, marginTop: 8 },
  timelineItem: { flexDirection: 'row', gap: 12, paddingVertical: 12 },
  timelineLeft: { width: 12, alignItems: 'center' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, zIndex: 1 },
  timelineLine: { position: 'absolute', top: 12, bottom: -12, width: 2, backgroundColor: 'rgba(0,0,0,0.08)' },
  timelineRight: { flex: 1 },
  timelineStatus: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  timelineMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  timelineComment: { fontSize: 12, color: Colors.textMuted, fontStyle: 'italic', marginTop: 4 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalDismiss: { flex: 1 },
  modalSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 44 : 20,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 20 },
  modalBody: { gap: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  amountInput: { fontSize: 24, fontWeight: '700', textAlign: 'center', color: Colors.primary, padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  noteInput: { padding: 12, borderRadius: 12, backgroundColor: '#F4F6F8', minHeight: 80, textAlignVertical: 'top' },
  confirmBtn: { backgroundColor: Colors.primary, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 12, ...Shadows.teal },
  confirmBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
});
