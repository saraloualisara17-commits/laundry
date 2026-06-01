import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView,
  Modal, TextInput, ActivityIndicator, Alert, Dimensions,
  Platform, KeyboardAvoidingView,
} from 'react-native';
import { row, textAlign } from '../../src/utils/rtl';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { AdminColors as Colors, AdminShadows } from '../../constants/AdminColors';
import { adminApi } from '../../src/services/adminApi';
import { ordersApi } from '../../src/services/api/ordersApi';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const CATEGORY_EMOJIS: Record<string, string> = {
  'Tapis': '🧺', 'Couvertures': '🛏️', 'Rideaux': '🪟',
  'Serviettes': '🧻', 'Vêtements': '👕', 'Canapé': '🛋️', 'default': '📦',
};
const getCategoryEmoji = (name: string) => CATEGORY_EMOJIS[name] || CATEGORY_EMOJIS['default'];

interface CartItem {
  cartId: string;
  productId: number;
  nom: string;
  categoryIcon: string;
  quantite: number;
  largeur?: number;
  hauteur?: number;
  longueur?: number;
  poids?: number;
  prixUnitaire: number;
  prixFinal: number;
  pricingMethod: string;
}

function calculatePrice(prod: any, form: any): number {
  if (!prod) return 0;
  const base = prod.prixUnitaire || 0;
  let v = 0;
  switch (prod.pricingMethod) {
    case 'PER_M2': v = (parseFloat(form.largura) || 0) * (parseFloat(form.hauteur) || 0) * base; break;
    case 'PER_UNIT': v = (form.qty || 1) * base; break;
    case 'PER_KG': v = (parseFloat(form.poids) || 0) * base; break;
    case 'PER_LINEAR_M': v = (parseFloat(form.longueur) || 0) * base; break;
    case 'CUSTOM': v = parseFloat(form.customPrice) || 0; break;
    default: v = (form.qty || 1) * base;
  }
  return Math.max(0, v);
}

const keyById = (item: { id: any }) => String(item.id);

export default function LivreurEditOrderItemsScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [products, setProducts] = useState<any[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);

  const modalScrollRef = useRef<ScrollView>(null);

  const [configModal, setConfigModal] = useState<{ open: boolean; product: any; editCartId: string | null }>({
    open: false, product: null, editCartId: null,
  });
  const [configForm, setConfigForm] = useState({
    qty: 1, largura: '', hauteur: '', longueur: '', poids: '', customPrice: '',
  });

  useEffect(() => {
    (async () => {
      setLoadingCatalog(true);
      try {
        const res = await adminApi.getCategories();
        const cats = res.data?.data || [];
        const all = cats.flatMap((cat: any) =>
          (cat.products || [])
            .filter((p: any) => p.isActive)
            .map((p: any) => ({ ...p, categoryNom: cat.nom, categoryIcon: getCategoryEmoji(cat.nom) }))
        );
        setProducts(all);
      } catch {
        Alert.alert(t('common.error'), t('admin.catalog.empty_title'));
      } finally {
        setLoadingCatalog(false);
      }
    })();
  }, []);

  const openConfig = (product: any, editCartId: string | null = null) => {
    if (editCartId) {
      const existing = cart.find(c => c.cartId === editCartId);
      if (existing) {
        setConfigForm({
          qty: existing.quantite,
          largura: existing.largeur ? String(existing.largeur) : '',
          hauteur: existing.hauteur ? String(existing.hauteur) : '',
          longueur: existing.longueur ? String(existing.longueur) : '',
          poids: existing.poids ? String(existing.poids) : '',
          customPrice: existing.pricingMethod === 'CUSTOM' ? String(existing.prixFinal) : '',
        });
      }
    } else {
      setConfigForm({ qty: 1, largura: '', hauteur: '', longueur: '', poids: '', customPrice: '' });
    }
    setConfigModal({ open: true, product, editCartId });
  };

  const saveItem = () => {
    const { product, editCartId } = configModal;
    if (!product) return;
    if (product.pricingMethod === 'PER_M2' && (!configForm.largura || !configForm.hauteur)) {
      return Alert.alert(t('common.error'), t('admin.orders.create.items.enter_dimensions'));
    }
    if (product.pricingMethod === 'CUSTOM' && !configForm.customPrice) {
      return Alert.alert(t('common.error'), t('admin.orders.create.items.enter_price'));
    }
    const prixFinal = calculatePrice(product, configForm);
    const item: CartItem = {
      cartId: editCartId || Date.now().toString(),
      productId: product.id,
      nom: product.nom,
      categoryIcon: product.categoryIcon,
      quantite: configForm.qty || 1,
      largeur: parseFloat(configForm.largura) || undefined,
      hauteur: parseFloat(configForm.hauteur) || undefined,
      longueur: parseFloat(configForm.longueur) || undefined,
      poids: parseFloat(configForm.poids) || undefined,
      prixUnitaire: product.prixUnitaire,
      prixFinal,
      pricingMethod: product.pricingMethod,
    };
    if (editCartId) {
      setCart(prev => prev.map(c => c.cartId === editCartId ? item : c));
    } else {
      setCart(prev => [...prev, item]);
    }
    setConfigModal({ open: false, product: null, editCartId: null });
  };

  const removeItem = (cartId: string) => {
    setCart(prev => prev.filter(c => c.cartId !== cartId));
  };

  const handleSave = async () => {
    if (cart.length === 0) {
      return Alert.alert(t('common.error'), t('admin.orders.create.items.no_items'));
    }
    setSaving(true);
    try {
      const payload = cart.map(item => ({
        productId: item.productId,
        quantite: item.quantite,
        largeur: item.largeur,
        hauteur: item.hauteur,
        longueur: item.longueur,
        poids: item.poids,
        prixCustom: item.pricingMethod === 'CUSTOM' ? item.prixFinal : undefined,
      }));
      await ordersApi.updateOrderItemsByDriver(id, payload);
      Alert.alert(t('common.success', { defaultValue: 'Succès' }), t('orders.items_updated', { defaultValue: 'Articles mis à jour' }), [
        { text: t('common.ok', { defaultValue: 'OK' }), onPress: () => router.back() },
      ]);
    } catch (e: any) {
      const msg = e?.response?.status === 403
        ? t('orders.not_your_order', { defaultValue: "Vous n'êtes pas le livreur de cet ordre" })
        : t('common.error_msg');
      Alert.alert(t('common.error'), msg);
    } finally {
      setSaving(false);
    }
  };

  const total = cart.reduce((s, i) => s + i.prixFinal, 0);
  const livePrice = configModal.product ? calculatePrice(configModal.product, configForm) : 0;
  const needsDims = configModal.product?.pricingMethod;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={[styles.headerRow, row(isArabic)]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={22} color="white" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text style={[styles.headerTitle, isArabic && { textAlign: 'right' }]}>
              {t('orders.edit_items', { defaultValue: 'Modifier les articles' })}
            </Text>
            <Text style={[styles.headerSub, isArabic && { textAlign: 'right' }]}>
              #{String(id).slice(-10)}
            </Text>
          </View>
          {cart.length > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cart.length}</Text>
            </View>
          )}
        </View>
      </View>

      {loadingCatalog ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={keyById}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
          ListHeaderComponent={
            cart.length > 0 ? (
              <View style={styles.cartSection}>
                <Text style={[styles.sectionTitle, isArabic && { textAlign: 'right' }]}>
                  {t('admin.orders.create.items.cart', { defaultValue: 'Panier' })} ({cart.length})
                </Text>
                {cart.map(item => (
                  <View key={item.cartId} style={[styles.cartItem, row(isArabic)]}>
                    <Text style={styles.cartIcon}>{item.categoryIcon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cartItemName, isArabic && { textAlign: 'right' }]}>{item.nom}</Text>
                      <Text style={[styles.cartItemSub, isArabic && { textAlign: 'right' }]}>
                        {item.quantite > 1 ? `×${item.quantite} · ` : ''}
                        {item.largeur && item.hauteur ? `${item.largeur}×${item.hauteur}m · ` : ''}
                        {item.prixFinal.toFixed(2)} {t('common.dh')}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.cartEditBtn} onPress={() => openConfig(products.find(p => p.id === item.productId), item.cartId)}>
                      <Ionicons name="pencil-outline" size={16} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cartRemoveBtn} onPress={() => removeItem(item.cartId)}>
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
                <View style={[styles.cartTotal, row(isArabic)]}>
                  <Text style={styles.cartTotalLabel}>{t('financial.total')}</Text>
                  <Text style={styles.cartTotalValue}>{total.toFixed(2)} {t('common.dh')}</Text>
                </View>
              </View>
            ) : null
          }
          ListHeaderComponentStyle={{ marginBottom: 8 }}
          renderItem={({ item }) => {
            const inCart = cart.filter(c => c.productId === item.id).length;
            return (
              <TouchableOpacity
                style={[styles.productCard, row(isArabic)]}
                onPress={() => openConfig(item)}
                activeOpacity={0.75}
              >
                <Text style={styles.productIcon}>{item.categoryIcon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.productName, isArabic && { textAlign: 'right' }]}>{item.nom}</Text>
                  <Text style={[styles.productPrice, isArabic && { textAlign: 'right' }]}>
                    {item.prixUnitaire?.toFixed(2)} {t('common.dh')}
                    {item.pricingMethod === 'PER_M2' ? '/m²' : item.pricingMethod === 'PER_KG' ? '/kg' : item.pricingMethod === 'PER_LINEAR_M' ? '/m' : ''}
                  </Text>
                </View>
                {inCart > 0 && (
                  <View style={styles.inCartBadge}>
                    <Text style={styles.inCartBadgeText}>{inCart}</Text>
                  </View>
                )}
                <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyText}>{t('admin.catalog.empty_title')}</Text>
            </View>
          }
        />
      )}

      {/* Save Button */}
      {cart.length > 0 && (
        <View style={[styles.saveBar, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color="white" />
              : <Text style={styles.saveBtnText}>{t('common.save', { defaultValue: 'Enregistrer' })} · {total.toFixed(2)} {t('common.dh')}</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      {/* Config Modal */}
      <Modal visible={configModal.open} transparent animationType="slide" statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setConfigModal({ open: false, product: null, editCartId: null })} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
            <View style={[styles.modalSheet, { maxHeight: SCREEN_HEIGHT * 0.85 }]}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>{configModal.product?.nom}</Text>

              <ScrollView ref={modalScrollRef} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={{ padding: 20 }}>
                  {/* Quantity */}
                  {(needsDims === 'PER_UNIT' || !needsDims || needsDims === 'CUSTOM') && (
                    <View style={styles.formRow}>
                      <Text style={styles.formLabel}>{t('admin.orders.create.items.qty', { defaultValue: 'Quantité' })}</Text>
                      <View style={styles.qtyRow}>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => setConfigForm(f => ({ ...f, qty: Math.max(1, f.qty - 1) }))}>
                          <Ionicons name="remove" size={20} color={Colors.primary} />
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{configForm.qty}</Text>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => setConfigForm(f => ({ ...f, qty: f.qty + 1 }))}>
                          <Ionicons name="add" size={20} color={Colors.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Dimensions */}
                  {needsDims === 'PER_M2' && (
                    <>
                      <Text style={styles.formLabel}>{t('admin.orders.create.items.dimensions')}</Text>
                      <View style={styles.dimRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.dimLabel}>{t('admin.orders.create.items.width', { defaultValue: 'Largeur (m)' })}</Text>
                          <TextInput
                            style={styles.dimInput}
                            keyboardType="decimal-pad"
                            value={configForm.largura}
                            onChangeText={v => setConfigForm(f => ({ ...f, largura: v }))}
                            onFocus={() => modalScrollRef.current?.scrollTo({ y: 0, animated: true })}
                            placeholder="0.0"
                            color="#1E293B"
                          />
                        </View>
                        <Text style={styles.dimX}>×</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.dimLabel}>{t('admin.orders.create.items.height', { defaultValue: 'Hauteur (m)' })}</Text>
                          <TextInput
                            style={styles.dimInput}
                            keyboardType="decimal-pad"
                            value={configForm.hauteur}
                            onChangeText={v => setConfigForm(f => ({ ...f, hauteur: v }))}
                            onFocus={() => modalScrollRef.current?.scrollTo({ y: 0, animated: true })}
                            placeholder="0.0"
                            color="#1E293B"
                          />
                        </View>
                      </View>
                    </>
                  )}

                  {needsDims === 'PER_KG' && (
                    <>
                      <Text style={styles.formLabel}>{t('admin.orders.create.items.weight', { defaultValue: 'Poids (kg)' })}</Text>
                      <TextInput
                        style={styles.formInput}
                        keyboardType="decimal-pad"
                        value={configForm.poids}
                        onChangeText={v => setConfigForm(f => ({ ...f, poids: v }))}
                        onFocus={() => modalScrollRef.current?.scrollTo({ y: 0, animated: true })}
                        placeholder="0.0"
                        color="#1E293B"
                      />
                    </>
                  )}

                  {needsDims === 'PER_LINEAR_M' && (
                    <>
                      <Text style={styles.formLabel}>{t('admin.orders.create.items.length', { defaultValue: 'Longueur (m)' })}</Text>
                      <TextInput
                        style={styles.formInput}
                        keyboardType="decimal-pad"
                        value={configForm.longueur}
                        onChangeText={v => setConfigForm(f => ({ ...f, longueur: v }))}
                        onFocus={() => modalScrollRef.current?.scrollTo({ y: 0, animated: true })}
                        placeholder="0.0"
                        color="#1E293B"
                      />
                    </>
                  )}

                  {needsDims === 'CUSTOM' && (
                    <>
                      <Text style={styles.formLabel}>{t('admin.orders.create.items.custom_price', { defaultValue: 'Prix personnalisé' })}</Text>
                      <TextInput
                        style={styles.formInput}
                        keyboardType="decimal-pad"
                        value={configForm.customPrice}
                        onChangeText={v => setConfigForm(f => ({ ...f, customPrice: v }))}
                        onFocus={() => modalScrollRef.current?.scrollTo({ y: 0, animated: true })}
                        placeholder="0.00"
                        color="#1E293B"
                      />
                    </>
                  )}

                  {/* Live price */}
                  <View style={styles.livePriceRow}>
                    <Text style={styles.livePriceLabel}>{t('financial.total')}</Text>
                    <Text style={styles.livePriceValue}>{livePrice.toFixed(2)} {t('common.dh')}</Text>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setConfigModal({ open: false, product: null, editCartId: null })}>
                  <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={saveItem}>
                  <Text style={styles.confirmBtnText}>
                    {configModal.editCartId ? t('common.update', { defaultValue: 'Modifier' }) : t('common.add', { defaultValue: 'Ajouter' })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    backgroundColor: '#D97706',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: 'white', fontSize: 17, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },
  cartBadge: {
    backgroundColor: 'white', borderRadius: 12,
    minWidth: 28, height: 28, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8,
  },
  cartBadgeText: { color: '#D97706', fontWeight: '800', fontSize: 14 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  cartSection: {
    backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 16,
    ...AdminShadows.shadowSmall,
  },
  cartItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  cartIcon: { fontSize: 22 },
  cartItemName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  cartItemSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  cartEditBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  cartRemoveBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' },
  cartTotal: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  cartTotalLabel: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  cartTotalValue: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  productCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'white', borderRadius: 14, padding: 14, marginBottom: 10,
    ...AdminShadows.shadowSmall,
  },
  productIcon: { fontSize: 26 },
  productName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  productPrice: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  inCartBadge: {
    backgroundColor: Colors.primary, borderRadius: 10,
    minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  inCartBadgeText: { color: 'white', fontSize: 11, fontWeight: '800' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: Colors.textMuted },
  saveBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'white', paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 8,
  },
  saveBtn: {
    backgroundColor: '#D97706', borderRadius: 14, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: 'white', borderTopLeftRadius: 28, borderTopRightRadius: 28,
  },
  modalHandle: { width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 10, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', paddingHorizontal: 20, marginBottom: 4 },
  formRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  formLabel: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  formInput: {
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    backgroundColor: '#F8FAFC', marginBottom: 16,
  },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.primary + '15', alignItems: 'center', justifyContent: 'center',
  },
  qtyText: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, minWidth: 32, textAlign: 'center' },
  dimRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  dimLabel: { fontSize: 12, color: Colors.textMuted, marginBottom: 4 },
  dimX: { fontSize: 18, color: Colors.textMuted, marginTop: 16 },
  dimInput: {
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 10, fontSize: 15,
    backgroundColor: '#F8FAFC', textAlign: 'center',
  },
  livePriceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14, marginTop: 8,
  },
  livePriceLabel: { fontSize: 14, fontWeight: '600', color: '#15803D' },
  livePriceValue: { fontSize: 18, fontWeight: '800', color: '#15803D' },
  modalActions: { flexDirection: 'row', gap: 12, padding: 20, paddingTop: 8 },
  cancelBtn: {
    flex: 1, height: 48, borderRadius: 12,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { color: Colors.textSecondary, fontSize: 15, fontWeight: '700' },
  confirmBtn: {
    flex: 2, height: 48, borderRadius: 12,
    backgroundColor: '#D97706', alignItems: 'center', justifyContent: 'center',
  },
  confirmBtnText: { color: 'white', fontSize: 15, fontWeight: '800' },
});
