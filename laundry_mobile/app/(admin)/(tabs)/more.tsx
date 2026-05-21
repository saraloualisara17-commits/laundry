import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AdminColors, AdminShadows } from '../../../constants/AdminColors';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../../../src/i18n';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../src/store/store';
import { logOut } from '../../../src/store/authSlice';
import * as SecureStore from 'expo-secure-store';
import { useFormStyles } from '../../../src/hooks/useFormStyles';

export default function MoreScreen() {
  const { t } = useTranslation();
  const f = useFormStyles();
  const isArabic = f.isArabic;
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);

  const handleLogout = async () => {
    dispatch(logOut());
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('user');
    router.replace('/(auth)/login');
  };

  const renderMenuItem = (icon: any, title: string, subtitle: string, onPress: () => void, danger?: boolean) => (
    <TouchableOpacity 
      style={styles.menuItem} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIconCircle, danger && { backgroundColor: '#FEF2F2' }]}>
        <Ionicons name={icon} size={22} color={danger ? '#EF4444' : AdminColors.primary} />
      </View>
      <View style={styles.menuInfo}>
        <Text style={[styles.menuTitle, danger && { color: '#EF4444' }, isArabic && { textAlign: 'right' }]}>{title}</Text>
        <Text style={[styles.menuSubtitle, isArabic && { textAlign: 'right' }]}>{subtitle}</Text>
      </View>
      <Ionicons name={isArabic ? "chevron-back" : "chevron-forward"} size={18} color={AdminColors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={[styles.headerContent, isArabic && { flexDirection: 'row-reverse' }]}>
          <View style={styles.profileInfo}>
            <Text style={[styles.headerTitle, isArabic && { textAlign: 'right' }]}>{t('common.more')}</Text>
            <Text style={[styles.headerSubtitle, isArabic && { textAlign: 'right' }]}>{user?.name || 'Admin'}</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, f.sectionLabel]}>{t('admin.more.management')}</Text>
          {renderMenuItem(
            'bar-chart-outline',
            t('stats.title'),
            t('admin.more.stats_sub'),
            () => router.push('/(admin)/statistics')
          )}
          {renderMenuItem(
            'layers-outline',
            t('tabs.catalog'),
            t('admin.more.catalog_sub'),
            () => router.push('/(admin)/catalog')
          )}
          {renderMenuItem(
            'people-circle-outline',
            t('tabs.team'),
            t('admin.more.team_sub'),
            () => router.push('/(admin)/users')
          )}
          {renderMenuItem(
            'map-outline',
            t('admin.more.map_title'),
            t('admin.more.map_sub'),
            () => router.push('/(admin)/all-orders-map')
          )}
        </View>
<View style={styles.section}>
  <Text style={[styles.sectionTitle, f.sectionLabel]}>{t('admin.more.settings')}</Text>
  {renderMenuItem(
    'color-palette-outline',
    'App Branding',
    'Update name and logo',
    () => router.push('/(admin)/settings')
  )}
  {renderMenuItem(
    'language-outline', 
    isArabic ? 'Français (FR)' : 'العربية (AR)', 
    t('admin.more.lang_sub'),
    () => changeLanguage(isArabic ? 'fr' : 'ar')
  )}
          {renderMenuItem(
            'notifications-outline', 
            t('tabs.notifications'), 
            t('admin.more.notif_sub'), 
            () => router.push('/notifications')
          )}
        </View>

        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.logoutBtn}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={styles.logoutText}>{t('common.logout')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Laundry Admin v2.1.0</Text>
        </View>
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
  },
  profileInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: AdminColors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: AdminColors.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
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
  },
  menuItem: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    ...AdminShadows.shadowSmall,
  },
  menuIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: AdminColors.primary100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuInfo: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: AdminColors.textPrimary,
  },
  menuSubtitle: {
    fontSize: 12,
    color: AdminColors.textMuted,
    marginTop: 2,
  },
  logoutBtn: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: AdminColors.textMuted,
    fontWeight: '500',
  },
});
