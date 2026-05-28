import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import { row, textAlign } from '../../src/utils/rtl';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AdminColors, AdminShadows } from '../../constants/AdminColors';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { useFormStyles } from '../../src/hooks/useFormStyles';
import { router } from 'expo-router';
import { useSettings, useUpdateSettings } from '../../src/hooks/query/useSettings';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const f = useFormStyles();
  const isArabic = f.isArabic;

  const { data: settingsData } = useSettings();
  const settings = settingsData ?? { appName: 'PureClean', logoUrl: null, businessPhone: null };
  const updateSettings = useUpdateSettings();

  const [appName, setAppName] = useState(settings?.appName ?? 'PureClean');
  const [businessPhone, setBusinessPhone] = useState(settings?.businessPhone ?? '');
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
    }
  };

  const handleSave = async () => {
    if (!appName.trim()) {
      Alert.alert(t('common.error'), t('settings.app_name_required'));
      return;
    }
    try {
      await updateSettings.mutateAsync({
        appName: appName.trim(),
        businessPhone: businessPhone.trim() || undefined,
        logo: selectedImage
          ? {
              uri: selectedImage.uri,
              name: selectedImage.fileName || 'logo.jpg',
              type: selectedImage.mimeType || 'image/jpeg',
            }
          : undefined,
      });
      Alert.alert(t('common.success'), t('settings.updated_success'));
      setSelectedImage(null);
    } catch {
      Alert.alert(t('common.error'), t('settings.update_failed'));
    }
  };

  const logoPreviewUri = selectedImage?.uri ?? settings?.logoUrl ?? undefined;

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={[styles.headerContent, row(isArabic)]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={24} color={AdminColors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('settings.branding_page_title')}</Text>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isArabic && { textAlign: 'right' }]}>{t('settings.visual_identity')}</Text>

          <View style={styles.card}>
            <Text style={[styles.label, isArabic && { textAlign: 'right' }]}>{t('settings.app_name')}</Text>
            <TextInput
              style={[styles.input, isArabic && { textAlign: 'right' }]}
              value={appName}
              onChangeText={setAppName}
              placeholder={t('settings.app_name_placeholder')}
              placeholderTextColor={AdminColors.textMuted}
            />

            <View style={styles.divider} />

            <Text style={[styles.label, isArabic && { textAlign: 'right' }]}>{t('settings.business_phone')}</Text>
            <TextInput
              style={[styles.input, isArabic && { textAlign: 'right' }]}
              value={businessPhone}
              onChangeText={setBusinessPhone}
              placeholder="0600000000"
              placeholderTextColor={AdminColors.textMuted}
              keyboardType="phone-pad"
            />

            <View style={styles.divider} />

            <Text style={[styles.label, isArabic && { textAlign: 'right' }]}>{t('settings.app_logo')}</Text>
            <View style={[styles.logoContainer, row(isArabic)]}>
              <View style={styles.logoPreview}>
                {logoPreviewUri ? (
                  <Image source={{ uri: logoPreviewUri }} style={styles.logoImage} />
                ) : (
                  <View style={[styles.logoImage, styles.logoPlaceholder]}>
                    <Ionicons name="image-outline" size={32} color={AdminColors.textMuted} />
                  </View>
                )}
              </View>
              <TouchableOpacity style={styles.pickBtn} onPress={pickImage}>
                <Ionicons name="camera-outline" size={20} color={AdminColors.primary} />
                <Text style={styles.pickBtnText}>{t('settings.change_logo')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, updateSettings.isPending && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={updateSettings.isPending}
        >
          {updateSettings.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color="white" />
              <Text style={styles.saveBtnText}>{t('settings.save_changes')}</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AdminColors.bg,
  },
  header: {
    backgroundColor: 'white',
    ...AdminShadows.shadowSmall,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: AdminColors.textPrimary,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: AdminColors.textMuted,
    marginBottom: 12,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    ...AdminShadows.shadowSmall,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: AdminColors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: AdminColors.bg,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: AdminColors.textPrimary,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  logoPreview: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: AdminColors.bg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  logoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AdminColors.primary,
    borderStyle: 'dashed',
  },
  pickBtnText: {
    color: AdminColors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: AdminColors.primary,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    ...AdminShadows.shadowTeal,
  },
  saveBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});
