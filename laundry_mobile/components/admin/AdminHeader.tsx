import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdminColors, AdminShadows } from '../../constants/AdminColors';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../../src/store/store';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ title, subtitle, rightAction }) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const { settings } = useSelector((state: RootState) => state.settings);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.content}>
        <View style={[styles.titleRow, isArabic && { flexDirection: 'row-reverse' }]}>
          <View style={[styles.titleGroup, isArabic && { flexDirection: 'row-reverse' }]}>
            {settings.logoUrl && (
              <Image 
                source={{ uri: settings.logoUrl }} 
                style={styles.logo} 
                resizeMode="contain" 
              />
            )}
            <Text style={[styles.title, isArabic && { textAlign: 'right' }]}>{title}</Text>
          </View>
          {rightAction}
        </View>
        {subtitle && <Text style={[styles.subtitle, isArabic && { textAlign: 'right' }]}>{subtitle}</Text>}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: AdminColors.surface,
    ...AdminShadows.shadowSmall,
    zIndex: 10,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: AdminColors.textPrimary,
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    color: AdminColors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
});
