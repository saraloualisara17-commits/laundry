import { Tabs, Stack } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../../src/store/store';
import { useTranslation } from 'react-i18next';

const PRIMARY = '#0D7377';
const TEXT_MUTED = '#94A3B8';

export default function LivreurLayout() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { readyDeliveries, readyOrders } = useSelector((s: RootState) => s.livreur);
  const missionCount = (readyDeliveries?.length || 0) + (readyOrders?.length || 0);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: 'rgba(0,0,0,0.06)',
          height: 68 + insets.bottom,
          paddingBottom: insets.bottom + 10,
          paddingTop: 10,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 16,
        },
        tabBarActiveTintColor: PRIMARY,
        tabBarInactiveTintColor: TEXT_MUTED,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 3 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: t('tabs.home'),
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              {focused && <View style={styles.pill} />}
              <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="missions"
        options={{
          tabBarLabel: t('tabs.missions'),
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              {focused && <View style={styles.pill} />}
              <Ionicons name={focused ? 'clipboard' : 'clipboard-outline'} size={22} color={color} />
              {missionCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{missionCount > 99 ? '99+' : missionCount}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      {/* Clients hidden — livreur has no client access */}
      <Tabs.Screen name="clients" options={{ href: null }} />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: t('tabs.profile'),
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              {focused && <View style={styles.pill} />}
              <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen name="map-view" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      {/* Hidden screens — accessible via Stack push */}
      <Tabs.Screen name="create-order" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignItems: 'center', justifyContent: 'center', width: 36, height: 30 },
  pill: {
    position: 'absolute',
    top: -10,
    width: 18,
    height: 3,
    backgroundColor: PRIMARY,
    borderRadius: 999,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: 'white',
  },
  badgeText: { fontSize: 9, fontWeight: '800', color: 'white' },
});
