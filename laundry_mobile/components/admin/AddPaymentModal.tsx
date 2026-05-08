import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { Colors, Shadows } from '../../constants/theme';
import { adminApi } from '../../src/services/adminApi';

interface AddPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  orderId: number | string;
  totalAmount: number;
  onSuccess: () => void;
}

export default function AddPaymentModal({ visible, onClose, orderId, totalAmount, onSuccess }: AddPaymentModalProps) {
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAddPayment = async () => {
    if (!paymentAmount || isNaN(parseFloat(paymentAmount))) {
      Alert.alert('Erreur', 'Veuillez saisir un montant valide.');
      return;
    }

    setSubmitting(true);
    try {
      await adminApi.addOrderPayment(orderId.toString(), parseFloat(paymentAmount), paymentNote);
      setPaymentAmount('');
      setPaymentNote('');
      onSuccess();
    } catch (error) {
      Alert.alert('Erreur', 'Échec de l\'enregistrement du paiement.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.modalDismiss} activeOpacity={1} onPress={onClose} />
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
              style={[styles.confirmBtn, submitting && { opacity: 0.7 }]}
              onPress={handleAddPayment}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.confirmBtnText}>Confirmer le paiement</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
