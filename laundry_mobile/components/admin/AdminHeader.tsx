import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdminColors, AdminShadows } from '../../constants/AdminColors';
import { useTranslation } from 'react-i18next';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ title, subtitle, rightAction }) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.content}>
        <View style={[styles.titleRow, isArabic && { flexDirection: 'row-reverse' }]}>
          <Text style={[styles.title, isArabic && { textAlign: 'right' }]}>{title}</Text>
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
    justifyContent: 'between',
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
