import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
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
  collectedAmount: string;
  setCollectedAmount: (amount: string) => void;
  deliveryNotes: string;
  setDeliveryNotes: (notes: string) => void;
  confirmingDelivery: boolean;
  photoUri?: string;
  setPhotoUri: (uri: string | undefined) => void;
  /** Kept for backward compat — direction is read from app language */
  isArabic?: boolean;
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
  photoUri,
  setPhotoUri,
  t,
}) => {
  const { isRTL } = useRTL();

  const requestAndLaunchCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), t('common.camera_permission_denied', { defaultValue: 'Accès à la caméra refusé' }));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets?.[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const requestAndLaunchGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), t('common.gallery_permission_denied', { defaultValue: 'Accès à la galerie refusé' }));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets?.[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleClose = () => {
    setPhotoUri(undefined);
    onClose();
  };

  const amountValue = parseFloat(collectedAmount) || 0;

  const getFeedback = () => {
    if (amountValue === 0) return {
      bg: Colors.dangerBg,
      border: 'rgba(239,68,68,0.2)',
      color: Colors.danger,
      label: t('delivery.unpaid_warning'),
      sub: `${t('delivery.unpaid_sub')} (${totalAmount.toFixed(2)} ${t('common.dh')})`,
    };
    if (amountValue < totalAmount - 0.05) return {
      bg: '#FFF7ED',
      border: 'rgba(245,158,11,0.2)',
      color: '#D97706',
      label: t('delivery.partial_payment'),
      sub: `${t('delivery.partial_sub')}: ${(totalAmount - amountValue).toFixed(2)} ${t('common.dh')}`,
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
      <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
        <Text style={[styles.cancelBtnText, font.semibold(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
          {t('common.cancel')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.confirmBtn, confirmingDelivery && { opacity: 0.6 }]}
        onPress={() => onConfirm()}
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
      onClose={handleClose}
      title={t('delivery.confirm_title')}
      footer={footer}
    >
      <View style={styles.body}>
        {/* Subtitle */}
        <Text
          style={[styles.subtitle, textAlign(isRTL), font.regular(isRTL)]}
          maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}
        >
          {t('delivery.declare_amount')}
        </Text>

        {/* Order total info row */}
        <View style={[styles.totalRow, row(isRTL)]}>
          <Text style={[styles.totalLabel, font.regular(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
            {t('delivery.order_total')}
          </Text>
          <Text style={[styles.totalValue, font.bold(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
            {totalAmount.toFixed(2)} {t('common.dh')}
          </Text>
        </View>

        {/* Amount collected */}
        <RTLFormRow label={t('delivery.collected_amount')}>
          <RTLNumericInput
            value={collectedAmount}
            onChangeText={setCollectedAmount}
            unit={t('common.dh')}
            placeholder="0"
          />
          {/* Quick preset buttons */}
          <View style={[styles.presetRow, row(isRTL)]}>
            <TouchableOpacity
              style={styles.presetBtn}
              onPress={() => setCollectedAmount('0')}
            >
              <Text style={[styles.presetBtnText, font.semibold(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
                0 {t('common.dh')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.presetBtn}
              onPress={() => setCollectedAmount(totalAmount.toString())}
            >
              <Text style={[styles.presetBtnText, font.semibold(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
                {totalAmount.toFixed(0)} {t('common.dh')}
              </Text>
            </TouchableOpacity>
          </View>
        </RTLFormRow>

        {/* Payment feedback chip */}
        <View style={[styles.feedbackBox, { backgroundColor: feedback.bg, borderColor: feedback.border }]}>
          <Text
            style={[styles.feedbackLabel, { color: feedback.color }, textAlign(isRTL), font.semibold(isRTL)]}
            maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}
          >
            {feedback.label}
          </Text>
          <Text
            style={[styles.feedbackSub, { color: feedback.color }, textAlign(isRTL), font.regular(isRTL)]}
            maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}
          >
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

        {/* Proof of delivery photo */}
        <RTLFormRow label={t('delivery.photo_label', { defaultValue: 'Photo (optionnel)' })} style={styles.photoRow}>
          {photoUri ? (
            <View style={styles.photoPreviewContainer}>
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
              <TouchableOpacity style={styles.photoRemoveBtn} onPress={() => setPhotoUri(undefined)}>
                <Ionicons name="close-circle" size={22} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.photoActions, row(isRTL)]}>
              <TouchableOpacity style={[styles.photoBtn, row(isRTL)]} onPress={requestAndLaunchCamera}>
                <Ionicons name="camera-outline" size={18} color={Colors.primary} />
                <Text style={[styles.photoBtnText, font.semibold(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
                  {t('common.camera', { defaultValue: 'Caméra' })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.photoBtn, row(isRTL)]} onPress={requestAndLaunchGallery}>
                <Ionicons name="images-outline" size={18} color={Colors.primary} />
                <Text style={[styles.photoBtnText, font.semibold(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
                  {t('common.gallery', { defaultValue: 'Galerie' })}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </RTLFormRow>
      </View>
    </RTLBottomSheet>
  );
};

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
  photoRow: {
    marginTop: 12,
  },
  photoActions: {
    gap: 10,
  },
  photoBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.primary100,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  photoBtnText: {
    fontSize: 13,
    color: Colors.primary,
  },
  photoPreviewContainer: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  photoPreview: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'white',
    borderRadius: 11,
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
