import React, { useState, useMemo } from 'react';
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
import { StatusBadge } from '../../../components/admin/StatusBadge';
import { SkeletonCard } from '../../../components/admin/SkeletonCard';
import { EmptyState } from '../../../components/admin/EmptyState';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRTL, row, font, arabicSafe, pos, textAlign, textProps } from '../../../src/utils/rtl';
import { formatOrderItemsSummary } from '../../../src/utils/orderSummary';
import { useFormStyles } from '../../../src/hooks/useFormStyles';
import { useInfiniteOrders } from '../../../src/hooks/query/useOrders';
import { useDriversList } from '../../../src/hooks/query/useDrivers';
import { useUpdateOrderStatus } from '../../../src/hooks/query/useOrder';

const { width } = Dimensions.get('window');

export default function OrdersScreen() {
  const { t, isRTL: isArabic } = useRTL();
  const f = useFormStyles();

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
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDriverPicker, setShowDriverPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const filters = useMemo(() => ({
    status: activeTab === 'Toutes' ? undefined : activeTab,
    search: search.length > 2 ? search : undefined,
    dateDebut: selectedDate ? selectedDate.toISOString().split('T')[0] : undefined,
    dateFin: selectedDate ? selectedDate.toISOString().split('T')[0] : undefined,
  }), [activeTab, search, selectedDate]);

  const {
    data: ordersPages,
    isLoading: loading,
    isFetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage: loadingMore,
  } = useInfiniteOrders(filters);

  const { data: driverUsers = [] } = useDriversList();
  const drivers = useMemo(
    () => driverUsers.filter((u: any) => u.role?.toLowerCase() === 'livreur'),
    [driverUsers]
  );

  const updateStatusMutation = useUpdateOrderStatus();

  const orders = useMemo(() => {
    const pages = ordersPages?.pages ?? [];
    return pages.flatMap((p: any) => p.content || p || []);
  }, [ordersPages]);

  const totalCount = ordersPages?.pages?.[0]?.totalElements ?? orders.length;
  const refreshing = isFetching && !loading && !loadingMore;

  const onRefresh = () => { refetch(); };
  const loadMore = () => { if (hasNextPage && !loadingMore) fetchNextPage(); };

  const handleValidateOrder = (id: number) => {
    Alert.alert(
      t('admin.orders.change_status'),
      `${t('admin.orders.change_status_msg')} ${t('status.PICKED_UP')} ?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: () => {
            updateStatusMutation.mutate(
              { id, status: 'PICKED_UP' },
              { onError: () => Alert.alert(t('common.error'), t('common.error_msg')) }
            );
          }
        }
      ]
    );
  };

  const filteredOrders = useMemo(() => {
    if (!selectedDriver) return orders;
    return orders.filter(o =>
      o.livreur?.id === selectedDriver.id || o.deliveryDriver?.id === selectedDriver.id
    );
  }, [orders, selectedDriver]);


  const renderStatsBanner = () => {
    const totalOrders = filteredOrders.length;
    const totalAmount = filteredOrders.reduce((sum, o) => sum + (o.montantTotal || 0), 0);
    const totalPending = filteredOrders.filter(o => o.status === 'PENDING_PICKUP').length;

    return (
      <View style={styles.statsBanner}>
        <View style={[styles.statsDecoCircle, pos.end(-30, isArabic), { top: -30 }]} />
        <View style={[styles.statsRow, row(isArabic)]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, font.extrabold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{totalOrders}</Text>
            <Text style={[styles.statLabel, f.statLabel, arabicSafe(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{t('common.all')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, font.extrabold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{totalAmount} <Text style={{fontSize: 14}}>{t('common.dh')}</Text></Text>
            <Text style={[styles.statLabel, f.statLabel, arabicSafe(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{t('common.total')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, font.extrabold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{totalPending}</Text>
            <Text style={[styles.statLabel, f.statLabel, arabicSafe(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{t('status.PENDING_PICKUP')}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderOrderCard = ({ item }: { item: any }) => {
    const statusCfg = StatusColors[item.status] || StatusColors.PENDING_PICKUP;
    const itemsSummary = formatOrderItemsSummary(item.commandeTapis, t);
    const address = item.client?.addresses?.[0]?.address || item.clientAdresse || null;

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => router.push(`/order/${item.id}`)}
        activeOpacity={0.7}
      >
        {/* Top row: status badge + order ref, direction respects RTL */}
        <View style={[styles.cardTop, row(isArabic)]}>
          <StatusBadge status={item.status} />
          <Text style={[styles.orderRef, arabicSafe(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>#{item.numeroCommande}</Text>
        </View>

        {/* Client name */}
        <Text style={[styles.clientName, textAlign(isArabic), font.bold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{item.client?.name || item.clientNom}</Text>

        {/* Address */}
        {address && (
          <View style={[styles.infoItem, { marginTop: 4 }, row(isArabic)]}>
            <Ionicons name="location-outline" size={13} color={AdminColors.textMuted} />
            <Text style={[styles.addressText, textAlign(isArabic)]} numberOfLines={1} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{address}</Text>
          </View>
        )}

        {/* Items + date */}
        <View style={[styles.infoRow, row(isArabic)]}>
          <View style={[styles.infoItem, row(isArabic)]}>
            <Ionicons name="cube-outline" size={13} color={AdminColors.textSecondary} />
            <Text style={[styles.infoText, font.regular(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{itemsSummary}</Text>
          </View>
          <View style={[styles.infoItem, row(isArabic)]}>
            <Ionicons name="calendar-outline" size={13} color={AdminColors.textSecondary} />
            <Text style={[styles.infoText, font.regular(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{new Date(item.dateCreation).toLocaleDateString('fr-FR')}</Text>
          </View>
        </View>

        {/* Bottom row: amount + financial */}
        <View style={[styles.cardBottom, row(isArabic)]}>
          <View style={isArabic ? { alignItems: 'flex-end' } : {}}>
            <Text style={[styles.amountText, font.extrabold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{item.montantTotal} {t('common.dh')}</Text>
            {(item.montantPaye > 0 || item.resteAPayer > 0) && (
              <View style={[styles.financialRow, row(isArabic)]}>
                <Text style={[styles.payeText, font.semibold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{t('financial.paid')}: {item.montantPaye || 0} {t('common.dh')}</Text>
                {item.resteAPayer > 0 && (
                  <Text style={[styles.resteText, font.semibold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{t('financial.remaining')}: {item.resteAPayer} {t('common.dh')}</Text>
                )}
              </View>
            )}
          </View>

          {item.status === 'PENDING_PICKUP' && (
            <TouchableOpacity
              style={styles.validateBtnInline}
              onPress={() => handleValidateOrder(item.id)}
            >
              <Text style={[styles.validateBtnTextInline, font.bold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{t('admin.orders.validate')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={[styles.headerContent, row(isArabic)]}>
          <Text style={[styles.headerTitle, font.bold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{t('admin.orders.title')}</Text>
          <View style={styles.countBadge}>
            <Text style={[styles.countText, font.semibold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{totalCount} {t('common.all')}</Text>
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
              onPress={() => { setActiveTab(item.id); }}
            >
              <Text style={[styles.tabText, activeTab === item.id && styles.activeTabText]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />

        <View style={[styles.searchContainer, row(isArabic)]}>
          <Ionicons name="search" size={18} color={AdminColors.primary} />
          <TextInput
            style={[styles.searchInput, textAlign(isArabic), font.regular(isArabic)]}
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
            
            <View style={[styles.filterRow, row(isArabic)]}>
              <TouchableOpacity style={[styles.filterBtn, row(isArabic)]} onPress={() => setShowDriverPicker(true)}>
                <View style={[{ alignItems: 'center', gap: 6, flex: 1 }, row(isArabic)]}>
                  <Feather name="chevron-down" size={14} color={AdminColors.textMuted} />
                  <Text style={[selectedDriver ? styles.filterSelectedText : styles.filterPlaceholderText, textAlign(isArabic), font.regular(isArabic)]} numberOfLines={1} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
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

              <TouchableOpacity
                style={[styles.filterBtn, selectedDate && styles.filterBtnActive, row(isArabic)]}
                onPress={() => setShowDatePicker(true)}
              >
                <View style={[{ alignItems: 'center', gap: 6, flex: 1 }, row(isArabic)]}>
                  <Ionicons name="calendar-outline" size={14} color={selectedDate ? AdminColors.primary : AdminColors.textMuted} />
                  <Text style={[selectedDate ? styles.filterSelectedText : styles.filterPlaceholderText, textAlign(isArabic), font.regular(isArabic)]} numberOfLines={1} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
                    {selectedDate ? selectedDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : t('common.all_dates')}
                  </Text>
                </View>
                {selectedDate && (
                  <TouchableOpacity onPress={(e) => { e.stopPropagation(); setSelectedDate(null); }} style={{ padding: 4 }}>
                    <Ionicons name="close-circle" size={16} color={AdminColors.primary} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </View>
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
              subtitle={activeTab === 'Toutes' ? t('admin.orders.empty_subtitle') : t('common.no_data')}
            />
          )
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator color={AdminColors.primary} style={{ marginVertical: 20 }} /> : <View style={{ height: 40 }} />}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={15}
      />

      {/* Driver Modal */}
      <Modal visible={showDriverPicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismiss} onPress={() => setShowDriverPicker(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('admin.orders.filter_driver')}</Text>
            <ScrollView style={{ maxHeight: Math.min(300, Dimensions.get('window').height * 0.45) }}>
              <TouchableOpacity
                style={[styles.modalItem, row(isArabic)]}
                onPress={() => { setSelectedDriver(null); setShowDriverPicker(false); }}
              >
                <Text style={[styles.modalItemText, !selectedDriver && styles.modalItemTextActive, font.regular(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{t('admin.orders.all_drivers')}</Text>
                {!selectedDriver && <Ionicons name="checkmark-circle" size={20} color={AdminColors.primary} />}
              </TouchableOpacity>

              {drivers.map(d => (
                <TouchableOpacity
                  key={d.id}
                  style={[styles.modalItem, row(isArabic)]}
                  onPress={() => { setSelectedDriver(d); setShowDriverPicker(false); }}
                >
                  <Text style={[styles.modalItemText, selectedDriver?.id === d.id && styles.modalItemTextActive, font.regular(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{d.name}</Text>
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
            <View style={[{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }, row(isArabic)]}>
              <Text style={[styles.modalTitle, { marginBottom: 0 }, font.bold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{t('admin.orders.filter_date')}</Text>
              <TouchableOpacity onPress={() => { setSelectedDate(null); setShowDatePicker(false); }}>
                <Text style={[{ color: AdminColors.primary, fontWeight: '700' }, font.bold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{t('admin.orders.reset_btn')}</Text>
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
  filterBtnActive: {
    borderColor: AdminColors.primary,
    borderWidth: 1.5,
    backgroundColor: AdminColors.primary100,
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
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    ...AdminShadows.shadowSmall,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderRef: {
    fontSize: 11,
    fontWeight: '600',
    color: AdminColors.textMuted,
  },
  clientName: {
    fontSize: 17,
    fontWeight: '700',
    color: AdminColors.textPrimary,
    marginTop: 2,
  },
  addressText: {
    fontSize: 12,
    color: AdminColors.textMuted,
    fontWeight: '500',
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 10,
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
});
