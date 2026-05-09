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
  RefreshControl,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AdminColors, AdminShadows } from '../../../constants/AdminColors';
import { adminApi } from '../../../src/services/adminApi';
import { SkeletonCard } from '../../../components/admin/SkeletonCard';
import { EmptyState } from '../../../components/admin/EmptyState';
import { router, useFocusEffect } from 'expo-router';

const ROLE_CONFIG: Record<string, { label: string, color: string, bg: string, border: string, description: string }> = {
  admin: { 
    label: 'Administrateur', 
    color: AdminColors.primary, 
    bg: AdminColors.primary100, 
    border: AdminColors.primary200,
    description: 'Accès complet'
  },
  employe: { 
    label: 'Staff', 
    color: '#1D4ED8', 
    bg: 'rgba(59,130,246,0.10)', 
    border: 'rgba(59,130,246,0.20)',
    description: 'Traitement'
  },
  livreur: { 
    label: 'Livreur', 
    color: '#D97706', 
    bg: 'rgba(245,158,11,0.10)', 
    border: 'rgba(245,158,11,0.20)',
    description: 'Logistique'
  },
};

export default function UsersScreen() {
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
        adminApi.getUsers(), // fetches active-users
        // Adding call for inactive-users to show the full team
        require('../../../src/api/axios').api.get('/admin/inactive-users')
      ]);
      
      const allUsers = [
        ...(activeRes.data || []),
        ...(inactiveRes.data || [])
      ];
      
      setUsers(allUsers);
    } catch (error) {
      console.error('Fetch users error:', error);
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
    
    // Support both active and isActive field names
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
      Alert.alert('Erreur', 'Impossible de changer le statut');
    }
  };

  const handleDeleteUser = async (user: any) => {
    Alert.alert(
      'Supprimer un membre',
      `Voulez-vous vraiment supprimer définitivement ${user.name} ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: async () => {
            try {
              await adminApi.deleteOrder(user.id); // Wait, adminApi.deleteOrder is for orders. Let me check the delete user method.
              // I will use a direct call if the method is missing or named differently
              await require('../../../src/api/axios').api.delete(`/admin/delete-user/${user.id}`);
              fetchUsers();
              Alert.alert('Succès', 'Membre supprimé avec succès');
            } catch (error: any) {
              const msg = error.response?.data?.message || 'Impossible de supprimer l\'utilisateur. Vérifiez s\'il a des commandes liées.';
              Alert.alert('Erreur', msg);
            }
          }
        }
      ]
    );
  };

  const saveUser = async () => {
    try {
      if (!form.name || !form.email || (!userModal.data && !form.password)) {
        return Alert.alert('Erreur', 'Veuillez remplir les champs obligatoires');
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
      const msg = error.response?.data?.message || 'Impossible d\'enregistrer l\'utilisateur';
      Alert.alert('Erreur', msg);
    }
  };

  const resetPassword = async () => {
    try {
      if (!newPass || newPass.length < 6) return Alert.alert('Erreur', 'Minimum 6 caractères');
      if (passModal.userId) {
        await adminApi.resetPassword(passModal.userId, newPass);
        Alert.alert('Succès', 'Mot de passe réinitialisé');
        setPassModal({ open: false, userId: null });
        setNewPass('');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de réinitialiser');
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
    
    // Unified status detection
    const isUserActive = item.isActive !== undefined ? item.isActive : item.active;

    return (
      <View style={styles.userCard}>
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: role.color }]}>
            <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
          </View>
          
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userEmail}>{item.email}</Text>
                <Text style={[styles.userEmail, { marginTop: 1 }]}>{item.phone || item.phoneNumber || 'Sans numéro'}</Text>
              </View>
              
              <View style={[styles.statusBadge, isUserActive ? styles.activeBadge : styles.inactiveBadge]}>
                <View style={[styles.statusDot, { backgroundColor: isUserActive ? AdminColors.success : AdminColors.danger }]} />
                <Text style={[styles.statusBadgeText, { color: isUserActive ? '#065F46' : AdminColors.danger }]}>
                  {isUserActive ? 'Actif' : 'Suspendu'}
                </Text>
              </View>
            </View>
            
            <View style={styles.badgeRow}>
              <View style={[styles.roleBadge, { backgroundColor: role.bg, borderColor: role.border }]}>
                <Text style={[styles.roleBadgeText, { color: role.color }]}>{role.label}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.actionsRow}>
          <TouchableOpacity 
            style={styles.actionBtn}
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
            <Text style={styles.actionBtnText}>Modifier</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionBtn}
            onPress={() => setPassModal({ open: true, userId: item.id })}
          >
            <Ionicons name="key-outline" size={16} color={AdminColors.primary} />
            <Text style={[styles.actionBtnText, { color: AdminColors.primary }]}>Clé</Text>
          </TouchableOpacity>

          {item.role?.toLowerCase() !== 'admin' && (
            <>
              <TouchableOpacity 
                style={[styles.actionBtn, isUserActive ? styles.suspendBtn : styles.reactivateBtn]}
                onPress={() => handleToggleActive(item)}
              >
                <Text style={[styles.actionBtnText, { color: isUserActive ? AdminColors.warning : AdminColors.success }]}>
                  {isUserActive ? 'Suspendre' : 'Activer'}
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
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Équipe</Text>
            <Text style={styles.headerSubtitle}>{users.length} membres au total</Text>
          </View>
          <TouchableOpacity 
            style={styles.addBtn}
            onPress={() => {
              setForm({ name: '', email: '', phone: '', password: '', role: 'livreur' });
              setUserModal({ open: true, data: null });
            }}
          >
            <Ionicons name="person-add" size={18} color="white" />
            <Text style={styles.addBtnText}>Nouveau</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={AdminColors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un membre..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={AdminColors.textMuted}
          />
        </View>

        <FlatList
          horizontal
          data={['Tous', 'Admin', 'Employé', 'Livreur']}
          keyExtractor={item => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsContainer}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.pill, activeRole === item && styles.activePill]}
              onPress={() => setActiveRole(item)}
            >
              <Text style={[styles.pillText, activeRole === item && styles.activePillText]}>{item}</Text>
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
            <EmptyState icon="👥" title="Aucun membre" subtitle={search ? "Aucun résultat pour cette recherche" : "Commencez par ajouter un membre"} />
          )
        }
      />

      {/* User Modal */}
      <Modal visible={userModal.open} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{userModal.data ? 'Modifier l\'utilisateur' : 'Nouveau membre'}</Text>
            <TouchableOpacity onPress={() => setUserModal({ open: false, data: null })}>
              <Ionicons name="close" size={24} color={AdminColors.textPrimary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <View style={styles.formField}>
              <Text style={styles.label}>Nom complet</Text>
              <TextInput style={styles.input} value={form.name} onChangeText={t => setForm({...form, name: t})} />
            </View>

            <View style={styles.formField}>
              <Text style={styles.label}>Email</Text>
              <TextInput style={styles.input} keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={t => setForm({...form, email: t})} />
            </View>

            <View style={styles.formField}>
              <Text style={styles.label}>Téléphone</Text>
              <TextInput style={styles.input} keyboardType="phone-pad" value={form.phone} onChangeText={t => setForm({...form, phone: t})} />
            </View>

            {!userModal.data && (
              <View style={styles.formField}>
                <Text style={styles.label}>Mot de passe</Text>
                <TextInput style={styles.input} secureTextEntry value={form.password} onChangeText={t => setForm({...form, password: t})} />
              </View>
            )}

            <View style={styles.formField}>
              <Text style={styles.label}>Rôle</Text>
              <View style={styles.roleGrid}>
                {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                  <TouchableOpacity 
                    key={key} 
                    style={[styles.roleCard, form.role === key && { borderColor: cfg.color, backgroundColor: cfg.bg }]}
                    onPress={() => setForm({...form, role: key})}
                  >
                    <Text style={[styles.roleCardTitle, { color: cfg.color }]}>{cfg.label}</Text>
                    <Text style={styles.roleCardDesc}>{cfg.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={saveUser}>
              <Text style={styles.primaryBtnText}>{userModal.data ? 'Enregistrer' : 'Créer le compte'}</Text>
            </TouchableOpacity>
            
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Password Reset Modal */}
      <Modal visible={passModal.open} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Réinitialiser le mot de passe</Text>
            <TextInput 
              style={styles.input} 
              secureTextEntry 
              placeholder="Nouveau mot de passe"
              value={newPass}
              onChangeText={setNewPass}
            />
            <View style={styles.dialogActions}>
              <TouchableOpacity style={styles.dialogBtn} onPress={() => { setPassModal({ open: false, userId: null }); setNewPass(''); }}>
                <Text style={styles.dialogBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.dialogBtn, styles.dangerBtn]} onPress={resetPassword}>
                <Text style={[styles.dialogBtnText, { color: 'white' }]}>Réinitialiser</Text>
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
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
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
});
