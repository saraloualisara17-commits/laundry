import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { logOut } from '../../src/store/authSlice';
import { RootState, AppDispatch } from '../../src/store/store';
import { Feather } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { api } from '../../src/api/axios';
import { Colors, Shadows, Typography, Radius } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

export default function LivreurProfile() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnexion',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.post('/auth/logout');
          } catch {
            // Ignore
          } finally {
            await SecureStore.deleteItemAsync('user');
            await SecureStore.deleteItemAsync('accessToken');
            await SecureStore.deleteItemAsync('refreshToken');
            dispatch(logOut());
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.avatarWrapper}>
        <LinearGradient 
          colors={[Colors.accent, '#E2C06E']} 
          start={{ x: 0, y: 0 }} 
          end={{ x: 1, y: 1 }} 
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || 'L'}</Text>
        </LinearGradient>
      </View>

      <Text style={styles.name}>{user?.name || 'Livreur'}</Text>
      <View style={styles.roleBadge}>
        <Feather name="truck" size={14} color={Colors.primary} />
        <Text style={styles.roleText}>Livreur</Text>
      </View>
      {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}

      <View style={styles.menuContainer}>
        <TouchableOpacity style={styles.menuItem}>
          <View style={[styles.menuIcon, { backgroundColor: Colors.primary100 }]}>
            <Feather name="user" size={18} color={Colors.primary} />
          </View>
          <Text style={styles.menuText}>Modifier mon profil</Text>
          <Feather name="chevron-right" size={18} color={Colors.borderMedium} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={[styles.menuIcon, { backgroundColor: Colors.infoBg }]}>
            <Feather name="shield" size={18} color={Colors.info} />
          </View>
          <Text style={styles.menuText}>Sécurité</Text>
          <Feather name="chevron-right" size={18} color={Colors.borderMedium} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={[styles.menuIcon, { backgroundColor: 'rgba(0,0,0,0.05)' }]}>
            <Feather name="help-circle" size={18} color={Colors.textSecondary} />
          </View>
          <Text style={styles.menuText}>Centre d'aide</Text>
          <Feather name="chevron-right" size={18} color={Colors.borderMedium} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
        <Feather name="log-out" size={20} color={Colors.danger} />
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.bg,
    paddingTop: Platform.OS === 'ios' ? 80 : 40,
    padding: 24,
  },
  avatarWrapper: {
    padding: 6,
    borderRadius: 60,
    backgroundColor: 'white',
    ...Shadows.sm,
    marginBottom: 20,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 40, fontWeight: 'bold', color: 'white' },
  name: { fontSize: Typography.size['2xl'], fontWeight: Typography.weight.bold, color: Colors.textPrimary, marginBottom: 8 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary100,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
    marginBottom: 8,
  },
  roleText: { fontSize: 13, fontWeight: Typography.weight.bold, color: Colors.primary },
  email: { fontSize: Typography.size.base, color: Colors.textMuted, marginTop: 4 },
  
  menuContainer: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 16,
    marginTop: 40,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surface2,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuText: {
    flex: 1,
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.medium,
    color: Colors.textPrimary,
  },
  
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.dangerBg,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.15)',
    paddingVertical: 14,
    borderRadius: Radius.md,
    width: '100%',
    marginTop: 24,
  },
  logoutText: { color: Colors.danger, fontSize: Typography.size.base, fontWeight: Typography.weight.bold },
});
