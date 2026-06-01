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
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { row, textAlign } from '../../../src/utils/rtl';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AdminColors, AdminShadows } from '../../../constants/AdminColors';
import { adminApi } from '../../../src/services/adminApi';
import { SkeletonCard } from '../../../components/admin/SkeletonCard';
import { EmptyState } from '../../../components/admin/EmptyState';
import { router, useFocusEffect } from 'expo-router';

import { useTranslation } from 'react-i18next';
import { logger } from '../../../src/lib/logger';

const log = logger.ns('clients');

const keyById = (item: { id: any }) => String(item.id);

export default function ClientsScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  const [search, setSearch] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const searchTimeout = React.useRef<any>(null);

  const fetchClients = async (pageNum: number, isRefresh: boolean = false, currentSearch?: string) => {
    try {
      if (pageNum === 0 && !isRefresh) setLoading(true);
      if (pageNum > 0) setLoadingMore(true);

      const params = {
        search: currentSearch && currentSearch.length > 1 ? currentSearch : undefined,
        page: pageNum,
        limit: 20,
        createdAfter: selectedDate ? selectedDate.toISOString().split('T')[0] : undefined,
      };

      const res = await adminApi.getClients(params);
      const newClients = res.data.content || res.data || [];
      const clientsArray = Array.isArray(newClients) ? newClients : [];
      
      if (isRefresh || pageNum === 0) {
        setClients(clientsArray);
      } else {
        setClients(prev => {
          const combined = [...prev, ...clientsArray];
          const unique = combined.filter((item, index, self) =>
            index === self.findIndex((t) => t.id === item.id)
          );
          return unique;
        });
      }

      setHasMore(clientsArray.length === 20);
      setTotalCount(res.data.totalElements || (isRefresh || pageNum === 0 ? clientsArray.length : totalCount));
    } catch (error) {
      log.error('Fetch clients error', { err: String(error) });
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchClients(0, true, search);
    }, [])
  );

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    
    searchTimeout.current = setTimeout(() => {
      setPage(0);
      fetchClients(0, true, search);
    }, 400);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [search, selectedDate]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(0);
    fetchClients(0, true, search);
  }, [fetchClients, search]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      setLoadingMore(true);
      const nextPage = page + 1;
      setPage(nextPage);
      fetchClients(nextPage, false, search);
    }
  }, [loadingMore, hasMore, loading, page, fetchClients, search]);

  const getInitials = useCallback((name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, []);

  const getClientPhone = useCallback((item: any) => {
    if (item.phone) return item.phone;
    if (item.phones && item.phones.length > 0) return item.phones[0].phoneNumber;
    return t('admin.clients.no_phone');
  }, [t]);

  const getClientAddress = useCallback((item: any) => {
    if (item.address) return item.address;
    if (item.addresses && item.addresses.length > 0) return item.addresses[0].address;
    return t('admin.clients.no_address');
  }, [t]);

  const renderClientCard = useCallback(({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.clientCard}
      onPress={() => router.push(`/client/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={[isArabic ? styles.avatarAr : styles.avatar]}>
        <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
      </View>

      <View style={[styles.infoCol, isArabic && { alignItems: 'flex-end' }]}>
        <Text style={[styles.clientName, isArabic && { textAlign: 'right' }]}>{item.name}</Text>
        <Text style={[styles.clientPhone, isArabic && { textAlign: 'right' }]}>{getClientPhone(item)}</Text>
        <Text style={[styles.clientAddress, isArabic && { textAlign: 'right' }]} numberOfLines={1}>
          {getClientAddress(item)}
        </Text>
        
        <View style={[styles.statsRow, row(isArabic)]}>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{item.totalCommandes || 0} {t('dashboard.orders_count')}</Text>
          </View>
          {item.createdAt && (
            <Text style={styles.sinceText}>{t('admin.clients.client_since')} {new Date(item.createdAt).toLocaleDateString(isArabic ? 'fr-FR' : 'fr-FR')}</Text>
          )}
        </View>
      </View>

      <Ionicons name={isArabic ? "chevron-back" : "chevron-forward"} size={18} color={AdminColors.textMuted} />
    </TouchableOpacity>
  ), [isArabic, t, getInitials, getClientPhone, getClientAddress]);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={[styles.headerContent, row(isArabic)]}>
          <View style={[{ flex: 1 }, isArabic && { alignItems: 'flex-end' }]}>
            <Text style={styles.headerTitle}>{t('admin.clients.title')}</Text>
            <Text style={styles.headerSubtitle}>{totalCount} {t('admin.clients.total_count')}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.addBtn, row(isArabic)]}
            onPress={() => router.push('/(admin)/order-client?mode=immediate')}
          >
            <Ionicons name="person-add" size={16} color="white" />
            <Text style={styles.addBtnText}>{t('admin.clients.new_client')}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.searchContainer, row(isArabic)]}>
          <Ionicons name="search" size={18} color={AdminColors.primary} />
          <TextInput
            style={[styles.searchInput, isArabic && { textAlign: 'right' }]}
            placeholder={t('admin.clients.search_placeholder')}
            placeholderTextColor={AdminColors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={[styles.filterRow, row(isArabic)]}>
          <TouchableOpacity
            style={[styles.filterBtn, selectedDate && styles.filterBtnActive, row(isArabic)]}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={14} color={selectedDate ? AdminColors.primary : AdminColors.textMuted} />
            <Text style={[selectedDate ? styles.filterSelectedText : styles.filterPlaceholderText, isArabic && { textAlign: 'right' }]} numberOfLines={1}>
              {selectedDate ? selectedDate.toLocaleDateString(isArabic ? 'fr-FR' : 'fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : t('common.all_dates')}
            </Text>
            {selectedDate && (
              <TouchableOpacity onPress={(e) => { e.stopPropagation(); setSelectedDate(null); }} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={16} color={AdminColors.primary} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <FlatList
        data={clients}
        renderItem={renderClientCard}
        keyExtractor={keyById}
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
              title={t('admin.clients.empty_title')} 
              subtitle={search.length > 0 ? `${t('common.no_data')} "${search}"` : t('admin.clients.empty_subtitle')} 
            />
          )
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator color={AdminColors.primary} style={{ marginVertical: 20 }} /> : <View style={{ height: 40 }} />}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={15}
      />

      {/* Date Picker Modal */}
      <Modal visible={showDatePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismiss} onPress={() => setShowDatePicker(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={{ ...row(isArabic), justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={styles.modalTitle}>{t('admin.orders.filter_date')}</Text>
              <TouchableOpacity onPress={() => { setSelectedDate(null); setShowDatePicker(false); }}>
                <Text style={{ color: AdminColors.primary, fontWeight: '700' }}>{t('admin.orders.reset_btn')}</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={selectedDate || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              themeVariant="light"
              onChange={(event, date) => {
                if (Platform.OS === 'android') {
                  setShowDatePicker(false);
                  if (event.type === 'set' && date) setSelectedDate(date);
                } else {
                  if (date) setSelectedDate(date);
                }
              }}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={{ marginTop: 20, backgroundColor: AdminColors.primary, borderRadius: 14, height: 48, alignItems: 'center', justifyContent: 'center' }}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>{t('common.confirm')}</Text>
              </TouchableOpacity>
            )}
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
  filterRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  filterBtn: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 6,
    ...AdminShadows.shadowSmall,
  },
  filterBtnActive: {
    borderColor: AdminColors.primary,
    borderWidth: 1.5,
    backgroundColor: AdminColors.primary100,
  },
  filterPlaceholderText: {
    flex: 1,
    fontSize: 13,
    color: AdminColors.textMuted,
    fontWeight: '500',
  },
  filterSelectedText: {
    flex: 1,
    fontSize: 13,
    color: AdminColors.textPrimary,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalDismiss: { flex: 1 },
  modalSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AdminColors.textPrimary,
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
  avatarAr: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: AdminColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    order: 2,
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
