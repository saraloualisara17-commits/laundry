import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { fetchClientCommandes, fetchClientById } from '../../src/store/adminThunks';
import { clearSelectedClient } from '../../src/store/adminSlice';
import { RootState, AppDispatch } from '../../src/store/store';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { Colors, Shadows, Typography, Radius, StatusColors } from '../../constants/theme';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { useTranslation } from 'react-i18next';

export default function ClientDetailsScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { clientCommandes, selectedClient, loading, error } = useSelector((state: RootState) => state.admin);

  useEffect(() => {
    if (id) {
      dispatch(fetchClientCommandes(id as string));
      dispatch(fetchClientById(id as string));
    }
    return () => {
      dispatch(clearSelectedClient());
    };
  }, [id, dispatch]);

  const client = selectedClient;

  const getClientPhone = (c: any) => {
    if (!c) return '—';
    if (c.phone) return c.phone;
    if (c.telephone) return c.telephone;
    if (Array.isArray(c.phones) && c.phones.length > 0) return c.phones[0].phoneNumber || c.phones[0].phone || '—';
    if (Array.isArray(c.telephones) && c.telephones.length > 0) return c.telephones[0].numero || c.telephones[0].phone || '—';
    return '—';
  };

  const getClientDisplayName = (c: any) => c?.name || c?.nom || `${t('tabs.clients')} #${id}`;

  const stats = useMemo(() => {
    if (!Array.isArray(clientCommandes)) return { total: 0, articles: 0 };
    const total = clientCommandes.reduce((acc, c) => acc + (c.montantTotal || 0), 0);
    const articles = clientCommandes.reduce((acc, c) => acc + (c.commandeTapis?.length || 0), 0);
    return { total, articles };
  }, [clientCommandes]);

  if (loading && !selectedClient) {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading_data')}</Text>
      </View>
    );
  }

  if (error && !selectedClient) {
    return (
      <View style={styles.centerContent}>
        <Feather name="alert-triangle" size={48} color={Colors.danger} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>{t('common.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.headerBar, isArabic && { flexDirection: 'row-reverse' }]}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => router.back()}>
          <Feather name={isArabic ? "arrow-right" : "arrow-left"} size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('admin.clients.details_title', { defaultValue: 'Fiche Client' })}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarTextLarge}>{getClientDisplayName(client).charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.clientName}>{getClientDisplayName(client)}</Text>
          
          <View style={[styles.contactInfoRow, isArabic && { flexDirection: 'row-reverse' }]}>
            <View style={[styles.contactItem, isArabic && { flexDirection: 'row-reverse' }]}>
              <Feather name="phone" size={14} color={Colors.success} />
              <Text style={styles.contactText}>{getClientPhone(client)}</Text>
            </View>
            <View style={styles.contactDivider} />
            <View style={[styles.contactItem, isArabic && { flexDirection: 'row-reverse' }]}>
              <Feather name="mail" size={14} color={Colors.primary} />
              <Text style={styles.contactText} numberOfLines={1}>{client?.email || t('admin.clients.no_email', { defaultValue: 'Pas d\'email' })}</Text>
            </View>
          </View>
        </View>

        {/* Stats Summary */}
        <View style={[styles.statsGrid, isArabic && { flexDirection: 'row-reverse' }]}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{Array.isArray(clientCommandes) ? clientCommandes.length : 0}</Text>
            <Text style={styles.statLabel}>{t('dashboard.orders')}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.articles}</Text>
            <Text style={styles.statLabel}>{t('admin.catalog.products_count', { defaultValue: 'Articles' })}</Text>
          </View>
          <View style={[styles.statBox, styles.statBoxPrimary]}>
            <Text style={[styles.statValue, { color: 'white' }]}>{stats.total} {t('common.dh')}</Text>
            <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.8)' }]}>{t('common.total')}</Text>
          </View>
        </View>

        {/* Orders List */}
        <View style={[styles.sectionHeader, isArabic && { flexDirection: 'row-reverse' }]}>
          <Text style={styles.sectionTitle}>{t('dashboard.recent_orders')}</Text>
          <View style={styles.badgeCount}>
            <Text style={styles.badgeCountText}>{Array.isArray(clientCommandes) ? clientCommandes.length : 0}</Text>
          </View>
        </View>

        {!Array.isArray(clientCommandes) || clientCommandes.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="package" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyStateText}>{t('admin.orders.empty_title')}</Text>
          </View>
        ) : (
          clientCommandes.map((commande) => (
            <TouchableOpacity 
              key={commande.id} 
              style={styles.orderCard}
              onPress={() => router.push(`/order/${commande.id}`)}
            >
              <View style={[styles.orderHeader, isArabic && { flexDirection: 'row-reverse' }]}>
                <View>
                  <Text style={[styles.orderRef, isArabic && { textAlign: 'right' }]}>#{commande.numeroCommande}</Text>
                  <Text style={[styles.orderDate, isArabic && { textAlign: 'right' }]}>
                    {new Date(commande.dateCreation).toLocaleDateString(isArabic ? 'ar-EG' : 'fr-FR')}
                  </Text>
                </View>
                <StatusBadge status={commande.status} />
              </View>

              <View style={[styles.orderBody, isArabic && { flexDirection: 'row-reverse' }]}>
                <View style={[styles.itemSummary, isArabic && { flexDirection: 'row-reverse' }]}>
                  <Feather name="shopping-bag" size={14} color={Colors.textSecondary} />
                  <Text style={styles.itemSummaryText}>
                    {commande.commandeTapis?.length || 0} {t('admin.catalog.products_count', { defaultValue: 'articles' })}
                  </Text>
                </View>
                <Text style={styles.orderPrice}>{commande.montantTotal} {t('common.dh')}</Text>
              </View>
              
              <View style={styles.cardFooter}>
                 <Text style={[styles.viewDetailsText, isArabic && { textAlign: 'left' }]}>{t('common.details')} →</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 12, fontSize: 16, color: Colors.textSecondary, ...Typography.medium },
  errorText: { marginTop: 12, fontSize: 16, color: Colors.danger, textAlign: 'center', ...Typography.medium },
  backButton: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: Colors.primary, borderRadius: Radius.md },
  backButtonText: { color: 'white', fontSize: 15, ...Typography.bold },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 15, paddingHorizontal: 20, backgroundColor: 'white', ...Shadows.sm },
  headerBackBtn: { padding: 5 },
  headerTitle: { fontSize: 18, color: Colors.textPrimary, ...Typography.bold },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  profileCard: { backgroundColor: 'white', borderRadius: Radius.xl, padding: 24, alignItems: 'center', ...Shadows.md, marginBottom: 20 },
  avatarLarge: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary50, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  avatarTextLarge: { fontSize: 32, color: Colors.primary, ...Typography.bold },
  clientName: { fontSize: 22, color: Colors.textPrimary, ...Typography.bold, marginBottom: 8, textAlign: 'center' },
  contactInfoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  contactItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  contactText: { fontSize: 14, color: Colors.textSecondary, ...Typography.regular },
  contactDivider: { width: 1, height: 14, backgroundColor: Colors.border, marginHorizontal: 12 },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statBox: { flex: 1, backgroundColor: 'white', borderRadius: Radius.lg, padding: 16, alignItems: 'center', ...Shadows.sm },
  statBoxPrimary: { backgroundColor: Colors.primary, flex: 1.5 },
  statValue: { fontSize: 18, color: Colors.textPrimary, ...Typography.bold, marginBottom: 4 },
  statLabel: { fontSize: 12, color: Colors.textMuted, ...Typography.medium },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  sectionTitle: { fontSize: 18, color: Colors.textPrimary, ...Typography.bold },
  badgeCount: { backgroundColor: Colors.primary100, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  badgeCountText: { fontSize: 12, color: Colors.primary, ...Typography.bold },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyStateText: { fontSize: 16, color: Colors.textMuted, ...Typography.medium },
  orderCard: { backgroundColor: 'white', borderRadius: Radius.lg, padding: 16, marginBottom: 12, ...Shadows.sm },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  orderRef: { fontSize: 15, color: Colors.textPrimary, ...Typography.bold, marginBottom: 2 },
  orderDate: { fontSize: 13, color: Colors.textMuted, ...Typography.regular },
  orderBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.border },
  itemSummary: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemSummaryText: { fontSize: 14, color: Colors.textSecondary, ...Typography.medium },
  orderPrice: { fontSize: 16, color: Colors.primary, ...Typography.bold },
  cardFooter: { paddingTop: 10 },
  viewDetailsText: { fontSize: 13, color: Colors.textMuted, textAlign: 'right', ...Typography.medium },
});
