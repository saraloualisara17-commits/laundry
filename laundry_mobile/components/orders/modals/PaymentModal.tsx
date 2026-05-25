import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Shadows, Fonts } from '../../../constants/theme';
import { RTLBottomSheet } from '../../ui/RTLBottomSheet';
import { RTLFormRow } from '../../ui/RTLFormRow';
import RTLNumericInput from '../../ui/RTLNumericInput';
import RTLTextarea from '../../ui/RTLTextarea';
import { useRTL, row, font, textAlign, textProps } from '../../../src/utils/rtl';

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: () => void;
  remaining: number;
  loading: boolean;
  paymentAmount: string;
  setPaymentAmount: (amount: string) => void;
  paymentNote: string;
  setPaymentNote: (note: string) => void;
  /** Kept for backward compatibility — direction is now read from app language */
  isArabic?: boolean;
  t: (key: string, options?: any) => string;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  visible,
  onClose,
  onSubmit,
  remaining,
  loading,
  paymentAmount,
  setPaymentAmount,
  paymentNote,
  setPaymentNote,
  t,
}) => {
  const { isRTL } = useRTL();

  const amount = parseFloat(paymentAmount);
  const isInvalidAmount = !!paymentAmount && (isNaN(amount) || amount <= 0 || amount > remaining + 0.05);
  const canSubmit = !!paymentAmount && !isNaN(amount) && amount > 0 && !isInvalidAmount && !loading;

  const footer = (
    <View style={[styles.actions, row(isRTL)]}>
      <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
        <Text style={[styles.cancelBtnText, font.semibold(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
          {t('common.cancel')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.confirmBtn, !canSubmit && styles.confirmBtnDisabled]}
        onPress={onSubmit}
        disabled={!canSubmit}
      >
        {loading ? (
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
        {/* Remaining amount info pill */}
        <View style={[styles.remainingPill, row(isRTL)]}>
          <Text style={[styles.remainingLabel, font.regular(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
            {t('financial.remaining')}:
          </Text>
          <Text style={[styles.remainingValue, font.bold(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
            {remaining.toFixed(2)} {t('common.dh')}
          </Text>
        </View>

        {/* Amount field */}
        <RTLFormRow
          label={t('admin.catalog.price_dh')}
          error={
            isInvalidAmount
              ? `⚠️ ${t('admin.unpaid.max_allowed')}: ${remaining.toFixed(2)} ${t('common.dh')}`
              : undefined
          }
        >
          <RTLNumericInput
            value={paymentAmount}
            onChangeText={setPaymentAmount}
            unit={t('common.dh')}
            quickFillLabel={t('common.all')}
            quickFillValue={remaining.toFixed(2)}
            hasError={isInvalidAmount}
            placeholder="0.00"
          />
        </RTLFormRow>

        {/* Notes field */}
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
};

export default PaymentModal;

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
