import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AdminColors, AdminShadows } from '../../../constants/AdminColors';
import { SkeletonCard } from '../../../components/admin/SkeletonCard';
import { EmptyState } from '../../../components/admin/EmptyState';
import UserCard from '../../../components/admin/UserCard';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useFormStyles } from '../../../src/hooks/useFormStyles';
import { row } from '../../../src/utils/rtl';
import AppInput from '../../../components/ui/AppInput';
import { adminApi } from '../../../src/services/adminApi';
import { useUsersHandlers } from '../../../src/hooks/useUsersHandlers';
import { logger } from '../../../src/lib/logger';

const log = logger.ns('users');

const keyById = (item: { id: any }) => String(item.id);

export default function UsersScreen() {
  const { t } = useTranslation();
  const f = useFormStyles();
  const isArabic = f.isArabic;

  const ROLE_CONFIG = useMemo<Record<string, { label: string; color: string; bg: string; border: string; description: string }>>(() => ({
    admin: {
      label: t('tabs.admin'),
      color: AdminColors.primary,
      bg: AdminColors.primary100,
      border: AdminColors.primary200,
      description: t('admin.users.roles.admin_desc'),
    },
    employe: {
      label: t('common.staff'),
      color: '#1D4ED8',
      bg: 'rgba(59,130,246,0.10)',
      border: 'rgba(59,130,246,0.20)',
      description: t('admin.users.roles.staff_desc'),
    },
    livreur: {
      label: t('tabs.livreur'),
      color: '#D97706',
      bg: 'rgba(245,158,11,0.10)',
      border: 'rgba(245,158,11,0.20)',
      description: t('admin.users.roles.driver_desc'),
    },
  }), [t]);

  const [activeRole, setActiveRole] = useState('Tous');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const [activeRes, inactiveRes] = await Promise.all([
        adminApi.getUsers(),
        adminApi.getInactiveUsers(),
      ]);
      setUsers([...(activeRes.data || []), ...(inactiveRes.data || [])]);
    } catch (error) {
      log.error('Fetch users error', { err: String(error) });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchUsers(); }, [fetchUsers]));

  const h = useUsersHandlers(fetchUsers, t);

  const filteredUsers = useMemo(() => users.filter(u => {
    const roleKey = u.role?.toLowerCase() || '';
    const activeRoleKey = activeRole === 'Employé' ? 'employe' : activeRole.toLowerCase();
    const matchesRole = activeRole === 'Tous' || roleKey === activeRoleKey;
    const matchesSearch = !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.includes(search) ||
      u.phoneNumber?.includes(search);
    return matchesRole && matchesSearch;
  }), [users, activeRole, search]);

  const renderUserCard = useCallback(({ item }: { item: any }) => (
    <UserCard
      item={item}
      roleConfig={ROLE_CONFIG}
      isArabic={isArabic}
      t={t}
      onEdit={h.openEdit}
      onResetPassword={h.openResetPassword}
      onToggleActive={h.handleToggleActive}
      onDelete={h.handleDeleteUser}
    />
  ), [ROLE_CONFIG, isArabic, t, h.openEdit, h.openResetPassword, h.handleToggleActive, h.handleDeleteUser]);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={[styles.headerContent, row(isArabic)]}>
          <View style={isArabic ? { alignItems: 'flex-end' } : {}}>
            <Text style={styles.headerTitle}>{t('admin.users.title')}</Text>
            <Text style={styles.headerSubtitle}>{users.length} {t('admin.users.total_count')}</Text>
          </View>
          <TouchableOpacity
            style={[styles.addBtn, isArabic && { marginLeft: 0, marginRight: 'auto' }]}
            onPress={h.openCreate}
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
        keyExtractor={keyById}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchUsers(); }}
            tintColor={AdminColors.primary}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={{ padding: 16 }}>{Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)}</View>
          ) : (
            <EmptyState icon="👥" title={t('admin.users.empty_title')} subtitle={search ? t('common.no_data') : t('admin.users.empty_subtitle')} />
          )
        }
      />

      {/* User create/edit modal */}
      <Modal visible={h.userModal.open} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={[styles.modalHeader, row(isArabic)]}>
            <Text style={styles.modalTitle}>{h.userModal.data ? t('common.modifier') : t('admin.users.new_user')}</Text>
            <TouchableOpacity onPress={h.closeUserModal}>
              <Ionicons name="close" size={24} color={AdminColors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <View style={styles.formField}>
              <AppInput label={t('admin.users.full_name')} value={h.form.name} onChangeText={v => h.setForm({ ...h.form, name: v })} />
            </View>
            <View style={styles.formField}>
              <AppInput label={t('admin.users.email')} keyboardType="email-address" autoCapitalize="none" value={h.form.email} onChangeText={v => h.setForm({ ...h.form, email: v })} forceDir="ltr" />
            </View>
            <View style={styles.formField}>
              <AppInput label={t('admin.users.phone')} keyboardType="phone-pad" value={h.form.phone} onChangeText={v => h.setForm({ ...h.form, phone: v })} forceDir="ltr" />
            </View>
            {!h.userModal.data && (
              <View style={styles.formField}>
                <AppInput label={t('admin.users.password')} isPassword value={h.form.password} onChangeText={v => h.setForm({ ...h.form, password: v })} forceDir="ltr" />
              </View>
            )}
            <View style={styles.formField}>
              <Text style={[styles.label, f.label]}>{t('admin.users.role')}</Text>
              <View style={styles.roleGrid}>
                {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.roleCard, h.form.role === key && { borderColor: cfg.color, backgroundColor: cfg.bg }]}
                    onPress={() => h.setForm({ ...h.form, role: key })}
                  >
                    <Text style={[styles.roleCardTitle, { color: cfg.color }, isArabic && { textAlign: 'right' }]}>{cfg.label}</Text>
                    <Text style={[styles.roleCardDesc, isArabic && { textAlign: 'right' }]}>{cfg.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={h.saveUser}>
              <Text style={styles.primaryBtnText}>{h.userModal.data ? t('common.save') : t('admin.users.create_account')}</Text>
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Password reset modal */}
      <Modal visible={h.passModal.open} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={[styles.dialogTitle, isArabic && { textAlign: 'right' }]}>{t('admin.users.reset_password')}</Text>
            <AppInput label={t('admin.users.new_password_placeholder')} isPassword value={h.newPass} onChangeText={h.setNewPass} forceDir="ltr" />
            <View style={[styles.dialogActions, row(isArabic)]}>
              <TouchableOpacity style={styles.dialogBtn} onPress={h.closePassModal}>
                <Text style={styles.dialogBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.dialogBtn, styles.dangerBtn]} onPress={h.resetPassword}>
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
  container: { flex: 1, backgroundColor: AdminColors.bg },
  headerSafe: { backgroundColor: 'white', ...AdminShadows.shadowSmall, zIndex: 10 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: AdminColors.textPrimary },
  headerSubtitle: { fontSize: 14, color: AdminColors.textMuted, fontWeight: '500', marginTop: 2 },
  addBtn: { backgroundColor: AdminColors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  addBtnText: { color: 'white', fontSize: 13, fontWeight: '600' },
  searchContainer: { marginHorizontal: 16, marginBottom: 14, backgroundColor: AdminColors.surface2, borderRadius: 14, height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  searchInput: { flex: 1, fontSize: 14, color: AdminColors.textPrimary, fontWeight: '500' },
  pillsContainer: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: 'white', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)', ...AdminShadows.shadowSmall },
  activePill: { backgroundColor: AdminColors.primary, borderColor: AdminColors.primary },
  pillText: { fontSize: 13, fontWeight: '600', color: AdminColors.textMuted },
  activePillText: { color: 'white' },
  listContent: { padding: 16 },
  modalContainer: { flex: 1, backgroundColor: 'white' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: AdminColors.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: AdminColors.textPrimary },
  modalBody: { padding: 20 },
  formField: { marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '700', color: AdminColors.textSecondary, marginBottom: 8 },
  roleGrid: { gap: 10 },
  roleCard: { backgroundColor: 'white', borderRadius: 12, padding: 14, borderWidth: 2, borderColor: 'rgba(0,0,0,0.05)' },
  roleCardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  roleCardDesc: { fontSize: 12, color: AdminColors.textMuted, fontWeight: '500' },
  primaryBtn: { backgroundColor: AdminColors.primary, borderRadius: 14, height: 54, alignItems: 'center', justifyContent: 'center', marginTop: 10, ...AdminShadows.shadowTeal },
  primaryBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  dialog: { backgroundColor: 'white', borderRadius: 20, padding: 24, gap: 16 },
  dialogTitle: { fontSize: 18, fontWeight: '700', color: AdminColors.textPrimary, textAlign: 'center' },
  dialogActions: { flexDirection: 'row', gap: 12 },
  dialogBtn: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: AdminColors.surface2 },
  dialogBtnText: { fontSize: 14, fontWeight: '700', color: AdminColors.textSecondary },
  dangerBtn: { backgroundColor: AdminColors.danger },
});
