import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, Modal, Linking, RefreshControl, Platform
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { fetchReadyDeliveries, fetchPaymentTypes, confirmPayment, cancelDelivery } from '../../src/store/livreurThunks';
import { RootState, AppDispatch } from '../../src/store/store';
import { Colors, Shadows, Typography, Radius } from '../../constants/theme';

export default function DeliveriesScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { readyDeliveries, paymentTypes, loading } = useSelector((state: RootState) => state.livreur);
  const [refreshing, setRefreshing] = useState(false);
  const [paymentModal, setPaymentModal] = useState<{ visible: boolean; order: any | null }>({ visible: false, order: null });
  const [processingId, setProcessingId] = useState<number | null>(null);

  const loadData = useCallback(() => {
    dispatch(fetchReadyDeliveries());
    dispatch(fetchPaymentTypes());
  }, [dispatch]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchReadyDeliveries());
    setRefreshing(false);
  };

  const handleOpenMaps = (order: any) => {
    const addr = order.client?.addresses?.[0];
    const lat = addr?.latitude;
    const lng = addr?.longitude;
    const address = addr?.address;

    let url = '';
    if (lat && lng) {
      url = Platform.OS === 'ios'
        ? `maps:0,0?q=${lat},${lng}`
        : `geo:${lat},${lng}?q=${lat},${lng}`;
    } else if (address) {
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    } else {
      Alert.alert('Pas de localisation', 'Aucun GPS ou adresse disponible pour cette commande.');
      return;
    }
    Linking.openURL(url);
  };

  const handleCall = (order: any) => {
    const phone = order.client?.phones?.[0]?.phoneNumber;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert('Pas de numéro', 'Aucun numéro de téléphone disponible.');
    }
  };

  const handleConfirmPayment = async (methodId: number) => {
    if (!paymentModal.order) return;
    setProcessingId(paymentModal.order.id);
    setPaymentModal({ visible: false, order: null });
    try {
      await dispatch(confirmPayment({ orderId: paymentModal.order.id, methodId })).unwrap();
      Alert.alert('✅ Paiement Enregistré', 'La livraison a été marquée comme payée !');
    } catch (err: any) {
      Alert.alert('Erreur', typeof err === 'string' ? err : 'Échec de l\'enregistrement du paiement.');
    } finally {
      setProcessingId(null);
      loadData();
    }
  };

  const handleCancel = (order: any) => {
    Alert.alert(
      'Annuler la livraison',
      `Êtes-vous sûr de vouloir annuler la livraison pour ${order.client?.nom || order.client?.name || 'ce client'} ?`,
      [
        { text: 'Garder', style: 'cancel' },
        {
          text: 'Annuler la livraison', style: 'destructive',
          onPress: async () => {
            setProcessingId(order.id);
            try {
              await dispatch(cancelDelivery(order.id)).unwrap();
              Alert.alert('Annulée', 'La livraison a été annulée.');
            } catch (err: any) {
              Alert.alert('Erreur', typeof err === 'string' ? err : 'Échec de l\'annulation.');
            } finally {
              setProcessingId(null);
              loadData();
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item: order }: { item: any }) => {
    const addr = order.client?.addresses?.[0];
    const clientName = order.client?.nom || order.client?.name || 'Client';
    const phone = order.client?.phones?.[0]?.phoneNumber;
    const totalItems = order.commandeTapis?.length || 0;
    const isProcessing = processingId === order.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.orderRef}>#{order.numeroCommande}</Text>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>PRÊTE</Text>
          </View>
        </View>

        <Text style={styles.clientName}>{clientName}</Text>

        {addr?.address && (
          <View style={styles.infoRow}>
            <Feather name="map-pin" size={14} color={Colors.primary} />
            <Text style={styles.infoText} numberOfLines={2}>{addr.address}</Text>
          </View>
        )}

        {phone && (
          <View style={styles.infoRow}>
            <Feather name="phone" size={14} color={Colors.success} />
            <Text style={styles.infoText}>{phone}</Text>
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>TAPIS</Text>
            <Text style={styles.statValue}>{totalItems}</Text>
          </View>
          <View style={[styles.statBox, styles.statBoxHighlight]}>
            <Text style={[styles.statLabel, { color: Colors.primary }]}>TOTAL</Text>
            <Text style={[styles.statValue, { color: Colors.primary }]}>{order.montantTotal} <Text style={styles.currencyText}>DH</Text></Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        {isProcessing ? (
          <View style={styles.processingRow}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.processingText}>Traitement...</Text>
          </View>
        ) : (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.iconBtn, { backgroundColor: Colors.primary }]} onPress={() => handleOpenMaps(order)}>
              <Feather name="navigation" size={20} color="white" />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.iconBtn, { backgroundColor: Colors.success }]} onPress={() => handleCall(order)}>
              <Feather name="phone" size={20} color="white" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.payBtn}
              onPress={() => setPaymentModal({ visible: true, order })}
            >
              <Feather name="credit-card" size={18} color={Colors.primary} />
              <Text style={styles.payBtnText}>ENCAISSER</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.iconBtn, { backgroundColor: Colors.danger }]} onPress={() => handleCancel(order)}>
              <Feather name="x" size={20} color="white" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>Livraisons</Text>
          <Text style={styles.headerSubtitle}>{readyDeliveries.length} commandes prêtes</Text>
        </View>
        <View style={styles.countChip}>
          <Feather name="package" size={14} color={Colors.primary} />
          <Text style={styles.countText}>{readyDeliveries.length}</Text>
        </View>
      </View>

      {loading && readyDeliveries.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={readyDeliveries}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="truck" size={60} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>Aucune livraison</Text>
              <Text style={styles.emptySubtitle}>Toutes les commandes ont été livrées ou ne sont pas encore prêtes.</Text>
            </View>
          }
        />
      )}

      {/* Payment Modal */}
      <Modal visible={paymentModal.visible} transparent animationType="slide" onRequestClose={() => setPaymentModal({ visible: false, order: null })}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismiss} activeOpacity={1} onPress={() => setPaymentModal({ visible: false, order: null })} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <View style={styles.modalIconContainer}>
              <Feather name="credit-card" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Encaisser le paiement</Text>

            <View style={styles.modalSummary}>
              <View>
                <Text style={styles.modalSummaryLabel}>COMMANDE</Text>
                <Text style={styles.modalSummaryValue}>#{paymentModal.order?.numeroCommande}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.modalSummaryLabel}>MONTANT</Text>
                <Text style={[styles.modalSummaryValue, { color: Colors.primary, fontSize: 24 }]}>
                  {paymentModal.order?.montantTotal} DH
                </Text>
              </View>
            </View>

            <Text style={styles.modalSectionLabel}>Mode de paiement</Text>
            <View style={styles.paymentGrid}>
              {paymentTypes.map((type: any) => (
                <TouchableOpacity
                  key={type.id}
                  style={styles.paymentChip}
                  onPress={() => handleConfirmPayment(type.id)}
                >
                  <Feather
                    name={type.code === 'especes' ? 'dollar-sign' : 'credit-card'}
                    size={24}
                    color={Colors.primary}
                  />
                  <Text style={styles.paymentChipText}>{type.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setPaymentModal({ visible: false, order: null })}
            >
              <Text style={styles.cancelBtnText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: 20, paddingBottom: 100 },

  headerRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: { 
    fontSize: Typography.size['2xl'], 
    fontWeight: Typography.weight.bold, 
    color: Colors.textPrimary 
  },
  headerSubtitle: {
    fontSize: Typography.size.base,
    color: Colors.textMuted,
    marginTop: 2,
  },
  countChip: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    backgroundColor: Colors.primary100, 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: Radius.full 
  },
  countText: { 
    fontSize: 13, 
    fontWeight: Typography.weight.bold, 
    color: Colors.primary 
  },

  card: {
    backgroundColor: Colors.surface, 
    borderRadius: Radius.xl, 
    padding: 20, 
    marginBottom: 16,
    borderWidth: 1, 
    borderColor: Colors.border,
    ...Shadows.sm
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderRef: { fontSize: 11, fontWeight: Typography.weight.bold, color: Colors.textMuted, letterSpacing: 0.5 },
  statusBadge: { 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(201,168,76,0.10)', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: Radius.full, 
    borderWidth: 1, 
    borderColor: 'rgba(201,168,76,0.25)',
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent,
  },
  statusText: { fontSize: 10, fontWeight: Typography.weight.bold, color: '#92400E', letterSpacing: 0.5 },
  clientName: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Colors.textPrimary, marginBottom: 12 },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  infoText: { flex: 1, fontSize: 14, color: Colors.textSecondary },

  statsRow: { flexDirection: 'row', gap: 12, marginTop: 12, marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: Colors.surface2, borderRadius: Radius.md, padding: 12, borderWidth: 1, borderColor: Colors.border },
  statBoxHighlight: { backgroundColor: Colors.primary50, borderColor: Colors.primary100 },
  statLabel: { fontSize: 10, fontWeight: Typography.weight.bold, color: Colors.textMuted, letterSpacing: 0.5, marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: Typography.weight.bold, color: Colors.textPrimary },
  currencyText: { fontSize: 12, fontWeight: Typography.weight.medium },

  cardDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 16,
  },

  actionsRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  iconBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', ...Shadows.sm },
  payBtn: {
    flex: 1, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.primary,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: 'white'
  },
  payBtnText: { color: Colors.primary, fontSize: 12, fontWeight: Typography.weight.bold, letterSpacing: 0.5 },
  processingRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 10 },
  processingText: { color: Colors.primary, fontWeight: Typography.weight.bold },

  emptyState: { paddingVertical: 80, alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: Typography.weight.bold, color: Colors.textSecondary },
  emptySubtitle: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', maxWidth: 260 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalDismiss: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 24, alignItems: 'center'
  },
  modalHandle: { width: 40, height: 4, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 2, marginBottom: 20 },
  modalIconContainer: { width: 64, height: 64, backgroundColor: Colors.primary100, borderRadius: Radius.lg, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Colors.textPrimary, marginBottom: 4 },
  modalSectionLabel: { fontSize: 12, fontWeight: Typography.weight.bold, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, alignSelf: 'flex-start' },
  modalSummary: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', backgroundColor: Colors.surface2, borderRadius: Radius.md, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: Colors.border },
  modalSummaryLabel: { fontSize: 10, fontWeight: Typography.weight.bold, color: Colors.textMuted, textTransform: 'uppercase', marginBottom: 4 },
  modalSummaryValue: { fontSize: 18, fontWeight: Typography.weight.bold, color: Colors.textPrimary },
  paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', width: '100%', marginBottom: 24 },
  paymentChip: {
    width: '47%', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 10,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface2
  },
  paymentChipText: { fontSize: 13, fontWeight: Typography.weight.bold, color: Colors.textPrimary, textTransform: 'uppercase' },
  cancelBtn: { width: '100%', backgroundColor: Colors.surface2, padding: 14, borderRadius: Radius.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  cancelBtnText: { fontSize: 14, fontWeight: Typography.weight.bold, color: Colors.textSecondary, textTransform: 'uppercase' },
});
