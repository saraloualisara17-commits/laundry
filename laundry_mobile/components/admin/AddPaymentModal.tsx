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
  Alert,
  ScrollView
} from 'react-native';
import { Colors, Shadows } from '../../constants/theme';
import { adminApi } from '../../src/services/adminApi';

import { useTranslation } from 'react-i18next';

import * as Haptics from 'expo-haptics';

interface AddPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  orderId: number | string;
  totalAmount: number;
  remainingAmount: number;
  onSuccess: () => void;
}

export default function AddPaymentModal({ visible, onClose, orderId, totalAmount, remainingAmount, onSuccess }: AddPaymentModalProps) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAddPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (!paymentAmount || isNaN(amount) || amount <= 0) {
      Alert.alert(t('common.error'), t('admin.unpaid.enter_valid_amount'));
      return;
    }

    if (amount > remainingAmount + 0.05) { // Small buffer for rounding
      Alert.alert(
        t('common.error'), 
        t('admin.unpaid.payment_exceeds_remaining', { 
          max: remainingAmount.toFixed(2),
          defaultValue: `Le montant ne peut pas dépasser le reste à payer (${remainingAmount.toFixed(2)} DH)`
        })
      );
      return;
    }

    setSubmitting(true);
    try {
      await adminApi.addOrderPayment(orderId.toString(), amount, paymentNote);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPaymentAmount('');
      setPaymentNote('');
      onSuccess();
    } catch (error) {
      Alert.alert(t('common.error'), t('common.error_msg'));
    } finally {
      setSubmitting(false);
    }
  };

  const isInvalid = !paymentAmount || isNaN(parseFloat(paymentAmount)) || parseFloat(paymentAmount) <= 0 || parseFloat(paymentAmount) > remainingAmount + 0.05;

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
          
          <ScrollView 
            bounces={false} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={[styles.modalTitle, isArabic && { textAlign: 'right' }]}>{t('admin.unpaid.add_payment')}</Text>

            <View style={styles.modalBody}>
              <View style={[styles.remainingInfo, isArabic && { flexDirection: 'row-reverse' }]}>
                 <Text style={styles.remainingLabel}>{t('financial.remaining')}:</Text>
                 <Text style={[styles.remainingValue, isInvalid && parseFloat(paymentAmount) > remainingAmount && { color: Colors.danger }]}>
                   {remainingAmount.toFixed(2)} {t('common.dh')}
                 </Text>
              </View>

              <View>
                <Text style={[styles.inputLabel, isArabic && { textAlign: 'right' }]}>{t('admin.catalog.price_dh')}</Text>
                <View style={styles.amountInputContainer}>
                  <TextInput
                    style={[
                      styles.amountInput, 
                      isArabic && { textAlign: 'right' },
                      isInvalid && parseFloat(paymentAmount) > remainingAmount && { color: Colors.danger, borderBottomColor: Colors.danger }
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
                      setPaymentAmount(remainingAmount.toFixed(2));
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }}
                  >
                    <Text style={styles.fullAmountBtnText}>{t('common.all')}</Text>
                  </TouchableOpacity>
                </View>
                {isInvalid && parseFloat(paymentAmount) > remainingAmount && (
                  <Text style={[styles.errorHint, isArabic && { textAlign: 'right' }]}>
                    ⚠️ {t('admin.unpaid.max_allowed')}: {remainingAmount.toFixed(2)} DH
                  </Text>
                )}
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
                  style={styles.cancelBtn} 
                  onPress={onClose}
                >
                  <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.confirmBtn, 
                    (submitting || isInvalid) && { opacity: 0.5 }
                  ]}
                  onPress={handleAddPayment}
                  disabled={submitting || isInvalid}
                >
                  {submitting ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.confirmBtnText}>{t('admin.unpaid.pay')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.4)', 
    justifyContent: 'flex-end' 
  },
  modalDismiss: { 
    flex: 1 
  },
  modalSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '90%', // Increased to allow more room for keyboard
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
  },
  modalHandle: { 
    width: 40, 
    height: 4, 
    backgroundColor: 'rgba(0,0,0,0.1)', 
    borderRadius: 2, 
    alignSelf: 'center', 
    marginBottom: 20 
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: Colors.textPrimary, 
    marginBottom: 10, 
    textAlign: 'center' 
  },
  modalBody: { 
    gap: 16 
  },
  remainingInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
    marginBottom: 8,
  },
  remainingLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  remainingValue: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '700',
  },
  inputLabel: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: Colors.textSecondary,
    marginBottom: 4
  },
  amountInputContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  amountInput: { 
    fontSize: 28, 
    fontWeight: '800', 
    textAlign: 'center', 
    color: Colors.primary, 
    padding: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(0,0,0,0.05)', 
    marginBottom: 10 
  },
  fullAmountBtn: {
    position: 'absolute',
    right: 0,
    top: '25%',
    backgroundColor: Colors.primary50,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  fullAmountBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  errorHint: {
    fontSize: 12,
    color: Colors.danger,
    fontWeight: '600',
    marginTop: -8,
    marginBottom: 8,
  },
  noteInput: { 
    padding: 14, 
    borderRadius: 14, 
    backgroundColor: '#F8FAFC', 
    minHeight: 80, 
    textAlignVertical: 'top', 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    fontSize: 15 
  },
  modalActions: { 
    flexDirection: 'row', 
    gap: 12, 
    marginTop: 12 
  },
  confirmBtn: { 
    flex: 2, 
    backgroundColor: Colors.primary, 
    height: 52, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center', 
    ...Shadows.teal 
  },
  confirmBtnText: { 
    color: 'white', 
    fontSize: 15, 
    fontWeight: '700' 
  },
  cancelBtn: { 
    flex: 1, 
    backgroundColor: '#F1F5F9', 
    height: 52, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  cancelBtnText: { 
    color: Colors.textSecondary, 
    fontSize: 15, 
    fontWeight: '600' 
  },
});
