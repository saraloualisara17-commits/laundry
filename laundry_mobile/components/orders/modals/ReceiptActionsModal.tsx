import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRTL, row, font, textProps } from '../../../src/utils/rtl';
import { Colors } from '../../../constants/theme';

interface ReceiptActionsModalProps {
  visible: boolean;
  onClose: () => void;
  confirmedStatus: string | undefined;
  sharingAction: 'whatsapp' | 'print' | null;
  onWhatsApp: (lang: 'fr' | 'ar') => void;
  onPrint: (lang: 'fr' | 'ar') => void;
  t: (key: string, options?: any) => string;
}

const C = {
  success: '#10B981',
  primary: '#0D7377',
  whatsappBg: '#E8F5E9',
  whatsappColor: '#2E7D32',
  printBg: '#F3E5F5',
  printColor: '#7B1FA2',
  frBg: '#EFF6FF',
  frColor: '#1D4ED8',
  arBg: '#FFF7ED',
  arColor: '#C2410C',
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
  const [selectedLang, setSelectedLang] = useState<'fr' | 'ar' | null>(null);

  const isPickup = confirmedStatus === 'PICKED_UP';

  const handleClose = () => {
    setSelectedLang(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={handleClose} />

        <View style={styles.card}>
          <View style={styles.iconBox}>
            <Ionicons name="checkmark-circle" size={56} color={C.success} />
          </View>

          <Text style={[styles.title, font.bold(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
            {isPickup
              ? t('livreur.confirm_pickup_title', { defaultValue: 'Collecte confirmée !' })
              : t('livreur.confirm_delivery_title', { defaultValue: 'Livraison confirmée !' })}
          </Text>

          <Text style={[styles.subtitle, font.regular(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
            {t('livreur.send_receipt_prompt', { defaultValue: 'Voulez-vous envoyer le reçu au client ?' })}
          </Text>

          {/* Language picker */}
          <Text style={styles.stepLabel}>{t('receipt.choose_language')}</Text>
          <View style={[styles.langRow, row(isRTL)]}>
            <TouchableOpacity
              style={[styles.langBtn, selectedLang === 'fr' ? styles.langBtnActiveFr : null]}
              onPress={() => setSelectedLang('fr')}
            >
              <Text style={[styles.langBtnText, selectedLang === 'fr' ? { color: C.frColor, fontWeight: '800' } : null]}>
                🇫🇷 Français
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langBtn, selectedLang === 'ar' ? styles.langBtnActiveAr : null]}
              onPress={() => setSelectedLang('ar')}
            >
              <Text style={[styles.langBtnText, selectedLang === 'ar' ? { color: C.arColor, fontWeight: '800' } : null]}>
                🇲🇦 العربية
              </Text>
            </TouchableOpacity>
          </View>

          {/* Action buttons */}
          <View style={[styles.actions, row(isRTL)]}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: C.whatsappBg }, !selectedLang ? styles.actionBtnDisabled : null]}
              onPress={() => selectedLang && onWhatsApp(selectedLang)}
              disabled={!!sharingAction || !selectedLang}
            >
              {sharingAction === 'whatsapp' ? (
                <ActivityIndicator color={C.whatsappColor} />
              ) : (
                <>
                  <Ionicons name="logo-whatsapp" size={22} color={selectedLang ? C.whatsappColor : '#ccc'} />
                  <Text style={[styles.actionText, { color: selectedLang ? C.whatsappColor : '#ccc' }, font.bold(isRTL)]}
                    maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
                    {t('common.share', { defaultValue: 'Partager' })}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: C.printBg }, !selectedLang ? styles.actionBtnDisabled : null]}
              onPress={() => selectedLang && onPrint(selectedLang)}
              disabled={!!sharingAction || !selectedLang}
            >
              {sharingAction === 'print' ? (
                <ActivityIndicator color={C.printColor} />
              ) : (
                <>
                  <Ionicons name="print" size={22} color={selectedLang ? C.printColor : '#ccc'} />
                  <Text style={[styles.actionText, { color: selectedLang ? C.printColor : '#ccc' }, font.bold(isRTL)]}
                    maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
                    {t('common.print')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.doneBtn} onPress={handleClose}>
            <Text style={[styles.doneBtnText, font.semibold(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
              {t('common.done', { defaultValue: 'Terminé' })}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default ReceiptActionsModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,18,25,0.55)',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
  },
  iconBox: { marginBottom: 10 },
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
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  langRow: {
    gap: 10,
    width: '100%',
    marginBottom: 20,
  },
  langBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  langBtnActiveFr: {
    borderColor: C.frColor,
    backgroundColor: C.frBg,
  },
  langBtnActiveAr: {
    borderColor: C.arColor,
    backgroundColor: C.arBg,
  },
  langBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
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
  actionBtnDisabled: {
    opacity: 0.45,
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
