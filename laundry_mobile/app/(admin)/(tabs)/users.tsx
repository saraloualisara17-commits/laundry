import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { row, textAlign } from '../../../src/utils/rtl';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AdminColors, AdminShadows } from '../../../constants/AdminColors';
import { adminApi } from '../../../src/services/adminApi';
import client from '../../../src/services/api/client';
import { SkeletonCard } from '../../../components/admin/SkeletonCard';
import { EmptyState } from '../../../components/admin/EmptyState';
import { router, useFocusEffect } from 'expo-router';

import { useTranslation } from 'react-i18next';
import { useFormStyles } from '../../../src/hooks/useFormStyles';
import AppInput from '../../../components/ui/AppInput';
import { logger } from '../../../src/lib/logger';

const log = logger.ns('users');

export default function UsersScreen() {
  const { t } = useTranslation();
  const f = useFormStyles();
  const isArabic = f.isArabic;

  const ROLE_CONFIG: Record<string, { label: string, color: string, bg: string, border: string, description: string }> = {
    admin: { 
      label: t('tabs.admin'), 
      color: AdminColors.primary, 
      bg: AdminColors.primary100, 
      border: AdminColors.primary200,
      description: t('admin.users.roles.admin_desc')
    },
    employe: { 
      label: t('common.staff'), 
      color: '#1D4ED8', 
      bg: 'rgba(59,130,246,0.10)', 
      border: 'rgba(59,130,246,0.20)',
      description: t('admin.users.roles.staff_desc')
    },
    livreur: { 
      label: t('tabs.livreur'), 
      color: '#D97706', 
      bg: 'rgba(245,158,11,0.10)', 
      border: 'rgba(245,158,11,0.20)',
      description: t('admin.users.roles.driver_desc')
    },
  };

  const [activeRole, setActiveRole] = useState('Tous');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [userModal, setUserModal] = useState({ open: false, data: null as any });
  const [passModal, setPassModal] = useState({ open: false, userId: null as number | null });
  
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'livreur' });
  const [newPass, setNewPass] = useState('');

  const fetchUsers = async () => {
    try {
      const [activeRes, inactiveRes] = await Promise.all([
        adminApi.getUsers(),
        client.get('/api/admin/inactive-users')
      ]);
      
      const allUsers = [
        ...(activeRes.data || []),
        ...(inactiveRes.data || [])
      ];
      
      setUsers(allUsers);
    } catch (error) {
      log.error('Fetch users error', { err: String(error) });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUsers();
    }, [])
  );

  const filteredUsers = users.filter(u => {
    const roleKey = u.role?.toLowerCase() || '';
    const activeRoleKey = activeRole === 'Employé' ? 'employe' : activeRole.toLowerCase();
    const matchesRole = activeRole === 'Tous' || roleKey === activeRoleKey;
    
    const isUserActive = u.isActive !== undefined ? u.isActive : u.active;
    
    const matchesSearch = !search || 
      u.name?.toLowerCase().includes(search.toLowerCase()) || 
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.includes(search) ||
      u.phoneNumber?.includes(search);
    return matchesRole && matchesSearch;
  });

  const handleToggleActive = async (user: any) => {
    const isUserActive = user.isActive !== undefined ? user.isActive : user.active;
    try {
      if (isUserActive) {
        await adminApi.deactivateUser(user.id);
      } else {
        await adminApi.activateUser(user.id);
      }
      fetchUsers();
    } catch (error) {
      Alert.alert(t('common.error'), t('common.error_msg'));
    }
  };

  const handleDeleteUser = async (user: any) => {
    Alert.alert(
      t('common.supprimer'),
      `${t('common.supprimer')} ${user.name} ?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('common.supprimer'), 
          style: 'destructive',
          onPress: async () => {
            try {
              await client.delete(`/admin/delete-user/${user.id}`);
              fetchUsers();
              Alert.alert(t('common.success'), t('admin.users.user_deleted'));
            } catch (error: any) {
              const msg = error.response?.data?.message || t('common.error_msg');
              Alert.alert(t('common.error'), msg);
            }
          }
        }
      ]
    );
  };

  const saveUser = async () => {
    try {
      if (!form.name || !form.email || (!userModal.data && !form.password)) {
        return Alert.alert(t('common.error'), t('admin.users.required_fields'));
      }
      
      const payload = {
        ...form,
        phoneNumber: form.phone
      };

      if (userModal.data) {
        await adminApi.updateUser(userModal.data.id, payload);
      } else {
        await adminApi.createUser(payload);
      }
      
      setUserModal({ open: false, data: null });
      fetchUsers();
    } catch (error: any) {
      const msg = error.response?.data?.message || t('common.error_msg');
      Alert.alert(t('common.error'), msg);
    }
  };

  const resetPassword = async () => {
    try {
      if (!newPass || newPass.length < 8) return Alert.alert(t('common.error'), t('admin.users.password_min_length'));
      if (passModal.userId) {
        await adminApi.resetPassword(passModal.userId, newPass);
        Alert.alert(t('common.success'), t('admin.users.password_updated'));
        setPassModal({ open: false, userId: null });
        setNewPass('');
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('common.error_msg'));
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const renderUserCard = ({ item }: { item: any }) => {
    const roleKey = item.role?.toLowerCase() || 'livreur';
    const role = ROLE_CONFIG[roleKey] || ROLE_CONFIG.livreur;
    
    const isUserActive = item.isActive !== undefined ? item.isActive : item.active;

    return (
      <View style={styles.userCard}>
        <View style={[styles.cardHeader, row(isArabic)]}>
          <View style={[styles.avatar, { backgroundColor: role.color }]}>
            <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
          </View>
          
          <View style={{ flex: 1 }}>
            <View style={[styles.rowSpaced, row(isArabic)]}>
              <View style={[{ flex: 1 }, isArabic && { alignItems: 'flex-end', marginLeft: 0, marginRight: 12 }]}>
                <Text style={[styles.userName, isArabic && { textAlign: 'right' }]}>{item.name}</Text>
                <Text style={[styles.userEmail, isArabic && { textAlign: 'right' }]}>{item.email}</Text>
                <Text style={[styles.userEmail, { marginTop: 1 }, isArabic && { textAlign: 'right' }]}>{item.phone || item.phoneNumber || t('admin.users.no_phone')}</Text>
              </View>
              
              <View style={[styles.statusBadge, isUserActive ? styles.activeBadge : styles.inactiveBadge, row(isArabic)]}>
                <View style={[styles.statusDot, { backgroundColor: isUserActive ? AdminColors.success : AdminColors.danger }]} />
                <Text style={[styles.statusBadgeText, { color: isUserActive ? '#065F46' : AdminColors.danger }]}>
                  {isUserActive ? t('admin.users.status.active') : t('admin.users.status.suspended')}
                </Text>
              </View>
            </View>
            
            <View style={[styles.badgeRow, isArabic && { flexDirection: 'row-reverse', marginRight: 12 }]}>
              <View style={[styles.roleBadge, { backgroundColor: role.bg, borderColor: role.border }]}>
                <Text style={[styles.roleBadgeText, { color: role.color }]}>{role.label}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={[styles.actionsRow, row(isArabic)]}>
          <TouchableOpacity 
            style={[styles.actionBtn, row(isArabic)]}
            onPress={() => {
              setForm({ 
                name: item.name, 
                email: item.email, 
                phone: item.phone || item.phoneNumber || '', 
                password: '', 
                role: roleKey 
              });
              setUserModal({ open: true, data: item });
            }}
          >
            <Ionicons name="pencil" size={16} color={AdminColors.textSecondary} />
            <Text style={styles.actionBtnText}>{t('common.modifier')}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBtn, row(isArabic)]}
            onPress={() => setPassModal({ open: true, userId: item.id })}
          >
            <Ionicons name="key-outline" size={16} color={AdminColors.primary} />
            <Text style={[styles.actionBtnText, { color: AdminColors.primary }]}>{t('admin.users.key')}</Text>
          </TouchableOpacity>

          {item.role?.toLowerCase() !== 'admin' && (
            <>
              <TouchableOpacity 
                style={[styles.actionBtn, isUserActive ? styles.suspendBtn : styles.reactivateBtn, row(isArabic)]}
                onPress={() => handleToggleActive(item)}
              >
                <Text style={[styles.actionBtnText, { color: isUserActive ? AdminColors.warning : AdminColors.success }]}>
                  {isUserActive ? t('admin.users.actions.suspend') : t('admin.users.actions.activate')}
                </Text>
              </TouchableOpacity>

              {!isUserActive && (
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.deleteBtn]}
                  onPress={() => handleDeleteUser(item)}
                >
                  <Ionicons name="trash-outline" size={16} color={AdminColors.danger} />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={[styles.headerContent, row(isArabic)]}>
          <View style={isArabic && { alignItems: 'flex-end' }}>
            <Text style={styles.headerTitle}>{t('admin.users.title')}</Text>
            <Text style={styles.headerSubtitle}>{users.length} {t('admin.users.total_count')}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.addBtn, isArabic && { marginLeft: 0, marginRight: 'auto' }]}
            onPress={() => {
              setForm({ name: '', email: '', phone: '', password: '', role: 'livreur' });
              setUserModal({ open: true, data: null });
            }}
          >
            <Ionicons name="person-add" size={18} color="white" />
            <Text style={styles.addBtnText}>{t('admin.users.new_user')}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.searchContainer, row(isArabic)]}>
          <Ionicons name="search" size={18} color={AdminColors.textMuted} />
          <TextInput
            style={[styles.searchInput, isArabic && { textAlign: 'right' }]}
            placeholder={t('admin.users.search_placeholder')}
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={AdminColors.textMuted}
          />
        </View>

        <FlatList
          horizontal
          inverted={isArabic}
          data={['Tous', 'Admin', 'Employé', 'Livreur']}
          keyExtractor={item => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsContainer}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.pill, activeRole === item && styles.activePill]}
              onPress={() => setActiveRole(item)}
            >
              <Text style={[styles.pillText, activeRole === item && styles.activePillText]}>
                {item === 'Tous' ? t('common.all') : (item === 'Employé' ? t('common.staff') : item)}
              </Text>
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>

      <FlatList
        data={filteredUsers}
        renderItem={renderUserCard}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchUsers(); }} tintColor={AdminColors.primary} />}
        ListEmptyComponent={
          loading ? (
            <View style={{ padding: 16 }}>{Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)}</View>
          ) : (
            <EmptyState icon="👥" title={t('admin.users.empty_title')} subtitle={search ? t('common.no_data') : t('admin.users.empty_subtitle')} />
          )
        }
      />

      {/* User Modal */}
      <Modal visible={userModal.open} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={[styles.modalHeader, row(isArabic)]}>
            <Text style={styles.modalTitle}>{userModal.data ? t('common.modifier') : t('admin.users.new_user')}</Text>
            <TouchableOpacity onPress={() => setUserModal({ open: false, data: null })}>
              <Ionicons name="close" size={24} color={AdminColors.textPrimary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <View style={styles.formField}>
              <AppInput
                label={t('admin.users.full_name')}
                value={form.name}
                onChangeText={v => setForm({...form, name: v})}
              />
            </View>

            <View style={styles.formField}>
              <AppInput
                label={t('admin.users.email')}
                keyboardType="email-address"
                autoCapitalize="none"
                value={form.email}
                onChangeText={v => setForm({...form, email: v})}
                forceDir="ltr"
              />
            </View>

            <View style={styles.formField}>
              <AppInput
                label={t('admin.users.phone')}
                keyboardType="phone-pad"
                value={form.phone}
                onChangeText={v => setForm({...form, phone: v})}
                forceDir="ltr"
              />
            </View>

            {!userModal.data && (
              <View style={styles.formField}>
                <AppInput
                  label={t('admin.users.password')}
                  isPassword
                  value={form.password}
                  onChangeText={v => setForm({...form, password: v})}
                  forceDir="ltr"
                />
              </View>
            )}

            <View style={styles.formField}>
              <Text style={[styles.label, f.label]}>{t('admin.users.role')}</Text>
              <View style={styles.roleGrid}>
                {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                  <TouchableOpacity 
                    key={key} 
                    style={[styles.roleCard, form.role === key && { borderColor: cfg.color, backgroundColor: cfg.bg }]}
                    onPress={() => setForm({...form, role: key})}
                  >
                    <Text style={[styles.roleCardTitle, { color: cfg.color }, isArabic && { textAlign: 'right' }]}>{cfg.label}</Text>
                    <Text style={[styles.roleCardDesc, isArabic && { textAlign: 'right' }]}>{cfg.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={saveUser}>
              <Text style={styles.primaryBtnText}>{userModal.data ? t('common.save') : t('admin.users.create_account')}</Text>
            </TouchableOpacity>
            
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Password Reset Modal */}
      <Modal visible={passModal.open} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={[styles.dialogTitle, isArabic && { textAlign: 'right' }]}>{t('admin.users.reset_password')}</Text>
            <AppInput
              label={t('admin.users.new_password_placeholder')}
              isPassword
              value={newPass}
              onChangeText={setNewPass}
              forceDir="ltr"
            />
            <View style={[styles.dialogActions, row(isArabic)]}>
              <TouchableOpacity style={styles.dialogBtn} onPress={() => { setPassModal({ open: false, userId: null }); setNewPass(''); }}>
                <Text style={styles.dialogBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.dialogBtn, styles.dangerBtn]} onPress={resetPassword}>
                <Text style={[styles.dialogBtnText, { color: 'white' }]}>{t('admin.users.reset_btn')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AdminColors.bg,
  },
  headerSafe: {
    backgroundColor: 'white',
    ...AdminShadows.shadowSmall,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: AdminColors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: AdminColors.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },
  addBtn: {
    backgroundColor: AdminColors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addBtnText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  searchContainer: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: AdminColors.surface2,
    borderRadius: 14,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: AdminColors.textPrimary,
    fontWeight: '500',
  },
  pillsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    ...AdminShadows.shadowSmall,
  },
  activePill: {
    backgroundColor: AdminColors.primary,
    borderColor: AdminColors.primary,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: AdminColors.textMuted,
  },
  activePillText: {
    color: 'white',
  },
  listContent: {
    padding: 16,
  },
  userCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    ...AdminShadows.shadowSmall,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: AdminColors.textPrimary,
  },
  userEmail: {
    fontSize: 12,
    color: AdminColors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  activeBadge: {
    backgroundColor: AdminColors.successBg,
  },
  inactiveBadge: {
    backgroundColor: AdminColors.dangerBg,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: AdminColors.surface2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: AdminColors.textSecondary,
  },
  suspendBtn: {
    backgroundColor: AdminColors.warningBg,
    borderColor: 'rgba(245,158,11,0.2)',
  },
  reactivateBtn: {
    backgroundColor: AdminColors.successBg,
    borderColor: 'rgba(16,185,129,0.2)',
  },
  deleteBtn: {
    flex: 0,
    width: 40,
    backgroundColor: AdminColors.dangerBg,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AdminColors.textPrimary,
  },
  modalBody: {
    padding: 20,
  },
  formField: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: AdminColors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: AdminColors.surface2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: AdminColors.textPrimary,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  roleGrid: {
    gap: 10,
  },
  roleCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  roleCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  roleCardDesc: {
    fontSize: 12,
    color: AdminColors.textMuted,
    fontWeight: '500',
  },
  primaryBtn: {
    backgroundColor: AdminColors.primary,
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    ...AdminShadows.shadowTeal,
  },
  primaryBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  dialog: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    gap: 16,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AdminColors.textPrimary,
    textAlign: 'center',
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 12,
  },
  dialogBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AdminColors.surface2,
  },
  dialogBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: AdminColors.textSecondary,
  },
  dangerBtn: {
    backgroundColor: AdminColors.danger,
  },
  rowSpaced: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
});
