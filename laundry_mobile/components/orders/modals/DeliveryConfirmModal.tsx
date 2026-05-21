import React from 'react';
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
  ScrollView,
} from 'react-native';
import { Colors, Shadows } from '../../../constants/theme';

interface DeliveryConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  totalAmount: number;
  collectedAmount: string;
  setCollectedAmount: (amount: string) => void;
  deliveryNotes: string;
  setDeliveryNotes: (notes: string) => void;
  confirmingDelivery: boolean;
  isArabic: boolean;
  t: (key: string, options?: any) => string;
}

export const DeliveryConfirmModal: React.FC<DeliveryConfirmModalProps> = ({
  visible,
  onClose,
  onConfirm,
  totalAmount,
  collectedAmount,
  setCollectedAmount,
  deliveryNotes,
  setDeliveryNotes,
  confirmingDelivery,
  isArabic,
  t,
}) => {
  const amountValue = parseFloat(collectedAmount) || 0;
  
  const getFeedbackStyles = () => {
    if (amountValue === 0) return { 
      bg: Colors.dangerBg, 
      border: 'rgba(239,68,68,0.2)', 
      color: Colors.danger,
      label: t('delivery.unpaid_warning'),
      sub: `${t('delivery.unpaid_sub')} (${totalAmount.toFixed(2)} ${t('common.dh')})`
    };
    if (amountValue < totalAmount - 0.05) return { 
      bg: '#FFF7ED', 
      border: 'rgba(245,158,11,0.2)', 
      color: '#D97706',
      label: t('delivery.partial_payment'),
      sub: `${t('delivery.partial_sub')}: ${(totalAmount - amountValue).toFixed(2)} ${t('common.dh')}`
    };
    return { 
      bg: Colors.successBg, 
      border: 'rgba(16,185,129,0.2)', 
      color: Colors.success,
      label: t('delivery.full_payment'),
      sub: t('delivery.full_sub')
    };
  };

  const feedback = getFeedbackStyles();

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
        <View style={[styles.modalSheet, { maxHeight: '90%' }]}>
          <View style={styles.modalHandle} />
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            bounces={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            <Text style={[styles.modalTitle, isArabic && { textAlign: 'right' }]}>
              {t('delivery.confirm_title')}
            </Text>
            <Text style={[{ fontSize: 14, color: Colors.textSecondary, marginBottom: 20 }, isArabic && { textAlign: 'right' }]}>
              {t('delivery.declare_amount')}
            </Text>

            <View style={[{ backgroundColor: Colors.primary50, borderRadius: 14, padding: 16, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, isArabic && { flexDirection: 'row-reverse' }]}>
              <Text style={{ fontSize: 13, color: Colors.textSecondary }}>{t('delivery.order_total')}</Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.primary }}>{totalAmount.toFixed(2)} {t('common.dh')}</Text>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, { textAlign: 'center' }]}>
                {t('delivery.collected_amount')}
              </Text>
              <TextInput 
                style={[styles.amountInput, { height: 60, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.12)', borderRadius: 14, borderBottomWidth: 1.5, fontSize: 24, textAlign: 'center' }]} 
                value={collectedAmount} 
                onChangeText={setCollectedAmount} 
                keyboardType="decimal-pad" 
                placeholder="0" 
                autoFocus 
              />
              <View style={[{ flexDirection: 'row', gap: 8, marginTop: 10 }, isArabic && { flexDirection: 'row-reverse' }]}>
                <TouchableOpacity 
                  style={{ flex: 1, height: 38, borderRadius: 10, backgroundColor: Colors.primary100, justifyContent: 'center', alignItems: 'center' }} 
                  onPress={() => setCollectedAmount('0')}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.primary }}>0 {t('common.dh')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{ flex: 1, height: 38, borderRadius: 10, backgroundColor: Colors.primary100, justifyContent: 'center', alignItems: 'center' }} 
                  onPress={() => setCollectedAmount(totalAmount.toString())}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.primary }}>{totalAmount.toFixed(0)} {t('common.dh')}</Text>
                </TouchableOpacity>
              </View>

              <View style={[{ marginTop: 16, borderRadius: 12, padding: 14, backgroundColor: feedback.bg, borderWidth: 1, borderColor: feedback.border }, isArabic && { flexDirection: 'row-reverse' }]}>
                <View style={styles.modalBody}>
                  <Text style={[{ fontSize: 14, fontWeight: '600', color: feedback.color }, isArabic && { textAlign: 'right' }]}>
                    {feedback.label}
                  </Text>
                  <Text style={[{ fontSize: 12, color: feedback.color, opacity: 0.8 }, isArabic && { textAlign: 'right' }]}>
                    {feedback.sub}
                  </Text>
                </View>
              </View>

              <Text style={[styles.inputLabel, { marginTop: 16 }, isArabic && { textAlign: 'right' }]}>
                {t('delivery.notes_label')}
              </Text>
              <TextInput 
                style={[styles.noteInput, { minHeight: 60 }, isArabic && { textAlign: 'right' }]} 
                value={deliveryNotes} 
                onChangeText={setDeliveryNotes} 
                placeholder={t('delivery.notes_placeholder')} 
                multiline 
              />

              <View style={[{ flexDirection: 'row', gap: 10, marginTop: 24, paddingBottom: 20 }, isArabic && { flexDirection: 'row-reverse' }]}>
                <TouchableOpacity 
                  style={{ flex: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)', justifyContent: 'center', alignItems: 'center' }} 
                  onPress={onClose}
                >
                  <Text style={{ color: Colors.textSecondary, fontWeight: '600' }}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{ flex: 2, height: 52, borderRadius: 14, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', ...Shadows.teal }} 
                  onPress={onConfirm} 
                  disabled={confirmingDelivery}
                >
                  {confirmingDelivery ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={{ color: 'white', fontSize: 15, fontWeight: '700' }}>
                      {t('common.confirm')} — {amountValue || 0} {t('common.dh')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,18,25,0.6)', 
    justifyContent: 'flex-end' 
  },
  modalDismiss: { 
    flex: 1 
  },
  modalSheet: { 
    backgroundColor: 'white', 
    borderTopLeftRadius: 30, 
    borderTopRightRadius: 30, 
    padding: 24, 
    paddingBottom: Platform.OS === 'ios' ? 40 : 24 
  },
  modalHandle: { 
    width: 40, 
    height: 5, 
    backgroundColor: '#E2E8F0', 
    borderRadius: 10, 
    alignSelf: 'center', 
    marginBottom: 20 
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: '800', 
    color: Colors.textPrimary, 
    marginBottom: 8 
  },
  modalBody: { 
    marginTop: 0 // Resetting for inner usage
  },
  inputLabel: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: Colors.textSecondary, 
    marginBottom: 8 
  },
  amountInput: { 
    height: 56, 
    backgroundColor: '#F8FAFC', 
    borderRadius: 16, 
    paddingHorizontal: 20, 
    fontSize: 18, 
    fontWeight: '700', 
    color: Colors.primary, 
    marginBottom: 16 
  },
  noteInput: { 
    minHeight: 100, 
    backgroundColor: '#F8FAFC', 
    borderRadius: 16, 
    padding: 16, 
    fontSize: 15, 
    textAlignVertical: 'top', 
    marginBottom: 20 
  },
  primaryModalBtn: { 
    height: 52, 
    borderRadius: 14, 
    backgroundColor: Colors.primary, 
    alignItems: 'center', 
    justifyContent: 'center', 
    ...Shadows.teal 
  },
});

export default DeliveryConfirmModal;
