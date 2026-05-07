import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator,
  RefreshControl,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AdminColors, AdminShadows } from '../../../constants/AdminColors';
import { adminApi } from '../../../src/services/adminApi';
import { SkeletonCard } from '../../../components/admin/SkeletonCard';
import { EmptyState } from '../../../components/admin/EmptyState';
import { router } from 'expo-router';

export default function ClientsScreen() {
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const fetchClients = async (pageNum: number, isRefresh: boolean = false) => {
    try {
      if (pageNum === 0) setLoading(true);
      else setLoadingMore(true);

      const params = {
        search: search.length > 2 ? search : undefined,
        page: pageNum,
        limit: 20
      };

      const res = await adminApi.getClients(params);
      const newClients = res.data.content || res.data;
      
      if (isRefresh || pageNum === 0) {
        setClients(newClients);
      } else {
        setClients(prev => [...prev, ...newClients]);
      }

      setHasMore(newClients.length === 20);
      setTotalCount(res.data.totalElements || newClients.length);
    } catch (error) {
      console.error('Fetch clients error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchClients(0, true);
  }, [search]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(0);
    fetchClients(0, true);
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchClients(nextPage);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const renderClientCard = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.clientCard}
      onPress={() => router.push(`/(admin)/clients`)} // Detail screen can be implemented later
      activeOpacity={0.7}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
      </View>

      <View style={styles.infoCol}>
        <Text style={styles.clientName}>{item.name}</Text>
        <Text style={styles.clientPhone}>{item.phone || (item.phones && item.phones[0]?.phoneNumber) || 'Pas de numéro'}</Text>
        <Text style={styles.clientAddress} numberOfLines={1}>
          {item.address || (item.addresses && item.addresses[0]?.address) || 'Pas d\'adresse'}
        </Text>
        
        <View style={styles.statsRow}>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{item.commandesCount || 0} commandes</Text>
          </View>
          <Text style={styles.sinceText}>Client depuis {new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color={AdminColors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.headerContent}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Clients</Text>
            <Text style={styles.headerSubtitle}>{totalCount} au total</Text>
          </View>
          <TouchableOpacity 
            style={styles.addBtn}
            onPress={() => router.push('/(livreur)/clients')}
          >
            <Ionicons name="person-add" size={16} color="white" />
            <Text style={styles.addBtnText}>Nouveau</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={AdminColors.primary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Nom ou numéro de téléphone..."
            placeholderTextColor={AdminColors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </SafeAreaView>

      <FlatList
        data={clients}
        renderItem={renderClientCard}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AdminColors.primary} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          loading ? (
            <View style={{ padding: 16 }}>
              {Array(5).fill(0).map((_, i) => <SkeletonCard key={i} />)}
            </View>
          ) : (
            <EmptyState 
              icon="👥" 
              title="Aucun client" 
              subtitle={search.length > 0 ? `Aucun résultat pour "${search}"` : "Commencez par enregistrer un client"} 
            />
          )
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator color={AdminColors.primary} style={{ marginVertical: 20 }} /> : <View style={{ height: 40 }} />}
      />
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
    marginBottom: 12,
    backgroundColor: AdminColors.surface2,
    borderRadius: 14,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: AdminColors.textPrimary,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
  },
  clientCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    ...AdminShadows.shadowSmall,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: AdminColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  infoCol: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '700',
    color: AdminColors.textPrimary,
  },
  clientPhone: {
    fontSize: 13,
    color: AdminColors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  clientAddress: {
    fontSize: 12,
    color: AdminColors.textMuted,
    marginTop: 2,
    fontWeight: '400',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  countBadge: {
    backgroundColor: AdminColors.primary50,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countBadgeText: {
    color: AdminColors.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  sinceText: {
    fontSize: 11,
    color: AdminColors.textMuted,
    fontWeight: '500',
  },
});
