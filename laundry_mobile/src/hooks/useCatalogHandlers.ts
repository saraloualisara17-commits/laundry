import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { adminApi } from '../services/adminApi';
import { logger } from '../lib/logger';

const log = logger.ns('catalog');

export interface CatForm {
  nom: string;
  nomAr: string;
  icon: string;
  imageUrl: string;
}

export interface ProdForm {
  nom: string;
  description: string;
  pricingMethod: string;
  prixUnitaire: string;
  uniteLabel: string;
  processingDays: number;
  imageUrl: string;
}

export function useCatalogHandlers(t: (key: string, options?: any) => string) {
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [categoryModal, setCategoryModal] = useState<{ open: boolean; data: any | null }>({ open: false, data: null });
  const [productModal, setProductModal] = useState<{ open: boolean; categoryId: number | null; data: any | null }>({ open: false, categoryId: null, data: null });

  const [catForm, setCatForm] = useState<CatForm>({ nom: '', nomAr: '', icon: '🧺', imageUrl: '' });
  const [prodForm, setProdForm] = useState<ProdForm>({
    nom: '', description: '', pricingMethod: 'PER_UNIT',
    prixUnitaire: '', uniteLabel: t('admin.catalog.unit_piece'),
    processingDays: 2, imageUrl: '',
  });

  const fetchData = useCallback(async () => {
    try {
      const res = await adminApi.getCategories();
      const fetched = res.data.data || res.data;
      setCategories(fetched);
      if (fetched.length > 0 && selectedCategoryId === null) {
        setSelectedCategoryId(fetched[0].id);
      }
    } catch (error) {
      log.error('Fetch catalog error', { err: String(error) });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategoryId]);

  useEffect(() => { fetchData(); }, []);

  const handleToggleCategory = useCallback(async (id: number) => {
    try {
      await adminApi.toggleCategory(id);
      fetchData();
    } catch {
      Alert.alert(t('common.error'), t('common.error_msg'));
    }
  }, [fetchData, t]);

  const handleToggleProduct = useCallback(async (id: number) => {
    try {
      await adminApi.toggleProduct(id);
      fetchData();
    } catch {
      Alert.alert(t('common.error'), t('common.error_msg'));
    }
  }, [fetchData, t]);

  const uploadImage = useCallback(async (file: any, type: 'category' | 'product') => {
    setIsUploading(true);
    try {
      const res = await adminApi.uploadFiles([{ uri: file.uri, name: `upload_${Date.now()}.jpg`, type: 'image/jpeg' }]);
      const imageUrl = res.data[0];
      if (imageUrl) {
        if (type === 'category') setCatForm(prev => ({ ...prev, imageUrl }));
        else setProdForm(prev => ({ ...prev, imageUrl }));
      }
    } catch {
      Alert.alert(t('common.error'), t('admin.items.photo_error'));
    } finally {
      setIsUploading(false);
    }
  }, [t]);

  const pickImage = useCallback(async (type: 'category' | 'product') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) uploadImage(result.assets[0], type);
  }, [uploadImage]);

  const openCreateCategory = useCallback(() => {
    setCatForm({ nom: '', nomAr: '', icon: '🧺', imageUrl: '' });
    setCategoryModal({ open: true, data: null });
  }, []);

  const openEditCategory = useCallback((category: any) => {
    setCatForm({ nom: category.nom, nomAr: category.nomAr || '', icon: category.icon || '🧺', imageUrl: category.imageUrl || '' });
    setCategoryModal({ open: true, data: category });
  }, []);

  const closeCategoryModal = useCallback(() => setCategoryModal({ open: false, data: null }), []);

  const saveCategory = useCallback(async () => {
    if (!catForm.nom) return Alert.alert(t('common.error'), t('admin.catalog.category_name_required'));
    try {
      if (categoryModal.data) {
        await adminApi.updateCategory(categoryModal.data.id, catForm);
      } else {
        await adminApi.createCategory(catForm);
      }
      setCategoryModal({ open: false, data: null });
      fetchData();
    } catch {
      Alert.alert(t('common.error'), t('common.error_msg'));
    }
  }, [catForm, categoryModal, fetchData, t]);

  const openCreateProduct = useCallback((categoryId: number) => {
    setProdForm({ nom: '', description: '', pricingMethod: 'PER_UNIT', prixUnitaire: '', uniteLabel: t('admin.catalog.unit_piece'), processingDays: 2, imageUrl: '' });
    setProductModal({ open: true, categoryId, data: null });
  }, [t]);

  const openEditProduct = useCallback((product: any) => {
    setProdForm({
      nom: product.nom,
      description: product.description || '',
      pricingMethod: product.pricingMethod,
      prixUnitaire: product.prixUnitaire?.toString() || '',
      uniteLabel: product.uniteLabel || t('admin.catalog.unit_piece'),
      processingDays: product.processingDays || 2,
      imageUrl: product.imageUrl || '',
    });
    setProductModal({ open: true, categoryId: null, data: product });
  }, [t]);

  const closeProductModal = useCallback(() => setProductModal({ open: false, categoryId: null, data: null }), []);

  const saveProduct = useCallback(async () => {
    if (!prodForm.nom || !prodForm.prixUnitaire) {
      return Alert.alert(t('common.error'), t('admin.catalog.product_required_fields'));
    }
    try {
      const payload = { ...prodForm, prixUnitaire: parseFloat(prodForm.prixUnitaire) };
      if (productModal.data) {
        await adminApi.updateProduct(productModal.data.id, payload);
      } else if (productModal.categoryId) {
        await adminApi.createProduct(productModal.categoryId, payload);
      }
      setProductModal({ open: false, categoryId: null, data: null });
      fetchData();
    } catch {
      Alert.alert(t('common.error'), t('common.error_msg'));
    }
  }, [prodForm, productModal, fetchData, t]);

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  const productsToShow = selectedCategory?.products || [];

  return {
    categories, selectedCategoryId, setSelectedCategoryId,
    loading, refreshing, setRefreshing, isUploading,
    fetchData,
    handleToggleCategory, handleToggleProduct,
    pickImage,
    categoryModal, catForm, setCatForm,
    openCreateCategory, openEditCategory, closeCategoryModal, saveCategory,
    productModal, prodForm, setProdForm,
    openCreateProduct, openEditProduct, closeProductModal, saveProduct,
    selectedCategory, productsToShow,
  };
}
