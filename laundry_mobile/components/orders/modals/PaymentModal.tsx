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
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Shadows } from '../../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  isArabic: boolean;
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
  isArabic,
  t,
}) => {
  const isInvalidAmount = parseFloat(paymentAmount) > remaining + 0.05;

  return (
    <Modal
      visible={visible}
      animationType="fade"
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
            keyboardShouldPersistTaps="handled" 
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            <Text style={[styles.modalTitle, isArabic && { textAlign: 'right' }]}>
              {t('admin.unpaid.add_payment')}
            </Text>
            
            <View style={styles.modalBody}>
              <View style={[styles.remainingInfo, isArabic && { flexDirection: 'row-reverse' }]}>
                 <Text style={styles.remainingLabel}>{t('financial.remaining')}:</Text>
                 <Text style={styles.remainingValue}>{remaining.toFixed(2)} {t('common.dh')}</Text>
              </View>

              <Text style={[styles.inputLabel, isArabic && { textAlign: 'right' }]}>
                {t('admin.catalog.price_dh')}
              </Text>
              <View style={styles.amountInputContainer}>
                <TextInput
                  style={[
                    styles.amountInput, 
                    { fontSize: 28, fontWeight: '800', textAlign: 'center' }, 
                    isArabic && { textAlign: 'right' },
                    isInvalidAmount && { color: Colors.danger }
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
                    setPaymentAmount(remaining.toFixed(2));
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }}
                >
                  <Text style={styles.fullAmountBtnText}>{t('common.all')}</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.inputLabel, isArabic && { textAlign: 'right' }]}>
                {t('common.notes')}
              </Text>
              <TextInput
                style={[styles.noteInput, isArabic && { textAlign: 'right' }]}
                value={paymentNote}
                onChangeText={setPaymentNote}
                placeholder={t('delivery.notes_placeholder')}
                multiline
              />

              <View style={[styles.modalActions, isArabic && { flexDirection: 'row-reverse' }]}>
                <TouchableOpacity 
                  style={[styles.secondaryModalBtn, { flex: 1 }]} 
                  onPress={onClose}
                >
                  <Text style={styles.secondaryModalBtnText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.primaryModalBtn, 
                    { flex: 2 }, 
                    (loading || isInvalidAmount) && { opacity: 0.5 }
                  ]}
                  onPress={onSubmit}
                  disabled={loading || isInvalidAmount}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.primaryModalBtnText}>{t('common.confirm')}</Text>
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
    marginTop: 10 
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
  modalActions: { 
    flexDirection: 'row', 
    gap: 12 
  },
  primaryModalBtn: { 
    height: 52, 
    borderRadius: 14, 
    backgroundColor: Colors.primary, 
    alignItems: 'center', 
    justifyContent: 'center', 
    ...Shadows.teal 
  },
  primaryModalBtnText: { 
    color: 'white', 
    fontSize: 15, 
    fontWeight: '700' 
  },
  secondaryModalBtn: { 
    height: 52, 
    borderRadius: 14, 
    backgroundColor: '#F1F5F9', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  secondaryModalBtnText: { 
    color: Colors.textSecondary, 
    fontSize: 15, 
    fontWeight: '600' 
  },
  amountInputContainer: { 
    position: 'relative', 
    justifyContent: 'center', 
    marginBottom: 16 
  },
  fullAmountBtn: { 
    position: 'absolute', 
    right: 12, 
    top: '25%', 
    backgroundColor: Colors.primary100, 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 8 
  },
  fullAmountBtnText: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: Colors.primary 
  },
  remainingInfo: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#F8FAFC', 
    paddingVertical: 8, 
    borderRadius: 12, 
    gap: 8, 
    marginBottom: 12 
  },
  remainingLabel: { 
    fontSize: 13, 
    color: Colors.textSecondary, 
    fontWeight: '500' 
  },
  remainingValue: { 
    fontSize: 14, 
    color: Colors.primary, 
    fontWeight: '700' 
  },
});

export default PaymentModal;
