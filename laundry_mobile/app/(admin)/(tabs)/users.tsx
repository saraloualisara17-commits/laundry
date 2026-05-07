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

const ROLE_CONFIG: Record<string, { label: string, color: string, bg: string, border: string, description: string }> = {
  admin: { 
    label: 'Administrateur', 
    color: AdminColors.primary, 
    bg: AdminColors.primary100, 
    border: AdminColors.primary200,
    description: 'Accès complet au système'
  },
  employe: { 
    label: 'Employé', 
    color: '#1D4ED8', 
    bg: AdminColors.infoBg, 
    border: '#BFDBFE',
    description: 'Traitement des articles'
  },
  livreur: { 
    label: 'Livreur', 
    color: '#92400E', 
    bg: AdminColors.accent100, 
    border: '#FDE68A',
    description: 'Livraisons et collectes'
  },
};

export default function UsersScreen() {
  const [activeRole, setActiveRole] = useState('Tous');
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
      const res = await adminApi.getUsers();
      setUsers(res.data);
    } catch (error) {
      console.error('Fetch users error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = activeRole === 'Tous' 
    ? users 
    : users.filter(u => u.role === activeRole.toLowerCase());

  const handleToggleActive = async (id: number) => {
    try {
      await adminApi.toggleUserActive(id);
      fetchUsers();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de changer le statut');
    }
  };

  const saveUser = async () => {
    try {
      if (!form.name || !form.email || (!userModal.data && !form.password)) {
        return Alert.alert('Erreur', 'Veuillez remplir les champs obligatoires');
      }
      
      if (userModal.data) {
        await adminApi.updateUser(userModal.data.id, form);
      } else {
        await adminApi.createUser(form);
      }
      
      setUserModal({ open: false, data: null });
      fetchUsers();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'enregistrer l\'utilisateur');
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
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const renderUserCard = ({ item }: { item: any }) => {
    const role = ROLE_CONFIG[item.role.toLowerCase()] || ROLE_CONFIG.livreur;

    return (
      <View style={styles.userCard}>
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: role.color }]}>
            <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
          </View>
          
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
            
            <View style={styles.badgeRow}>
              <View style={[styles.roleBadge, { backgroundColor: role.bg, borderColor: role.border }]}>
                <Text style={[styles.roleBadgeText, { color: role.color }]}>{role.label}</Text>
              </View>
              
              <View style={[styles.statusBadge, item.isActive ? styles.activeBadge : styles.inactiveBadge]}>
                <View style={[styles.statusDot, { backgroundColor: item.isActive ? AdminColors.success : AdminColors.danger }]} />
                <Text style={[styles.statusBadgeText, { color: item.isActive ? '#065F46' : AdminColors.danger }]}>
                  {item.isActive ? 'Actif' : 'Suspendu'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.actionsRow}>
          <TouchableOpacity 
            style={styles.actionBtn}
            onPress={() => {
              setForm({ name: item.name, email: item.email, phone: item.phone || '', password: '', role: item.role.toLowerCase() });
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
            <Text style={[styles.actionBtnText, { color: AdminColors.primary }]}>Réinit.</Text>
          </TouchableOpacity>

          {item.role.toLowerCase() !== 'admin' && (
            <TouchableOpacity 
              style={[styles.actionBtn, item.isActive ? styles.suspendBtn : styles.reactivateBtn]}
              onPress={() => handleToggleActive(item.id)}
            >
              <Text style={[styles.actionBtnText, { color: item.isActive ? AdminColors.warning : AdminColors.success }]}>
                {item.isActive ? 'Suspendre' : 'Réactiver'}
              </Text>
            </TouchableOpacity>
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
            <Text style={styles.headerSubtitle}>{users.length} membres</Text>
          </View>
          <TouchableOpacity 
            style={styles.addBtn}
            onPress={() => {
              setForm({ name: '', email: '', phone: '', password: '', role: 'livreur' });
              setUserModal({ open: true, data: null });
            }}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.addBtnText}>Ajouter</Text>
          </TouchableOpacity>
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
            <EmptyState icon="👥" title="Aucun membre" subtitle="Commencez par ajouter un membre à votre équipe" />
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
