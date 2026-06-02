import React, { useState, useMemo, useCallback } from 'react';
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
import { SkeletonCard } from '../../../components/admin/SkeletonCard';
import { EmptyState } from '../../../components/admin/EmptyState';
import OrderCard from '../../../components/admin/OrderCard';
import OrderStatsBanner from '../../../components/admin/OrderStatsBanner';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRTL, row, font, textAlign, textProps } from '../../../src/utils/rtl';
import { useInfiniteOrders } from '../../../src/hooks/query/useOrders';
import { useDriversList } from '../../../src/hooks/query/useDrivers';
import { useUpdateOrderStatus } from '../../../src/hooks/query/useOrder';

const { width } = Dimensions.get('window');

const keyById = (item: { id: any }) => String(item.id);

export default function OrdersScreen() {
  const { t, isRTL: isArabic } = useRTL();

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
    search: search.length >= 1 ? search : undefined,
    dateDebut: selectedDate ? selectedDate.toISOString().split('T')[0] : undefined,
    dateFin: selectedDate ? selectedDate.toISOString().split('T')[0] : undefined,
    livreurId: selectedDriver ? selectedDriver.id : undefined,
  }), [activeTab, search, selectedDate, selectedDriver]);

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

  const handleValidateOrder = useCallback((id: number) => {
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
  }, [t, updateStatusMutation]);

  const filteredOrders = orders;

  const renderTabItem = useCallback(({ item }: { item: typeof TABS[number] }) => (
    <TouchableOpacity
      style={[styles.tab, activeTab === item.id && styles.activeTab]}
      onPress={() => { setActiveTab(item.id); }}
    >
      <Text style={[styles.tabText, activeTab === item.id && styles.activeTabText]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  ), [activeTab]);

  const renderOrderCard = useCallback(({ item }: { item: any }) => (
    <OrderCard item={item} isArabic={isArabic} t={t} onValidate={handleValidateOrder} />
  ), [isArabic, t, handleValidateOrder]);

  const renderListHeader = useCallback(() => (
    <>
      <OrderStatsBanner orders={filteredOrders} isArabic={isArabic} t={t} />

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
  ), [filteredOrders, isArabic, t, selectedDriver, selectedDate]);

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
          renderItem={renderTabItem}
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
        keyExtractor={keyById}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AdminColors.primary} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={renderListHeader}
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
