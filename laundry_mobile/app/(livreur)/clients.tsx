import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../src/store/store';
import { fetchLivreurClients } from '../../src/store/livreurThunks';

const C = {
  primary: '#0D7377',
  success: '#10B981',
  successBg: 'rgba(16,185,129,0.1)',
  warning: '#F59E0B',
  warningBg: 'rgba(245,158,11,0.1)',
  danger: '#EF4444',
  bg: '#F4F6F8',
  surface: '#FFFFFF',
  textPrimary: '#0D1B2A',
  textSecondary: '#4A5568',
  textMuted: '#94A3B8',
};

function getPhone(client: any): string {
  if (client.phone) return client.phone;
  if (Array.isArray(client.phones) && client.phones.length > 0)
    return client.phones[0].phoneNumber || client.phones[0].phone || '';
  return '';
}

export default function LivreurClientsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { clients, loading } = useSelector((s: RootState) => s.livreur);

  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { dispatch(fetchLivreurClients()); }, [dispatch]));

  const onRefresh = () => {
    setRefreshing(true);
    dispatch(fetchLivreurClients()).finally(() => setRefreshing(false));
  };

  const filtered = search.length > 1
    ? clients.filter((c: any) => {
        const name = (c.name || c.nom || '').toLowerCase();
        const phone = getPhone(c).toLowerCase();
        const q = search.toLowerCase();
        return name.includes(q) || phone.includes(q);
      })
    : clients;

  const renderClient = ({ item }: { item: any }) => {
    const phone = getPhone(item);
    const addr = item.address || item.adresse
      || (Array.isArray(item.addresses) && item.addresses[0]?.fullAddress)
      || (Array.isArray(item.addresses) && item.addresses[0]?.address)
      || '';
    const unpaid = item.totalUnpaid || 0;
    const orderCount = item.totalOrders || item.commandesCount || 0;
    const lastOrder = item.lastOrderDate;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/order/${item.id}`)}
        activeOpacity={0.8}
      >
        {/* Avatar */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(item.name || item.nom || '?').charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.clientName} numberOfLines={1}>
              {item.name || item.nom}
            </Text>
            {unpaid > 0 && (
              <View style={styles.unpaidBadge}>
                <Text style={styles.unpaidText}>{unpaid} DH impayé</Text>
              </View>
            )}
          </View>

          {phone ? (
            <TouchableOpacity
              style={styles.infoRow}
              onPress={() => Linking.openURL(`tel:${phone}`)}
            >
              <Ionicons name="call-outline" size={13} color={C.success} />
              <Text style={[styles.infoText, { color: C.success }]}>{phone}</Text>
            </TouchableOpacity>
          ) : null}

          {addr ? (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={13} color={C.textMuted} />
              <Text style={styles.infoText} numberOfLines={1}>{addr}</Text>
            </View>
          ) : null}

          <View style={styles.metaRow}>
            {orderCount > 0 && (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>{orderCount} commande{orderCount > 1 ? 's' : ''}</Text>
              </View>
            )}
            {lastOrder && (
              <Text style={styles.lastOrder}>
                Dernier: {new Date(lastOrder).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </Text>
            )}
          </View>
        </View>

        <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.surface }}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Clients</Text>
            <Text style={styles.subtitle}>{clients?.length || 0} clients</Text>
          </View>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={C.primary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Nom ou numéro de téléphone..."
            placeholderTextColor={C.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      <FlatList
        data={filtered}
        keyExtractor={(i, idx) => i.id?.toString() || idx.toString()}
        renderItem={renderClient}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={C.primary} style={{ marginTop: 60 }} />
          ) : (
            <View style={styles.empty}>
              <Text style={{ fontSize: 48 }}>👥</Text>
              <Text style={styles.emptyTitle}>Aucun client trouvé</Text>
              <Text style={styles.emptyText}>
                {search.length > 1
                  ? 'Essayez un autre nom ou téléphone'
                  : 'Vos clients apparaîtront ici'}
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  title: { fontSize: 22, fontWeight: '700', color: C.textPrimary },
  subtitle: { fontSize: 13, color: C.textMuted, marginTop: 2 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 14, height: 44,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.textPrimary },
  list: { padding: 16, paddingBottom: 100 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surface, borderRadius: 16, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(13,115,119,0.1)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(13,115,119,0.2)',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: C.primary },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  clientName: { fontSize: 15, fontWeight: '700', color: C.textPrimary, flex: 1 },
  unpaidBadge: {
    backgroundColor: C.warningBg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: C.warning + '30',
  },
  unpaidText: { fontSize: 10, fontWeight: '700', color: C.warning },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  infoText: { fontSize: 12, color: C.textSecondary, flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  metaChip: { backgroundColor: 'rgba(13,115,119,0.08)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  metaChipText: { fontSize: 10, fontWeight: '600', color: C.primary },
  lastOrder: { fontSize: 10, color: C.textMuted },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.textSecondary, marginTop: 12 },
  emptyText: { fontSize: 14, color: C.textMuted, marginTop: 6, textAlign: 'center' },
});
