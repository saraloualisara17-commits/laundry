import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { adminApi } from '../services/adminApi';

export interface UserForm {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: string;
}

const EMPTY_FORM: UserForm = { name: '', email: '', phone: '', password: '', role: 'livreur' };

export function useUsersHandlers(
  fetchUsers: () => void,
  t: (key: string, options?: any) => string,
) {
  const [userModal, setUserModal] = useState<{ open: boolean; data: any | null }>({ open: false, data: null });
  const [passModal, setPassModal] = useState<{ open: boolean; userId: number | null }>({ open: false, userId: null });
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [newPass, setNewPass] = useState('');

  const openCreate = useCallback(() => {
    setForm(EMPTY_FORM);
    setUserModal({ open: true, data: null });
  }, []);

  const openEdit = useCallback((item: any) => {
    const roleKey = item.role?.toLowerCase() || 'livreur';
    setForm({
      name: item.name,
      email: item.email,
      phone: item.phone || item.phoneNumber || '',
      password: '',
      role: roleKey,
    });
    setUserModal({ open: true, data: item });
  }, []);

  const closeUserModal = useCallback(() => {
    setUserModal({ open: false, data: null });
  }, []);

  const saveUser = useCallback(async () => {
    if (!form.name || !form.email || (!userModal.data && !form.password)) {
      return Alert.alert(t('common.error'), t('admin.users.required_fields'));
    }
    try {
      const payload = { ...form, phoneNumber: form.phone };
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
  }, [form, userModal, fetchUsers, t]);

  const openResetPassword = useCallback((id: number) => {
    setNewPass('');
    setPassModal({ open: true, userId: id });
  }, []);

  const closePassModal = useCallback(() => {
    setPassModal({ open: false, userId: null });
    setNewPass('');
  }, []);

  const resetPassword = useCallback(async () => {
    if (!newPass || newPass.length < 8) {
      return Alert.alert(t('common.error'), t('admin.users.password_min_length'));
    }
    if (!passModal.userId) return;
    try {
      await adminApi.resetPassword(passModal.userId, newPass);
      Alert.alert(t('common.success'), t('admin.users.password_updated'));
      setPassModal({ open: false, userId: null });
      setNewPass('');
    } catch {
      Alert.alert(t('common.error'), t('common.error_msg'));
    }
  }, [newPass, passModal.userId, t]);

  const handleToggleActive = useCallback(async (user: any) => {
    const isUserActive = user.isActive !== undefined ? user.isActive : user.active;
    try {
      if (isUserActive) {
        await adminApi.deactivateUser(user.id);
      } else {
        await adminApi.activateUser(user.id);
      }
      fetchUsers();
    } catch {
      Alert.alert(t('common.error'), t('common.error_msg'));
    }
  }, [fetchUsers, t]);

  const handleDeleteUser = useCallback((user: any) => {
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
              await adminApi.deleteUser(user.id);
              fetchUsers();
              Alert.alert(t('common.success'), t('admin.users.user_deleted'));
            } catch (error: any) {
              const msg = error.response?.data?.message || t('common.error_msg');
              Alert.alert(t('common.error'), msg);
            }
          },
        },
      ]
    );
  }, [fetchUsers, t]);

  return {
    userModal, form, setForm, openCreate, openEdit, closeUserModal, saveUser,
    passModal, newPass, setNewPass, openResetPassword, closePassModal, resetPassword,
    handleToggleActive, handleDeleteUser,
  };
}
