import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Colors, Shadows } from '../../../constants/theme';
import { RTLBottomSheet } from '../../ui/RTLBottomSheet';
import { RTLFormRow } from '../../ui/RTLFormRow';
import RTLNumericInput from '../../ui/RTLNumericInput';
import RTLTextarea from '../../ui/RTLTextarea';
import { useRTL, row, font, textAlign, textProps } from '../../../src/utils/rtl';

interface DeliveryConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  totalAmount: number;
  remainingAmount: number;
  collectedAmount: string;
  setCollectedAmount: (amount: string) => void;
  deliveryNotes: string;
  setDeliveryNotes: (notes: string) => void;
  confirmingDelivery: boolean;
  photoUris?: string[];
  setPhotoUris?: (uris: string[]) => void;
  isArabic?: boolean;
  t: (key: string, options?: any) => string;
}

export const DeliveryConfirmModal: React.FC<DeliveryConfirmModalProps> = React.memo(({
  visible,
  onClose,
  onConfirm,
  totalAmount,
  remainingAmount,
  collectedAmount,
  setCollectedAmount,
  deliveryNotes,
  setDeliveryNotes,
  confirmingDelivery,
  t,
}) => {
  const { isRTL } = useRTL();

  const amountValue = parseFloat(collectedAmount) || 0;

  const getFeedback = () => {
    if (amountValue === 0) return {
      bg: Colors.dangerBg,
      border: 'rgba(239,68,68,0.2)',
      color: Colors.danger,
      label: t('delivery.unpaid_warning'),
      sub: `${t('delivery.unpaid_sub')} (${remainingAmount.toFixed(2)} ${t('common.dh')})`,
    };
    if (amountValue < remainingAmount - 0.05) return {
      bg: '#FFF7ED',
      border: 'rgba(245,158,11,0.2)',
      color: '#D97706',
      label: t('delivery.partial_payment'),
      sub: `${t('delivery.partial_sub')}: ${(remainingAmount - amountValue).toFixed(2)} ${t('common.dh')}`,
    };
    return {
      bg: Colors.successBg,
      border: 'rgba(16,185,129,0.2)',
      color: Colors.success,
      label: t('delivery.full_payment'),
      sub: t('delivery.full_sub'),
    };
  };

  const feedback = getFeedback();

  const footer = (
    <View style={[styles.actions, row(isRTL)]}>
      <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
        <Text style={[styles.cancelBtnText, font.semibold(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
          {t('common.cancel')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.confirmBtn, confirmingDelivery && { opacity: 0.6 }]}
        onPress={onConfirm}
        disabled={confirmingDelivery}
      >
        {confirmingDelivery ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={[styles.confirmBtnText, font.bold(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
            {t('common.confirm')} — {amountValue || 0} {t('common.dh')}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <RTLBottomSheet
      visible={visible}
      onClose={onClose}
      title={t('delivery.confirm_title')}
      footer={footer}
      centered
    >
      <View style={styles.body}>
        <Text
          style={[styles.subtitle, textAlign(isRTL), font.regular(isRTL)]}
          maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}
        >
          {t('delivery.declare_amount')}
        </Text>

        {/* Order total */}
        <View style={[styles.totalRow, row(isRTL)]}>
          <Text style={[styles.totalLabel, font.regular(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
            {t('delivery.order_total')}
          </Text>
          <Text style={[styles.totalValue, font.bold(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
            {totalAmount.toFixed(2)} {t('common.dh')}
          </Text>
        </View>

        {/* Remaining — only when partial payment already made */}
        {remainingAmount < totalAmount && (
          <View style={[styles.remainingRow, row(isRTL)]}>
            <Text style={[styles.totalLabel, font.regular(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
              {t('delivery.remaining_amount', { defaultValue: 'Reste à payer' })}
            </Text>
            <Text style={[styles.remainingValue, font.bold(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
              {remainingAmount.toFixed(2)} {t('common.dh')}
            </Text>
          </View>
        )}

        {/* Amount collected */}
        <RTLFormRow label={t('delivery.collected_amount')}>
          <RTLNumericInput
            value={collectedAmount}
            onChangeText={setCollectedAmount}
            unit={t('common.dh')}
            placeholder="0"
          />
          <View style={[styles.presetRow, row(isRTL)]}>
            <TouchableOpacity style={styles.presetBtn} onPress={() => setCollectedAmount('0')}>
              <Text style={[styles.presetBtnText, font.semibold(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
                0 {t('common.dh')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.presetBtn} onPress={() => setCollectedAmount(remainingAmount.toString())}>
              <Text style={[styles.presetBtnText, font.semibold(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
                {remainingAmount.toFixed(0)} {t('common.dh')}
              </Text>
            </TouchableOpacity>
          </View>
        </RTLFormRow>

        {/* Payment feedback */}
        <View style={[styles.feedbackBox, { backgroundColor: feedback.bg, borderColor: feedback.border }]}>
          <Text style={[styles.feedbackLabel, { color: feedback.color }, textAlign(isRTL), font.semibold(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
            {feedback.label}
          </Text>
          <Text style={[styles.feedbackSub, { color: feedback.color }, textAlign(isRTL), font.regular(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
            {feedback.sub}
          </Text>
        </View>

        {/* Notes */}
        <RTLFormRow label={t('delivery.notes_label')} style={styles.notesRow}>
          <RTLTextarea
            value={deliveryNotes}
            onChangeText={setDeliveryNotes}
            placeholder={t('delivery.notes_placeholder')}
            minLines={2}
          />
        </RTLFormRow>
      </View>
    </RTLBottomSheet>
  );
});

export default DeliveryConfirmModal;

const styles = StyleSheet.create({
  body: {
    gap: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 14,
  },
  totalRow: {
    backgroundColor: Colors.primary50,
    borderRadius: 14,
    padding: 14,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  totalValue: {
    fontSize: 18,
    color: Colors.primary,
  },
  remainingRow: {
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    padding: 14,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: -8,
  },
  remainingValue: {
    fontSize: 18,
    color: '#D97706',
  },
  presetRow: {
    gap: 8,
    marginTop: 10,
  },
  presetBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.primary100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetBtnText: {
    fontSize: 13,
    color: Colors.primary,
  },
  feedbackBox: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 4,
  },
  feedbackLabel: {
    fontSize: 14,
    marginBottom: 2,
  },
  feedbackSub: {
    fontSize: 12,
    opacity: 0.85,
  },
  notesRow: {
    marginTop: 12,
  },
  actions: {
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
  confirmBtn: {
    flex: 2,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.teal,
  },
  confirmBtnText: {
    color: 'white',
    fontSize: 15,
  },
});
