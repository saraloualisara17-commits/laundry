import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Colors, Shadows } from '../../constants/theme';
import { adminApi } from '../../src/services/adminApi';
import { useRTL, row, font, textProps } from '../../src/utils/rtl';
import * as Haptics from 'expo-haptics';
import { RTLBottomSheet } from '../ui/RTLBottomSheet';
import { RTLFormRow } from '../ui/RTLFormRow';
import RTLNumericInput from '../ui/RTLNumericInput';
import RTLTextarea from '../ui/RTLTextarea';

interface AddPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  orderId: number | string;
  totalAmount: number;
  remainingAmount: number;
  onSuccess: () => void;
}

export default function AddPaymentModal({
  visible,
  onClose,
  orderId,
  totalAmount,
  remainingAmount,
  onSuccess,
}: AddPaymentModalProps) {
  const { t, isRTL } = useRTL();

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const amount = parseFloat(paymentAmount);
  const isInvalidAmount = !!paymentAmount && (isNaN(amount) || amount <= 0 || amount > remainingAmount + 0.05);
  const canSubmit = !!paymentAmount && !isNaN(amount) && amount > 0 && !isInvalidAmount && !submitting;

  const handleAddPayment = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await adminApi.addOrderPayment(orderId.toString(), amount, paymentNote);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPaymentAmount('');
      setPaymentNote('');
      onSuccess();
    } catch {
      Alert.alert(t('common.error'), t('common.error_msg'));
    } finally {
      setSubmitting(false);
    }
  };

  const footer = (
    <View style={[styles.actions, row(isRTL)]}>
      <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
        <Text style={[styles.cancelBtnText, font.semibold(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
          {t('common.cancel')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.confirmBtn, !canSubmit && styles.confirmBtnDisabled]}
        onPress={handleAddPayment}
        disabled={!canSubmit}
      >
        {submitting ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={[styles.confirmBtnText, font.bold(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
            {t('admin.unpaid.pay')}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <RTLBottomSheet
      visible={visible}
      onClose={onClose}
      title={t('admin.unpaid.add_payment')}
      footer={footer}
    >
      <View style={styles.body}>
        {/* Remaining pill */}
        <View style={[styles.remainingPill, row(isRTL)]}>
          <Text style={[styles.remainingLabel, font.regular(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
            {t('financial.remaining')}:
          </Text>
          <Text
            style={[
              styles.remainingValue,
              font.bold(isRTL),
              isInvalidAmount && parseFloat(paymentAmount) > remainingAmount && { color: Colors.danger },
            ]}
            maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}
          >
            {remainingAmount.toFixed(2)} {t('common.dh')}
          </Text>
        </View>

        {/* Amount */}
        <RTLFormRow
          label={t('admin.catalog.price_dh')}
          error={
            isInvalidAmount
              ? `⚠️ ${t('admin.unpaid.max_allowed')}: ${remainingAmount.toFixed(2)} ${t('common.dh')}`
              : undefined
          }
        >
          <RTLNumericInput
            value={paymentAmount}
            onChangeText={setPaymentAmount}
            unit={t('common.dh')}
            quickFillLabel={t('common.all')}
            quickFillValue={remainingAmount.toFixed(2)}
            hasError={isInvalidAmount}
            placeholder="0.00"
          />
        </RTLFormRow>

        {/* Notes */}
        <RTLFormRow label={t('common.notes')}>
          <RTLTextarea
            value={paymentNote}
            onChangeText={setPaymentNote}
            placeholder={t('delivery.notes_placeholder')}
            minLines={3}
          />
        </RTLFormRow>
      </View>
    </RTLBottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 4,
  },
  remainingPill: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface2,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  remainingLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  remainingValue: {
    fontSize: 14,
    color: Colors.primary,
  },
  actions: {
    gap: 12,
  },
  confirmBtn: {
    flex: 2,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.teal,
  },
  confirmBtnDisabled: {
    opacity: 0.45,
  },
  confirmBtnText: {
    color: 'white',
    fontSize: 15,
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
});
