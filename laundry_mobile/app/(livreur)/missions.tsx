import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Linking, Platform,
  Modal, TextInput, ScrollView, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import * as Clipboard from 'expo-clipboard';
import { RootState, AppDispatch } from '../../src/store/store';
import { fetchReadyDeliveries, fetchPendingPickups } from '../../src/store/livreurThunks';
import { setPendingClient } from '../../src/store/livreurSlice';
import { ordersApi } from '../../src/services/api';
import { showError } from '../../src/services/errors/errorHandler';

// ─── Color tokens ─────────────────────────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function openNav(lat?: any, lng?: any, address?: string) {
  const url = Platform.select({
    ios: lat && lng
      ? `maps://?daddr=${lat},${lng}`
      : `maps://?daddr=${encodeURIComponent(address || '')}`,
    android: lat && lng
      ? `geo:${lat},${lng}?q=${lat},${lng}`
      : `geo:0,0?q=${encodeURIComponent(address || '')}`,
  });
  Linking.openURL(url || '').catch(() =>
    Linking.openURL(`https://maps.google.com/?daddr=${lat},${lng}`)
  );
}

// ─── Reason definitions ───────────────────────────────────────────────────────
const DELIVERY_REASONS = [
  { key: 'CLIENT_ABSENT',    emoji: '🚪', label: 'Client absent' },
  { key: 'CLIENT_REFUSED',   emoji: '🚫', label: 'Client a refusé la livraison' },
  { key: 'PAYMENT_REFUSED',  emoji: '💸', label: 'Client refuse de payer' },
  { key: 'ADDRESS_NOT_FOUND',emoji: '📍', label: 'Adresse introuvable' },
  { key: 'ACCESS_PROBLEM',   emoji: '🔒', label: "Problème d'accès" },
  { key: 'OTHER',            emoji: '📝', label: 'Autre raison' },
] as const;

const PICKUP_REASONS = [
  { key: 'CLIENT_ABSENT',    emoji: '🚪', label: 'Client absent' },
  { key: 'CLIENT_CANCELLED', emoji: '❌', label: 'Client a annulé' },
  { key: 'ADDRESS_NOT_FOUND',emoji: '📍', label: 'Adresse introuvable' },
  { key: 'ACCESS_PROBLEM',   emoji: '🔒', label: "Problème d'accès" },
  { key: 'OTHER',            emoji: '📝', label: 'Autre raison' },
] as const;

// ─── FailedAttemptModal ───────────────────────────────────────────────────────
interface FailedAttemptModalProps {
  visible: boolean;
  order: any;
  attemptType: 'PICKUP' | 'DELIVERY';
  onClose: () => void;
  onSuccess: () => void;
}

