import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  TextInput, ActivityIndicator, RefreshControl, Modal, Platform, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { row, textAlign, font } from '../../src/utils/rtl';
import { useFormStyles } from '../../src/hooks/useFormStyles';
import { AdminColors, AdminShadows } from '../../constants/AdminColors';
import { StatusColors } from '../../constants/StatusColors';
import { galleryApi, GalleryOrderItem, GalleryImageItem } from '../../src/services/api/galleryApi';
import { BASE_URL } from '../../src/services/api/client';
import { useSelector } from 'react-redux';
import { RootState } from '../../src/store/store';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMG_COL_GAP = 4;
const IMG_CARD_PADDING = 12;
const IMG_SIZE = (SCREEN_WIDTH - 32 - IMG_CARD_PADDING * 2 - IMG_COL_GAP * 2) / 3;

const STATUS_TABS = [
  'ALL',
  'PENDING_PICKUP',
  'PICKED_UP',
  'IN_PROCESS',
  'READY_FOR_DELIVERY',
  'DELIVERED',
  'PICKUP_FAILED',
  'DELIVERY_FAILED',
];

const keyByOrderId = (item: { orderId: any }) => String(item.orderId);

export default function GalleryScreen() {
  const { t } = useTranslation();
  const f = useFormStyles();
  const isArabic = f.isArabic;

  const { user } = useSelector((state: RootState) => state.auth);
  const restrictedRole = user?.role === 'LIVREUR' || user?.role === 'EMPLOYE';

  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [viewOrder, setViewOrder] = useState<{ id: number; status: string; clientName: string } | null>(null);

  const filters = useMemo(() => ({
    status: activeTab === 'ALL' ? undefined : activeTab,
    search: search.length >= 1 ? search : undefined,
    size: 50,
    page: 0,
  }), [activeTab, search]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['gallery', filters],
    queryFn: () => galleryApi.getImages(filters).then(r => r.data),
    staleTime: 1000 * 30,
  });

  const orders: GalleryOrderItem[] = data?.content ?? [];
  const refreshing = isFetching && !isLoading;

  const openImage = useCallback((img: GalleryImageItem, order: GalleryOrderItem) => {
    setViewOrder({ id: order.orderId, status: order.orderStatus, clientName: order.clientName });
    setViewImage(`${BASE_URL}${img.imageUrl}`);
  }, []);

  const renderOrderCard = useCallback(({ item }: { item: GalleryOrderItem }) => {
    const statusCfg = StatusColors[item.orderStatus] || { dot: '#94A3B8', bg: '#F1F5F9' };
    return (
      <View style={styles.orderCard}>
        {/* Card header: camera icon + client name + order ID chip */}
        <View style={[styles.cardHeader, row(isArabic)]}>
          <View style={styles.cameraIcon}>
            <Text style={styles.cameraEmoji}>📷</Text>
          </View>
          <Text style={[styles.clientName, { flex: 1 }, isArabic && { textAlign: 'right' }]} numberOfLines={1}>
            {item.clientName || item.clientPhone || '—'}
          </Text>
          <TouchableOpacity
            style={[styles.orderIdChip, { backgroundColor: statusCfg.dot }]}
            onPress={() => {
              if (restrictedRole && item.orderStatus === 'DELIVERED') return;
              router.push(`/order/${item.orderId}` as any);
            }}
          >
            <Text style={styles.orderIdText}>{item.orderId}</Text>
          </TouchableOpacity>
        </View>

        {/* Images grid — 3 columns */}
        {item.images.length > 0 && (
          <View style={styles.imagesGrid}>
            {item.images.map((img) => (
              <TouchableOpacity
                key={img.id}
                onPress={() => openImage(img, item)}
                activeOpacity={0.85}
              >
                <Image
                  source={{ uri: `${BASE_URL}${img.imageUrl}` }}
                  style={styles.thumbnail}
                  contentFit="cover"
                  transition={150}
                  cachePolicy="memory-disk"
                  recyclingKey={String(img.id)}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  }, [isArabic, openImage]);

  const renderTab = useCallback(({ item: tab }: { item: string }) => {
    const isActive = activeTab === tab;
    const statusCfg = tab !== 'ALL' ? (StatusColors[tab] || { dot: '#94A3B8' }) : null;
    return (
      <TouchableOpacity
        style={[
          styles.tab,
          isActive && styles.activeTab,
          isActive && statusCfg && { borderColor: statusCfg.dot },
        ]}
        onPress={() => setActiveTab(tab)}
      >
        <Text style={[
          styles.tabText,
          isActive && styles.activeTabText,
          isActive && statusCfg && { color: statusCfg.dot },
        ]}>
          {tab === 'ALL' ? t('common.all') : t(`status.${tab}`, { defaultValue: tab })}
        </Text>
      </TouchableOpacity>
    );
  }, [activeTab, t]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, row(isArabic)]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={24} color={AdminColors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, font.bold(isArabic)]}>
          {t('admin.gallery.title', { defaultValue: 'Galerie Photos' })}
        </Text>
        {data && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{data.totalElements}</Text>
          </View>
        )}
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, row(isArabic)]}>
        <Ionicons name="search" size={18} color={AdminColors.primary} />
        <TextInput
          style={[styles.searchInput, textAlign(isArabic)]}
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

      {/* Status tabs */}
      <FlatList
        data={STATUS_TABS}
        keyExtractor={tab => tab}
        renderItem={renderTab}
        horizontal
        showsHorizontalScrollIndicator={false}
        inverted={isArabic}
        contentContainerStyle={styles.tabsContent}
        style={styles.tabsRow}
      />

      {/* Order cards list */}
      {isLoading ? (
        <ActivityIndicator size="large" color={AdminColors.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={keyByOrderId}
          renderItem={renderOrderCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor={AdminColors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🖼️</Text>
              <Text style={styles.emptyTitle}>{t('admin.orders.empty_title')}</Text>
            </View>
          }
        />
      )}

      {/* Fullscreen image viewer */}
      <Modal visible={!!viewImage} transparent animationType="fade" onRequestClose={() => setViewImage(null)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayClose} onPress={() => setViewImage(null)}>
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>

          {viewOrder && (
            <TouchableOpacity
              style={styles.overlayOrderChip}
              onPress={() => {
                if (restrictedRole && viewOrder.status === 'DELIVERED') return;
                setViewImage(null);
                router.push(`/order/${viewOrder.id}` as any);
              }}
            >
              <Text style={[styles.overlayOrderId, { color: (StatusColors[viewOrder.status] || { dot: '#fff' }).dot }]}>
                #{viewOrder.id}
              </Text>
              <Text style={styles.overlayClient}>{viewOrder.clientName}</Text>
            </TouchableOpacity>
          )}

          {viewImage && (
            <Image
              source={{ uri: viewImage }}
              style={styles.fullImage}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: 'white', ...AdminShadows.shadowSmall,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: AdminColors.textPrimary },
  countBadge: {
    backgroundColor: AdminColors.primary + '18',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  countText: { fontSize: 13, fontWeight: '700', color: AdminColors.primary },

  searchContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'white', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10,
    marginHorizontal: 16, marginTop: 12,
    ...AdminShadows.shadowSmall,
  },
  searchInput: { flex: 1, fontSize: 14, color: AdminColors.textPrimary },

  tabsRow: { maxHeight: 48, marginTop: 10 },
  tabsContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  tab: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: 'white', borderWidth: 1, borderColor: '#E2E8F0',
  },
  activeTab: { borderWidth: 1.5 },
  tabText: { fontSize: 12, fontWeight: '600', color: AdminColors.textMuted },
  activeTabText: { fontWeight: '800' },

  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40, gap: 12 },

  // Order card
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    ...AdminShadows.shadowSmall,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: IMG_CARD_PADDING, paddingVertical: 12,
  },
  cameraIcon: {
    width: 42, height: 42, borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },
  cameraEmoji: { fontSize: 22 },
  clientName: {
    fontSize: 15, fontWeight: '700', color: AdminColors.textPrimary,
  },
  orderIdChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
    minWidth: 50, alignItems: 'center',
  },
  orderIdText: { fontSize: 14, fontWeight: '800', color: 'white' },

  // Images grid inside card
  imagesGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: IMG_CARD_PADDING,
    paddingBottom: IMG_CARD_PADDING,
    gap: IMG_COL_GAP,
  },
  thumbnail: {
    width: IMG_SIZE, height: IMG_SIZE,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },

  empty: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: AdminColors.textSecondary },

  // Fullscreen viewer
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.93)',
    justifyContent: 'center', alignItems: 'center',
  },
  overlayClose: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 20, right: 20,
    zIndex: 10, padding: 8,
  },
  overlayOrderChip: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 20, left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
  },
  overlayOrderId: { fontSize: 16, fontWeight: '800' },
  overlayClient: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  fullImage: { width: SCREEN_WIDTH, height: '80%' },
});
