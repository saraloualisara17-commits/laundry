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

export default function ClientDetailsScreen() {
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

  const getClientDisplayName = (c: any) => c?.name || c?.nom || `Client #${id}`;

  const stats = useMemo(() => {
    const total = clientCommandes.reduce((acc, c) => acc + (c.montantTotal || 0), 0);
    const articles = clientCommandes.reduce((acc, c) => acc + (c.commandeTapis?.length || 0), 0);
    return { total, articles };
  }, [clientCommandes]);

  if (loading && clientCommandes.length === 0) {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Chargement du profil...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContent}>
        <Feather name="alert-triangle" size={48} color={Colors.danger} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fiche Client</Text>
        <TouchableOpacity style={styles.headerIconBtn}>
          <Feather name="edit" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarTextLarge}>{getClientDisplayName(client).charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.clientName}>{getClientDisplayName(client)}</Text>
          
          <View style={styles.contactInfoRow}>
            <View style={styles.contactItem}>
              <Feather name="phone" size={14} color={Colors.success} />
              <Text style={styles.contactText}>{getClientPhone(client)}</Text>
            </View>
            <View style={styles.contactDivider} />
            <View style={styles.contactItem}>
              <Feather name="mail" size={14} color={Colors.primary} />
              <Text style={styles.contactText} numberOfLines={1}>{client?.email || 'Pas d\'email'}</Text>
            </View>
          </View>
        </View>

        {/* KPI Grid */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>COMMANDES</Text>
            <Text style={styles.kpiValue}>{clientCommandes.length}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>ARTICLES</Text>
            <Text style={styles.kpiValue}>{stats.articles}</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: Colors.primary50 }]}>
            <Text style={[styles.kpiLabel, { color: Colors.primaryDark }]}>CHIFFRE</Text>
            <Text style={[styles.kpiValue, { color: Colors.primary }]}>{stats.total} <Text style={styles.currencySmall}>DH</Text></Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Historique des commandes</Text>
        </View>

        {clientCommandes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="file-text" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>Aucune commande trouvée.</Text>
          </View>
        ) : (
          clientCommandes.map((order: any) => {
            const statusConfig = StatusColors[order.status] || StatusColors.PENDING_PICKUP;
            
            return (
              <TouchableOpacity 
                key={order.id} 
                style={styles.orderCard}
                onPress={() => router.push(`/order/${order.id}`)}
                activeOpacity={0.7}
              >
                <View style={[styles.orderAccentBar, { backgroundColor: statusConfig.dot }]} />
                <View style={styles.orderHeader}>
                  <View>
                    <Text style={styles.orderNumberText}>Commande #{order.numeroCommande}</Text>
                    <View style={styles.dateRow}>
                       <Feather name="calendar" size={12} color={Colors.textMuted} />
                       <Text style={styles.dateText}>{new Date(order.dateCreation).toLocaleDateString('fr-FR')}</Text>
                    </View>
                  </View>
                  <StatusBadge status={order.status} />
                </View>
                
                <View style={styles.orderFooter}>
                  <View style={styles.itemsBadge}>
                    <MaterialIcons name="layers" size={14} color={Colors.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={styles.itemsBadgeText}>{order.commandeTapis?.length || 0} tapis</Text>
                  </View>
                  <Text style={styles.orderPrice}>{order.montantTotal || 0} DH</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    height: Platform.OS === 'ios' ? 100 : 60,
    paddingTop: Platform.OS === 'ios' ? 40 : 0,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerBackBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: Typography.weight.semibold, color: Colors.textPrimary },
  headerIconBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.primary50, justifyContent: 'center', alignItems: 'center' },
  
  scrollView: { flex: 1 },
  scrollContent: { padding: 20 },
  
  profileCard: { 
    backgroundColor: Colors.surface, 
    borderRadius: Radius.xl, 
    padding: 24, 
    alignItems: 'center', 
    marginBottom: 20, 
    borderWidth: 1, 
    borderColor: Colors.border,
    ...Shadows.sm 
  },
  avatarLarge: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: Colors.primary100, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.primary100,
  },
  avatarTextLarge: { fontSize: 32, fontWeight: 'bold', color: Colors.primary },
  clientName: { fontSize: 24, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 16 },
  
  contactInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  contactItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  contactText: { fontSize: 13, color: Colors.textSecondary, fontWeight: Typography.weight.medium },
  contactDivider: { width: 1, height: 12, backgroundColor: Colors.border },
  
  kpiGrid: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  kpiCard: { 
    flex: 1, 
    backgroundColor: Colors.surface, 
    padding: 16, 
    borderRadius: Radius.lg, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: Colors.border,
    ...Shadows.xs 
  },
  kpiLabel: { fontSize: 9, fontWeight: 'bold', color: Colors.textMuted, marginBottom: 6, letterSpacing: 0.5 },
  kpiValue: { fontSize: 18, fontWeight: 'bold', color: Colors.textPrimary },
  currencySmall: { fontSize: 10 },
  
  sectionHeader: { marginBottom: 12, marginLeft: 4 },
  sectionTitle: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.textPrimary },

  emptyContainer: { alignItems: 'center', padding: 40, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border },
  emptyText: { color: Colors.textMuted, marginTop: 12, fontWeight: '500' },
  
  orderCard: { 
    backgroundColor: Colors.surface, 
    padding: 16, 
    borderRadius: Radius.lg, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: Colors.border,
    ...Shadows.sm,
    position: 'relative',
    overflow: 'hidden',
  },
  orderAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderRadius: Radius.sm,
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  orderNumberText: { fontSize: 14, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 4 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 12, color: Colors.textMuted },
  
  orderFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingTop: 12, 
    borderTopWidth: 1, 
    borderTopColor: Colors.surface2 
  },
  itemsBadge: { 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg, 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: Radius.sm, 
    borderWidth: 1, 
    borderColor: Colors.border 
  },
  itemsBadgeText: { fontSize: 12, fontWeight: Typography.weight.semibold, color: Colors.textSecondary },
  orderPrice: { fontSize: 16, fontWeight: 'bold', color: Colors.primary },

  loadingText: { marginTop: 12, color: Colors.textSecondary, fontWeight: 'bold' },
  errorText: { color: Colors.danger, marginBottom: 20, fontSize: 16, textAlign: 'center' },
  backButton: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: Radius.md, ...Shadows.teal },
  backButtonText: { color: 'white', fontWeight: 'bold' }
});
