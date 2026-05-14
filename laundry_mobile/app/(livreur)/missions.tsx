import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Linking, Platform,
  Modal, TextInput, ScrollView, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../src/store/store';
import { fetchReadyDeliveries, fetchPendingPickups, cancelDelivery } from '../../src/store/livreurThunks';
import { api } from '../../src/api/axios';

const C = {
  primary: '#0D7377',
  success: '#10B981',
  successBg: 'rgba(16,185,129,0.1)',
  warning: '#F59E0B',
  warningBg: 'rgba(245,158,11,0.1)',
  danger: '#EF4444',
  dangerBg: 'rgba(239,68,68,0.1)',
  bg: '#F4F6F8',
  surface: '#FFFFFF',
  textPrimary: '#0D1B2A',
  textSecondary: '#4A5568',
  textMuted: '#94A3B8',
};

function openNav(lat?: any, lng?: any, address?: string) {
  const url = Platform.select({
    ios: lat && lng ? `maps://?daddr=${lat},${lng}` : `maps://?daddr=${encodeURIComponent(address || '')}`,
    android: lat && lng ? `geo:${lat},${lng}?q=${lat},${lng}` : `geo:0,0?q=${encodeURIComponent(address || '')}`,
  });
  Linking.openURL(url || '').catch(() =>
    Linking.openURL(`https://maps.google.com/?daddr=${lat},${lng}`)
  );
}

function DeliveryModal({ order, visible, onClose, onConfirmed }: any) {
  const [amount, setAmount] = useState('0');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (order) setAmount('0'); }, [order]);

  const total = parseFloat(order?.montantTotal || 0);
  const collected = parseFloat(amount) || 0;
  const statusColor = collected === 0 ? C.danger : collected < total ? C.warning : C.success;
  const statusLabel = collected === 0 ? '⚠️ Impayé' : collected < total ? '⚡ Partiel' : '✅ Complet';

  const confirm = async () => {
    setLoading(true);
    try {
      await api.patch(`/api/commandes/${order.id}/status`, {
        status: 'DELIVERED',
        montantCollecte: collected,
      });
      onConfirmed(order);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Impossible de confirmer la livraison';
      Alert.alert('Erreur', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>🚚 Confirmer la livraison</Text>
          <Text style={styles.modalSub}>#{order?.numeroCommande} · {order?.client?.name}</Text>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Montant total</Text>
            <Text style={styles.totalValue}>{total} DH</Text>
          </View>

          <Text style={styles.inputLabel}>Montant encaissé</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            autoFocus
          />

          <View style={[styles.presetRow]}>
            <TouchableOpacity style={styles.preset} onPress={() => setAmount('0')}>
              <Text style={styles.presetText}>0 DH</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.preset, { backgroundColor: C.primary + '15' }]} onPress={() => setAmount(String(total))}>
              <Text style={[styles.presetText, { color: C.primary }]}>{total} DH</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.statusPreview, { borderColor: statusColor + '40', backgroundColor: statusColor + '12' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>

          <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: C.success }]} onPress={confirm} disabled={loading}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.confirmBtnText}>Confirmer la livraison</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ReceiptSheet({ order, visible, onClose }: any) {
  const send = async () => {
    try {
      const res = await api.get(`/api/commandes/${order.id}/receipt/delivery/whatsapp`);
      const { phone, message } = res.data.data || res.data;
      const waPhone = phone?.replace(/\D/g, '');
      const url = `whatsapp://send?phone=${waPhone}&text=${encodeURIComponent(message)}`;
      Linking.openURL(url).catch(() =>
        Linking.openURL(`https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`)
      );
    } catch {
      Alert.alert('Erreur', 'Impossible d\'envoyer le reçu');
    }
    onClose();
  };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />
      <View style={[styles.modalSheet, { paddingBottom: 36 }]}>
        <View style={styles.modalHandle} />
        <Text style={{ fontSize: 22, textAlign: 'center', marginBottom: 8 }}>✅</Text>
        <Text style={[styles.modalTitle, { color: C.success }]}>Livraison confirmée!</Text>
        <Text style={[styles.modalSub, { marginBottom: 20 }]}>Envoyer le reçu au client?</Text>
        <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: '#25D366', marginBottom: 10 }]} onPress={send}>
          <Text style={styles.confirmBtnText}>📱 Envoyer via WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelBtnText}>Plus tard</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function DeliveryCard({ order, onDeliver }: { order: any; onDeliver: (o: any) => void }) {
  const addr = order.client?.addresses?.[0];
  const phone = order.client?.phones?.[0]?.phoneNumber;
  const remaining = order.montantRestant ?? 0;
  return (
    <View style={styles.card}>
      <View style={[styles.accentBar, { backgroundColor: C.success }]} />
      <View style={styles.cardHeader}>
        <Text style={styles.cardRef}>#{order.numeroCommande}</Text>
        <View style={[styles.pill, { backgroundColor: C.successBg, borderColor: C.success + '40' }]}>
          <Text style={[styles.pillText, { color: C.success }]}>PRÊTE</Text>
        </View>
      </View>
      <Text style={styles.cardClient}>{order.client?.name || order.clientNom}</Text>
      {addr?.address ? (
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={14} color={C.primary} />
          <Text style={styles.infoText} numberOfLines={2}>{addr.address}</Text>
        </View>
      ) : null}
      {phone ? (
        <TouchableOpacity style={styles.infoRow} onPress={() => Linking.openURL(`tel:${phone}`)}>
          <Ionicons name="call-outline" size={14} color={C.success} />
          <Text style={[styles.infoText, { color: C.success }]}>{phone}</Text>
        </TouchableOpacity>
      ) : null}
      <View style={styles.financialCard}>
        <View>
          <Text style={styles.finLabel}>Total</Text>
          <Text style={styles.finVal}>{order.montantTotal} DH</Text>
        </View>
        <View style={styles.finDivider} />
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.finLabel}>Reste</Text>
          <Text style={[styles.finVal, { color: remaining > 0 ? C.danger : C.success }]}>{remaining} DH</Text>
        </View>
      </View>
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: 'rgba(13,115,119,0.08)', borderColor: C.primary + '30' }]}
          onPress={() => openNav(addr?.latitude, addr?.longitude, addr?.address)}
        >
          <Text style={[styles.actionBtnText, { color: C.primary }]}>🗺️ Navigation</Text>
        </TouchableOpacity>
        {phone ? (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: C.successBg, borderColor: C.success + '30' }]}
            onPress={() => Linking.openURL(`tel:${phone}`)}
          >
            <Text style={[styles.actionBtnText, { color: C.success }]}>📞 Appeler</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <TouchableOpacity style={styles.deliverBtn} onPress={() => onDeliver(order)}>
        <Text style={styles.deliverBtnText}>🚚 Livrer et encaisser</Text>
      </TouchableOpacity>
    </View>
  );
}

