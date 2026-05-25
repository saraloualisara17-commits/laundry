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
import RTLTextarea from '../../ui/RTLTextarea';
import { useRTL, row, font, textAlign, textProps } from '../../../src/utils/rtl';

interface PickupConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  confirmingPickup: boolean;
  photoUri?: string;
  setPhotoUri: (uri: string | undefined) => void;
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
  photoUri,
  setPhotoUri,
  pickupNotes,
  setPickupNotes,
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

  const footer = (
    <View style={[styles.actions, row(isRTL)]}>
      <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
        <Text style={[styles.cancelBtnText, font.semibold(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
          {t('common.cancel')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.confirmBtn, confirmingPickup && { opacity: 0.6 }]}
        onPress={() => onConfirm()}
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
      onClose={handleClose}
      title={t('livreur.pickup_confirm_title', { defaultValue: 'Confirmer la collecte' })}
      footer={footer}
    >
      <View style={styles.body}>
        <Text
          style={[styles.subtitle, textAlign(isRTL), font.regular(isRTL)]}
          maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}
        >
          {t('livreur.pickup_confirm_subtitle', { defaultValue: 'Prenez une photo des articles récupérés (optionnel).' })}
        </Text>

        {/* Proof of pickup photo */}
        <RTLFormRow label={t('delivery.photo_label', { defaultValue: 'Photo (optionnel)' })}>
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

        {/* Notes */}
        <RTLFormRow label={t('delivery.notes_label')} style={styles.notesRow}>
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
