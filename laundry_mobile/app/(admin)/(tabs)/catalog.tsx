import React, { useState, useEffect, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Switch, 
  Modal, 
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AdminColors, AdminShadows } from '../../../constants/AdminColors';
import { adminApi } from '../../../src/services/adminApi';
import { SkeletonCard } from '../../../components/admin/SkeletonCard';
import { EmptyState } from '../../../components/admin/EmptyState';

import { useFormStyles } from '../../../src/hooks/useFormStyles';
import AppInput from '../../../components/ui/AppInput';
import { useRTL, row, font, textAlign, textProps } from '../../../src/utils/rtl';
import { logger } from '../../../src/lib/logger';

const log = logger.ns('catalog');

export default function CatalogScreen() {
  const { t, isRTL: isArabic } = useRTL();
  const f = useFormStyles();

  const PRICING_METHODS: Record<string, { label: string, color: string, icon: any }> = {
    PER_M2: { label: t('admin.catalog.pricing.per_m2'), color: AdminColors.primary, icon: 'square-outline' },
    PER_UNIT: { label: t('admin.catalog.pricing.per_unit'), color: '#3B82F6', icon: 'list-outline' },
    PER_KG: { label: t('admin.catalog.pricing.per_kg'), color: '#F59E0B', icon: 'scale-outline' },
    PER_LINEAR_M: { label: t('admin.catalog.pricing.per_linear_m'), color: '#8B5CF6', icon: 'resize-outline' },
    CUSTOM: { label: t('admin.catalog.pricing.custom'), color: AdminColors.textMuted, icon: 'create-outline' },
  };

  const ICONS = ['🧺', '🛋️', '👕', '🛏️', '🪟', '🧸', '📦', '🧣', '🧤', '🧦'];

  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Modal states
  const [categoryModal, setCategoryModal] = useState({ open: false, data: null as any });
  const [productModal, setProductModal] = useState({ open: false, categoryId: null as number | null, data: null as any });
  
  const [catForm, setCatForm] = useState({ nom: '', nomAr: '', icon: '🧺', imageUrl: '' });
  const [prodForm, setProdForm] = useState({ 
    nom: '', 
    description: '', 
    pricingMethod: 'PER_UNIT', 
    prixUnitaire: '', 
    uniteLabel: t('admin.catalog.unit_piece'),
    processingDays: 2,
    imageUrl: ''
  });

  const fetchData = async () => {
    try {
      const res = await adminApi.getCategories();
      const fetchedCategories = res.data.data || res.data;
      setCategories(fetchedCategories);
      if (fetchedCategories.length > 0 && selectedCategoryId === null) {
        setSelectedCategoryId(fetchedCategories[0].id);
      }
    } catch (error) {
      log.error('Fetch catalog error', { err: String(error) });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleCategory = async (id: number, current: boolean) => {
    try {
      await adminApi.toggleCategory(id);
      fetchData();
    } catch (error) {
      Alert.alert(t('common.error'), t('common.error_msg'));
    }
  };

  const handleToggleProduct = async (id: number) => {
    try {
      await adminApi.toggleProduct(id);
      fetchData();
    } catch (error) {
      Alert.alert(t('common.error'), t('common.error_msg'));
    }
  };

  const pickImage = async (type: 'category' | 'product') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      const file = result.assets[0];
      uploadImage(file, type);
    }
  };

  const uploadImage = async (file: any, type: 'category' | 'product') => {
    setIsUploading(true);
    try {
      const res = await adminApi.uploadFiles([{
        uri: file.uri,
        name: `upload_${Date.now()}.jpg`,
        type: 'image/jpeg'
      }]);
      
      // The backend returns a List<String>, so res.data[0] is the path
      const imageUrl = res.data[0];
      if (imageUrl) {
        if (type === 'category') {
          setCatForm(prev => ({ ...prev, imageUrl }));
        } else {
          setProdForm(prev => ({ ...prev, imageUrl }));
        }
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('admin.items.photo_error'));
    } finally {
      setIsUploading(false);
    }
  };

  const saveCategory = async () => {
    try {
      if (!catForm.nom) return Alert.alert(t('common.error'), t('admin.catalog.category_name_required'));
      
      if (categoryModal.data) {
        await adminApi.updateCategory(categoryModal.data.id, catForm);
      } else {
        await adminApi.createCategory(catForm);
      }
      
      setCategoryModal({ open: false, data: null });
      fetchData();
    } catch (error) {
      Alert.alert(t('common.error'), t('common.error_msg'));
    }
  };

  const saveProduct = async () => {
    try {
      if (!prodForm.nom || !prodForm.prixUnitaire) return Alert.alert(t('common.error'), t('admin.catalog.product_required_fields'));
      
      const payload = {
        ...prodForm,
        prixUnitaire: parseFloat(prodForm.prixUnitaire)
      };

      if (productModal.data) {
        await adminApi.updateProduct(productModal.data.id, payload);
      } else if (productModal.categoryId) {
        await adminApi.createProduct(productModal.categoryId, payload);
      }
      
      setProductModal({ open: false, categoryId: null, data: null });
      fetchData();
    } catch (error) {
      Alert.alert(t('common.error'), t('common.error_msg'));
    }
  };

  const renderProduct = (product: any) => {
    const method = PRICING_METHODS[product.pricingMethod] || PRICING_METHODS.PER_UNIT;
    return (
      <View key={product.id} style={[styles.productRow, !product.isActive && { opacity: 0.6 }, row(isArabic)]}>
        <View style={styles.productIconBox}>
          {product.imageUrl ? (
            <Image source={{ uri: `${adminApi.getOrderPdfUrl(1).split('/api/')[0]}${product.imageUrl}` }} style={styles.productImg} />
          ) : (
            <Ionicons name="cube-outline" size={20} color={AdminColors.primary} />
          )}
        </View>

        <View style={[styles.productInfo, { alignItems: isArabic ? 'flex-end' : 'flex-start' }]}>
          <Text style={[styles.productName, textAlign(isArabic), font.semibold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{product.nom}</Text>
          <View style={[styles.pricingBadge, { backgroundColor: method.color + '15' }]}>
            <Text style={[styles.pricingBadgeText, { color: method.color }]}>{isArabic ? method.label : method.label.toUpperCase()}</Text>
          </View>
        </View>

        <View style={[styles.productRight, row(isArabic)]}>
          <Text style={[styles.productPrice, textAlign(isArabic), font.bold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
            {product.pricingMethod === 'CUSTOM' ? t('admin.catalog.pricing.custom') : `${product.prixUnitaire} ${t('common.dh')}`}
          </Text>

          <TouchableOpacity style={styles.editProductIcon} onPress={() => {
            setProdForm({
              nom: product.nom,
              description: product.description || '',
              pricingMethod: product.pricingMethod,
              prixUnitaire: product.prixUnitaire?.toString() || '',
              uniteLabel: product.uniteLabel || t('admin.catalog.unit_piece'),
              processingDays: product.processingDays || 2,
              imageUrl: product.imageUrl || ''
            });
            setProductModal({ open: true, categoryId: null, data: product });
          }}>
            <Ionicons name="pencil" size={16} color={AdminColors.textMuted} />
          </TouchableOpacity>

          <Switch 
            value={product.isActive}
            onValueChange={() => handleToggleProduct(product.id)}
            trackColor={{ false: '#D1D5DB', true: AdminColors.primary }}
            thumbColor="white"
            style={{ transform: [{ scale: 0.8 }] }}
          />
        </View>
      </View>
    );
  };

  const renderCategoryTab = ({ item }: { item: any }) => {
    const isActive = selectedCategoryId === item.id;
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.categoryTab, isActive && styles.activeCategoryTab, row(isArabic)]}
        onPress={() => setSelectedCategoryId(item.id)}
      >
        <Text style={[styles.categoryTabIcon, isActive && styles.activeCategoryTabText]}>{item.icon || '📦'}</Text>
        <Text style={[styles.categoryTabText, isActive && styles.activeCategoryTabText]}>
          {isArabic && item.nomAr ? item.nomAr : item.nom}
        </Text>
      </TouchableOpacity>
    );
  };

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  const productsToShow = selectedCategory?.products || [];

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={[styles.headerContent, row(isArabic)]}>
          <Text style={[styles.headerTitle, font.bold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{t('admin.catalog.title')}</Text>
          <TouchableOpacity
            style={[styles.editCatBtn, row(isArabic)]}
            onPress={() => {
              if (selectedCategory) {
                setCatForm({ nom: selectedCategory.nom, nomAr: selectedCategory.nomAr || '', icon: selectedCategory.icon || '🧺', imageUrl: selectedCategory.imageUrl || '' });
                setCategoryModal({ open: true, data: selectedCategory });
              }
            }}
          >
            <Ionicons name="settings-outline" size={18} color={AdminColors.primary} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.tabsContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={[styles.tabsScroll, row(isArabic)]}

          >
            {categories.map(cat => renderCategoryTab({ item: cat }))}
            <TouchableOpacity 
              style={[styles.addTabBtn, row(isArabic)]}
              onPress={() => {
                setCatForm({ nom: '', nomAr: '', icon: '🧺', imageUrl: '' });
                setCategoryModal({ open: true, data: null });
              }}
            >
              <Ionicons name="add" size={20} color={AdminColors.primary} />
              <Text style={styles.addTabText}>{t('common.add')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </SafeAreaView>

      <FlatList
        data={productsToShow}
        renderItem={({ item }) => renderProduct(item)}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={AdminColors.primary} />}
        ListHeaderComponent={
          selectedCategory && (
            <View style={[styles.categoryOverview, { alignItems: isArabic ? 'flex-end' : 'flex-start' }]}>
              <View style={[styles.categoryStatus, row(isArabic)]}>
                <Text style={[styles.categoryInfoTitle, font.bold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{isArabic && selectedCategory.nomAr ? selectedCategory.nomAr : selectedCategory.nom}</Text>
                <Switch 
                  value={selectedCategory.isActive}
                  onValueChange={() => handleToggleCategory(selectedCategory.id, selectedCategory.isActive)}
                  trackColor={{ false: '#D1D5DB', true: AdminColors.primary }}
                  thumbColor="white"
                  style={{ transform: [{ scale: 0.8 }] }}
                />
              </View>
              <Text style={styles.productCountText}>{productsToShow.length} {t('admin.catalog.products_count')}</Text>
            </View>
          )
        }
        ListEmptyComponent={
          loading ? (
            <View style={{ padding: 16 }}>
              {Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)}
            </View>
          ) : (
            <EmptyState icon="🏷️" title={t('admin.catalog.empty_title')} subtitle={t('admin.catalog.empty_subtitle')} />
          )
        }
      />

      {selectedCategoryId && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => {
            setProdForm({ nom: '', description: '', pricingMethod: 'PER_UNIT', prixUnitaire: '', uniteLabel: t('admin.catalog.unit_piece'), processingDays: 2, imageUrl: '' });
            setProductModal({ open: true, categoryId: selectedCategoryId, data: null });
          }}
        >
          <Ionicons name="add" size={30} color="white" />
        </TouchableOpacity>
      )}

      {/* Category Modal */}
      <Modal visible={categoryModal.open} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={[styles.modalHeader, row(isArabic)]}>
            <Text style={[styles.modalTitle, font.bold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{categoryModal.data ? t('admin.catalog.edit_category') : t('admin.catalog.new_category')}</Text>
            <TouchableOpacity onPress={() => setCategoryModal({ open: false, data: null })}>
              <Ionicons name="close" size={24} color={AdminColors.textPrimary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <View style={styles.formField}>
              <Text style={[styles.label, f.label]}>{t('admin.catalog.category_image')}</Text>
              <View style={styles.imagePickerContainer}>
                {catForm.imageUrl ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: `${adminApi.getOrderPdfUrl(1).split('/api/')[0]}${catForm.imageUrl}` }} style={styles.imagePreview} />
                    <TouchableOpacity style={styles.removeImageBtn} onPress={() => setCatForm({ ...catForm, imageUrl: '' })}>
                      <Ionicons name="close-circle" size={24} color={AdminColors.danger} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.pickImageBtn} onPress={() => pickImage('category')} disabled={isUploading}>
                    {isUploading ? (
                      <ActivityIndicator color={AdminColors.primary} />
                    ) : (
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
              <AppInput
                label={t('admin.catalog.category_name')}
                value={catForm.nom}
                onChangeText={v => setCatForm({...catForm, nom: v})}
                placeholder={t('admin.catalog.search_placeholder')}
                lang="fr"
              />
            </View>

            <View style={styles.formField}>
              <AppInput
                label={t('admin.catalog.category_name_ar')}
                value={catForm.nomAr}
                onChangeText={v => setCatForm({...catForm, nomAr: v})}
                lang="ar"
              />
            </View>

            <View style={styles.formField}>
              <Text style={[styles.label, f.label]}>{t('admin.catalog.category_icon')}</Text>
              <View style={[styles.iconGrid, row(isArabic)]}>
                {ICONS.map(icon => (
                  <TouchableOpacity 
                    key={icon} 
                    style={[styles.iconCell, catForm.icon === icon && styles.activeIconCell]}
                    onPress={() => setCatForm({...catForm, icon})}
                  >
                    <Text style={{ fontSize: 24 }}>{icon}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={saveCategory}>
              <Text style={styles.primaryBtnText}>{t('common.save')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Product Modal */}
      <Modal visible={productModal.open} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={[styles.modalHeader, row(isArabic)]}>
            <Text style={[styles.modalTitle, font.bold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{productModal.data ? t('admin.catalog.edit_product') : t('admin.catalog.new_product')}</Text>
            <TouchableOpacity onPress={() => setProductModal({ open: false, categoryId: null, data: null })}>
              <Ionicons name="close" size={24} color={AdminColors.textPrimary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <View style={styles.formField}>
              <Text style={[styles.label, f.label]}>{t('admin.catalog.product_image')}</Text>
              <View style={styles.imagePickerContainer}>
                {prodForm.imageUrl ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: `${adminApi.getOrderPdfUrl(1).split('/api/')[0]}${prodForm.imageUrl}` }} style={styles.imagePreview} />
                    <TouchableOpacity style={styles.removeImageBtn} onPress={() => setProdForm({ ...prodForm, imageUrl: '' })}>
                      <Ionicons name="close-circle" size={24} color={AdminColors.danger} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.pickImageBtn} onPress={() => pickImage('product')} disabled={isUploading}>
                    {isUploading ? (
                      <ActivityIndicator color={AdminColors.primary} />
                    ) : (
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
              <AppInput
                label={t('admin.catalog.product_name')}
                value={prodForm.nom}
                onChangeText={v => setProdForm({...prodForm, nom: v})}
              />
            </View>

            <View style={styles.formField}>
              <AppInput
                label={t('admin.catalog.description')}
                value={prodForm.description}
                onChangeText={v => setProdForm({...prodForm, description: v})}
                multiline
                inputStyle={{ height: 80, textAlignVertical: 'top' }}
              />
            </View>

            <View style={styles.formField}>
              <Text style={[styles.label, f.label]}>{t('admin.catalog.pricing_method')}</Text>
              <View style={[styles.methodGrid, row(isArabic)]}>
                {Object.entries(PRICING_METHODS).map(([key, m]) => (
                  <TouchableOpacity 
                    key={key} 
                    style={[styles.methodCard, prodForm.pricingMethod === key && styles.activeMethodCard]}
                    onPress={() => setProdForm({...prodForm, pricingMethod: key})}
                  >
                    <Ionicons name={m.icon} size={24} color={prodForm.pricingMethod === key ? AdminColors.primary : AdminColors.textMuted} />
                    <Text style={[styles.methodLabel, prodForm.pricingMethod === key && { color: AdminColors.primary }]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {prodForm.pricingMethod !== 'CUSTOM' && (
              <View style={[styles.formRow, row(isArabic)]}>
                <View style={[styles.formField, { flex: 1 }]}>
                  <AppInput
                    label={t('admin.catalog.price_dh')}
                    keyboardType="numeric"
                    value={prodForm.prixUnitaire}
                    onChangeText={v => setProdForm({...prodForm, prixUnitaire: v})}
                    forceDir="ltr"
                  />
                </View>
                {prodForm.pricingMethod === 'PER_UNIT' && (
                  <View style={[styles.formField, { flex: 1, marginStart: 12 }]}>
                    <AppInput
                      label={t('admin.catalog.unit')}
                      value={prodForm.uniteLabel}
                      onChangeText={v => setProdForm({...prodForm, uniteLabel: v})}
                    />
                  </View>
                )}
              </View>
            )}

            <View style={styles.formField}>
              <Text style={[styles.label, f.label]}>{t('admin.catalog.delay_days')}</Text>
              <View style={[styles.stepper, row(isArabic)]}>
                <TouchableOpacity 
                  style={styles.stepBtn} 
                  onPress={() => setProdForm({...prodForm, processingDays: Math.max(1, prodForm.processingDays - 1)})}
                >
                  <Ionicons name="remove" size={20} color={AdminColors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.stepValue}>{prodForm.processingDays}</Text>
                <TouchableOpacity 
                  style={styles.stepBtn}
                  onPress={() => setProdForm({...prodForm, processingDays: prodForm.processingDays + 1})}
                >
                  <Ionicons name="add" size={20} color={AdminColors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={saveProduct}>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: AdminColors.textPrimary,
  },
  editCatBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: AdminColors.primary100,
  },
  tabsContainer: {
    paddingBottom: 8,
  },
  tabsScroll: {
    paddingHorizontal: 16,
    gap: 10,
    alignItems: 'center',
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: AdminColors.surface2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    gap: 6,
  },
  activeCategoryTab: {
    backgroundColor: AdminColors.primary,
    borderColor: AdminColors.primary,
  },
  categoryTabIcon: {
    fontSize: 16,
  },
  categoryTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: AdminColors.textSecondary,
  },
  activeCategoryTabText: {
    color: 'white',
  },
  addTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AdminColors.primary,
    borderStyle: 'dashed',
    gap: 4,
  },
  addTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: AdminColors.primary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  categoryOverview: {
    marginBottom: 16,
  },
  categoryStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  categoryInfoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AdminColors.textPrimary,
  },
  productCountText: {
    fontSize: 12,
    color: AdminColors.textMuted,
    fontWeight: '500',
  },
  productRow: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...AdminShadows.shadowSmall,
  },
  productIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: AdminColors.primary100,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  productImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: AdminColors.textPrimary,
    marginBottom: 4,
  },
  pricingBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  pricingBadgeText: {
    fontSize: 8,
    fontWeight: '800',
  },
  productRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: AdminColors.primary,
  },
  editProductIcon: {
    padding: 6,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: AdminColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...AdminShadows.shadowTeal,
    elevation: 5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AdminColors.textPrimary,
  },
  modalBody: {
    padding: 20,
  },
  formField: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: AdminColors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: AdminColors.surface2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: AdminColors.textPrimary,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  imagePickerContainer: {
    marginTop: 4,
  },
  pickImageBtn: {
    height: 100,
    borderRadius: 14,
    backgroundColor: AdminColors.surface2,
    borderWidth: 1.5,
    borderColor: AdminColors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pickImageText: {
    fontSize: 13,
    fontWeight: '600',
    color: AdminColors.textMuted,
  },
  imagePreviewContainer: {
    position: 'relative',
    height: 120,
    width: 120,
    alignSelf: 'center',
  },
  imagePreview: {
    height: '100%',
    width: '100%',
    borderRadius: 14,
    backgroundColor: AdminColors.surface2,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  iconCell: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AdminColors.surface2,
  },
  activeIconCell: {
    borderColor: AdminColors.primary,
    backgroundColor: AdminColors.primary100,
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  methodCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  activeMethodCard: {
    borderColor: AdminColors.primary,
    backgroundColor: AdminColors.primary100,
  },
  methodLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: AdminColors.textSecondary,
    marginTop: 6,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AdminColors.surface2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  stepBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    fontSize: 16,
    fontWeight: '700',
    color: AdminColors.textPrimary,
    paddingHorizontal: 16,
  },
  primaryBtn: {
    backgroundColor: AdminColors.primary,
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    ...AdminShadows.shadowTeal,
  },
  primaryBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});
