import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, Platform, Modal, TextInput, Alert,
  KeyboardAvoidingView, RefreshControl,
} from 'react-native';
import { row, textAlign } from '../../src/utils/rtl';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Colors, Shadows, Typography, Radius, StatusColors } from '../../constants/theme';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { useTranslation } from 'react-i18next';
import { useOrderCreation } from '../../src/context/OrderCreationContext';
import { useClient, useClientOrders, useSaveClient } from '../../src/hooks/query/useClients';

export default function ClientDetailsScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { clearOrder, setMode, setClient } = useOrderCreation();

  const clientId = id as string;
  const { data: selectedClient, isLoading: loadingClient, refetch: refetchClient } = useClient(clientId);
  const { data: clientCommandes = [], isLoading: loadingOrders, refetch: refetchOrders } = useClientOrders(clientId);
  const saveClient = useSaveClient();

  const loading = loadingClient && !selectedClient;
  const refreshing = !loading && (loadingClient || loadingOrders);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '', address: '' });

  useEffect(() => {
    if (selectedClient) {
      setEditForm({
        name: selectedClient.name || '',
        phone: getClientPhone(selectedClient),
        email: selectedClient.email || '',
        address: selectedClient.addresses?.[0]?.address || '',
      });
    }
  }, [selectedClient]);

  const onRefresh = () => {
    refetchClient();
    refetchOrders();
  };

  const client = selectedClient;

  const getClientPhone = (c: any) => {
    if (!c) return '';
    if (c.phone) return c.phone;
    if (c.telephone) return c.telephone;
    if (Array.isArray(c.phones) && c.phones.length > 0) return c.phones[0].phoneNumber || c.phones[0].phone || '';
    if (Array.isArray(c.telephones) && c.telephones.length > 0) return c.telephones[0].numero || c.telephones[0].phone || '';
    return '';
  };

  const getClientDisplayName = (c: any) => c?.name || c?.nom || `${t('tabs.clients')} #${id}`;

  const stats = useMemo(() => {
    if (!Array.isArray(clientCommandes)) return { total: 0, articles: 0 };
    const total = clientCommandes.reduce((acc, c) => acc + (c.montantTotal || 0), 0);
    const articles = clientCommandes.reduce((acc, c) => acc + (c.commandeTapis?.length || 0), 0);
    return { total, articles };
  }, [clientCommandes]);

  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) {
      Alert.alert(t('common.error'), t('admin.clients.full_name') + ' ' + t('admin.catalog.category_name_required'));
      return;
    }
    setEditLoading(true);
    try {
      await saveClient.mutateAsync({
        id: clientId,
        data: {
          name: editForm.name.trim(),
          phones: editForm.phone.trim() ? [{ phoneNumber: editForm.phone.trim() }] : [],
          email: editForm.email.trim() || null,
          addresses: editForm.address.trim() ? [{ address: editForm.address.trim() }] : [],
        },
      });
      setShowEditModal(false);
    } catch {
      Alert.alert(t('common.error'), t('common.error_msg'));
    } finally {
      setEditLoading(false);
    }
  };

  const handleNewOrder = (mode: 'immediate' | 'scheduled') => {
    clearOrder();
    setMode(mode);
    if (client) {
      setClient({
        id: client.id,
        name: client.name || client.nom || '',
        phone: getClientPhone(client),
        email: client.email || undefined,
        address: client.addresses?.[0]?.address || undefined,
        latitude: client.addresses?.[0]?.latitude ? parseFloat(client.addresses[0].latitude) : undefined,
        longitude: client.addresses?.[0]?.longitude ? parseFloat(client.addresses[0].longitude) : undefined,
      });
    }
    router.push({ pathname: '/(admin)/order-items', params: { mode } });
  };

  if (loading && !selectedClient) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading_data')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={[styles.headerRow, row(isArabic)]}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
            <Feather name={isArabic ? 'arrow-right' : 'arrow-left'} size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('admin.clients.details_title')}</Text>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setShowEditModal(true)}>
            <Feather name="edit-2" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{getClientDisplayName(client).charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.clientName}>{getClientDisplayName(client)}</Text>

          <View style={[styles.contactRow, row(isArabic)]}>
            {getClientPhone(client) ? (
              <View style={[styles.contactChip, row(isArabic)]}>
                <Feather name="phone" size={13} color={Colors.success} />
                <Text style={styles.contactChipText}>{getClientPhone(client)}</Text>
              </View>
            ) : null}
            {client?.email ? (
              <View style={[styles.contactChip, row(isArabic)]}>
                <Feather name="mail" size={13} color={Colors.primary} />
                <Text style={styles.contactChipText} numberOfLines={1}>{client.email}</Text>
              </View>
            ) : null}
          </View>

          {client?.addresses?.[0]?.address ? (
            <View style={[styles.addressRow, row(isArabic)]}>
              <Feather name="map-pin" size={13} color={Colors.textMuted} />
              <Text style={[styles.addressText, isArabic && { textAlign: 'right' }]} numberOfLines={2}>
                {client.addresses[0].address}
              </Text>
            </View>
          ) : null}

          {/* New order buttons */}
          <View style={[styles.orderBtnRow, row(isArabic)]}>
            <TouchableOpacity
              style={[styles.orderBtn, { backgroundColor: Colors.primary }]}
              onPress={() => handleNewOrder('immediate')}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle-outline" size={18} color="white" />
              <Text style={styles.orderBtnText}>{t('admin.orders.create.btn_now')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.orderBtn, { backgroundColor: Colors.primaryDark || '#0A5C60' }]}
              onPress={() => handleNewOrder('scheduled')}
              activeOpacity={0.85}
            >
              <Ionicons name="time-outline" size={18} color="white" />
              <Text style={styles.orderBtnText}>{t('admin.clients.schedule_pickup')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={[styles.statsRow, row(isArabic)]}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{Array.isArray(clientCommandes) ? clientCommandes.length : 0}</Text>
            <Text style={styles.statLbl}>{t('dashboard.orders_count')}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{stats.articles}</Text>
            <Text style={styles.statLbl}>{t('admin.catalog.products_count')}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: Colors.primary }]}>
            <Text style={[styles.statVal, { color: 'white' }]}>{stats.total.toFixed(0)}</Text>
            <Text style={[styles.statLbl, { color: 'rgba(255,255,255,0.8)' }]}>{t('common.total')} {t('common.dh')}</Text>
          </View>
        </View>

        {/* Orders list */}
        <View style={[styles.sectionRow, row(isArabic)]}>
          <Text style={styles.sectionTitle}>{t('dashboard.recent_orders')}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{Array.isArray(clientCommandes) ? clientCommandes.length : 0}</Text>
          </View>
        </View>

        {!Array.isArray(clientCommandes) || clientCommandes.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="package" size={44} color={Colors.textMuted} />
            <Text style={styles.emptyText}>{t('admin.orders.empty_title')}</Text>
          </View>
        ) : (
          clientCommandes.map((commande) => (
            <TouchableOpacity
              key={commande.id}
              style={styles.orderCard}
              onPress={() => router.push(`/order/${commande.id}`)}
              activeOpacity={0.75}
            >
              <View style={[styles.orderTop, row(isArabic)]}>
                <View>
                  <Text style={[styles.orderRef, isArabic && { textAlign: 'right' }]}>#{commande.numeroCommande}</Text>
                  <Text style={[styles.orderDate, isArabic && { textAlign: 'right' }]}>
                    {new Date(commande.dateCreation).toLocaleDateString(isArabic ? 'fr-FR' : 'fr-FR')}
                  </Text>
                </View>
                <StatusBadge status={commande.status} />
              </View>
              <View style={[styles.orderBottom, row(isArabic)]}>
                <View style={[styles.itemsChip, row(isArabic)]}>
                  <Feather name="shopping-bag" size={13} color={Colors.textSecondary} />
                  <Text style={styles.itemsChipText}>{commande.commandeTapis?.length || 0} {t('admin.catalog.products_count')}</Text>
                </View>
                <Text style={styles.orderTotal}>{commande.montantTotal} {t('common.dh')}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit modal */}
      <Modal visible={showEditModal} animationType="slide" transparent onRequestClose={() => setShowEditModal(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={styles.modalDismiss} activeOpacity={1} onPress={() => setShowEditModal(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, isArabic && { textAlign: 'right' }]}>{t('admin.clients.edit_client')}</Text>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.inputLabel, isArabic && { textAlign: 'right' }]}>{t('admin.clients.full_name')} *</Text>
              <TextInput
                style={[styles.input, isArabic && { textAlign: 'right' }]}
                value={editForm.name}
                onChangeText={(v) => setEditForm((f) => ({ ...f, name: v }))}
                placeholder={t('admin.clients.full_name')}
              />

              <Text style={[styles.inputLabel, isArabic && { textAlign: 'right' }]}>{t('admin.users.phone')}</Text>
              <TextInput
                style={[styles.input, isArabic && { textAlign: 'right' }]}
                value={editForm.phone}
                onChangeText={(v) => setEditForm((f) => ({ ...f, phone: v }))}
                keyboardType="phone-pad"
                placeholder="06XXXXXXXX"
              />

              <Text style={[styles.inputLabel, isArabic && { textAlign: 'right' }]}>{t('admin.users.email')}</Text>
              <TextInput
                style={[styles.input, isArabic && { textAlign: 'right' }]}
                value={editForm.email}
                onChangeText={(v) => setEditForm((f) => ({ ...f, email: v }))}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="email@example.com"
              />

              <Text style={[styles.inputLabel, isArabic && { textAlign: 'right' }]}>{t('admin.clients.address')}</Text>
              <TextInput
                style={[styles.input, styles.inputMulti, isArabic && { textAlign: 'right' }]}
                value={editForm.address}
                onChangeText={(v) => setEditForm((f) => ({ ...f, address: v }))}
                placeholder={t('admin.clients.address')}
                multiline
                numberOfLines={2}
              />

              <View style={[styles.modalActions, row(isArabic)]}>
                <TouchableOpacity style={[styles.cancelBtn, { flex: 1 }]} onPress={() => setShowEditModal(false)}>
                  <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, { flex: 2 }, editLoading && { opacity: 0.6 }]}
                  onPress={handleSaveEdit}
                  disabled={editLoading}
                >
                  {editLoading
                    ? <ActivityIndicator color="white" />
                    : <Text style={styles.saveBtnText}>{t('common.save')}</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 15, color: Colors.textSecondary },

  header: { backgroundColor: 'white', ...Shadows.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },

  scroll: { flex: 1 },
  scrollContent: { padding: 16 },

  profileCard: { backgroundColor: 'white', borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 16, ...Shadows.md },
  avatarCircle: { width: 76, height: 76, borderRadius: 38, backgroundColor: Colors.primary100, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 30, fontWeight: '800', color: Colors.primary },
  clientName: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginBottom: 10, textAlign: 'center' },
  contactRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 8 },
  contactChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.bg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  contactChipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 4, marginBottom: 14, paddingHorizontal: 8 },
  addressText: { fontSize: 13, color: Colors.textMuted, flex: 1 },

  orderBtnRow: { flexDirection: 'row', gap: 10, marginTop: 4, width: '100%' },
  orderBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 12 },
  orderBtnText: { color: 'white', fontSize: 12, fontWeight: '700' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: 'white', borderRadius: 16, padding: 14, alignItems: 'center', ...Shadows.sm },
  statVal: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginBottom: 2 },
  statLbl: { fontSize: 11, color: Colors.textMuted, fontWeight: '600', textAlign: 'center' },

  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  badge: { backgroundColor: Colors.primary100, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '700', color: Colors.primary },

  empty: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 15, color: Colors.textMuted, fontWeight: '500' },

  orderCard: { backgroundColor: 'white', borderRadius: 14, padding: 14, marginBottom: 10, ...Shadows.sm },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  orderRef: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  orderDate: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  orderBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  itemsChip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  itemsChipText: { fontSize: 13, color: Colors.textSecondary },
  orderTotal: { fontSize: 15, fontWeight: '700', color: Colors.primary },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,18,25,0.55)', justifyContent: 'flex-end' },
  modalDismiss: { flex: 1 },
  modalSheet: { backgroundColor: 'white', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, maxHeight: '90%' },
  modalHandle: { width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 10, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginBottom: 20 },

  inputLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6 },
  input: { backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.textPrimary, marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  inputMulti: { minHeight: 72, textAlignVertical: 'top' },

  modalActions: { flexDirection: 'row', gap: 12, marginTop: 4, marginBottom: 8 },
  cancelBtn: { height: 50, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  saveBtn: { height: 50, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: 'white' },
});