function FailedAttemptModal({
  visible, order, attemptType, onClose, onSuccess,
}: FailedAttemptModalProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedReason(null);
      setNotes('');
      setSubmitting(false);
    }
  }, [visible]);

  const reasons = attemptType === 'DELIVERY' ? DELIVERY_REASONS : PICKUP_REASONS;
  const isDelivery = attemptType === 'DELIVERY';
  const accentColor = isDelivery ? C.danger : C.warning;
  const accentBg = isDelivery ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)';

  const isOther = selectedReason === 'OTHER';
  const canSubmit = selectedReason !== null && !(isOther && notes.trim() === '') && !submitting;

  const submit = async () => {
    if (!canSubmit || !order) return;
    setSubmitting(true);
    try {
      await ordersApi.reportFailedAttempt(order.id, {
        attemptType,
        reason: selectedReason!,
        notes: notes.trim() || null,
        rescheduledTo: null,
      });
      onSuccess();
      onClose();
      Alert.alert(
        '✅ Enregistré',
        isDelivery
          ? 'Tentative de livraison enregistrée.'
          : 'Tentative de collecte enregistrée.'
      );
    } catch (e) {
      Alert.alert('Erreur', "Impossible d'enregistrer. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!order) return null;

  const clientName = order.client?.name ?? order.clientNom ?? '—';
  const orderRef = order.numeroCommande ?? `#${order.id}`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: C.surface }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.faModalContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Drag handle */}
          <View style={styles.modalHandle} />

          {/* Header */}
          <Text style={[styles.faTitle, { color: accentColor }]}>
            {isDelivery ? '🚚 Problème de livraison' : '📦 Problème de collecte'}
          </Text>
          <Text style={styles.faSubtitle}>
            {clientName} — {orderRef}
          </Text>

          <Text style={styles.faSectionLabel}>Quelle est la raison ?</Text>

          {reasons.map((r) => {
            const isSelected = selectedReason === r.key;
            return (
              <TouchableOpacity
                key={r.key}
                style={[
                  styles.faReasonBtn,
                  isSelected && {
                    borderColor: accentColor,
                    backgroundColor: accentBg,
                  },
                ]}
                onPress={() => setSelectedReason(r.key)}
                activeOpacity={0.7}
              >
                <Text style={styles.faReasonEmoji}>{r.emoji}</Text>
                <Text style={[styles.faReasonLabel, isSelected && { color: accentColor, fontWeight: '700' }]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Notes — only shows if OTHER selected */}
          {isOther && (
            <View style={{ marginTop: 16 }}>
              <Text style={[styles.faSectionLabel, { marginTop: 0 }]}>
                Précisez *{' '}
                <Text style={{ color: C.danger }}>(obligatoire)</Text>
              </Text>
              <TextInput
                style={[
                  styles.faNotesInput,
                  notes.trim() === '' && { borderColor: C.danger },
                ]}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                placeholder="Expliquez en quelques mots..."
                placeholderTextColor={C.textMuted}
                textAlignVertical="top"
              />
            </View>
          )}

          {/* Optional notes for non-OTHER reasons */}
          {!isOther && selectedReason !== null && (
            <View style={{ marginTop: 16 }}>
              <Text style={[styles.faSectionLabel, { marginTop: 0 }]}>
                Notes (optionnel)
              </Text>
              <TextInput
                style={styles.faNotesInput}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                placeholder="Détails supplémentaires..."
                placeholderTextColor={C.textMuted}
                textAlignVertical="top"
              />
            </View>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>

        {/* Bottom buttons */}
        <View style={styles.faBottomBtns}>
          <TouchableOpacity
            style={[styles.faConfirmBtn, { backgroundColor: accentColor, opacity: canSubmit ? 1 : 0.45 }]}
            onPress={submit}
            disabled={!canSubmit}
          >
            {submitting
              ? <ActivityIndicator color="white" />
              : <Text style={[styles.faConfirmBtnText, isDelivery ? {} : { color: C.textPrimary }]}>
                  CONFIRMER LE PROBLÈME
                </Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={styles.faCancelBtn} onPress={onClose} disabled={submitting}>
            <Text style={styles.faCancelBtnText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── PickupModal ────────────────────────────────────────────────────────────
function PickupModal({ order, visible, onClose, onConfirmed }: any) {
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    setLoading(true);
    try {
      await ordersApi.updateStatus(order.id, { status: 'PICKED_UP' });
      onConfirmed(order);
    } catch (err: any) {
      showError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.modalSheet}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle}>📦 Confirmer la collecte</Text>
        <Text style={styles.modalSub}>
          {order?.client?.name ?? order?.clientNom}
        </Text>
        <Text style={[styles.modalSub, { fontSize: 12, marginTop: 2 }]}>
          #{order?.numeroCommande}
        </Text>

        <View style={{ height: 24 }} />

        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: C.warning }]}
          onPress={confirm}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="white" />
            : <Text style={[styles.confirmBtnText, { color: C.textPrimary }]}>CONFIRMER LA COLLECTE</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelBtnText}>Annuler</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── DeliveryModal ────────────────────────────────────────────────────────────
function DeliveryModal({ order, visible, onClose, onConfirmed }: any) {
  const [amount, setAmount] = useState('0');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (order) setAmount('0');
  }, [order]);

  const total = parseFloat(order?.montantTotal || 0);
  const collected = parseFloat(amount) || 0;
  const statusColor = collected === 0 ? C.danger : collected < total ? C.warning : C.success;
  const statusLabel = collected === 0 ? '⚠️ Impayé' : collected < total ? '⚡ Partiel' : '✅ Complet';

  const confirm = async () => {
    setLoading(true);
    try {
      await ordersApi.updateStatus(order.id, { status: 'DELIVERED', amount: collected });
      onConfirmed(order);
    } catch (err: any) {
      showError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>🚚 Confirmer la livraison</Text>
          <Text style={styles.modalSub}>
            {order?.client?.name ?? order?.clientNom}
          </Text>
          <Text style={[styles.modalSub, { fontSize: 12, marginTop: 2 }]}>
            #{order?.numeroCommande}
          </Text>

          {/* Amount display */}
          <View style={styles.bigAmountRow}>
            <Text style={styles.bigAmountLabel}>À encaisser</Text>
            <Text style={styles.bigAmountValue}>{total} DH</Text>
          </View>

          {/* Quick preset buttons */}
          <View style={styles.presetRow}>
            <TouchableOpacity
              style={[styles.presetBtn, { backgroundColor: C.dangerBg, borderColor: C.danger + '30' }]}
              onPress={() => setAmount('0')}
            >
              <Text style={[styles.presetBtnText, { color: C.danger }]}>RIEN{'\n'}0 DH</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.presetBtn, { backgroundColor: C.successBg, borderColor: C.success + '30' }]}
              onPress={() => setAmount(String(total))}
            >
              <Text style={[styles.presetBtnText, { color: C.success }]}>TOUT{'\n'}{total} DH</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>Autre montant</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />

          <View style={[styles.statusPreview, { borderColor: statusColor + '40', backgroundColor: statusColor + '12' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>

          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: C.success }]}
            onPress={confirm}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="white" />
              : <Text style={styles.confirmBtnText}>CONFIRMER LA LIVRAISON</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── ReceiptSheet ─────────────────────────────────────────────────────────────
function ReceiptSheet({ order, visible, onClose }: any) {
  const [loadingWa, setLoadingWa] = useState(false);
  const [loadingThermal, setLoadingThermal] = useState(false);

  const sendWhatsApp = async () => {
    setLoadingWa(true);
    try {
      const res = await ordersApi.getDeliveryReceiptWhatsapp(order.id);
      const { phone, message } = res.data.data || res.data;
      const waPhone = phone?.replace(/\D/g, '');
      const url = `whatsapp://send?phone=${waPhone}&text=${encodeURIComponent(message)}`;
      await Linking.openURL(url).catch(() =>
        Linking.openURL(`https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`)
      );
    } catch (err) {
      showError(err);
    } finally {
      setLoadingWa(false);
    }
    onClose();
  };

  const sendThermal = async () => {
    setLoadingThermal(true);
    try {
      const res = await ordersApi.getDeliveryThermal(order.id);
      const text = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
      await Clipboard.setStringAsync(text);
      Alert.alert(
        '🖨️ Reçu thermique',
        "Texte copié dans le presse-papier.\nCollez dans votre application d'impression Bluetooth.",
        [{ text: 'OK' }]
      );
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de récupérer le reçu thermique.');
    } finally {
      setLoadingThermal(false);
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />
      <View style={[styles.modalSheet, { paddingBottom: 40 }]}>
        <View style={styles.modalHandle} />
        <Text style={{ fontSize: 32, textAlign: 'center', marginBottom: 8 }}>✅</Text>
        <Text style={[styles.modalTitle, { color: C.success, marginBottom: 4 }]}>
          Livraison confirmée !
        </Text>
        <Text style={[styles.modalSub, { marginBottom: 20 }]}>
          Envoyer le reçu ?
        </Text>

        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: '#25D366', marginBottom: 8 }]}
          onPress={sendWhatsApp}
          disabled={loadingWa}
        >
          {loadingWa
            ? <ActivityIndicator color="white" />
            : <Text style={styles.confirmBtnText}>📱 ENVOYER SUR WHATSAPP</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: '#2563EB', marginBottom: 8 }]}
          onPress={sendThermal}
          disabled={loadingThermal}
        >
          {loadingThermal
            ? <ActivityIndicator color="white" />
            : <Text style={styles.confirmBtnText}>🖨️ REÇU THERMIQUE</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={onClose}>
          <Text style={[styles.cancelBtnText, { textAlign: 'center', marginTop: 12, fontSize: 15 }]}>
            Ignorer
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── DeliveryCard ─────────────────────────────────────────────────────────────
function DeliveryCard({
  order,
  onDeliver,
  onReportProblem,
}: {
  order: any;
  onDeliver: (o: any) => void;
  onReportProblem: (o: any) => void;
}) {
  const addr = order.client?.addresses?.[0];
  const phone = order.client?.phones?.[0]?.phoneNumber;
  const remaining = parseFloat(order.montantRestant ?? order.resteAPayer ?? 0);
  const total = parseFloat(order.montantTotal ?? 0);
  const paid = parseFloat(order.montantPaye ?? 0);

  return (
    <View style={[styles.card, { borderLeftColor: C.success }]}>
      {/* Top section */}
      <View style={styles.cardTop}>
        <Text style={styles.cardRef}>
          #{(order.numeroCommande ?? '').slice(-10)}
        </Text>
        <Text style={styles.cardClient} numberOfLines={1}>
          {order.client?.name ?? order.clientNom}
        </Text>
        {addr?.address ? (
          <Text style={styles.cardAddress} numberOfLines={1}>
            {addr.address}
          </Text>
        ) : null}
      </View>

      {/* Amount section */}
      <View style={styles.amountSection}>
        <View>
          <Text style={styles.amountLabel}>À encaisser</Text>
          {remaining > 0 ? (
            <Text style={[styles.amountValue, { color: C.danger }]}>
              {remaining} DH
            </Text>
          ) : (
            <Text style={[styles.amountValue, { color: C.success }]}>✅ Payé</Text>
          )}
        </View>
        {paid > 0 && remaining > 0 ? (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.amountMeta}>Total: {total} DH</Text>
            <Text style={[styles.amountMeta, { color: C.success }]}>Payé: {paid} DH</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.divider} />

      {/* Actions */}
      <View style={styles.actionsSection}>
        <View style={styles.utilRow}>
          {phone ? (
            <TouchableOpacity
              style={[styles.utilBtn, { backgroundColor: C.successBg, borderColor: C.success + '33' }]}
              onPress={() => Linking.openURL(`tel:${phone}`)}
            >
              <Ionicons name="call" size={20} color={C.success} />
              <Text style={[styles.utilBtnText, { color: C.success }]}>Appeler</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[styles.utilBtn, { backgroundColor: 'rgba(13,115,119,0.10)', borderColor: C.primary + '33' }]}
            onPress={() => openNav(addr?.latitude, addr?.longitude, addr?.address)}
          >
            <Ionicons name="navigate" size={20} color={C.primary} />
            <Text style={[styles.utilBtnText, { color: C.primary }]}>Naviguer</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.mainActionBtn}
          onPress={() => onDeliver(order)}
        >
          <Text style={styles.mainActionBtnText}>🚚 LIVRER ET ENCAISSER</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.problemBtn}
          onPress={() => onReportProblem(order)}
        >
          <Text style={styles.problemBtnText}>⚠️ Signaler un problème</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── PickupCard ───────────────────────────────────────────────────────────────
function PickupCard({
  order,
  onPickup,
  onReportProblem,
}: {
  order: any;
  onPickup: (o: any) => void;
  onReportProblem: (o: any) => void;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const addr = order.client?.addresses?.[0];
  const phone = order.client?.phones?.[0]?.phoneNumber;
  const scheduled = order.scheduledPickupDate ?? order.dateLivraisonPrevue;
  const isOverdue = scheduled && new Date(scheduled) < new Date();
  const clientId = order.clientId ?? order.client?.id;

  return (
    <View style={[styles.card, { borderLeftColor: C.warning }]}>
      {/* Top section */}
      <View style={styles.cardTop}>
        <Text style={styles.cardRef}>
          #{(order.numeroCommande ?? '').slice(-10)}
        </Text>
        <Text style={styles.cardClient} numberOfLines={1}>
          {order.client?.name ?? order.clientNom}
        </Text>
        {addr?.address ? (
          <Text style={styles.cardAddress} numberOfLines={1}>
            {addr.address}
          </Text>
        ) : null}
      </View>

      {/* Scheduled time section */}
      {scheduled ? (
        <View style={[styles.scheduledSection, isOverdue && { backgroundColor: C.dangerBg }]}>
          {isOverdue ? (
            <Text style={[styles.scheduledOverdue]}>⚠️ EN RETARD</Text>
          ) : (
            <Text style={styles.scheduledLabel}>📅 Prévu le</Text>
          )}
          <Text style={[styles.scheduledTime, isOverdue && { color: C.danger }]}>
            {new Date(scheduled).toLocaleDateString('fr-FR', {
              day: 'numeric', month: 'short',
            })} à {new Date(scheduled).toLocaleTimeString('fr-FR', {
              hour: '2-digit', minute: '2-digit',
            })}
          </Text>
        </View>
      ) : null}

      {order.itemCount > 0 ? (
        <Text style={styles.itemCount}>
          {order.itemCount} article{order.itemCount > 1 ? 's' : ''} à collecter
        </Text>
      ) : null}

      <View style={styles.divider} />

      {/* Actions */}
      <View style={styles.actionsSection}>
        <View style={styles.utilRow}>
          {phone ? (
            <TouchableOpacity
              style={[styles.utilBtn, { backgroundColor: C.warningBg, borderColor: C.warning + '33' }]}
              onPress={() => Linking.openURL(`tel:${phone}`)}
            >
              <Ionicons name="call" size={20} color={C.warning} />
              <Text style={[styles.utilBtnText, { color: C.warning }]}>Appeler</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[styles.utilBtn, { backgroundColor: 'rgba(13,115,119,0.10)', borderColor: C.primary + '33' }]}
            onPress={() => openNav(addr?.latitude, addr?.longitude, addr?.address)}
          >
            <Ionicons name="navigate" size={20} color={C.primary} />
            <Text style={[styles.utilBtnText, { color: C.primary }]}>Naviguer</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.mainActionBtn, { backgroundColor: C.warning }]}
          onPress={() => onPickup(order)}
        >
          <Text style={[styles.mainActionBtnText, { color: C.textPrimary }]}>
            📦 JE SUIS ARRIVÉ — CONFIRMER COLLECTE
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.problemBtn}
          onPress={() => onReportProblem(order)}
        >
          <Text style={styles.problemBtnText}>⚠️ Signaler un problème</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── MissionsScreen ───────────────────────────────────────────────────────────
export default function MissionsScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<'delivery' | 'pickup'>(
    params.tab === 'pickup' ? 'pickup' : 'delivery'
  );
  const [refreshing, setRefreshing] = useState(false);

  // Pickup modal state
  const [pickupOrder, setPickupOrder] = useState<any>(null);
  const [showPickupModal, setShowPickupModal] = useState(false);

  // Delivery modal state
  const [deliveryOrder, setDeliveryOrder] = useState<any>(null);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);

  // Receipt sheet state
  const [confirmedOrder, setConfirmedOrder] = useState<any>(null);
  const [showReceiptSheet, setShowReceiptSheet] = useState(false);

  // Failed attempt modal state
  const [failedAttemptOrder, setFailedAttemptOrder] = useState<any>(null);
  const [failedAttemptType, setFailedAttemptType] = useState<'PICKUP' | 'DELIVERY'>('DELIVERY');
  const [showFailedModal, setShowFailedModal] = useState(false);

  const dispatch = useDispatch<AppDispatch>();
  const { readyDeliveries, readyOrders, loading } = useSelector((s: RootState) => s.livreur);

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchReadyDeliveries());
      dispatch(fetchPendingPickups());
    }, [dispatch])
  );

  useEffect(() => {
    if (params.tab === 'pickup') setActiveTab('pickup');
    else if (params.tab === 'delivery') setActiveTab('delivery');
  }, [params.tab]);

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([dispatch(fetchReadyDeliveries()), dispatch(fetchPendingPickups())])
      .finally(() => setRefreshing(false));
  };

  const openDeliveryModal = (order: any) => {
    setDeliveryOrder(order);
    setShowDeliveryModal(true);
  };

  const openPickupModal = (order: any) => {
    setPickupOrder(order);
    setShowPickupModal(true);
  };

  const openFailedAttempt = (order: any, type: 'PICKUP' | 'DELIVERY') => {
    setFailedAttemptOrder(order);
    setFailedAttemptType(type);
    setShowFailedModal(true);
  };

  const handleConfirmed = (order: any) => {
    setShowDeliveryModal(false);
    setConfirmedOrder(order);
    setShowReceiptSheet(true);
    dispatch(fetchReadyDeliveries());
  };

  const handlePickupConfirmed = (order: any) => {
    setShowPickupModal(false);
    dispatch(fetchPendingPickups());
    Alert.alert('✅ Succès', 'Commande collectée avec succès!');
  };

  const handleFailedAttemptSuccess = () => {
    dispatch(fetchReadyDeliveries());
    dispatch(fetchPendingPickups());
  };

  const deliveries = readyDeliveries ?? [];
  const pickups = readyOrders ?? [];

  const totalRemaining = deliveries.reduce(
    (s: number, o: any) => s + parseFloat(o.montantRestant ?? o.resteAPayer ?? 0),
    0
  );

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
            const accentColor = tab === 'delivery' ? C.danger : C.warning;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, isActive && { backgroundColor: C.primary }]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, isActive && { color: 'white' }]}>
                  {tab === 'delivery' ? 'Livraisons' : 'Collectes'}
                </Text>
                {count > 0 && (
                  <View style={[styles.tabBadge, { backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : accentColor }]}>
                    <Text style={styles.tabBadgeText}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>

      {/* Stats banner — delivery only */}
      {activeTab === 'delivery' && deliveries.length > 0 && (
        <View style={styles.statsBanner}>
          <View style={styles.statCol}>
            <Text style={styles.statVal}>{deliveries.length}</Text>
            <Text style={styles.statLabel}>livraisons</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={[styles.statVal, { color: totalRemaining > 0 ? C.danger : C.success }]}>
              {totalRemaining} DH
            </Text>
            <Text style={styles.statLabel}>à encaisser</Text>
          </View>
        </View>
      )}

      <FlatList
        data={activeTab === 'delivery' ? deliveries : pickups}
        keyExtractor={(i) => String(i.id)}
        renderItem={({ item }) =>
          activeTab === 'delivery' ? (
            <DeliveryCard
              order={item}
              onDeliver={openDeliveryModal}
              onReportProblem={(o) => openFailedAttempt(o, 'DELIVERY')}
            />
          ) : (
            <PickupCard
              order={item}
              onPickup={openPickupModal}
              onReportProblem={(o) => openFailedAttempt(o, 'PICKUP')}
            />
          )
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.primary}
          />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={C.primary} style={{ marginTop: 60 }} size="large" />
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>
                {activeTab === 'delivery' ? '🎉' : '📭'}
              </Text>
              <Text style={styles.emptyTitle}>
                {activeTab === 'delivery' ? 'Aucune livraison' : 'Aucune collecte prévue'}
              </Text>
              <Text style={styles.emptyText}>
                {activeTab === 'delivery' ? 'Vous êtes à jour !' : 'Profitez de votre journée'}
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
      <PickupModal
        order={pickupOrder}
        visible={showPickupModal}
        onClose={() => setShowPickupModal(false)}
        onConfirmed={handlePickupConfirmed}
      />
      <ReceiptSheet
        order={confirmedOrder}
        visible={showReceiptSheet}
        onClose={() => setShowReceiptSheet(false)}
      />
      <FailedAttemptModal
        visible={showFailedModal}
        order={failedAttemptOrder}
        attemptType={failedAttemptType}
        onClose={() => setShowFailedModal(false)}
        onSuccess={handleFailedAttemptSuccess}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Screen
  topBar: { paddingHorizontal: 20, paddingVertical: 16 },
  topTitle: { fontSize: 20, fontWeight: '700', color: C.textPrimary },

  // Tabs
  tabsWrap: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 12,
    backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4, gap: 4,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10,
  },
  tabText: { fontSize: 14, fontWeight: '600', color: C.textMuted },
  tabBadge: {
    minWidth: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  tabBadgeText: { fontSize: 10, fontWeight: '800', color: 'white' },

  // Stats banner
  statsBanner: {
    flexDirection: 'row', backgroundColor: C.surface,
    marginHorizontal: 16, borderRadius: 14, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  statCol: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 16, fontWeight: '700', color: C.textPrimary },
  statLabel: { fontSize: 10, color: C.textMuted, fontWeight: '600', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#E2E8F0' },

  // Card
  card: {
    backgroundColor: C.surface, borderRadius: 20, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 4,
    borderLeftWidth: 5, overflow: 'hidden',
  },
  cardTop: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14 },
  cardRef: { fontSize: 12, fontWeight: '600', color: C.textMuted, marginBottom: 4 },
  cardClient: { fontSize: 22, fontWeight: '800', color: C.textPrimary },
  cardAddress: { fontSize: 15, color: C.textSecondary, marginTop: 4 },

  // Amount section (delivery)
  amountSection: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.06)', paddingHorizontal: 18, paddingVertical: 14,
  },
  amountLabel: { fontSize: 12, color: C.textMuted, marginBottom: 2 },
  amountValue: { fontSize: 28, fontWeight: '900' },
  amountMeta: { fontSize: 13, color: C.textMuted },

  // Scheduled section (pickup)
  scheduledSection: {
    backgroundColor: 'rgba(245,158,11,0.06)', paddingHorizontal: 18, paddingVertical: 14,
  },
  scheduledLabel: { fontSize: 12, color: C.textMuted },
  scheduledTime: { fontSize: 18, fontWeight: '700', color: C.warning, marginTop: 2 },
  scheduledOverdue: { fontSize: 14, fontWeight: '800', color: C.danger },
  itemCount: {
    fontSize: 15, fontWeight: '600', color: C.textSecondary,
    paddingHorizontal: 18, paddingVertical: 10,
  },

  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.06)' },

  // Actions
  actionsSection: { padding: 16 },
  utilRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  utilBtn: {
    flex: 1, height: 52, borderRadius: 14, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  utilBtnText: { fontSize: 14, fontWeight: '700' },
  mainActionBtn: {
    width: '100%', height: 60, borderRadius: 16, backgroundColor: C.success,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.success, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 5,
  },
  mainActionBtnText: {
    fontSize: 17, fontWeight: '800', color: 'white', letterSpacing: 0.5,
  },
  problemBtn: {
    marginTop: 8, paddingVertical: 8, alignItems: 'center',
  },
  problemBtnText: {
    fontSize: 13, color: C.textMuted,
    textDecorationLine: 'underline',
  },

  // Empty state
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: C.textPrimary, textAlign: 'center' },
  emptyText: { fontSize: 16, color: C.textMuted, marginTop: 8, textAlign: 'center' },

  // Shared modal
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet: {
    backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: Platform.OS === 'ios' ? 44 : 24,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: '#E2E8F0',
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary, textAlign: 'center' },
  modalSub: { fontSize: 14, color: C.textMuted, textAlign: 'center', marginTop: 4 },

  // Delivery modal internals
  bigAmountRow: {
    backgroundColor: '#F0FAFA', borderRadius: 16, padding: 20,
    marginTop: 16, marginBottom: 16, alignItems: 'center',
  },
  bigAmountLabel: { fontSize: 15, color: C.textMuted, marginBottom: 4 },
  bigAmountValue: { fontSize: 40, fontWeight: '900', color: C.primary },
  presetRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  presetBtn: {
    flex: 1, height: 52, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  presetBtnText: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  inputLabel: {
    fontSize: 11, fontWeight: '700', color: C.textMuted,
    textTransform: 'uppercase', marginBottom: 8,
  },
  amountInput: {
    borderWidth: 2, borderColor: C.primary, borderRadius: 14,
    fontSize: 28, fontWeight: '700', textAlign: 'center',
    paddingVertical: 14, color: C.textPrimary, marginBottom: 10,
  },
  statusPreview: {
    borderRadius: 12, padding: 12, borderWidth: 1,
    alignItems: 'center', marginBottom: 16,
  },
  statusText: { fontSize: 14, fontWeight: '700' },
  confirmBtn: {
    height: 56, borderRadius: 14, alignItems: 'center',
    justifyContent: 'center', marginBottom: 8,
  },
  confirmBtnText: { fontSize: 16, fontWeight: '800', color: 'white' },
  cancelBtn: {
    height: 48, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F1F5F9', borderRadius: 12,
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: C.textSecondary },

  // FailedAttemptModal
  faModalContent: {
    padding: 24, paddingBottom: 8,
  },
  faTitle: { fontSize: 20, fontWeight: '700', marginBottom: 6, marginTop: 4 },
  faSubtitle: { fontSize: 14, color: C.textMuted, marginBottom: 4 },
  faSectionLabel: {
    fontSize: 14, fontWeight: '600', color: C.textPrimary,
    marginTop: 20, marginBottom: 12,
  },
  faReasonBtn: {
    height: 56, borderRadius: 14, borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.08)', backgroundColor: C.surface,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, gap: 12, marginBottom: 8,
  },
  faReasonEmoji: { fontSize: 24 },
  faReasonLabel: { fontSize: 16, fontWeight: '600', color: C.textPrimary, flex: 1 },
  faNotesInput: {
    borderWidth: 2, borderColor: 'rgba(0,0,0,0.12)', borderRadius: 14,
    padding: 14, fontSize: 15, color: C.textPrimary,
    minHeight: 80, backgroundColor: C.surface,
  },
  faBottomBtns: {
    padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1, borderTopColor: '#F1F5F9', backgroundColor: C.surface,
  },
  faConfirmBtn: {
    height: 56, borderRadius: 16, alignItems: 'center',
    justifyContent: 'center', marginBottom: 8,
  },
  faConfirmBtnText: { fontSize: 17, fontWeight: '800', color: 'white' },
  faCancelBtn: {
    height: 48, borderRadius: 14, backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },
  faCancelBtnText: { fontSize: 15, fontWeight: '600', color: C.textSecondary },
});