function PickupCard({ order }: { order: any }) {
  const addr = order.client?.addresses?.[0];
  const phone = order.client?.phones?.[0]?.phoneNumber;
  const scheduled = order.dateLivraisonPrevue || order.scheduledPickupDate;
  const isOverdue = scheduled && new Date(scheduled) < new Date();
  return (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/order/${order.id}`)} activeOpacity={0.8}>
      <View style={[styles.accentBar, { backgroundColor: C.warning }]} />
      <View style={styles.cardHeader}>
        <Text style={styles.cardRef}>#{order.numeroCommande}</Text>
        <View style={[styles.pill, { backgroundColor: isOverdue ? C.dangerBg : C.warningBg, borderColor: (isOverdue ? C.danger : C.warning) + '40' }]}>
          <Text style={[styles.pillText, { color: isOverdue ? C.danger : C.warning }]}>
            {isOverdue ? 'EN RETARD' : 'À COLLECTER'}
          </Text>
        </View>
      </View>
      {scheduled && (
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={14} color={isOverdue ? C.danger : C.warning} />
          <Text style={[styles.infoText, { color: isOverdue ? C.danger : C.textSecondary }]}>
            {new Date(scheduled).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      )}
      <Text style={styles.cardClient}>{order.client?.name || order.clientNom}</Text>
      {addr?.address ? (
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={14} color={C.warning} />
          <Text style={styles.infoText} numberOfLines={2}>{addr.address}</Text>
        </View>
      ) : null}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: 'rgba(13,115,119,0.08)', borderColor: C.primary + '30' }]}
          onPress={() => openNav(addr?.latitude, addr?.longitude, addr?.address)}
        >
          <Text style={[styles.actionBtnText, { color: C.primary }]}>🗺️ Navigation</Text>
        </TouchableOpacity>
        {phone ? (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: C.warningBg, borderColor: C.warning + '30' }]}
            onPress={() => Linking.openURL(`tel:${phone}`)}
          >
            <Text style={[styles.actionBtnText, { color: C.warning }]}>📞 Appeler</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <TouchableOpacity
        style={[styles.deliverBtn, { backgroundColor: C.warning }]}
        onPress={() => router.push(`/order/${order.id}`)}
      >
        <Text style={[styles.deliverBtnText, { color: C.textPrimary }]}>📦 Voir les détails</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function MissionsScreen() {
  const params = useLocalSearchParams<{ tab?: string; orderId?: string }>();
  const [activeTab, setActiveTab] = useState<'delivery' | 'pickup'>(
    params.tab === 'pickup' ? 'pickup' : 'delivery'
  );
  const [refreshing, setRefreshing] = useState(false);
  const [deliveryOrder, setDeliveryOrder] = useState<any>(null);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showReceiptSheet, setShowReceiptSheet] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<any>(null);

  const dispatch = useDispatch<AppDispatch>();
  const { readyDeliveries, readyOrders, loading } = useSelector((s: RootState) => s.livreur);

  useFocusEffect(useCallback(() => {
    dispatch(fetchReadyDeliveries());
    dispatch(fetchPendingPickups());
  }, [dispatch]));

  useEffect(() => {
    if (params.tab === 'pickup') setActiveTab('pickup');
    else if (params.tab === 'delivery') setActiveTab('delivery');
  }, [params.tab]);

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([dispatch(fetchReadyDeliveries()), dispatch(fetchPendingPickups())])
      .finally(() => setRefreshing(false));
  };

  const handleDeliver = (order: any) => {
    setDeliveryOrder(order);
    setShowDeliveryModal(true);
  };

  const handleConfirmed = (order: any) => {
    setShowDeliveryModal(false);
    setConfirmedOrder(order);
    setShowReceiptSheet(true);
    dispatch(fetchReadyDeliveries());
  };

  const deliveries = readyDeliveries || [];
  const pickups = readyOrders || [];

  const totalAmount = deliveries.reduce((s: number, o: any) => s + (o.montantTotal || 0), 0);
  const totalRemaining = deliveries.reduce((s: number, o: any) => s + (o.montantRestant || 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.surface }}>
        <View style={styles.topBar}>
          <Text style={styles.topTitle}>Mes Missions</Text>
        </View>
        {/* Tabs */}
        <View style={styles.tabsWrap}>
          {(['delivery', 'pickup'] as const).map((tab) => {
            const isActive = activeTab === tab;
            const count = tab === 'delivery' ? deliveries.length : pickups.length;
            const color = tab === 'delivery' ? C.success : C.warning;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, isActive && { backgroundColor: C.primary }]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, isActive && { color: 'white' }]}>
                  {tab === 'delivery' ? 'Livraisons' : 'À collecter'}
                </Text>
                {count > 0 && (
                  <View style={[styles.tabBadge, { backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : color }]}>
                    <Text style={styles.tabBadgeText}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>

      {/* Stats banner for deliveries */}
      {activeTab === 'delivery' && deliveries.length > 0 && (
        <View style={styles.statsBanner}>
          <View style={styles.statCol}>
            <Text style={styles.statVal}>{deliveries.length}</Text>
            <Text style={styles.statLabel}>commandes</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={[styles.statVal, { color: C.primary }]}>{totalAmount} DH</Text>
            <Text style={styles.statLabel}>total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={[styles.statVal, { color: totalRemaining > 0 ? C.danger : C.success }]}>{totalRemaining} DH</Text>
            <Text style={styles.statLabel}>reste</Text>
          </View>
        </View>
      )}

      <FlatList
        data={activeTab === 'delivery' ? deliveries : pickups}
        keyExtractor={(i) => i.id.toString()}
        renderItem={({ item }) =>
          activeTab === 'delivery'
            ? <DeliveryCard order={item} onDeliver={handleDeliver} />
            : <PickupCard order={item} />
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={C.primary} style={{ marginTop: 60 }} />
          ) : (
            <View style={styles.empty}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>{activeTab === 'delivery' ? '🚚' : '📦'}</Text>
              <Text style={styles.emptyTitle}>
                {activeTab === 'delivery' ? 'Aucune livraison' : 'Aucune collecte'}
              </Text>
              <Text style={styles.emptyText}>
                {activeTab === 'delivery'
                  ? 'Pas de commandes prêtes pour la livraison'
                  : 'Pas de collectes planifiées'}
              </Text>
            </View>
          )
        }
      />

      <DeliveryModal
        order={deliveryOrder}
        visible={showDeliveryModal}
        onClose={() => setShowDeliveryModal(false)}
        onConfirmed={handleConfirmed}
      />
      <ReceiptSheet
        order={confirmedOrder}
        visible={showReceiptSheet}
        onClose={() => setShowReceiptSheet(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { paddingHorizontal: 20, paddingVertical: 16 },
  topTitle: { fontSize: 20, fontWeight: '700', color: C.textPrimary },
  tabsWrap: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 12,
    backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4, gap: 4,
  },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 10 },
  tabText: { fontSize: 13, fontWeight: '600', color: C.textMuted },
  tabBadge: { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabBadgeText: { fontSize: 10, fontWeight: '800', color: 'white' },
  statsBanner: {
    flexDirection: 'row', backgroundColor: C.surface,
    marginHorizontal: 16, borderRadius: 14, padding: 14, marginBottom: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  statCol: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 16, fontWeight: '700', color: C.textPrimary },
  statLabel: { fontSize: 10, color: C.textMuted, fontWeight: '600', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#E2E8F0' },
  card: {
    backgroundColor: C.surface, borderRadius: 16, marginBottom: 12, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    overflow: 'hidden',
  },
  accentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginLeft: 8 },
  cardRef: { fontSize: 11, fontWeight: '700', color: C.textMuted },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  pillText: { fontSize: 10, fontWeight: '700' },
  cardClient: { fontSize: 17, fontWeight: '700', color: C.textPrimary, marginBottom: 8, marginLeft: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, marginLeft: 8 },
  infoText: { flex: 1, fontSize: 13, color: C.textSecondary },
  financialCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginTop: 12,
  },
  finLabel: { fontSize: 10, color: C.textMuted, fontWeight: '600', marginBottom: 2 },
  finVal: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  finDivider: { width: 1, height: 32, backgroundColor: '#E2E8F0' },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  actionBtn: {
    flex: 1, height: 44, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  actionBtnText: { fontSize: 13, fontWeight: '600' },
  deliverBtn: {
    width: '100%', height: 52, borderRadius: 14, backgroundColor: C.success,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
    shadowColor: C.success, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 5,
  },
  deliverBtnText: { fontSize: 15, fontWeight: '700', color: 'white' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.textSecondary },
  emptyText: { fontSize: 14, color: C.textMuted, marginTop: 6, textAlign: 'center' },
  // Modal
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: Platform.OS === 'ios' ? 44 : 24,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary, textAlign: 'center' },
  modalSub: { fontSize: 14, color: C.textMuted, textAlign: 'center', marginTop: 4, marginBottom: 16 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, marginBottom: 16 },
  totalLabel: { fontSize: 13, color: C.textMuted, fontWeight: '600' },
  totalValue: { fontSize: 20, fontWeight: '800', color: C.primary },
  inputLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', marginBottom: 8 },
  amountInput: {
    borderWidth: 2, borderColor: C.primary, borderRadius: 14,
    fontSize: 28, fontWeight: '700', textAlign: 'center',
    paddingVertical: 14, color: C.textPrimary, marginBottom: 10,
  },
  presetRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  preset: { flex: 1, height: 40, backgroundColor: '#F1F5F9', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  presetText: { fontSize: 13, fontWeight: '600', color: C.textSecondary },
  statusPreview: { borderRadius: 12, padding: 12, borderWidth: 1, alignItems: 'center', marginBottom: 16 },
  statusText: { fontSize: 14, fontWeight: '700' },
  confirmBtn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  confirmBtnText: { fontSize: 15, fontWeight: '700', color: 'white' },
  cancelBtn: { height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9', borderRadius: 12 },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: C.textSecondary },
});
