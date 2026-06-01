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
import RTLTextarea from '../../ui/RTLTextarea';
import { useRTL, row, font, textAlign, textProps } from '../../../src/utils/rtl';

interface PickupConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  confirmingPickup: boolean;
  photoUris?: string[];
  setPhotoUris?: (uris: string[]) => void;
  pickupNotes: string;
  setPickupNotes: (notes: string) => void;
  isArabic?: boolean;
  t: (key: string, options?: any) => string;
}

export const PickupConfirmModal: React.FC<PickupConfirmModalProps> = ({
  visible,
  onClose,
  onConfirm,
  confirmingPickup,
  pickupNotes,
  setPickupNotes,
  t,
}) => {
  const { isRTL } = useRTL();

  const footer = (
    <View style={[styles.actions, row(isRTL)]}>
      <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
        <Text style={[styles.cancelBtnText, font.semibold(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
          {t('common.cancel')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.confirmBtn, confirmingPickup && { opacity: 0.6 }]}
        onPress={onConfirm}
        disabled={confirmingPickup}
      >
        {confirmingPickup ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={[styles.confirmBtnText, font.bold(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
            {t('livreur.collect_btn')}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <RTLBottomSheet
      visible={visible}
      onClose={onClose}
      title={t('livreur.pickup_confirm_title')}
      footer={footer}
      centered
    >
      <View style={styles.body}>
        <Text
          style={[styles.subtitle, textAlign(isRTL), font.regular(isRTL)]}
          maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}
        >
          {t('livreur.pickup_confirm_subtitle')}
        </Text>

        <RTLFormRow label={t('delivery.notes_label')}>
          <RTLTextarea
            value={pickupNotes}
            onChangeText={setPickupNotes}
            placeholder={t('delivery.notes_placeholder')}
            minLines={2}
          />
        </RTLFormRow>
      </View>
    </RTLBottomSheet>
  );
};

export default PickupConfirmModal;

const styles = StyleSheet.create({
  body: {
    gap: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 14,
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
    backgroundColor: Colors.warning,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.teal,
  },
  confirmBtnText: {
    color: 'white',
    fontSize: 15,
  },
});
