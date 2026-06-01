import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Image } from 'react-native';
import { row, textAlign } from '../../src/utils/rtl';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AdminColors, AdminShadows } from '../../constants/AdminColors';
import { useOrderCreation, OrderItem } from '../../src/context/OrderCreationContext';
import { adminApi } from '../../src/services/adminApi';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { SkeletonCard } from '../../components/admin/SkeletonCard';
import * as ImagePicker from 'expo-image-picker';
import { compressImage } from '../../src/services/uploads/imageCompression';
import * as Haptics from 'expo-haptics';
import { useReceiptActions } from '../../src/hooks/useReceiptActions';
import { useTranslation } from 'react-i18next';
import { BASE_URL } from '../../src/services/api/client';
import { logger } from '../../src/lib/logger';
import { ordersApi } from '../../src/services/api/ordersApi';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../src/services/query/queryKeys';
import { uploadManager } from '../../src/services/uploads';

const log = logger.ns('order-items');

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const CATEGORY_EMOJIS: Record<string, string> = {
  'Tapis': '🧺',
  'Couvertures': '🛏️',
  'Rideaux': '🪟',
  'Serviettes': '🧻',
  'Vêtements': '👕',
  'Canapé': '🛋️',
  'default': '📦'
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
  const {
    client, items, addItem, removeItem, updateItem,
    totalAmount, totalArea, itemCount,
    paidAmount, setPaidAmount, remainingAmount,
    orderNotes, setOrderNotes, orderImages, setOrderImages, editingOrderId,
    pickupOrderId, pickupImagesOnly, clearOrder,
  } = useOrderCreation();
  
  const qc = useQueryClient();

  // Get the cached order object when editing — used for frontend receipt generation
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

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingPickup, setConfirmingPickup] = useState(false);
  const modalScrollRef = useRef<ScrollView>(null);

  const handleConfirmImagesOnly = async () => {
    if (!pickupOrderId) return;
    setConfirmingPickup(true);
    try {
      await ordersApi.confirmPickup(pickupOrderId, []);
      const localImages = orderImages.filter(u => u.startsWith('file://') || u.startsWith('content://'));
      if (localImages.length > 0) {
        uploadManager.addImages(localImages, pickupOrderId as string, 'reception', 'standard')
          .catch(e => log.error('Background image upload failed', { err: String(e) }));
      }
      qc.invalidateQueries({ queryKey: queryKeys.orders.all });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      qc.invalidateQueries({ queryKey: queryKeys.livreur.all });
      qc.invalidateQueries({ queryKey: queryKeys.statistics.all });
      clearOrder();
      router.replace(`/order/${pickupOrderId}`);
    } catch {
      Alert.alert(t('common.error'), t('common.error_msg'));
    } finally {
      setConfirmingPickup(false);
    }
  };

  // Modals
  const [configModal, setConfigModal] = useState<{ open: boolean, product: any, editCartId: string | null }>({
    open: false, product: null, editCartId: null
  });
  const [paymentModal, setShowPaymentModal] = useState(false);
  const [notesModal, setShowNotesModal] = useState(false);
  const [tempNotes, setTempNotes] = useState('');
  const [tempPaid, setTempPaid] = useState('');

  const [configForm, setConfigForm] = useState({
    qty: 1, largura: '', hauteur: '', longueur: '', poids: '',
    customPrice: '', noteAtelier: '',
  });

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getCategories();
      const responseData = res.data;
      const categories = responseData.data || [];
      
      const allProducts = categories.flatMap((cat: any) => {
        if (!cat || !cat.products) return [];
        
        return cat.products
          .filter((p: any) => p.isActive)
          .map((p: any) => ({ 
            ...p, 
            categoryNom: cat.nom,
            categoryIcon: getCategoryEmoji(cat.nom)
          }));
      });

      setProducts(allProducts);
    } catch (e: any) {
      log.error('Catalog load error', { msg: String(e?.message) });
      Alert.alert(t('common.error'), t('admin.catalog.empty_title'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  const calculateItemPrice = (prod: any, form: typeof configForm) => {
    if (!prod) return 0;
    let basePrice = prod.prixUnitaire || 0;
    let calculated = 0;

    switch (prod.pricingMethod) {
      case 'PER_M2':
        calculated = (parseFloat(form.largura) || 0) * (parseFloat(form.hauteur) || 0) * basePrice;
        break;
      case 'PER_UNIT':
        calculated = (form.qty || 1) * basePrice;
        break;
      case 'PER_KG':
        calculated = (parseFloat(form.poids) || 0) * basePrice;
        break;
      case 'PER_LINEAR_M':
        calculated = (parseFloat(form.longueur) || 0) * basePrice;
        break;
      case 'CUSTOM':
        calculated = parseFloat(form.customPrice) || 0;
        break;
      default:
        calculated = (form.qty || 1) * basePrice;
    }

    if (form.hasRemise) {
      calculated -= (parseFloat(form.remiseMontant) || 0);
    }

    return Math.max(0, calculated);
  };

  const handleSaveItem = () => {
    const { product, editCartId } = configModal;
    if (!product) return;

    if (product.pricingMethod === 'PER_M2' && (!configForm.largura || !configForm.hauteur)) {
      return Alert.alert(t('common.error'), t('admin.orders.create.items.enter_dimensions'));
    }
    if (product.pricingMethod === 'CUSTOM' && !configForm.customPrice) {
      return Alert.alert(t('common.error'), t('admin.orders.create.items.enter_price'));
    }

    const finalPrice = calculateItemPrice(product, configForm);

    const newItem: OrderItem = {
      cartId: editCartId || Date.now().toString(),
      productId: product.id,
      nom: product.nom,
      categoryIcon: product.categoryIcon,
      quantite: configForm.qty,
      largeur: parseFloat(configForm.largura) || undefined,
      hauteur: parseFloat(configForm.hauteur) || undefined,
      longueur: parseFloat(configForm.longueur) || undefined,
      poids: parseFloat(configForm.poids) || undefined,
      prixUnitaire: product.prixUnitaire,
      prixFinal: finalPrice,
      notes: configForm.noteAtelier,
      pricingMethod: product.pricingMethod,
      uniteLabel: product.uniteLabel,
    };

    if (editCartId) {
      updateItem(editCartId, newItem);
    } else {
      addItem(newItem);
    }

    setConfigModal({ open: false, product: null, editCartId: null });
  };

  // Shared picker helper — request permission, launch source, return raw assets
  const launchPicker = async (source: 'camera' | 'gallery', multi = false) => {
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('admin.orders.location_permission_denied'));
        return null;
      }
      return ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('admin.orders.location_permission_denied'));
        return null;
      }
      return ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
        allowsMultipleSelection: multi,
        selectionLimit: multi ? 5 : 1,
      });
    }
  };

  // Order-level photo picker: camera only (these are reception/handoff shots).
  // Also compresses immediately on pick.
  const pickImage = async (source: 'camera' | 'gallery' = 'camera') => {
    try {
      const result = await launchPicker(source, false);
      if (!result || result.canceled || result.assets.length === 0) return;

      const compressed = await compressImage(result.assets[0].uri, 'standard');
      setOrderImages([...orderImages, compressed]);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      log.error('Order photo error', { err: String(e) });
    }
  };

  const removeOrderImage = (uri: string) => {
    setOrderImages(orderImages.filter(i => i !== uri));
  };


  const renderActionBar = () => (
    <View style={[styles.actionBar, row(isArabic)]}>
      <TouchableOpacity
        style={[styles.actionBtn, (!editingOrderId || !editingOrder) && { opacity: 0.4 }]}
        onPress={handleShare}
        disabled={!!sharingAction}
      >
        <View style={[styles.actionIcon, { backgroundColor: '#E3F2FD' }]}>
          {sharingAction === 'whatsapp'
            ? <ActivityIndicator size="small" color="#1976D2" />
            : <Ionicons name="share-social" size={20} color="#1976D2" />}
        </View>
        <Text style={styles.actionText}>{t('admin.orders.create.items.share')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionBtn, (!editingOrderId || !editingOrder) && { opacity: 0.4 }]}
        onPress={handlePrintReceipt}
        disabled={!!sharingAction}
      >
        <View style={[styles.actionIcon, { backgroundColor: '#F3E5F5' }]}>
          {sharingAction === 'print'
            ? <ActivityIndicator size="small" color="#7B1FA2" />
            : <Ionicons name="print" size={20} color="#7B1FA2" />}
        </View>
        <Text style={styles.actionText}>{t('admin.orders.create.items.print')}</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.actionBtn} onPress={() => pickImage('gallery')}>
        <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
          <Ionicons name="images-outline" size={20} color="#388E3C" />
        </View>
        <Text style={styles.actionText}>{t('common.gallery', { defaultValue: 'Galerie' })}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionBtn} onPress={() => pickImage('camera')}>
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
        <TouchableOpacity style={styles.paymentSection} onPress={() => { setTempPaid(paidAmount.toString()); setShowPaymentModal(true); }}>
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

      <TouchableOpacity 
        style={[styles.addNoteBtn, row(isArabic)]} 
        onPress={() => { setTempNotes(orderNotes); setShowNotesModal(true); }}
      >
        <Ionicons name="document-text-outline" size={16} color={AdminColors.primary} />
        <Text style={styles.addNoteText}>{orderNotes ? t('common.modifier') : t('admin.orders.create.items.add_note')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCartItem = (item: OrderItem) => (
    <View key={item.cartId} style={[styles.cartItemCard, row(isArabic)]}>
      <View style={styles.cartActions}>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => removeItem(item.cartId)}>
          <Ionicons name="trash-outline" size={16} color={AdminColors.danger} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.editBtn, { marginTop: 6 }]} onPress={() => openEdit(item)}>
          <Ionicons name="pencil-outline" size={16} color={AdminColors.textSecondary} />
        </TouchableOpacity>
      </View>
      <View style={[styles.cartInfo, isArabic && { alignItems: 'flex-end', marginLeft: 0, marginRight: 12 }]}>
        <Text style={[styles.cartItemName, isArabic && { textAlign: 'right' }]}>{item.nom} ({item.quantite})</Text>
        {item.pricingMethod === 'PER_M2' && (
          <Text style={[styles.cartItemDetails, isArabic && { textAlign: 'right' }]}>{item.largeur}×{item.hauteur}={(item.largeur! * item.hauteur!).toFixed(2)}m²</Text>
        )}
        {item.imageUrls && item.imageUrls.length > 0 && (
          <View style={[{ flexDirection: 'row', gap: 4, marginTop: 4 }, row(isArabic)]}>
             {item.imageUrls.slice(0, 3).map((uri, idx) => (
                <Image key={idx} source={{ uri }} style={{ width: 30, height: 30, borderRadius: 6 }} />
             ))}
          </View>
        )}
        <Text style={[styles.cartItemPrice, isArabic && { textAlign: 'right' }]}>{item.prixFinal.toFixed(2)} {t('common.dh')}</Text>
      </View>
      <View style={[styles.cartItemImgBox, isArabic && { order: 2 }]}>
         {item.imageUrls && item.imageUrls.length > 0 ? (
           <Image source={{ uri: item.imageUrls[0] }} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
         ) : (
           <Text style={{ fontSize: 28 }}>{item.categoryIcon || '🧺'}</Text>
         )}
      </View>
    </View>
  );

  const renderProductRow = ({ item }: { item: any }) => (
    <View style={[styles.productRow, row(isArabic)]}>
      <TouchableOpacity style={styles.addIconBtn} onPress={() => openAdd(item)}>
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
  );

  const openAdd = (product: any) => {
    setConfigForm({
      qty: 1, largura: '', hauteur: '', longueur: '', poids: '',
      customPrice: '', noteAtelier: '',
    });
    setConfigModal({ open: true, product, editCartId: null });
  };

  const openEdit = (item: OrderItem) => {
    const product = products.find(p => p.id === item.productId) || item;
    setConfigForm({
      qty: item.quantite,
      largura: item.largeur?.toString() || '',
      hauteur: item.hauteur?.toString() || '',
      longueur: item.longueur?.toString() || '',
      poids: item.poids?.toString() || '',
      customPrice: item.pricingMethod === 'CUSTOM' ? item.prixFinal.toString() : '',
      noteAtelier: item.notes || '',
    });
    setConfigModal({ open: true, product, editCartId: item.cartId });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={[styles.headerContent, row(isArabic)]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name={isArabic ? "arrow-forward" : "arrow-back"} size={24} color={AdminColors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {client ? `${client.name}` : t('dashboard.create_order')}
              </Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
      </SafeAreaView>

      <FlatList
        data={pickupImagesOnly ? [] : products}
        renderItem={renderProductRow}
        keyExtractor={item => item.id.toString()}
        ListHeaderComponent={
          <View>
            {!pickupImagesOnly && renderActionBar()}
            {!pickupImagesOnly && renderSummaryCard()}

            {pickupImagesOnly && (
              <View style={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: AdminColors.textPrimary, marginBottom: 4 }}>
                  {t('pickup.images_only_title', { defaultValue: 'Photos de collecte' })}
                </Text>
                <Text style={{ fontSize: 13, color: AdminColors.textSecondary, marginBottom: 16 }}>
                  {t('pickup.images_only_subtitle', { defaultValue: 'Ajoutez des photos de l\'ordre avant de confirmer la collecte.' })}
                </Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 14, backgroundColor: '#E8F5E9' }}
                    onPress={() => pickImage('gallery')}
                  >
                    <Ionicons name="images-outline" size={20} color="#388E3C" />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#388E3C' }}>
                      {t('common.gallery', { defaultValue: 'Galerie' })}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 14, backgroundColor: '#E3F2FD' }}
                    onPress={() => pickImage('camera')}
                  >
                    <Ionicons name="camera" size={20} color="#1976D2" />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#1976D2' }}>
                      {t('common.camera', { defaultValue: 'Caméra' })}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {orderImages.filter(uri => uri.startsWith('file://') || uri.startsWith('content://')).length > 0 && (
              <View style={styles.orderPhotosContainer}>
                {(() => {
                  const newImages = orderImages.filter(uri => uri.startsWith('file://') || uri.startsWith('content://'));
                  return (
                    <>
                      <Text style={[styles.sectionTitle, { marginLeft: 16, marginBottom: 8, marginTop: 16 }, isArabic && { textAlign: 'right', marginRight: 16 }]}>
                        {t('admin.orders.create.items.photos')} ({newImages.length})
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
                        {newImages.map((uri, idx) => (
                          <View key={idx} style={styles.orderPhotoThumbWrap}>
                            <Image source={{ uri }} style={styles.orderPhotoThumb} />
                            <TouchableOpacity
                              style={styles.photoRemoveBtn}
                              onPress={() => removeOrderImage(uri)}
                            >
                              <Ionicons name="close" size={12} color="white" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </ScrollView>
                    </>
                  );
                })()}
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
        }
        contentContainerStyle={{ paddingBottom: 150 }}
        ListEmptyComponent={loading ? (
          <View style={{ paddingHorizontal: 16 }}>
            {Array(5).fill(0).map((_, i) => <SkeletonCard key={i} />)}
          </View>
        ) : null}
      />

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        {pickupImagesOnly ? (
          <TouchableOpacity
            style={[styles.continueBtn, confirmingPickup && styles.continueBtnDisabled]}
            onPress={handleConfirmImagesOnly}
            disabled={confirmingPickup}
          >
            {confirmingPickup
              ? <ActivityIndicator color="white" />
              : <Text style={styles.continueBtnText}>
                  {t('pickup.confirm_btn', { defaultValue: 'Confirmer la collecte' })}
                </Text>
            }
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

      {/* Config Modal */}
      <Modal
        visible={configModal.open}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={() => setConfigModal({ open: false, product: null, editCartId: null })}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setConfigModal({ open: false, product: null, editCartId: null })} />
          <View style={styles.modalSheet}>
            <View style={[styles.modalHeaderRow, row(isArabic)]}>
              <View style={styles.modalHeaderImgBox}>
                {configModal.product?.imageUrl ? (
                   <Image source={{ uri: `${BASE_URL}${configModal.product.imageUrl}` }} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
                ) : (
                   <Text style={{ fontSize: 24 }}>{configModal.product?.categoryIcon || '📦'}</Text>
                )}
              </View>
              <View style={[{ flex: 1 }, isArabic && { alignItems: 'flex-end' }]}>
                <Text style={styles.modalProductName}>{configModal.product?.nom}</Text>
                <Text style={styles.modalProductPrice}>{configModal.product?.prixUnitaire} {t('common.dh')} / {configModal.product?.uniteLabel || t('common.unit')}</Text>
              </View>
            </View>

            <ScrollView ref={modalScrollRef} style={styles.modalBody} keyboardShouldPersistTaps="handled">
              {configModal.product?.pricingMethod === 'PER_M2' && (
                <View style={[styles.dimRow, row(isArabic)]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, isArabic && { textAlign: 'right' }]}>{t('admin.orders.create.items.width')}</Text>
                    <TextInput
                      style={styles.dimInput}
                      keyboardType="decimal-pad"
                      value={configForm.largura}
                      onChangeText={v => setConfigForm({...configForm, largura: v})}
                      onFocus={() => modalScrollRef.current?.scrollTo({ y: 0, animated: true })}
                    />
                  </View>
                  <View style={{ width: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, isArabic && { textAlign: 'right' }]}>{t('admin.orders.create.items.height')}</Text>
                    <TextInput
                      style={styles.dimInput}
                      keyboardType="decimal-pad"
                      value={configForm.hauteur}
                      onChangeText={v => setConfigForm({...configForm, hauteur: v})}
                      onFocus={() => modalScrollRef.current?.scrollTo({ y: 0, animated: true })}
                    />
                  </View>
                </View>
              )}

              {configModal.product?.pricingMethod === 'PER_UNIT' && (
                <View style={[styles.unitStepper, row(isArabic)]}>
                  <TouchableOpacity 
                    style={[styles.stepBtn, configForm.qty === 1 && styles.stepBtnDisabled]} 
                    disabled={configForm.qty === 1}
                    onPress={() => setConfigForm({...configForm, qty: configForm.qty - 1})}
                  >
                    <Text style={[styles.stepSymbol, configForm.qty === 1 && { color: AdminColors.textMuted }]}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepValue}>{configForm.qty}</Text>
                  <TouchableOpacity 
                    style={[styles.stepBtn, { backgroundColor: AdminColors.primary }]} 
                    onPress={() => setConfigForm({...configForm, qty: configForm.qty + 1})}
                  >
                    <Text style={[styles.stepSymbol, { color: 'white' }]}>+</Text>
                  </TouchableOpacity>
                </View>
              )}

              {configModal.product?.pricingMethod === 'PER_KG' && (
                <View style={[styles.dimRow, row(isArabic)]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, isArabic && { textAlign: 'right' }]}>{t('admin.catalog.pricing.per_kg')} (kg)</Text>
                    <TextInput
                      style={styles.dimInput}
                      keyboardType="decimal-pad"
                      value={configForm.poids}
                      onChangeText={v => setConfigForm({...configForm, poids: v})}
                      onFocus={() => modalScrollRef.current?.scrollTo({ y: 0, animated: true })}
                    />
                  </View>
                </View>
              )}

              {configModal.product?.pricingMethod === 'PER_LINEAR_M' && (
                <View style={[styles.dimRow, row(isArabic)]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, isArabic && { textAlign: 'right' }]}>{t('admin.catalog.pricing.per_linear_m')} (m)</Text>
                    <TextInput
                      style={styles.dimInput}
                      keyboardType="decimal-pad"
                      value={configForm.longueur}
                      onChangeText={v => setConfigForm({...configForm, longueur: v})}
                      onFocus={() => modalScrollRef.current?.scrollTo({ y: 0, animated: true })}
                    />
                  </View>
                </View>
              )}

              {configModal.product?.pricingMethod === 'CUSTOM' && (
                <View style={[styles.dimRow, row(isArabic)]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, isArabic && { textAlign: 'right' }]}>{t('financial.amount')} ({t('common.dh')})</Text>
                    <TextInput
                      style={styles.dimInput}
                      keyboardType="numeric"
                      value={configForm.customPrice}
                      onChangeText={v => setConfigForm({...configForm, customPrice: v})}
                      onFocus={() => modalScrollRef.current?.scrollTo({ y: 0, animated: true })}
                    />
                  </View>
                </View>
              )}

              <View style={styles.calcBox}>
                  <Text style={styles.calcFormula}>
                    {configModal.product?.pricingMethod === 'PER_M2' ? `${configForm.largura || 0}m × ${configForm.hauteur || 0}m × ${configModal.product?.prixUnitaire} ${t('common.dh')}/m²` : 
                     configModal.product?.pricingMethod === 'PER_UNIT' ? `${configForm.qty} × ${configModal.product?.prixUnitaire} ${t('common.dh')}` : 
                     configModal.product?.pricingMethod === 'PER_KG' ? `${configForm.poids || 0}kg × ${configModal.product?.prixUnitaire} ${t('common.dh')}/kg` :
                     configModal.product?.pricingMethod === 'PER_LINEAR_M' ? `${configForm.longueur || 0}m × ${configModal.product?.prixUnitaire} ${t('common.dh')}/m` : ''}
                  </Text>
                  <Text style={styles.calcResult}>= {calculateItemPrice(configModal.product, configForm).toFixed(2)} {t('common.dh')}</Text>
              </View>

              <Text style={[styles.inputLabel, { marginTop: 12 }, isArabic && { textAlign: 'right' }]}>{t('admin.orders.create.items.workshop_notes')}</Text>
              <TextInput
                style={[styles.formInput, { height: 64, textAlignVertical: 'top', marginBottom: 8 }, isArabic && { textAlign: 'right', writingDirection: 'rtl' }]}
                multiline
                placeholder={t('admin.orders.create.items.workshop_notes_placeholder')}
                value={configForm.noteAtelier}
                onChangeText={v => setConfigForm({...configForm, noteAtelier: v})}
              />
            </ScrollView>

            <View style={styles.sheetFooter}>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveItem}>
                <Text style={styles.saveBtnText}>{t('admin.orders.create.items.add_to_bag')} — {calculateItemPrice(configModal.product, configForm).toFixed(2)} {t('common.dh')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Payment Modal */}
      <Modal
        visible={paymentModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.overlayCenter}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.dialogBox, { marginBottom: insets.bottom }]}>
            <Text style={[styles.dialogTitle, isArabic && { textAlign: 'right' }]}>{t('admin.orders.create.items.paid_amount')}</Text>
            <TextInput
              style={[styles.dialogInput, isArabic && { textAlign: 'right' }]}
              keyboardType="numeric"
              value={tempPaid}
              onChangeText={setTempPaid}
              autoFocus
            />
            <View style={[styles.dialogButtons, row(isArabic)]}>
              <TouchableOpacity style={styles.dialogBtn} onPress={() => setShowPaymentModal(false)}>
                <Text style={styles.dialogBtnCancel}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dialogBtn} onPress={() => { setPaidAmount(parseFloat(tempPaid) || 0); setShowPaymentModal(false); }}>
                <Text style={styles.dialogBtnConfirm}>{t('common.confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Notes Modal */}
      <Modal
        visible={notesModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowNotesModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.overlayCenter}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.dialogBox, { marginBottom: insets.bottom }]}>
            <Text style={[styles.dialogTitle, isArabic && { textAlign: 'right' }]}>{t('admin.orders.create.items.order_note')}</Text>
            <TextInput
              style={[styles.dialogInput, { height: 100, textAlignVertical: 'top' }, isArabic && { textAlign: 'right' }]}
              multiline
              value={tempNotes}
              onChangeText={setTempNotes}
              placeholder={t('admin.orders.create.items.order_note_placeholder')}
            />
            <View style={[styles.dialogButtons, row(isArabic)]}>
              <TouchableOpacity style={styles.dialogBtn} onPress={() => setShowNotesModal(false)}>
                <Text style={styles.dialogBtnCancel}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dialogBtn} onPress={() => { setOrderNotes(tempNotes); setShowNotesModal(false); }}>
                <Text style={styles.dialogBtnConfirm}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalSheet: {
    backgroundColor: 'white',
    borderRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.72,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeaderImgBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalProductName: {
    fontSize: 16,
    fontWeight: '700',
    color: AdminColors.textPrimary,
  },
  modalProductPrice: {
    fontSize: 13,
    color: AdminColors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  modalBody: { 
    // Removed paddingHorizontal here since it's on modalSheet
  },
  dimRow: { 
    flexDirection: 'row', 
    marginBottom: 12,
    gap: 12,
  },
  inputLabel: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: AdminColors.textSecondary, 
    marginBottom: 4 
  },
  dimInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: 'white',
    color: '#1E293B',
  },
  calcBox: { 
    backgroundColor: '#F1F5F9', 
    borderRadius: 14, 
    padding: 12, 
    marginTop: 8, 
    alignItems: 'center' 
  },
  calcFormula: { 
    fontSize: 13, 
    color: AdminColors.textSecondary, 
    textAlign: 'center' 
  },
  calcResult: { 
    fontSize: 20, 
    fontWeight: '800', 
    color: AdminColors.primary, 
    marginTop: 2, 
    textAlign: 'center' 
  },
  unitStepper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 20, 
    marginVertical: 8 
  },
  stepBtn: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    borderWidth: 2, 
    borderColor: AdminColors.primary, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  stepBtnDisabled: { 
    borderColor: '#E2E8F0' 
  },
  stepSymbol: { 
    fontSize: 20, 
    fontWeight: '300', 
    color: AdminColors.primary 
  },
  stepValue: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: AdminColors.textPrimary, 
    minWidth: 40, 
    textAlign: 'center' 
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    backgroundColor: 'white',
    color: '#1E293B',
  },
  sheetFooter: {
    paddingTop: 14,
  },
  saveBtn: { 
    backgroundColor: AdminColors.primary, 
    height: 52, 
    borderRadius: 16, 
    alignItems: 'center', 
    justifyContent: 'center', 
    ...AdminShadows.shadowTeal 
  },
  saveBtnText: { 
    color: 'white', 
    fontSize: 16, 
    fontWeight: '700' 
  },

  overlayCenter: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    padding: 24 
  },
  dialogBox: { 
    backgroundColor: 'white', 
    borderRadius: 24, 
    padding: 24, 
    ...AdminShadows.shadowLarge 
  },
  dialogTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: AdminColors.textPrimary, 
    marginBottom: 15,
    textAlign: 'center' 
  },
  dialogInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#F8FAFC',
    color: '#1E293B',
  },
  dialogButtons: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    marginTop: 20, 
    gap: 12 
  },
  dialogBtn: { 
    flex: 1,
    paddingVertical: 12, 
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogBtnCancel: { 
    color: AdminColors.textSecondary, 
    fontWeight: '600',
    fontSize: 15,
  },
  dialogBtnConfirm: { 
    color: AdminColors.primary, 
    fontWeight: '700',
    fontSize: 15,
  },

  photoRemoveBtn: { position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(0,0,0,0.5)', width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  
  orderPhotosContainer: { marginBottom: 16 },
  orderPhotoThumbWrap: { width: 80, height: 80, borderRadius: 12, overflow: 'hidden', position: 'relative', borderWidth: 1, borderColor: '#F1F5F9' },
  orderPhotoThumb: { width: '100%', height: '100%' },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 12,
    ...AdminShadows.shadowLarge,
    zIndex: 30,
  },
  continueBtn: {
    backgroundColor: AdminColors.primary,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...AdminShadows.shadowTeal,
  },
  continueBtnDisabled: { backgroundColor: 'rgba(13,115,119,0.3)' },
  continueBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
});
