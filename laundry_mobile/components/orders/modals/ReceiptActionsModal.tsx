import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ReceiptActionsModalProps {
  visible: boolean;
  onClose: () => void;
  /** The resolved status of the order after mutation — drives the title. */
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
  const isPickup = confirmedStatus === 'PICKED_UP';

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismiss} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.iconBox}>
            <Ionicons name="checkmark-circle" size={60} color={C.success} />
          </View>

          <Text style={styles.title}>
            {isPickup
              ? t('livreur.confirm_pickup_title', { defaultValue: 'Collecte confirmée !' })
              : t('livreur.confirm_delivery_title', { defaultValue: 'Livraison confirmée !' })}
          </Text>

          <Text style={styles.subtitle}>
            {t('livreur.send_receipt_prompt', { defaultValue: 'Voulez-vous envoyer le reçu au client ?' })}
          </Text>

          <View style={styles.actions}>
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
                  <Text style={[styles.actionText, { color: C.whatsappColor }]}>WhatsApp</Text>
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
                  <Text style={[styles.actionText, { color: C.printColor }]}>
                    {t('common.print')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>
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
  dismiss: { flex: 1 },
  sheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
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
    color: '#0D1B2A',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 24,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
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
  doneBtnText: { fontSize: 15, fontWeight: '600', color: '#64748B' },
});
