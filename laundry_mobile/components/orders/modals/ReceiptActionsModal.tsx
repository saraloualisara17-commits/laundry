import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRTL, row, font, textProps } from '../../../src/utils/rtl';
import { Colors } from '../../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ReceiptActionsModalProps {
  visible: boolean;
  onClose: () => void;
  confirmedStatus: string | undefined;
  sharingAction: 'whatsapp' | 'print' | null;
  onWhatsApp: () => void;
  onPrint: () => void;
  t: (key: string, options?: any) => string;
}

const C = {
  success: '#10B981',
  whatsappBg: '#E8F5E9',
  whatsappColor: '#2E7D32',
  printBg: '#F3E5F5',
  printColor: '#7B1FA2',
};

const ReceiptActionsModal: React.FC<ReceiptActionsModalProps> = ({
  visible,
  onClose,
  confirmedStatus,
  sharingAction,
  onWhatsApp,
  onPrint,
  t,
}) => {
  const { isRTL } = useRTL();
  const insets = useSafeAreaInsets();

  const isPickup = confirmedStatus === 'PICKED_UP';
  // Bottom padding: safe area on devices with home indicator
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 12);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={[styles.sheet, { paddingBottom: bottomPad + 12 }]}>
          <View style={styles.handle} />

          {/* Success icon */}
          <View style={styles.iconBox}>
            <Ionicons name="checkmark-circle" size={60} color={C.success} />
          </View>

          {/* Title — centered on confirmation screens is intentional */}
          <Text
            style={[styles.title, font.bold(isRTL)]}
            maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}
          >
            {isPickup
              ? t('livreur.confirm_pickup_title', { defaultValue: 'Collecte confirmée !' })
              : t('livreur.confirm_delivery_title', { defaultValue: 'Livraison confirmée !' })}
          </Text>

          <Text
            style={[styles.subtitle, font.regular(isRTL)]}
            maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}
          >
            {t('livreur.send_receipt_prompt', { defaultValue: 'Voulez-vous envoyer le reçu au client ?' })}
          </Text>

          {/* Action buttons — row direction flips in RTL */}
          <View style={[styles.actions, row(isRTL)]}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: C.whatsappBg }]}
              onPress={onWhatsApp}
              disabled={!!sharingAction}
            >
              {sharingAction === 'whatsapp' ? (
                <ActivityIndicator color={C.whatsappColor} />
              ) : (
                <>
                  <Ionicons name="logo-whatsapp" size={24} color={C.whatsappColor} />
                  <Text
                    style={[styles.actionText, { color: C.whatsappColor }, font.bold(isRTL)]}
                    maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}
                  >
                    WhatsApp
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: C.printBg }]}
              onPress={onPrint}
              disabled={!!sharingAction}
            >
              {sharingAction === 'print' ? (
                <ActivityIndicator color={C.printColor} />
              ) : (
                <>
                  <Ionicons name="print" size={24} color={C.printColor} />
                  <Text
                    style={[styles.actionText, { color: C.printColor }, font.bold(isRTL)]}
                    maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}
                  >
                    {t('common.print')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Done / dismiss */}
          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text
              style={[styles.doneBtnText, font.semibold(isRTL)]}
              maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}
            >
              {t('common.done', { defaultValue: 'Terminé' })}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default ReceiptActionsModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  backdrop: { flex: 1 },
  sheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2,
    marginBottom: 20,
  },
  iconBox: { marginBottom: 12 },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    gap: 12,
    width: '100%',
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionText: { fontSize: 13, fontWeight: '700' },
  doneBtn: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});
