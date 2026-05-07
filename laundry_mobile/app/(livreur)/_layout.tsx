import { Tabs } from 'expo-router';
import { MaterialIcons, Feather, Ionicons } from '@expo/vector-icons';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Colors, Typography, Radius, Shadows } from '../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom || 12 }]}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        if (options.href === null) return null;

        const label = options.tabBarLabel !== undefined ? options.tabBarLabel : options.title !== undefined ? options.title : route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const renderIcon = (color: string) => {
          switch (route.name) {
            case 'index': return <MaterialIcons name="dashboard" size={24} color={color} />;
            case 'clients': return <Feather name="users" size={24} color={color} />;
            case 'map': return <Feather name="map" size={24} color={color} />;
            case 'deliveries': return <Feather name="truck" size={24} color={color} />;
            case 'profile': return <Feather name="user" size={24} color={color} />;
            default: return null;
          }
        };

        return (
          <TouchableOpacity
            key={index}
            onPress={onPress}
            style={styles.tabItem}
          >
            {isFocused && <View style={styles.activeIndicator} />}
            <View style={[styles.iconWrapper, isFocused && styles.activeIconWrapper]}>
              {renderIcon(isFocused ? Colors.primary : Colors.textMuted)}
              <Text style={[styles.tabLabel, { color: isFocused ? Colors.primary : Colors.textMuted }]}>
                {label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function LivreurLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.primary,
          height: Platform.OS === 'ios' ? 100 : 56,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontSize: 17,
          fontWeight: Typography.weight.semibold,
        },
        headerTitleAlign: 'left',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          headerTitle: 'Tableau de bord',
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: 'Clients',
          headerTitle: 'Mes Clients',
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Carte',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="deliveries"
        options={{
          title: 'Livraisons',
          headerTitle: 'À livrer',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          headerTitle: 'Mon Profil',
        }}
      />
      <Tabs.Screen name="create-order" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    height: 72,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    paddingTop: 10,
    ...Shadows.md,
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 1,
    shadowRadius: 20,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  activeIconWrapper: {
    backgroundColor: 'rgba(13,115,119,0.06)',
    borderRadius: 12,
  },
  activeIndicator: {
    position: 'absolute',
    top: -10,
    width: 20,
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: Typography.weight.semibold,
    letterSpacing: 0.3,
  },
});

