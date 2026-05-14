import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { AdminColors } from '../../../constants/AdminColors';

export default function EmployeTabsLayout() {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

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
          height: 68 + (Platform.OS === 'ios' ? insets.bottom : 10),
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 10,
          paddingTop: 10,
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
            <View style={styles.iconWrap}>
              {focused && <View style={styles.dot} />}
              <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
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
            <View style={styles.iconWrap}>
              {focused && <View style={styles.dot} />}
              <Ionicons name={focused ? 'clipboard' : 'clipboard-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="unpaid"
        options={{
          tabBarLabel: t('dashboard.unpaid_balance', { defaultValue: 'Impayés' }),
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              {focused && <View style={styles.dot} />}
              <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 30,
    width: 36,
  },
  dot: {
    position: 'absolute',
    top: -10,
    width: 18,
    height: 3,
    backgroundColor: AdminColors.primary,
    borderRadius: 999,
  },
});
