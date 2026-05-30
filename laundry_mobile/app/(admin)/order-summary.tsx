import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { row } from '../../src/utils/rtl';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AdminColors, AdminShadows } from '../../constants/AdminColors';
import { useOrderCreation } from '../../src/context/OrderCreationContext';
import { useSelector } from 'react-redux';
import { adminApi } from '../../src/services/adminApi';
import { ordersApi } from '../../src/services/api/ordersApi';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { uploadManager } from '../../src/services/uploads';
import { parseError, getFriendlyMessage } from '../../src/services/errors/errorParser';
import { logger } from '../../src/lib/logger';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../src/services/query/queryKeys';

const log = logger.ns('order-summary');

export default function OrderSummaryScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const insets = useSafeAreaInsets();

  const {
    mode, client, items, totalAmount, orderNotes, setOrderNotes, orderImages,
    deliveryType, livreurId, scheduledDate,
    paidAmount,
    clearOrder, editingOrderId, pickupOrderId, creationIdempotencyKey,
  } = useOrderCreation();

  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();
  const currentUser = useSelector((state: any) => state.auth.user);
  const isLivreur = currentUser?.role?.toUpperCase() === 'LIVREUR';

  const totalDiscount = useMemo(
    () => items.reduce((sum, item) => sum + (item.remiseMontant || 0), 0),
    [items],
  );

  const subTotal = useMemo(
    () => items.reduce((sum, item) => sum + (item.prixFinal + (item.remiseMontant || 0)), 0),
    [items],
  );

  const handleSubmit = async () => {
    if (items.length === 0) {
      return Alert.alert(t('common.error'), t('admin.orders.create.items.bag_empty'));
    }

    setLoading(true);
    try {
      const tapisPayload = items.map(it => ({
        productId: it.productId,
        quantite: it.quantite,
        largeur: it.largeur,
        hauteur: it.hauteur,
        longueur: it.longueur,
        poids: it.poids,
        manualPrice: it.pricingMethod === 'CUSTOM' ? it.prixFinal : undefined,
        notes: it.notes,
        couleur: it.couleur,
        remiseMontant: it.remiseMontant,
        remiseRaison: it.remiseRaison,
        // Include existing remote image URLs so the backend reattaches them when
        // it deletes and recreates the item rows on update. New local URIs are
        // excluded here — they are queued via uploadManager below.
        imageUrls: (it.imageUrls ?? []).filter(u => !u.startsWith('file://') && !u.startsWith('content://')),
      }));

      // ── PICKUP FLOW ───────────────────────────────────────────────────────
      // Atomic: sends items + transitions to PICKED_UP in one backend transaction.
      if (pickupOrderId) {
        await ordersApi.confirmPickup(pickupOrderId, tapisPayload);

        // Queue order-level images added by the livreur on the detail page
        const localOrderImages = orderImages.filter(u => u.startsWith('file://') || u.startsWith('content://'));
        if (localOrderImages.length > 0) {
          uploadManager.addImages(localOrderImages, pickupOrderId as string, 'reception', 'standard')
            .catch(e => log.error('Background order-image upload failed', { err: String(e) }));
        }

        // Queue per-item images
        items.forEach(item => {
          const localItemImages = (item.imageUrls ?? []).filter(
            u => u.startsWith('file://') || u.startsWith('content://'),
          );
          if (localItemImages.length > 0) {
            uploadManager.addImages(localItemImages, pickupOrderId as string, 'item_photo', 'standard')
              .catch(e => log.error('Background item-image upload failed', { err: String(e) }));
          }
        });

        // Invalidate all caches that depend on order status so the dashboard,
        // orders list, and livreur pickups list all refetch when the user gets back.
        qc.invalidateQueries({ queryKey: queryKeys.orders.all });
        qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
        qc.invalidateQueries({ queryKey: queryKeys.livreur.all });
        qc.invalidateQueries({ queryKey: queryKeys.statistics.all });

        clearOrder();
        router.replace(`/order/${pickupOrderId}`);
        return;
      }

      // ── STANDARD EDIT / (legacy create path) ─────────────────────────────
      const orderData = {
        clientId: client?.id,
        tapis: tapisPayload,
        // When editing, omit imageUrls entirely (null) so the backend skips its
        // image-replace block and keeps all existing images untouched.
        // New local images added this session are queued via uploadManager below.
        // On create, send an empty array so the backend initialises the image list.
        imageUrls: editingOrderId ? null : [],
        mode: mode?.toUpperCase(),
        deliveryType,
        pickupDriverId: livreurId,
        scheduledPickupDate: scheduledDate,
        paymentMethod: 'especes',
        montantPaye: paidAmount,
        notes: orderNotes,
        source: 'ADMIN_APP',
        deliveryAddress: client?.address || client?.quartier || null,
        deliveryLatitude: client?.latitude ?? null,
        deliveryLongitude: client?.longitude ?? null,
        creationIdempotencyKey: editingOrderId ? undefined : creationIdempotencyKey,
      };

      let res;
      if (editingOrderId) {
        res = await adminApi.updateOrder(editingOrderId, orderData);
      } else {
        res = await adminApi.createOrder(orderData);
      }

      const savedOrder = res.data?.data ?? res.data;
      const orderId = savedOrder?.id;

      if (!orderId) {
        throw new Error('Server did not return an order ID');
      }

      const localOrderImages = orderImages.filter(u => u.startsWith('file://') || u.startsWith('content://'));
      if (localOrderImages.length > 0) {
        uploadManager.addImages(localOrderImages, orderId, 'order_general', 'standard')
          .catch(e => log.error('Background order-image upload failed', { err: String(e) }));
      }

      items.forEach(item => {
        const localItemImages = (item.imageUrls ?? []).filter(
          u => u.startsWith('file://') || u.startsWith('content://'),
        );
        if (localItemImages.length > 0) {
          uploadManager.addImages(localItemImages, orderId, 'item_photo', 'standard')
            .catch(e => log.error('Background item-image upload failed', { err: String(e) }));
        }
      });

      router.push({
        pathname: '/(admin)/order-confirmation',
        params: { orderId, orderNumber: savedOrder?.numeroCommande },
      });

    } catch (error: any) {
      const parsed = parseError(error);
      log.error('Order submit failed', { type: parsed.type, status: parsed.status });
      Alert.alert(t('common.error'), getFriendlyMessage(parsed) || t('common.error_msg'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, row(isArabic)]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons
            name={isArabic ? 'arrow-forward' : 'arrow-back'}
            size={24}
            color={AdminColors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('admin.orders.create.summary.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Client */}
        <View style={[styles.card, isArabic && { alignItems: 'flex-end' }]}>
          <View style={[styles.cardHeader, row(isArabic)]}>
            <Ionicons name="person-outline" size={20} color={AdminColors.primary} />
            <Text style={styles.cardTitle}>{t('admin.orders.create.client_info')}</Text>
          </View>
          <Text style={styles.clientName}>{client?.name}</Text>
          <Text style={styles.clientInfo}>{client?.phone}</Text>
          {(client?.address || (client as any)?.region) && (
            <View style={[{ marginTop: 4 }, isArabic && { alignItems: 'flex-end' }]}>
              {(client as any)?.region && (
                <Text style={styles.clientInfo}>
                  {t('admin.orders.create.region_label')}: {(client as any).region}
                </Text>
              )}
              {client?.address && <Text style={styles.clientInfo}>{client.address}</Text>}
            </View>
          )}
        </View>

        {/* Items */}
        <View style={[styles.card, isArabic && { alignItems: 'flex-end' }]}>
          <View style={[styles.cardHeader, row(isArabic)]}>
            <Ionicons name="list-outline" size={20} color={AdminColors.primary} />
            <Text style={styles.cardTitle}>{t('admin.catalog.title')}</Text>
          </View>
          {items.map((item, index) => (
            <View key={index} style={[styles.itemRow, row(isArabic)]}>
              <View style={[{ flex: 1 }, isArabic && { alignItems: 'flex-end' }]}>
                <Text style={styles.itemName}>{item.nom} x{item.quantite}</Text>
                {item.pricingMethod === 'PER_M2' && (
                  <Text style={styles.itemMeta}>{item.largeur}m × {item.hauteur}m</Text>
                )}
              </View>
              <Text style={styles.itemPrice}>{item.prixFinal.toFixed(2)} {t('common.dh')}</Text>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={[styles.summaryRow, row(isArabic)]}>
            <Text style={styles.summaryLabel}>{t('admin.orders.create.summary.subtotal')}</Text>
            <Text style={styles.summaryValue}>{subTotal.toFixed(2)} {t('common.dh')}</Text>
          </View>
          {totalDiscount > 0 && (
            <View style={[styles.summaryRow, row(isArabic)]}>
              <Text style={styles.summaryLabel}>
                {t('financial.amount')} ({t('admin.orders.create.items.remise_amount')})
              </Text>
              <Text style={[styles.summaryValue, { color: AdminColors.danger }]}>
                -{totalDiscount.toFixed(2)} {t('common.dh')}
              </Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.totalRow, row(isArabic)]}>
            <Text style={styles.totalLabel}>{t('common.total')}</Text>
            <Text style={styles.totalValue}>{totalAmount.toFixed(2)} {t('common.dh')}</Text>
          </View>
        </View>

        {/* Details */}
        <View style={[styles.card, isArabic && { alignItems: 'flex-end' }]}>
          <View style={[styles.cardHeader, row(isArabic)]}>
            <Ionicons name="information-circle-outline" size={20} color={AdminColors.primary} />
            <Text style={styles.cardTitle}>{t('common.details')}</Text>
          </View>
          {mode === 'immediate' ? (
            <View style={[{ marginTop: 4 }, isArabic && { alignItems: 'flex-end' }]}>
              <Text style={styles.clientInfo}>{t('admin.orders.create.mode_immediate')}</Text>
              {/* Don't show paid amount in the pickup flow — it's always 0 and misleading */}
              {!pickupOrderId && (
                <Text style={styles.clientInfo}>
                  {t('financial.paid')}: {paidAmount.toFixed(2)} {t('common.dh')}
                </Text>
              )}
            </View>
          ) : (
            <View style={[{ marginTop: 4 }, isArabic && { alignItems: 'flex-end' }]}>
              <Text style={styles.clientInfo}>
                {t('admin.orders.create.pickup_date')}:{' '}
                {new Date(scheduledDate!).toLocaleString('fr-FR')}
              </Text>
              <Text style={styles.clientInfo}>{t('admin.orders.create.mode_scheduled')}</Text>
            </View>
          )}
        </View>

        {/* Photo count hint (images upload in background) */}
        {(orderImages.length > 0 || items.some(i => (i.imageUrls?.length ?? 0) > 0)) && (
          <View style={[styles.card, styles.photoHintCard, row(isArabic)]}>
            <Ionicons name="cloud-upload-outline" size={18} color={AdminColors.primary} />
            <Text style={[styles.photoHint, { flex: 1 }]}>
              {t('admin.orders.create.summary.photos_background', {
                defaultValue: 'Photos upload automatically in the background after the order is created.',
              })}
            </Text>
          </View>
        )}

        {/* Notes */}
        <View style={[styles.card, isArabic && { alignItems: 'flex-end' }]}>
          <View style={[styles.cardHeader, row(isArabic)]}>
            <Ionicons name="document-text-outline" size={20} color={AdminColors.primary} />
            <Text style={styles.cardTitle}>{t('admin.orders.create.items.order_note')}</Text>
          </View>
          <TextInput
            style={[styles.notesInput, isArabic && { textAlign: 'right' }]}
            multiline
            placeholder={t('admin.orders.create.items.order_note_placeholder')}
            value={orderNotes}
            onChangeText={setOrderNotes}
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.submitBtn, loading && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitBtnText}>
              {pickupOrderId
                ? t('admin.orders.actions.confirm_received')
                : editingOrderId
                  ? t('common.save')
                  : t('admin.orders.create.summary.create_btn')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  header: {
    backgroundColor: 'white',
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    ...AdminShadows.shadowSmall,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: AdminColors.textPrimary },
  scrollContent: { padding: 16 },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...AdminShadows.shadowSmall,
  },
  photoHintCard: {
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: AdminColors.primary50 ?? 'rgba(13,115,119,0.06)',
  },
  photoHint: { fontSize: 13, color: AdminColors.primary, lineHeight: 18 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: AdminColors.textPrimary },
  clientName: { fontSize: 18, fontWeight: '700', color: AdminColors.textPrimary, marginBottom: 4 },
  clientInfo: { fontSize: 14, color: AdminColors.textSecondary, marginBottom: 2 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  itemName: { fontSize: 14, color: AdminColors.textPrimary, fontWeight: '500' },
  itemMeta: { fontSize: 12, color: AdminColors.textMuted },
  itemPrice: { fontSize: 14, fontWeight: '600', color: AdminColors.textPrimary },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryLabel: { fontSize: 14, color: AdminColors.textSecondary },
  summaryValue: { fontSize: 14, fontWeight: '600', color: AdminColors.textPrimary },
  totalRow: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  totalLabel: { fontSize: 16, fontWeight: '700', color: AdminColors.textPrimary },
  totalValue: { fontSize: 20, fontWeight: '800', color: AdminColors.primary },
  notesInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    height: 80,
    textAlignVertical: 'top',
    fontSize: 14,
    color: AdminColors.textPrimary,
  },
  footer: { padding: 16, backgroundColor: 'white', ...AdminShadows.shadowSmall },
  submitBtn: {
    backgroundColor: AdminColors.primary,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...AdminShadows.shadowTeal,
  },
  submitBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
});
