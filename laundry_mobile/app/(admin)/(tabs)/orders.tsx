import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
  Platform,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { AdminColors, AdminShadows } from '../../../constants/AdminColors';
import { StatusColors } from '../../../constants/StatusColors';
import { adminApi } from '../../../src/services/adminApi';
import { StatusBadge } from '../../../components/admin/StatusBadge';
import { SkeletonCard } from '../../../components/admin/SkeletonCard';
import { EmptyState } from '../../../components/admin/EmptyState';
import { router } from 'expo-router';

import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width } = Dimensions.get('window');

export default function OrdersScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  const TABS = [
    { id: 'Toutes', label: t('common.all') },
    { id: 'PENDING_PICKUP', label: t('status.PENDING_PICKUP') },
    { id: 'PICKED_UP', label: t('status.PICKED_UP') },
    { id: 'IN_PROCESS', label: t('status.IN_PROCESS') },
    { id: 'READY_FOR_DELIVERY', label: t('status.READY_FOR_DELIVERY') },
    { id: 'DELIVERED', label: t('status.DELIVERED') },
    { id: 'CANCELLED', label: t('status.CANCELLED') },
  ];

  const [activeTab, setActiveTab] = useState('Toutes');
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Filters State
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDriverPicker, setShowDriverPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    adminApi.getUsers().then(res => {
      setDrivers(res.data.filter((u: any) => u.role?.toLowerCase() === 'livreur'));
    }).catch(console.error);
  }, []);

  const fetchOrders = async (pageNum: number, isRefresh: boolean = false) => {
    try {
      if (pageNum === 0) setLoading(true);
      else setLoadingMore(true);

      const params = {
        status: activeTab === 'Toutes' ? undefined : activeTab,
        search: search.length > 2 ? search : undefined,
        page: pageNum,
        limit: 20,
        dateDebut: selectedDate ? selectedDate.toISOString().split('T')[0] : undefined,
        dateFin: selectedDate ? selectedDate.toISOString().split('T')[0] : undefined
      };

      const res = await adminApi.getOrders(params);
      const newOrders = res.data.content || res.data; 

      if (isRefresh || pageNum === 0) {
        setOrders(newOrders);
      } else {
        setOrders(prev => [...prev, ...newOrders]);
      }

      setHasMore(newOrders.length === 20);
      setTotalCount(res.data.totalElements || newOrders.length);
    } catch (error) {
      console.error('Fetch orders error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchOrders(0, true);
  }, [activeTab, search, selectedDate]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(0);
    fetchOrders(0, true);
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchOrders(nextPage);
    }
  };

  const onDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleValidateOrder = (id: number) => {
    Alert.alert(
      t('admin.orders.change_status'),
      `${t('admin.orders.change_status_msg')} ${t('status.PICKED_UP')} ?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async () => {
            try {
              await adminApi.updateOrderStatus(id, 'PICKED_UP');
              onRefresh();
            } catch (error) {
              Alert.alert(t('common.error'), t('common.error_msg'));
            }
          }
        }
      ]
    );
  };

  const sameDay = (d1: string | Date, d2: Date) => {
    const date1 = new Date(d1);
    return date1.getFullYear() === d2.getFullYear() &&
           date1.getMonth() === d2.getMonth() &&
           date1.getDate() === d2.getDate();
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      let match = true;
      if (selectedDriver) {
        if (o.livreur?.id !== selectedDriver.id && o.deliveryDriver?.id !== selectedDriver.id) {
          match = false;
        }
      }
      if (selectedDate && o.dateCreation) {
        if (!sameDay(o.dateCreation, selectedDate)) {
          match = false;
        }
      }
      return match;
    });
  }, [orders, selectedDriver, selectedDate]);

  // Generate last 14 days
  const dateOptions = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    let label = d.toLocaleDateString(isArabic ? 'ar-EG' : 'fr-FR', { weekday: 'short' });
    let dayNum = d.getDate();
    if (i === 0) label = t('common.today');
    if (i === 1) label = t('common.yesterday');
    return { date: d, label, dayNum };
  });

  const renderStatsBanner = () => {
    const totalOrders = filteredOrders.length;
    const totalAmount = filteredOrders.reduce((sum, o) => sum + (o.montantTotal || 0), 0);
    const totalPending = filteredOrders.filter(o => o.status === 'PENDING_PICKUP').length;

    return (
      <View style={styles.statsBanner}>
        <View style={styles.statsDecoCircle} />
        <View style={[styles.statsRow, isArabic && { flexDirection: 'row-reverse' }]}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalOrders}</Text>
            <Text style={styles.statLabel}>{t('common.all')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalAmount} <Text style={{fontSize: 14}}>{t('common.dh')}</Text></Text>
            <Text style={styles.statLabel}>{t('common.total')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalPending}</Text>
            <Text style={styles.statLabel}>{t('status.PENDING_PICKUP')}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderOrderCard = ({ item }: { item: any }) => {
    const statusCfg = StatusColors[item.status] || StatusColors.PENDING_PICKUP;
    const isReady = item.status === 'READY_FOR_DELIVERY';

    const hasDimensions = item.commandeTapis?.some((t: any) => t.modeTarification === 'PER_M2' && t.largeur && t.hauteur);
    const totalArea = hasDimensions ? item.commandeTapis.reduce((sum: number, t: any) => {
       if (t.modeTarification === 'PER_M2' && t.largeur && t.hauteur) {
           return sum + (parseFloat(t.largeur) * parseFloat(t.hauteur));
       }
       return sum;
    }, 0) : 0;

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => router.push(`/order/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={[isArabic ? styles.statusAccentAr : styles.statusAccent, { backgroundColor: statusCfg.dot }]} />

        <View style={[styles.cardTop, isArabic && { flexDirection: 'row-reverse' }]}>
          <Text style={styles.orderRef}>#{item.numeroCommande}</Text>
          {isReady ? (
            <View style={[styles.readyBadge, isArabic && { flexDirection: 'row-reverse' }]}>
              <View style={styles.readyDot} />
              <Text style={styles.readyText}>{t('admin.orders.ready')}</Text>
            </View>
          ) : (
            <StatusBadge status={item.status} />
          )}
        </View>

        <Text style={[styles.clientName, isArabic && { textAlign: 'right' }]}>{item.client?.name || item.clientNom}</Text>

        <View style={[styles.infoRow, isArabic && { flexDirection: 'row-reverse' }]}>
          <View style={[styles.infoItem, isArabic && { flexDirection: 'row-reverse' }]}>
            <Ionicons name="cube-outline" size={14} color={AdminColors.textSecondary} />
            <Text style={styles.infoText}>{item.commandeTapis?.length || 0} {t('dashboard.orders_count')}</Text>
          </View>
          <View style={[styles.infoItem, isArabic && { flexDirection: 'row-reverse' }]}>
            <Ionicons name="calendar-outline" size={14} color={AdminColors.textSecondary} />
            <Text style={styles.infoText}>{new Date(item.dateCreation).toLocaleDateString(isArabic ? 'ar-EG' : 'fr-FR')}</Text>
          </View>
          
          {totalArea > 0 && (
            <View style={[styles.areaChip, isArabic && { flexDirection: 'row-reverse' }]}>
              <Ionicons name="grid-outline" size={12} color="#0284C7" />
              <Text style={styles.areaText}>{totalArea.toFixed(2)} m²</Text>
            </View>
          )}
        </View>

        <View style={[styles.cardBottom, isArabic && { flexDirection: 'row-reverse' }]}>
          <View style={isArabic && { alignItems: 'flex-end' }}>
            <Text style={styles.amountText}>{item.montantTotal} {t('common.dh')}</Text>
            {(item.montantPaye > 0 || item.resteAPayer > 0) && (
              <View style={[styles.financialRow, isArabic && { flexDirection: 'row-reverse' }]}>
                <Text style={styles.payeText}>{t('financial.paid')}: {item.montantPaye || 0} {t('common.dh')}</Text>
                {item.resteAPayer > 0 && (
                  <Text style={styles.resteText}>{t('financial.remaining')}: {item.resteAPayer} {t('common.dh')}</Text>
                )}
              </View>
            )}
          </View>

          {item.status === 'PENDING_PICKUP' && (
            <TouchableOpacity
              style={[styles.validateBtnInline, isArabic && { flexDirection: 'row-reverse' }]}
              onPress={() => handleValidateOrder(item.id)}
            >
              <Text style={styles.validateBtnTextInline}>{t('admin.orders.validate')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={[styles.headerContent, isArabic && { flexDirection: 'row-reverse' }]}>
          <Text style={styles.headerTitle}>{t('admin.orders.title')}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{totalCount} {t('common.all')}</Text>
          </View>
        </View>

        <FlatList
          horizontal
          inverted={isArabic}
          data={TABS}
          keyExtractor={item => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.tab, activeTab === item.id && styles.activeTab]}
              onPress={() => { setActiveTab(item.id); setPage(0); }}
            >
              <Text style={[styles.tabText, activeTab === item.id && styles.activeTabText]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />

        <View style={[styles.searchContainer, isArabic && { flexDirection: 'row-reverse' }]}>
          <Ionicons name="search" size={18} color={AdminColors.primary} />
          <TextInput
            style={[styles.searchInput, isArabic && { textAlign: 'right' }]}
            placeholder={t('admin.orders.search_placeholder')}
            placeholderTextColor={AdminColors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={AdminColors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      <FlatList
        data={filteredOrders}
        renderItem={renderOrderCard}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AdminColors.primary} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={() => (
          <>
            {renderStatsBanner()}
            
            <View style={[styles.filterRow, isArabic && { flexDirection: 'row-reverse' }]}>
              <TouchableOpacity style={[styles.filterBtn, isArabic && { flexDirection: 'row-reverse' }]} onPress={() => setShowDriverPicker(true)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, ...(isArabic && { flexDirection: 'row-reverse' }) }}>
                  <Feather name="chevron-down" size={14} color={AdminColors.textMuted} />
                  <Text style={[selectedDriver ? styles.filterSelectedText : styles.filterPlaceholderText, isArabic && { textAlign: 'right' }]} numberOfLines={1}>
                    {selectedDriver ? selectedDriver.name : t('admin.orders.filter_driver')}
                  </Text>
                </View>
                {selectedDriver && (
                  <TouchableOpacity 
                    onPress={(e) => { e.stopPropagation(); setSelectedDriver(null); }} 
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="close-circle" size={16} color={AdminColors.textMuted} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={[styles.filterBtn, isArabic && { flexDirection: 'row-reverse' }]} onPress={() => setSelectedDate(null)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, ...(isArabic && { flexDirection: 'row-reverse' }) }}>
                  <Ionicons name="calendar-outline" size={14} color={AdminColors.textMuted} />
                  <Text style={[selectedDate ? styles.filterSelectedText : styles.filterPlaceholderText, isArabic && { textAlign: 'right' }]} numberOfLines={1}>
                    {selectedDate ? selectedDate.toLocaleDateString(isArabic ? 'ar-EG' : 'fr-FR') : t('common.all_dates', { defaultValue: 'Toutes les dates' })}
                  </Text>
                </View>
                {selectedDate && (
                   <Ionicons name="close-circle" size={16} color={AdminColors.textMuted} />
                )}
              </TouchableOpacity>
            </View>

            <ScrollView 
              horizontal 
              inverted={isArabic}
              showsHorizontalScrollIndicator={false} 
              style={{ marginBottom: 16 }}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
            >
              {dateOptions.map((opt, i) => {
                const isActive = selectedDate && sameDay(selectedDate, opt.date);
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.dateCard,
                      isActive ? styles.dateCardActive : styles.dateCardInactive
                    ]}
                    onPress={() => setSelectedDate(opt.date)}
                  >
                    <Text style={[styles.dateDayLabel, isActive && styles.dateTextActive]}>{opt.label}</Text>
                    <Text style={[styles.dateDayNum, isActive && styles.dateTextActive]}>{opt.dayNum}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}
        ListEmptyComponent={
          loading ? (
            <View style={{ padding: 16 }}>
              {Array(5).fill(0).map((_, i) => <SkeletonCard key={i} />)}
            </View>
          ) : (
            <EmptyState
              icon="📋"
              title={t('admin.orders.empty_title')}
              subtitle={activeTab === 'Toutes' ? t('admin.orders.empty_subtitle', { defaultValue: t('admin.orders.empty_title') }) : t('common.no_data')}
            />
          )
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator color={AdminColors.primary} style={{ marginVertical: 20 }} /> : <View style={{ height: 40 }} />}
      />

      {/* Driver Modal */}
      <Modal visible={showDriverPicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismiss} onPress={() => setShowDriverPicker(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('admin.orders.filter_driver')}</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              <TouchableOpacity 
                style={[styles.modalItem, isArabic && { flexDirection: 'row-reverse' }]}
                onPress={() => { setSelectedDriver(null); setShowDriverPicker(false); }}
              >
                <Text style={[styles.modalItemText, !selectedDriver && styles.modalItemTextActive]}>{t('admin.orders.all_drivers')}</Text>
                {!selectedDriver && <Ionicons name="checkmark-circle" size={20} color={AdminColors.primary} />}
              </TouchableOpacity>
              
              {drivers.map(d => (
                <TouchableOpacity 
                  key={d.id}
                  style={[styles.modalItem, isArabic && { flexDirection: 'row-reverse' }]}
                  onPress={() => { setSelectedDriver(d); setShowDriverPicker(false); }}
                >
                  <Text style={[styles.modalItemText, selectedDriver?.id === d.id && styles.modalItemTextActive]}>{d.name}</Text>
                  {selectedDriver?.id === d.id && <Ionicons name="checkmark-circle" size={20} color={AdminColors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Date Modal (Calendar Grid) */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismiss} onPress={() => setShowDatePicker(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }, isArabic && { flexDirection: 'row-reverse' }]}>
              <Text style={styles.modalTitle}>{t('admin.orders.filter_date')}</Text>
              <TouchableOpacity onPress={() => { setSelectedDate(null); setShowDatePicker(false); }}>
                 <Text style={{ color: AdminColors.primary, fontWeight: '700' }}>{t('admin.orders.reset_btn')}</Text>
              </TouchableOpacity>
            </View>
            
            <DateTimePicker
              value={selectedDate || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
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
                style={[styles.validateBtnInline, { marginTop: 20, height: 48 }]} 
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.validateBtnTextInline}>{t('common.confirm')}</Text>
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
    gap: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: AdminColors.textPrimary,
  },
  countBadge: {
    backgroundColor: AdminColors.primary100,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countText: {
    color: AdminColors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tab: {
    backgroundColor: 'white',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    ...AdminShadows.shadowSmall,
  },
  activeTab: {
    backgroundColor: AdminColors.primary,
    borderColor: AdminColors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: AdminColors.textMuted,
  },
  activeTabText: {
    color: 'white',
  },
  searchContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: 'white',
    borderRadius: 14,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
    ...AdminShadows.shadowSmall,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: AdminColors.textPrimary,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 40,
  },
  statsBanner: {
    backgroundColor: '#0D7377',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    ...AdminShadows.shadowMedium,
    overflow: 'hidden',
    position: 'relative',
  },
  statsDecoCircle: {
    position: 'absolute',
    right: -30,
    top: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: 'white',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
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
    ...AdminShadows.shadowSmall,
  },
  filterPlaceholderText: {
    fontSize: 13,
    color: AdminColors.textMuted,
    fontWeight: '500',
  },
  filterSelectedText: {
    fontSize: 13,
    color: AdminColors.textPrimary,
    fontWeight: '600',
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 12,
    position: 'relative',
    overflow: 'hidden',
    ...AdminShadows.shadowSmall,
  },
  statusAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  statusAccentAr: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderRef: {
    fontSize: 12,
    fontWeight: '700',
    color: AdminColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clientName: {
    fontSize: 17,
    fontWeight: '700',
    color: AdminColors.textPrimary,
    marginTop: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    color: AdminColors.textSecondary,
    fontWeight: '500',
  },
  areaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  areaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  amountText: {
    fontSize: 18,
    fontWeight: '800',
    color: AdminColors.primary,
  },
  financialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  payeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669', // Success green
  },
  resteText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626', // Error red
  },
  validateBtnInline: {
    backgroundColor: AdminColors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  validateBtnTextInline: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5', // Light green
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  readyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  readyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalDismiss: {
    flex: 1,
  },
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
    marginBottom: 16,
    textAlign: 'center',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalItemText: {
    fontSize: 16,
    color: AdminColors.textSecondary,
    fontWeight: '500',
  },
  modalItemTextActive: {
    color: AdminColors.primary,
    fontWeight: '700',
  },
  dateCard: {
    width: 60,
    height: 70,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...AdminShadows.shadowSmall,
  },
  dateCardInactive: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  dateCardActive: {
    backgroundColor: AdminColors.primary,
  },
  dateDayLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: AdminColors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  dateDayNum: {
    fontSize: 18,
    fontWeight: '800',
    color: AdminColors.primary,
  },
  dateTextActive: {
    color: 'white',
  },
});
