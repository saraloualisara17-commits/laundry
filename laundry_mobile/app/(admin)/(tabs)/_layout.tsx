import { Tabs, router, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AdminColors } from '../../../constants/AdminColors';
import { View, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../../../src/store/store';
import { useEffect } from 'react';

export default function AdminTabsLayout() {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const { user } = useSelector((state: RootState) => state.auth);

  // Guard: employees and livreurs should never be in the admin TABS — redirect to their zone
  useEffect(() => {
    const role = user?.role?.toLowerCase();
    if (role === 'employe') {
      router.replace('/(employe)');
    } else if (role === 'livreur') {
      router.replace('/(livreur)');
    }
  }, [user]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: AdminColors.primary,
        tabBarInactiveTintColor: AdminColors.textMuted,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: 'rgba(0,0,0,0.06)',
          height: 72 + insets.bottom,
          paddingBottom: insets.bottom + 8,
          paddingTop: 12,
          flexDirection: isArabic ? 'row-reverse' : 'row',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.dashboard'),
          tabBarLabel: t('tabs.dashboard'),
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              {focused && <View style={styles.activeIndicator} />}
              <Ionicons name={focused ? "grid" : "grid-outline"} size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: t('tabs.orders'),
          tabBarLabel: t('tabs.orders'),
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              {focused && <View style={styles.activeIndicator} />}
              <Ionicons name={focused ? "clipboard" : "clipboard-outline"} size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: t('tabs.clients'),
          tabBarLabel: t('tabs.clients'),
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              {focused && <View style={styles.activeIndicator} />}
              <Ionicons name={focused ? "people" : "people-outline"} size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="catalog"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t('common.more'),
          tabBarLabel: t('common.more'),
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              {focused && <View style={styles.activeIndicator} />}
              <Ionicons name={focused ? "ellipsis-horizontal" : "ellipsis-horizontal-outline"} size={24} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
    width: 40,
  },
  activeIndicator: {
    position: 'absolute',
    top: -12,
    width: 20,
    height: 3,
    backgroundColor: AdminColors.primary,
    borderRadius: 999,
  },
});
