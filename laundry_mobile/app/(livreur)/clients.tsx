import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'expo-router';
import { fetchLivreurClients } from '../../src/store/livreurThunks';
import { RootState, AppDispatch } from '../../src/store/store';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { Colors, Shadows, Typography, Radius } from '../../constants/theme';

export default function LivreurClientsScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { clients, loading, error } = useSelector((state: RootState) => state.livreur);

  const loadData = useCallback(() => {
    dispatch(fetchLivreurClients());
  }, [dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getClientDisplayName = (client: any) => {
    return client?.name || client?.nom || 'Client Inconnu';
  };

  const getClientPhone = (client: any) => {
    if (!client) return '—';
    if (client.phone) return client.phone;
    if (client.telephone) return client.telephone;
    if (Array.isArray(client.phones) && client.phones.length > 0) {
      return client.phones[0].phoneNumber || client.phones[0].phone || '—';
    }
    return '—';
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.clientCard}
      onPress={() => router.push(`/client/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarWrapper}>
        <Text style={styles.avatarText}>
          {getClientDisplayName(item).charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.clientInfo}>
        <Text style={styles.clientName}>{getClientDisplayName(item)}</Text>
        <View style={styles.infoRow}>
          <Feather name="phone" size={12} color={Colors.textSecondary} />
          <Text style={styles.infoText}>{getClientPhone(item)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Feather name="map-pin" size={12} color={Colors.textMuted} />
          <Text style={styles.infoText} numberOfLines={1}>
            {item.address || item.adresse || (Array.isArray(item.addresses) && item.addresses[0]?.fullAddress) || 'Pas d\'adresse'}
          </Text>
        </View>
      </View>
      <Feather name="chevron-right" size={18} color={Colors.borderMedium} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
           <Text style={styles.headerTitle}>Mes Clients</Text>
           <Text style={styles.headerSubtitle}>{clients?.length || 0} clients dans votre zone</Text>
        </View>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {typeof error === 'string' ? error : (error.message || 'Une erreur est survenue')}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={clients}
        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} colors={[Colors.primary]} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyState}>
              <Feather name="users" size={52} color="#CBD5E1" />
              <Text style={styles.emptyStateTitle}>Aucun client</Text>
              <Text style={styles.emptyStateDesc}>Vous n'avez pas encore de clients enregistrés</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.bg,
  },
  headerTitle: {
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: Typography.size.base,
    color: Colors.textMuted,
    marginTop: 2,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.teal,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  clientCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: Radius.lg,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  avatarWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: Colors.primary100,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: Typography.weight.bold,
    color: Colors.primary,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
    gap: 6,
  },
  infoText: {
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  errorContainer: {
    margin: 20,
    marginTop: 0,
    padding: 12,
    backgroundColor: Colors.dangerBg,
    borderRadius: Radius.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: Colors.danger,
    fontSize: Typography.size.sm,
    flex: 1,
  },
  retryButton: {
    backgroundColor: Colors.danger,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  retryButtonText: {
    color: 'white',
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.semibold,
    color: Colors.textSecondary,
    marginTop: 12,
  },
  emptyStateDesc: {
    fontSize: Typography.size.base,
    color: Colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
});
