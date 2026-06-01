import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Image } from 'react-native';
import { row } from '../../src/utils/rtl';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AdminColors, AdminShadows } from '../../constants/AdminColors';
import { useOrderCreation } from '../../src/context/OrderCreationContext';
import { adminApi } from '../../src/services/adminApi';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { SkeletonCard } from '../../components/admin/SkeletonCard';
import { useReceiptActions } from '../../src/hooks/useReceiptActions';
import { useTranslation } from 'react-i18next';
import { BASE_URL } from '../../src/services/api/client';
import { logger } from '../../src/lib/logger';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../src/services/query/queryKeys';
import { useOrderItemsHandlers, calculateItemPrice } from '../../src/hooks/useOrderItemsHandlers';
import ProductConfigModal from '../../components/order-items/ProductConfigModal';
import SimpleDialogModal from '../../components/order-items/SimpleDialogModal';

const log = logger.ns('order-items');

const keyById = (item: { id: any }) => String(item.id);

const CATEGORY_EMOJIS: Record<string, string> = {
  'Tapis': '🧺', 'Couvertures': '🛏️', 'Rideaux': '🪟',
  'Serviettes': '🧻', 'Vêtements': '👕', 'Canapé': '🛋️', 'default': '📦',
};

const getCategoryEmoji = (category: any) => {
  if (!category) return CATEGORY_EMOJIS['default'];
  const name = typeof category === 'string' ? category : category.nom;
  return CATEGORY_EMOJIS[name] || CATEGORY_EMOJIS['default'];
};

