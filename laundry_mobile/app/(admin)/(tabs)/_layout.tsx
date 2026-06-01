import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AdminColors } from '../../../constants/AdminColors';
import { View, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../../../src/store/store';
import { useEffect } from 'react';
import { useRTL, row } from '../../../src/utils/rtl';
import { useUnreadCount } from '../../../src/hooks/query/useNotifications';

export default function AdminTabsLayout() {
  const insets = useSafeAreaInsets();
  const { t, isRTL: isArabic } = useRTL();
  const { user } = useSelector((state: RootState) => state.auth);
  const { data: unreadCount = 0 } = useUnreadCount();

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
          ...row(isArabic),
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
        name="audit"
        options={{
          href: null,
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
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
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
  badge: {
    position: 'absolute',
    top: -2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: AdminColors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: 'white',
  },
});
