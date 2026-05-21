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
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AdminColors, AdminShadows } from '../../constants/AdminColors';
import { useOrderCreation } from '../../src/context/OrderCreationContext';
import { adminApi } from '../../src/services/adminApi';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { uploadManager } from '../../src/services/uploads';
import { compressImage } from '../../src/utils/imageCompression';

export default function OrderSummaryScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const insets = useSafeAreaInsets();
  
  const { 
    mode, client, items, totalAmount, orderNotes, setOrderNotes, orderImages,
    deliveryType, livreurId, scheduledDate,
    paidAmount, remainingAmount,
    clearOrder, editingOrderId 
  } = useOrderCreation();
  
  const [loading, setLoading] = useState(false);

  const totalDiscount = useMemo(() => 
    items.reduce((sum, item) => sum + (item.remiseMontant || 0), 0), 
  [items]);

  const subTotal = useMemo(() => 
    items.reduce((sum, item) => sum + (item.prixFinal + (item.remiseMontant || 0)), 0), 
  [items]);

  const handleSubmit = async () => {
    if (items.length === 0) return Alert.alert(t('common.error'), t('admin.orders.create.items.bag_empty'));

    setLoading(true);
    try {
      // 1. Process and Upload Images
      const processAndUpload = async (uri: string) => {
        if (!uri || !uri.startsWith('file://')) return uri; // Already a server path or empty
        
        try {
          // A. Compress the image first
          const compressedUri = await compressImage(uri);
          
          // B. Upload to server
          const res = await adminApi.uploadFiles([{
            uri: compressedUri,
            name: `order_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`,
            type: 'image/jpeg'
          }]);
          return res.data?.[0] || null; 
        } catch (e) {
          console.error('Image processing/upload failed:', uri, e);
          return null;
        }
      };

      // Upload global order images
      const serverOrderImages = orderImages ? await Promise.all(orderImages.map(processAndUpload)) : [];
      const validOrderImages = serverOrderImages.filter(img => img !== null);

      // Upload item-level images
      const processedItems = await Promise.all(items.map(async (it) => {
        const serverItemImages = it.imageUrls 
          ? await Promise.all(it.imageUrls.map(processAndUpload))
          : [];
        
        return {
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
          imageUrls: serverItemImages.filter(img => img !== null)
        };
      }));

      const orderData = {
        clientId: client?.id,
        tapis: processedItems,
        imageUrls: validOrderImages,
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
      };

      let res;
      if (editingOrderId) {
        res = await adminApi.updateOrder(editingOrderId, orderData);
      } else {
        res = await adminApi.createOrder(orderData);
      }

      if (res.data) {
        router.push({
          pathname: '/(admin)/order-confirmation',
          params: { 
            orderId: res.data.id || res.data.data?.id,
            orderNumber: res.data.numeroCommande || res.data.data?.numeroCommande 
          }
        });
      }
    } catch (error: any) {
      console.error('Order creation error:', error.response?.data || error.message);
      const detail = error.response?.data?.message || error.message;
      Alert.alert(t('common.error'), detail || t('common.error_msg'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, isArabic && { flexDirection: 'row-reverse' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name={isArabic ? "arrow-forward" : "arrow-back"} size={24} color={AdminColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('admin.orders.create.summary.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Client Info */}
        <View style={[styles.card, isArabic && { alignItems: 'flex-end' }]}>
          <View style={[styles.cardHeader, isArabic && { flexDirection: 'row-reverse' }]}>
            <Ionicons name="person-outline" size={20} color={AdminColors.primary} />
            <Text style={styles.cardTitle}>{t('admin.orders.create.client_info')}</Text>
          </View>
          <Text style={styles.clientName}>{client?.name}</Text>
          <Text style={styles.clientInfo}>{client?.phone}</Text>
          {(client?.address || client?.region) && (
            <View style={[{ marginTop: 4 }, isArabic && { alignItems: 'flex-end' }]}>
               {client.region && <Text style={styles.clientInfo}>{t('admin.orders.create.region_label')}: {client.region}</Text>}
               {client.address && <Text style={styles.clientInfo}>{client.address}</Text>}
            </View>
          )}
        </View>

        {/* Order Items */}
        <View style={[styles.card, isArabic && { alignItems: 'flex-end' }]}>
          <View style={[styles.cardHeader, isArabic && { flexDirection: 'row-reverse' }]}>
            <Ionicons name="list-outline" size={20} color={AdminColors.primary} />
            <Text style={styles.cardTitle}>{t('admin.catalog.title')}</Text>
          </View>
          {items.map((item, index) => (
            <View key={index} style={[styles.itemRow, isArabic && { flexDirection: 'row-reverse' }]}>
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
          
          <View style={[styles.summaryRow, isArabic && { flexDirection: 'row-reverse' }]}>
            <Text style={styles.summaryLabel}>{t('admin.orders.create.summary.subtotal')}</Text>
            <Text style={styles.summaryValue}>{subTotal.toFixed(2)} {t('common.dh')}</Text>
          </View>
          {totalDiscount > 0 && (
            <View style={[styles.summaryRow, isArabic && { flexDirection: 'row-reverse' }]}>
              <Text style={styles.summaryLabel}>{t('financial.amount')} ({t('admin.orders.create.items.remise_amount')})</Text>
              <Text style={[styles.summaryValue, { color: AdminColors.danger }]}>-{totalDiscount.toFixed(2)} {t('common.dh')}</Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.totalRow, isArabic && { flexDirection: 'row-reverse' }]}>
            <Text style={styles.totalLabel}>{t('common.total')}</Text>
            <Text style={styles.totalValue}>{totalAmount.toFixed(2)} {t('common.dh')}</Text>
          </View>
        </View>

        {/* Order Details */}
        <View style={[styles.card, isArabic && { alignItems: 'flex-end' }]}>
          <View style={[styles.cardHeader, isArabic && { flexDirection: 'row-reverse' }]}>
            <Ionicons name="information-circle-outline" size={20} color={AdminColors.primary} />
            <Text style={styles.cardTitle}>{t('common.details')}</Text>
          </View>
          
          {mode === 'immediate' ? (
            <View style={[{ marginTop: 4 }, isArabic && { alignItems: 'flex-end' }]}>
               <Text style={styles.clientInfo}>{t('admin.orders.create.mode_immediate')}</Text>
               <Text style={styles.clientInfo}>{t('financial.paid')}: {paidAmount.toFixed(2)} {t('common.dh')}</Text>
            </View>
          ) : (
            <View style={[{ marginTop: 4 }, isArabic && { alignItems: 'flex-end' }]}>
               <Text style={styles.clientInfo}>{t('admin.orders.create.pickup_date')}: {new Date(scheduledDate!).toLocaleString(isArabic ? 'fr-FR' : 'fr-FR')}</Text>
               <Text style={styles.clientInfo}>{t('admin.orders.create.mode_scheduled')}</Text>
            </View>
          )}
        </View>

        {/* Order Notes */}
        <View style={[styles.card, isArabic && { alignItems: 'flex-end' }]}>
          <View style={[styles.cardHeader, isArabic && { flexDirection: 'row-reverse' }]}>
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
              {editingOrderId ? t('common.save') : t('admin.orders.create.summary.create_btn')}
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