export default function OrderItemsScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const {
    client, items, removeItem,
    totalAmount, totalArea, itemCount,
    paidAmount, remainingAmount,
    orderNotes, orderImages,
    editingOrderId, pickupOrderId, pickupImagesOnly,
  } = useOrderCreation();

  // ── Catalog ───────────────────────────────────────────────────────────────────
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await adminApi.getCategories();
        const categories = res.data?.data || [];
        const all = categories.flatMap((cat: any) => {
          if (!cat?.products) return [];
          return cat.products
            .filter((p: any) => p.isActive)
            .map((p: any) => ({ ...p, categoryNom: cat.nom, categoryIcon: getCategoryEmoji(cat.nom) }));
        });
        setProducts(all);
      } catch (e: any) {
        log.error('Catalog load error', { msg: String(e?.message) });
        Alert.alert(t('common.error'), t('admin.catalog.empty_title'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Handlers hook ─────────────────────────────────────────────────────────────
  const h = useOrderItemsHandlers(products, t);

  // ── Receipt actions ───────────────────────────────────────────────────────────
  const editingOrder = editingOrderId
    ? qc.getQueryData<any>(queryKeys.orders.details(String(editingOrderId)))
    : null;

  const { sharingAction, handleShareWhatsApp, handlePrint } = useReceiptActions(
    editingOrderId ?? undefined,
    editingOrder?.status,
    editingOrder?.numeroCommande,
    t,
    editingOrder?.client?.phones?.[0]?.phoneNumber || editingOrder?.client?.phone || null,
    editingOrder ?? null,
  );

  const handleShare = () => {
    if (!editingOrderId || !editingOrder) {
      Alert.alert(t('common.info'), t('admin.orders.create.items.save_first_to_print'));
      return;
    }
    Alert.alert(t('receipt.choose_language', { defaultValue: 'Langue du reçu' }), '', [
      { text: '🇫🇷 Français', onPress: () => handleShareWhatsApp('fr') },
      { text: '🇲🇦 العربية', onPress: () => handleShareWhatsApp('ar') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const handlePrintReceipt = () => {
    if (!editingOrderId || !editingOrder) {
      Alert.alert(t('common.info'), t('admin.orders.create.items.save_first_to_print'));
      return;
    }
    Alert.alert(t('receipt.choose_language', { defaultValue: 'Langue du reçu' }), '', [
      { text: '🇫🇷 Français', onPress: () => handlePrint('fr') },
      { text: '🇲🇦 العربية', onPress: () => handlePrint('ar') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  // ── Render helpers ────────────────────────────────────────────────────────────
  const newImages = useMemo(
    () => orderImages.filter(u => u.startsWith('file://') || u.startsWith('content://')),
    [orderImages],
  );

  const renderActionBar = () => (
    <View style={[styles.actionBar, row(isArabic)]}>
      <TouchableOpacity style={[styles.actionBtn, (!editingOrderId || !editingOrder) && { opacity: 0.4 }]} onPress={handleShare} disabled={!!sharingAction}>
        <View style={[styles.actionIcon, { backgroundColor: '#E3F2FD' }]}>
          {sharingAction === 'whatsapp' ? <ActivityIndicator size="small" color="#1976D2" /> : <Ionicons name="share-social" size={20} color="#1976D2" />}
        </View>
        <Text style={styles.actionText}>{t('admin.orders.create.items.share')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.actionBtn, (!editingOrderId || !editingOrder) && { opacity: 0.4 }]} onPress={handlePrintReceipt} disabled={!!sharingAction}>
        <View style={[styles.actionIcon, { backgroundColor: '#F3E5F5' }]}>
          {sharingAction === 'print' ? <ActivityIndicator size="small" color="#7B1FA2" /> : <Ionicons name="print" size={20} color="#7B1FA2" />}
        </View>
        <Text style={styles.actionText}>{t('admin.orders.create.items.print')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionBtn} onPress={() => h.pickImage('gallery')}>
        <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
          <Ionicons name="images-outline" size={20} color="#388E3C" />
        </View>
        <Text style={styles.actionText}>{t('common.gallery', { defaultValue: 'Galerie' })}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionBtn} onPress={() => h.pickImage('camera')}>
        <View style={[styles.actionIcon, { backgroundColor: '#FFF3E0' }]}>
          <Ionicons name="camera-outline" size={20} color="#E65100" />
        </View>
        <Text style={styles.actionText}>{t('common.camera', { defaultValue: 'Caméra' })}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSummaryCard = () => (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryGrid, row(isArabic)]}>
        <View style={styles.gridItem}>
          <Text style={styles.summaryLabel}>{t('common.total')}</Text>
          <Text style={[styles.summaryValue, { color: AdminColors.textPrimary }]}>{totalAmount.toFixed(2)} {t('common.dh')}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.summaryLabel}>{t('admin.orders.create.items.area')}</Text>
          <Text style={styles.summaryValue}>{totalArea.toFixed(2)} m²</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.summaryLabel}>{t('admin.orders.create.items.pieces')}</Text>
          <Text style={styles.summaryValue}>{itemCount}</Text>
        </View>
      </View>
      <View style={[styles.paymentRow, row(isArabic)]}>
        <TouchableOpacity style={styles.paymentSection} onPress={() => h.openPaymentDialog(paidAmount)}>
          <Text style={styles.summaryLabel}>{t('financial.paid')}</Text>
          <Text style={[styles.summaryValue, { color: AdminColors.success }]}>{paidAmount.toFixed(2)} {t('common.dh')}</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <View style={styles.paymentSection}>
          <Text style={styles.summaryLabel}>{t('financial.remaining')}</Text>
          <Text style={[styles.summaryValue, { color: remainingAmount > 0 ? AdminColors.danger : AdminColors.textMuted }]}>
            {remainingAmount.toFixed(2)} {t('common.dh')}
          </Text>
        </View>
      </View>
      <TouchableOpacity style={[styles.addNoteBtn, row(isArabic)]} onPress={() => h.openNotesDialog(orderNotes)}>
        <Ionicons name="document-text-outline" size={16} color={AdminColors.primary} />
        <Text style={styles.addNoteText}>{orderNotes ? t('common.modifier') : t('admin.orders.create.items.add_note')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCartItem = (item: any) => (
    <View key={item.cartId} style={[styles.cartItemCard, row(isArabic)]}>
      <View style={styles.cartActions}>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => removeItem(item.cartId)}>
          <Ionicons name="trash-outline" size={16} color={AdminColors.danger} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.editBtn, { marginTop: 6 }]} onPress={() => h.openEdit(item)}>
          <Ionicons name="pencil-outline" size={16} color={AdminColors.textSecondary} />
        </TouchableOpacity>
      </View>
      <View style={[styles.cartInfo, isArabic && { alignItems: 'flex-end', marginLeft: 0, marginRight: 12 }]}>
        <Text style={[styles.cartItemName, isArabic && { textAlign: 'right' }]}>{item.nom} ({item.quantite})</Text>
        {item.pricingMethod === 'PER_M2' && (
          <Text style={[styles.cartItemDetails, isArabic && { textAlign: 'right' }]}>{item.largeur}×{item.hauteur}={(item.largeur! * item.hauteur!).toFixed(2)}m²</Text>
        )}
        <Text style={[styles.cartItemPrice, isArabic && { textAlign: 'right' }]}>{item.prixFinal.toFixed(2)} {t('common.dh')}</Text>
      </View>
      <View style={[styles.cartItemImgBox, isArabic && { order: 2 }]}>
        {item.imageUrls?.[0] ? (
          <Image source={{ uri: item.imageUrls[0] }} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
        ) : (
          <Text style={{ fontSize: 28 }}>{item.categoryIcon || '🧺'}</Text>
        )}
      </View>
    </View>
  );

  const renderProductRow = useCallback(({ item }: { item: any }) => (
    <View style={[styles.productRow, row(isArabic)]}>
      <TouchableOpacity style={styles.addIconBtn} onPress={() => h.openAdd(item)}>
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>
      <View style={[styles.productInfoCol, isArabic && { alignItems: 'flex-end', marginLeft: 0, marginRight: 14 }]}>
        <Text style={[styles.productName, isArabic && { textAlign: 'right' }]}>{item.nom}</Text>
        <View style={[styles.priceRowSmall, row(isArabic)]}>
          <Text style={styles.productPriceText}>{item.prixUnitaire} {t('common.dh')}</Text>
          <Text style={styles.unitSmall}> / {item.uniteLabel || t('common.unit')}</Text>
        </View>
      </View>
      <View style={[styles.productImgBox, isArabic && { order: 2 }]}>
        {item.imageUrl ? (
          <Image source={{ uri: `${BASE_URL}${item.imageUrl}` }} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
        ) : (
          <Text style={{ fontSize: 28 }}>{item.categoryIcon}</Text>
        )}
      </View>
    </View>
  ), [isArabic, t, h.openAdd]);

  const ListHeader = (
    <View>
      {!pickupImagesOnly && renderActionBar()}
      {!pickupImagesOnly && renderSummaryCard()}

      {pickupImagesOnly && (
        <View style={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: AdminColors.textPrimary, marginBottom: 4 }}>
            {t('pickup.images_only_title', { defaultValue: 'Photos de collecte' })}
          </Text>
          <Text style={{ fontSize: 13, color: AdminColors.textSecondary, marginBottom: 16 }}>
            {t('pickup.images_only_subtitle', { defaultValue: "Ajoutez des photos de l'ordre avant de confirmer la collecte." })}
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity style={styles.pickupBtn} onPress={() => h.pickImage('gallery')}>
              <Ionicons name="images-outline" size={20} color="#388E3C" />
              <Text style={[styles.pickupBtnText, { color: '#388E3C' }]}>{t('common.gallery', { defaultValue: 'Galerie' })}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.pickupBtn, { backgroundColor: '#E3F2FD' }]} onPress={() => h.pickImage('camera')}>
              <Ionicons name="camera" size={20} color="#1976D2" />
              <Text style={[styles.pickupBtnText, { color: '#1976D2' }]}>{t('common.camera', { defaultValue: 'Caméra' })}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {newImages.length > 0 && (
        <View style={styles.orderPhotosContainer}>
          <Text style={[styles.sectionTitle, { marginLeft: 16, marginBottom: 8, marginTop: 16 }, isArabic && { textAlign: 'right', marginRight: 16 }]}>
            {t('admin.orders.create.items.photos')} ({newImages.length})
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
            {newImages.map((uri, idx) => (
              <View key={idx} style={styles.orderPhotoThumbWrap}>
                <Image source={{ uri }} style={styles.orderPhotoThumb} />
                <TouchableOpacity style={styles.photoRemoveBtn} onPress={() => h.removeOrderImage(uri)}>
                  <Ionicons name="close" size={12} color="white" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {!pickupImagesOnly && (
        <View style={styles.bagSection}>
          <View style={[styles.sectionHeader, row(isArabic)]}>
            <View style={styles.bagIconBox}>
              <MaterialCommunityIcons name="shopping" size={16} color="white" />
            </View>
            <Text style={styles.sectionTitle}>{t('admin.orders.create.items.bag')}</Text>
            <View style={styles.pillBadge}><Text style={styles.pillText}>{items.length}</Text></View>
          </View>
          {items.length === 0 ? (
            <View style={styles.emptyBag}>
              <Ionicons name="basket-outline" size={48} color={AdminColors.textMuted} />
              <Text style={styles.emptyBagText}>{t('admin.orders.create.items.bag_empty')}</Text>
            </View>
          ) : (
            items.map(renderCartItem)
          )}
        </View>
      )}

      {!pickupImagesOnly && (
        <View style={[styles.section, { marginTop: 24, marginBottom: 8 }]}>
          <View style={[styles.sectionHeader, row(isArabic)]}>
            <Ionicons name="list" size={20} color={AdminColors.primary} />
            <Text style={styles.sectionTitle}>{t('admin.orders.create.items.available_products')}</Text>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={[styles.headerContent, row(isArabic)]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={24} color={AdminColors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {client ? client.name : t('dashboard.create_order')}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <FlatList
        data={pickupImagesOnly ? [] : products}
        renderItem={renderProductRow}
        keyExtractor={keyById}
        removeClippedSubviews
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{ paddingBottom: 150 }}
        ListEmptyComponent={loading ? (
          <View style={{ paddingHorizontal: 16 }}>
            {Array(5).fill(0).map((_, i) => <SkeletonCard key={i} />)}
          </View>
        ) : null}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        {pickupImagesOnly ? (
          <TouchableOpacity
            style={[styles.continueBtn, h.confirmingPickup && styles.continueBtnDisabled]}
            onPress={h.handleConfirmImagesOnly}
            disabled={h.confirmingPickup}
          >
            {h.confirmingPickup
              ? <ActivityIndicator color="white" />
              : <Text style={styles.continueBtnText}>{t('pickup.confirm_btn', { defaultValue: 'Confirmer la collecte' })}</Text>}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.continueBtn, items.length === 0 && styles.continueBtnDisabled]}
            onPress={() => router.push('/(admin)/order-summary')}
            disabled={items.length === 0}
          >
            <Text style={styles.continueBtnText}>{t('common.continue')} {isArabic ? '←' : '→'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <ProductConfigModal
        visible={h.configModal.open}
        product={h.configModal.product}
        editCartId={h.configModal.editCartId}
        form={h.configForm}
        setForm={h.setConfigForm}
        onClose={h.closeConfigModal}
        onSave={h.handleSaveItem}
        calculatePrice={calculateItemPrice}
        isArabic={isArabic}
        t={t}
      />

      <SimpleDialogModal
        visible={h.showPaymentDialog}
        title={t('admin.orders.create.items.paid_amount')}
        value={h.tempPaid}
        onChangeText={h.setTempPaid}
        onCancel={() => h.setShowPaymentDialog(false)}
        onConfirm={h.confirmPayment}
        keyboardType="numeric"
        confirmLabel={t('common.confirm')}
        cancelLabel={t('common.cancel')}
        isArabic={isArabic}
      />

      <SimpleDialogModal
        visible={h.showNotesDialog}
        title={t('admin.orders.create.items.order_note')}
        value={h.tempNotes}
        onChangeText={h.setTempNotes}
        onCancel={() => h.setShowNotesDialog(false)}
        onConfirm={h.confirmNotes}
        multiline
        placeholder={t('admin.orders.create.items.order_note_placeholder')}
        confirmLabel={t('common.save')}
        cancelLabel={t('common.cancel')}
        isArabic={isArabic}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { backgroundColor: 'white', ...AdminShadows.shadowSmall, zIndex: 10 },
  headerContent: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  backBtn: { padding: 8 },
  headerTitleContainer: { flex: 1, paddingHorizontal: 12 },
  headerTitle: { fontSize: 14, fontWeight: '600', color: AdminColors.textPrimary, textAlign: 'center' },

  actionBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: 'white', marginBottom: 12 },
  actionBtn: { alignItems: 'center', flex: 1 },
  actionIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  actionText: { fontSize: 12, fontWeight: '600', color: AdminColors.textSecondary },

  summaryCard: { backgroundColor: 'white', borderRadius: 20, marginHorizontal: 16, padding: 20, ...AdminShadows.shadowSmall },
  summaryGrid: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 15 },
  gridItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 11, fontWeight: '700', color: AdminColors.textMuted, textTransform: 'uppercase', marginBottom: 4 },
  summaryValue: { fontSize: 17, fontWeight: '800', color: AdminColors.textPrimary },
  paymentRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 15 },
  paymentSection: { flex: 1, alignItems: 'center' },
  divider: { width: 1, height: 30, backgroundColor: '#E2E8F0' },
  addNoteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  addNoteText: { fontSize: 13, fontWeight: '600', color: AdminColors.primary },

  bagSection: { marginTop: 24 },
  bagIconBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: AdminColors.primary, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: AdminColors.textPrimary },
  pillBadge: { backgroundColor: AdminColors.primary100, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  pillText: { color: AdminColors.primary, fontSize: 11, fontWeight: '700' },
  emptyBag: { alignItems: 'center', paddingVertical: 40, opacity: 0.5 },
  emptyBagText: { marginTop: 10, fontSize: 14, color: AdminColors.textMuted },
  section: {},

  cartItemCard: { backgroundColor: 'white', borderRadius: 16, marginHorizontal: 16, marginBottom: 10, padding: 14, ...AdminShadows.shadowSmall, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  cartActions: { alignItems: 'center' },
  deleteBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  editBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  cartInfo: { flex: 1 },
  cartItemName: { fontSize: 14, fontWeight: '600', color: AdminColors.textPrimary },
  cartItemDetails: { fontSize: 12, color: AdminColors.primary, fontWeight: '500', marginTop: 2 },
  cartItemPrice: { fontSize: 15, fontWeight: '800', color: AdminColors.primary, marginTop: 4 },
  cartItemImgBox: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },

  productRow: { backgroundColor: 'white', borderRadius: 16, marginHorizontal: 16, marginBottom: 8, padding: 12, ...AdminShadows.shadowSmall, flexDirection: 'row', alignItems: 'center', gap: 14 },
  addIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: AdminColors.primary, alignItems: 'center', justifyContent: 'center', ...AdminShadows.shadowTeal },
  productInfoCol: { flex: 1 },
  productName: { fontSize: 15, fontWeight: '600', color: AdminColors.textPrimary },
  priceRowSmall: { flexDirection: 'row', alignItems: 'baseline', marginTop: 2 },
  productPriceText: { fontSize: 14, fontWeight: '700', color: AdminColors.textPrimary },
  unitSmall: { fontSize: 12, color: AdminColors.textMuted },
  productImgBox: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },

  pickupBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 14, backgroundColor: '#E8F5E9' },
  pickupBtnText: { fontSize: 14, fontWeight: '700' },

  orderPhotosContainer: { marginBottom: 16 },
  orderPhotoThumbWrap: { width: 80, height: 80, borderRadius: 12, overflow: 'hidden', position: 'relative', borderWidth: 1, borderColor: '#F1F5F9' },
  orderPhotoThumb: { width: '100%', height: '100%' },
  photoRemoveBtn: { position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(0,0,0,0.5)', width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', paddingHorizontal: 20, paddingTop: 12, ...AdminShadows.shadowLarge, zIndex: 30 },
  continueBtn: { backgroundColor: AdminColors.primary, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', ...AdminShadows.shadowTeal },
  continueBtnDisabled: { backgroundColor: 'rgba(13,115,119,0.3)' },
  continueBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
});
