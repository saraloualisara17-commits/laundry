import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AdminColors, AdminShadows } from '../../constants/AdminColors';
import { row } from '../../src/utils/rtl';

interface RoleConfig {
  label: string;
  color: string;
  bg: string;
  border: string;
}

interface UserCardProps {
  item: any;
  roleConfig: Record<string, RoleConfig>;
  isArabic: boolean;
  t: (key: string, options?: any) => string;
  onEdit: (item: any) => void;
  onResetPassword: (id: number) => void;
  onToggleActive: (item: any) => void;
  onDelete: (item: any) => void;
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const UserCard = React.memo(function UserCard({
  item, roleConfig, isArabic, t,
  onEdit, onResetPassword, onToggleActive, onDelete,
}: UserCardProps) {
  const roleKey = item.role?.toLowerCase() || 'livreur';
  const role = roleConfig[roleKey] || roleConfig.livreur;
  const isUserActive = item.isActive !== undefined ? item.isActive : item.active;

  return (
    <View style={styles.card}>
      <View style={[styles.cardHeader, row(isArabic)]}>
        <View style={[styles.avatar, { backgroundColor: role.color }]}>
          <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={[styles.rowSpaced, row(isArabic)]}>
            <View style={[{ flex: 1 }, isArabic && { alignItems: 'flex-end', marginLeft: 0, marginRight: 12 }]}>
              <Text style={[styles.userName, isArabic && { textAlign: 'right' }]}>{item.name}</Text>
              <Text style={[styles.userEmail, isArabic && { textAlign: 'right' }]}>{item.email}</Text>
              <Text style={[styles.userEmail, { marginTop: 1 }, isArabic && { textAlign: 'right' }]}>
                {item.phone || item.phoneNumber || t('admin.users.no_phone')}
              </Text>
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
        <TouchableOpacity style={[styles.actionBtn, row(isArabic)]} onPress={() => onEdit(item)}>
          <Ionicons name="pencil" size={16} color={AdminColors.textSecondary} />
          <Text style={styles.actionBtnText}>{t('common.modifier')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, row(isArabic)]} onPress={() => onResetPassword(item.id)}>
          <Ionicons name="key-outline" size={16} color={AdminColors.primary} />
          <Text style={[styles.actionBtnText, { color: AdminColors.primary }]}>{t('admin.users.key')}</Text>
        </TouchableOpacity>

        {item.role?.toLowerCase() !== 'admin' && (
          <>
            <TouchableOpacity
              style={[styles.actionBtn, isUserActive ? styles.suspendBtn : styles.reactivateBtn, row(isArabic)]}
              onPress={() => onToggleActive(item)}
            >
              <Text style={[styles.actionBtnText, { color: isUserActive ? AdminColors.warning : AdminColors.success }]}>
                {isUserActive ? t('admin.users.actions.suspend') : t('admin.users.actions.activate')}
              </Text>
            </TouchableOpacity>
            {!isUserActive && (
              <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => onDelete(item)}>
                <Ionicons name="trash-outline" size={16} color={AdminColors.danger} />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
});

export default UserCard;

const styles = StyleSheet.create({
  card: { backgroundColor: 'white', borderRadius: 16, padding: 18, marginBottom: 12, ...AdminShadows.shadowSmall },
  cardHeader: { flexDirection: 'row', gap: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '700', color: 'white' },
  userName: { fontSize: 16, fontWeight: '700', color: AdminColors.textPrimary },
  userEmail: { fontSize: 12, color: AdminColors.textMuted, marginTop: 2, fontWeight: '500' },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
  roleBadgeText: { fontSize: 10, fontWeight: '700' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  activeBadge: { backgroundColor: AdminColors.successBg },
  inactiveBadge: { backgroundColor: AdminColors.dangerBg },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)', marginVertical: 14 },
  actionsRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, height: 40, borderRadius: 10, backgroundColor: AdminColors.surface2, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: AdminColors.textSecondary },
  suspendBtn: { backgroundColor: AdminColors.warningBg, borderColor: 'rgba(245,158,11,0.2)' },
  reactivateBtn: { backgroundColor: AdminColors.successBg, borderColor: 'rgba(16,185,129,0.2)' },
  deleteBtn: { flex: 0, width: 40, backgroundColor: AdminColors.dangerBg, borderColor: 'rgba(239,68,68,0.2)' },
  rowSpaced: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
});
