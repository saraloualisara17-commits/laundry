import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Switch,
  Modal,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AdminColors, AdminShadows } from '../../../constants/AdminColors';
import { adminApi } from '../../../src/services/adminApi';
import { BASE_URL } from '../../../src/services/api/client';
import { SkeletonCard } from '../../../components/admin/SkeletonCard';
import { EmptyState } from '../../../components/admin/EmptyState';
import { useFormStyles } from '../../../src/hooks/useFormStyles';
import AppInput from '../../../components/ui/AppInput';
import { useRTL, row, font, textAlign, textProps } from '../../../src/utils/rtl';
import { useCatalogHandlers } from '../../../src/hooks/useCatalogHandlers';

const ICONS = ['🧺', '🛋️', '👕', '🛏️', '🪟', '🧸', '📦', '🧣', '🧤', '🧦'];

const keyById = (item: { id: any }) => String(item.id);

export default function CatalogScreen() {
  const { t, isRTL: isArabic } = useRTL();
  const f = useFormStyles();
  const h = useCatalogHandlers(t);

  const PRICING_METHODS: Record<string, { label: string; color: string; icon: any }> = {
    PER_M2: { label: t('admin.catalog.pricing.per_m2'), color: AdminColors.primary, icon: 'square-outline' },
    PER_UNIT: { label: t('admin.catalog.pricing.per_unit'), color: '#3B82F6', icon: 'list-outline' },
    PER_KG: { label: t('admin.catalog.pricing.per_kg'), color: '#F59E0B', icon: 'scale-outline' },
    PER_LINEAR_M: { label: t('admin.catalog.pricing.per_linear_m'), color: '#8B5CF6', icon: 'resize-outline' },
    CUSTOM: { label: t('admin.catalog.pricing.custom'), color: AdminColors.textMuted, icon: 'create-outline' },
  };

  const baseUrl = BASE_URL;

  const renderProduct = (product: any) => {
    const method = PRICING_METHODS[product.pricingMethod] || PRICING_METHODS.PER_UNIT;
    return (
      <View key={product.id} style={[styles.productRow, !product.isActive && { opacity: 0.6 }, row(isArabic)]}>
        <View style={styles.productIconBox}>
          {product.imageUrl ? (
            <Image source={{ uri: `${baseUrl}${product.imageUrl}` }} style={styles.productImg} />
          ) : (
            <Ionicons name="cube-outline" size={20} color={AdminColors.primary} />
          )}
        </View>
        <View style={[styles.productInfo, { alignItems: isArabic ? 'flex-end' : 'flex-start' }]}>
          <Text style={[styles.productName, textAlign(isArabic), font.semibold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{product.nom}</Text>
          <View style={[styles.pricingBadge, { backgroundColor: method.color + '15' }]}>
            <Text style={[styles.pricingBadgeText, { color: method.color }]}>{method.label.toUpperCase()}</Text>
          </View>
        </View>
        <View style={[styles.productRight, row(isArabic)]}>
          <Text style={[styles.productPrice, textAlign(isArabic), font.bold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
            {product.pricingMethod === 'CUSTOM' ? t('admin.catalog.pricing.custom') : `${product.prixUnitaire} ${t('common.dh')}`}
          </Text>
          <TouchableOpacity style={styles.editProductIcon} onPress={() => h.openEditProduct(product)}>
            <Ionicons name="pencil" size={16} color={AdminColors.textMuted} />
          </TouchableOpacity>
          <Switch
            value={product.isActive}
            onValueChange={() => h.handleToggleProduct(product.id)}
            trackColor={{ false: '#D1D5DB', true: AdminColors.primary }}
            thumbColor="white"
            style={{ transform: [{ scale: 0.8 }] }}
          />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={[styles.headerContent, row(isArabic)]}>
          <Text style={[styles.headerTitle, font.bold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{t('admin.catalog.title')}</Text>
          <TouchableOpacity
            style={[styles.editCatBtn, row(isArabic)]}
            onPress={() => h.selectedCategory && h.openEditCategory(h.selectedCategory)}
          >
            <Ionicons name="settings-outline" size={18} color={AdminColors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.tabsScroll, row(isArabic)]}>
            {h.categories.map(cat => {
              const isActive = h.selectedCategoryId === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryTab, isActive && styles.activeCategoryTab, row(isArabic)]}
                  onPress={() => h.setSelectedCategoryId(cat.id)}
                >
                  <Text style={[styles.categoryTabIcon, isActive && styles.activeCategoryTabText]}>{cat.icon || '📦'}</Text>
                  <Text style={[styles.categoryTabText, isActive && styles.activeCategoryTabText]}>
                    {isArabic && cat.nomAr ? cat.nomAr : cat.nom}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={[styles.addTabBtn, row(isArabic)]} onPress={h.openCreateCategory}>
              <Ionicons name="add" size={20} color={AdminColors.primary} />
              <Text style={styles.addTabText}>{t('common.add')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </SafeAreaView>

      <FlatList
        data={h.productsToShow}
        renderItem={({ item }: { item: any }) => renderProduct(item)}
        keyExtractor={keyById}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={h.refreshing} onRefresh={() => { h.setRefreshing(true); h.fetchData(); }} tintColor={AdminColors.primary} />}
        ListHeaderComponent={
          h.selectedCategory ? (
            <View style={[styles.categoryOverview, { alignItems: isArabic ? 'flex-end' : 'flex-start' }]}>
              <View style={[styles.categoryStatus, row(isArabic)]}>
                <Text style={[styles.categoryInfoTitle, font.bold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
                  {isArabic && h.selectedCategory.nomAr ? h.selectedCategory.nomAr : h.selectedCategory.nom}
                </Text>
                <Switch
                  value={h.selectedCategory.isActive}
                  onValueChange={() => h.handleToggleCategory(h.selectedCategory.id)}
                  trackColor={{ false: '#D1D5DB', true: AdminColors.primary }}
                  thumbColor="white"
                  style={{ transform: [{ scale: 0.8 }] }}
                />
              </View>
              <Text style={styles.productCountText}>{h.productsToShow.length} {t('admin.catalog.products_count')}</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          h.loading ? (
            <View style={{ padding: 16 }}>{Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)}</View>
          ) : (
            <EmptyState icon="🏷️" title={t('admin.catalog.empty_title')} subtitle={t('admin.catalog.empty_subtitle')} />
          )
        }
      />

      {h.selectedCategoryId && (
        <TouchableOpacity style={styles.fab} onPress={() => h.openCreateProduct(h.selectedCategoryId!)}>
          <Ionicons name="add" size={30} color="white" />
        </TouchableOpacity>
      )}

      {/* Category Modal */}
      <Modal visible={h.categoryModal.open} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={[styles.modalHeader, row(isArabic)]}>
            <Text style={[styles.modalTitle, font.bold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
              {h.categoryModal.data ? t('admin.catalog.edit_category') : t('admin.catalog.new_category')}
            </Text>
            <TouchableOpacity onPress={h.closeCategoryModal}>
              <Ionicons name="close" size={24} color={AdminColors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <View style={styles.formField}>
              <Text style={[styles.label, f.label]}>{t('admin.catalog.category_image')}</Text>
              <View style={styles.imagePickerContainer}>
                {h.catForm.imageUrl ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: `${baseUrl}${h.catForm.imageUrl}` }} style={styles.imagePreview} />
                    <TouchableOpacity style={styles.removeImageBtn} onPress={() => h.setCatForm({ ...h.catForm, imageUrl: '' })}>
                      <Ionicons name="close-circle" size={24} color={AdminColors.danger} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.pickImageBtn} onPress={() => h.pickImage('category')} disabled={h.isUploading}>
                    {h.isUploading ? <ActivityIndicator color={AdminColors.primary} /> : (
                      <>
                        <Ionicons name="camera-outline" size={32} color={AdminColors.textMuted} />
                        <Text style={styles.pickImageText}>{t('common.add_image')}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.formField}>
              <AppInput label={t('admin.catalog.category_name')} value={h.catForm.nom} onChangeText={v => h.setCatForm({ ...h.catForm, nom: v })} placeholder={t('admin.catalog.search_placeholder')} lang="fr" />
            </View>
            <View style={styles.formField}>
              <AppInput label={t('admin.catalog.category_name_ar')} value={h.catForm.nomAr} onChangeText={v => h.setCatForm({ ...h.catForm, nomAr: v })} lang="ar" />
            </View>

            <View style={styles.formField}>
              <Text style={[styles.label, f.label]}>{t('admin.catalog.category_icon')}</Text>
              <View style={[styles.iconGrid, row(isArabic)]}>
                {ICONS.map(icon => (
                  <TouchableOpacity key={icon} style={[styles.iconCell, h.catForm.icon === icon && styles.activeIconCell]} onPress={() => h.setCatForm({ ...h.catForm, icon })}>
                    <Text style={{ fontSize: 24 }}>{icon}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={h.saveCategory}>
              <Text style={styles.primaryBtnText}>{t('common.save')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Product Modal */}
      <Modal visible={h.productModal.open} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={[styles.modalHeader, row(isArabic)]}>
            <Text style={[styles.modalTitle, font.bold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
              {h.productModal.data ? t('admin.catalog.edit_product') : t('admin.catalog.new_product')}
            </Text>
            <TouchableOpacity onPress={h.closeProductModal}>
              <Ionicons name="close" size={24} color={AdminColors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <View style={styles.formField}>
              <Text style={[styles.label, f.label]}>{t('admin.catalog.product_image')}</Text>
              <View style={styles.imagePickerContainer}>
                {h.prodForm.imageUrl ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: `${baseUrl}${h.prodForm.imageUrl}` }} style={styles.imagePreview} />
                    <TouchableOpacity style={styles.removeImageBtn} onPress={() => h.setProdForm({ ...h.prodForm, imageUrl: '' })}>
                      <Ionicons name="close-circle" size={24} color={AdminColors.danger} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.pickImageBtn} onPress={() => h.pickImage('product')} disabled={h.isUploading}>
                    {h.isUploading ? <ActivityIndicator color={AdminColors.primary} /> : (
                      <>
                        <Ionicons name="camera-outline" size={32} color={AdminColors.textMuted} />
                        <Text style={styles.pickImageText}>{t('common.add_image')}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.formField}>
              <AppInput label={t('admin.catalog.product_name')} value={h.prodForm.nom} onChangeText={v => h.setProdForm({ ...h.prodForm, nom: v })} />
            </View>
            <View style={styles.formField}>
              <AppInput label={t('admin.catalog.description')} value={h.prodForm.description} onChangeText={v => h.setProdForm({ ...h.prodForm, description: v })} multiline inputStyle={{ height: 80, textAlignVertical: 'top' }} />
            </View>

            <View style={styles.formField}>
              <Text style={[styles.label, f.label]}>{t('admin.catalog.pricing_method')}</Text>
              <View style={[styles.methodGrid, row(isArabic)]}>
                {Object.entries(PRICING_METHODS).map(([key, m]) => (
                  <TouchableOpacity key={key} style={[styles.methodCard, h.prodForm.pricingMethod === key && styles.activeMethodCard]} onPress={() => h.setProdForm({ ...h.prodForm, pricingMethod: key })}>
                    <Ionicons name={m.icon} size={24} color={h.prodForm.pricingMethod === key ? AdminColors.primary : AdminColors.textMuted} />
                    <Text style={[styles.methodLabel, h.prodForm.pricingMethod === key && { color: AdminColors.primary }]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {h.prodForm.pricingMethod !== 'CUSTOM' && (
              <View style={[styles.formRow, row(isArabic)]}>
                <View style={[styles.formField, { flex: 1 }]}>
                  <AppInput label={t('admin.catalog.price_dh')} keyboardType="numeric" value={h.prodForm.prixUnitaire} onChangeText={v => h.setProdForm({ ...h.prodForm, prixUnitaire: v })} forceDir="ltr" />
                </View>
                {h.prodForm.pricingMethod === 'PER_UNIT' && (
                  <View style={[styles.formField, { flex: 1, marginStart: 12 }]}>
                    <AppInput label={t('admin.catalog.unit')} value={h.prodForm.uniteLabel} onChangeText={v => h.setProdForm({ ...h.prodForm, uniteLabel: v })} />
                  </View>
                )}
              </View>
            )}

            <View style={styles.formField}>
              <Text style={[styles.label, f.label]}>{t('admin.catalog.delay_days')}</Text>
              <View style={[styles.stepper, row(isArabic)]}>
                <TouchableOpacity style={styles.stepBtn} onPress={() => h.setProdForm({ ...h.prodForm, processingDays: Math.max(1, h.prodForm.processingDays - 1) })}>
                  <Ionicons name="remove" size={20} color={AdminColors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.stepValue}>{h.prodForm.processingDays}</Text>
                <TouchableOpacity style={styles.stepBtn} onPress={() => h.setProdForm({ ...h.prodForm, processingDays: h.prodForm.processingDays + 1 })}>
                  <Ionicons name="add" size={20} color={AdminColors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={h.saveProduct}>
              <Text style={styles.primaryBtnText}>{t('common.save')}</Text>
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AdminColors.bg },
  headerSafe: { backgroundColor: 'white', ...AdminShadows.shadowSmall, zIndex: 10 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: AdminColors.textPrimary },
  editCatBtn: { padding: 8, borderRadius: 10, backgroundColor: AdminColors.primary100 },
  tabsContainer: { paddingBottom: 8 },
  tabsScroll: { paddingHorizontal: 16, gap: 10, alignItems: 'center' },
  categoryTab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: AdminColors.surface2, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', gap: 6 },
  activeCategoryTab: { backgroundColor: AdminColors.primary, borderColor: AdminColors.primary },
  categoryTabIcon: { fontSize: 16 },
  categoryTabText: { fontSize: 13, fontWeight: '600', color: AdminColors.textSecondary },
  activeCategoryTabText: { color: 'white' },
  addTabBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: AdminColors.primary, borderStyle: 'dashed', gap: 4 },
  addTabText: { fontSize: 13, fontWeight: '600', color: AdminColors.primary },
  listContent: { padding: 16, paddingBottom: 100 },
  categoryOverview: { marginBottom: 16 },
  categoryStatus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  categoryInfoTitle: { fontSize: 18, fontWeight: '700', color: AdminColors.textPrimary },
  productCountText: { fontSize: 12, color: AdminColors.textMuted, fontWeight: '500' },
  productRow: { backgroundColor: 'white', borderRadius: 16, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12, ...AdminShadows.shadowSmall },
  productIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: AdminColors.primary100, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  productImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  productInfo: { flex: 1 },
  productName: { fontSize: 15, fontWeight: '600', color: AdminColors.textPrimary, marginBottom: 4 },
  pricingBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  pricingBadgeText: { fontSize: 8, fontWeight: '800' },
  productRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  productPrice: { fontSize: 15, fontWeight: '700', color: AdminColors.primary },
  editProductIcon: { padding: 6 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: AdminColors.primary, alignItems: 'center', justifyContent: 'center', ...AdminShadows.shadowTeal, elevation: 5 },
  modalContainer: { flex: 1, backgroundColor: 'white' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: AdminColors.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: AdminColors.textPrimary },
  modalBody: { padding: 20 },
  formField: { marginBottom: 20 },
  formRow: { flexDirection: 'row', marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '700', color: AdminColors.textSecondary, marginBottom: 8 },
  imagePickerContainer: { marginTop: 4 },
  pickImageBtn: { height: 100, borderRadius: 14, backgroundColor: AdminColors.surface2, borderWidth: 1.5, borderColor: AdminColors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 8 },
  pickImageText: { fontSize: 13, fontWeight: '600', color: AdminColors.textMuted },
  imagePreviewContainer: { position: 'relative', height: 120, width: 120, alignSelf: 'center' },
  imagePreview: { height: '100%', width: '100%', borderRadius: 14, backgroundColor: AdminColors.surface2 },
  removeImageBtn: { position: 'absolute', top: -10, right: -10, backgroundColor: 'white', borderRadius: 12 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  iconCell: { width: 48, height: 48, borderRadius: 12, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center', backgroundColor: AdminColors.surface2 },
  activeIconCell: { borderColor: AdminColors.primary, backgroundColor: AdminColors.primary100 },
  methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  methodCard: { width: '48%', backgroundColor: 'white', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  activeMethodCard: { borderColor: AdminColors.primary, backgroundColor: AdminColors.primary100 },
  methodLabel: { fontSize: 12, fontWeight: '600', color: AdminColors.textSecondary, marginTop: 6 },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: AdminColors.surface2, borderRadius: 12, alignSelf: 'flex-start' },
  stepBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontSize: 16, fontWeight: '700', color: AdminColors.textPrimary, paddingHorizontal: 16 },
  primaryBtn: { backgroundColor: AdminColors.primary, borderRadius: 14, height: 54, alignItems: 'center', justifyContent: 'center', marginTop: 10, ...AdminShadows.shadowTeal },
  primaryBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
});
