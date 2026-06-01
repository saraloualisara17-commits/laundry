import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { compressImage } from '../services/uploads/imageCompression';
import { uploadManager } from '../services/uploads';
import { ordersApi } from '../services/api/ordersApi';
import { queryKeys } from '../services/query/queryKeys';
import { OrderItem, useOrderCreation } from '../context/OrderCreationContext';
import { logger } from '../lib/logger';

const log = logger.ns('order-items');

export interface ConfigForm {
  qty: number;
  largura: string;
  hauteur: string;
  longueur: string;
  poids: string;
  customPrice: string;
  noteAtelier: string;
  hasRemise?: boolean;
  remiseMontant?: string;
}

const EMPTY_FORM: ConfigForm = {
  qty: 1, largura: '', hauteur: '', longueur: '', poids: '',
  customPrice: '', noteAtelier: '',
};

export function calculateItemPrice(prod: any, form: ConfigForm): number {
  if (!prod) return 0;
  const base = prod.prixUnitaire || 0;
  let calculated = 0;
  switch (prod.pricingMethod) {
    case 'PER_M2':
      calculated = (parseFloat(form.largura) || 0) * (parseFloat(form.hauteur) || 0) * base;
      break;
    case 'PER_UNIT':
      calculated = (form.qty || 1) * base;
      break;
    case 'PER_KG':
      calculated = (parseFloat(form.poids) || 0) * base;
      break;
    case 'PER_LINEAR_M':
      calculated = (parseFloat(form.longueur) || 0) * base;
      break;
    case 'CUSTOM':
      calculated = parseFloat(form.customPrice) || 0;
      break;
    default:
      calculated = (form.qty || 1) * base;
  }
  if (form.hasRemise) calculated -= (parseFloat(form.remiseMontant || '') || 0);
  return Math.max(0, calculated);
}

export function useOrderItemsHandlers(products: any[], t: (key: string, options?: any) => string) {
  const qc = useQueryClient();
  const {
    addItem, removeItem, updateItem,
    orderImages, setOrderImages,
    setPaidAmount, setOrderNotes,
    pickupOrderId, clearOrder,
  } = useOrderCreation();

  // ── Config modal ──────────────────────────────────────────────────────────────
  const [configModal, setConfigModal] = useState<{ open: boolean; product: any; editCartId: string | null }>({
    open: false, product: null, editCartId: null,
  });
  const [configForm, setConfigForm] = useState<ConfigForm>(EMPTY_FORM);

  const openAdd = useCallback((product: any) => {
    setConfigForm(EMPTY_FORM);
    setConfigModal({ open: true, product, editCartId: null });
  }, []);

  const openEdit = useCallback((item: OrderItem) => {
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
  }, [products]);

  const closeConfigModal = useCallback(() => {
    setConfigModal({ open: false, product: null, editCartId: null });
  }, []);

  const handleSaveItem = useCallback(() => {
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

    if (editCartId) updateItem(editCartId, newItem);
    else addItem(newItem);
    closeConfigModal();
  }, [configModal, configForm, addItem, updateItem, closeConfigModal, t]);

  // ── Payment dialog ────────────────────────────────────────────────────────────
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [tempPaid, setTempPaid] = useState('');

  const openPaymentDialog = useCallback((currentPaid: number) => {
    setTempPaid(currentPaid.toString());
    setShowPaymentDialog(true);
  }, []);

  const confirmPayment = useCallback(() => {
    setPaidAmount(parseFloat(tempPaid) || 0);
    setShowPaymentDialog(false);
  }, [tempPaid, setPaidAmount]);

  // ── Notes dialog ──────────────────────────────────────────────────────────────
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [tempNotes, setTempNotes] = useState('');

  const openNotesDialog = useCallback((currentNotes: string) => {
    setTempNotes(currentNotes);
    setShowNotesDialog(true);
  }, []);

  const confirmNotes = useCallback(() => {
    setOrderNotes(tempNotes);
    setShowNotesDialog(false);
  }, [tempNotes, setOrderNotes]);

  // ── Image picker ──────────────────────────────────────────────────────────────
  const launchPicker = useCallback(async (source: 'camera' | 'gallery') => {
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('admin.orders.location_permission_denied'));
        return null;
      }
      return ImagePicker.launchCameraAsync({ mediaTypes: ['images'] as any, quality: 1 });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('admin.orders.location_permission_denied'));
        return null;
      }
      return ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] as any, quality: 1, allowsMultipleSelection: false, selectionLimit: 1 });
    }
  }, [t]);

  const pickImage = useCallback(async (source: 'camera' | 'gallery' = 'camera') => {
    try {
      const result = await launchPicker(source);
      if (!result || result.canceled || result.assets.length === 0) return;
      const compressed = await compressImage(result.assets[0].uri, 'standard');
      setOrderImages([...orderImages, compressed]);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      log.error('Order photo error', { err: String(e) });
    }
  }, [launchPicker, orderImages, setOrderImages]);

  const removeOrderImage = useCallback((uri: string) => {
    setOrderImages(orderImages.filter(i => i !== uri));
  }, [orderImages, setOrderImages]);

  // ── Confirm pickup (images-only mode) ─────────────────────────────────────────
  const [confirmingPickup, setConfirmingPickup] = useState(false);

  const handleConfirmImagesOnly = useCallback(async () => {
    if (!pickupOrderId) return;
    setConfirmingPickup(true);
    try {
      await ordersApi.confirmPickup(pickupOrderId, []);
      const localImages = orderImages.filter(u => u.startsWith('file://') || u.startsWith('content://'));
      if (localImages.length > 0) {
        uploadManager.addImages(localImages, pickupOrderId as string, 'reception', 'standard')
          .catch(e => {
            log.error('Background image upload failed', { err: String(e) });
            Alert.alert(t('common.info'), t('admin.orders.upload_queued'));
          });
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
  }, [pickupOrderId, orderImages, qc, clearOrder, t]);

  return {
    // config modal
    configModal, configForm, setConfigForm,
    openAdd, openEdit, closeConfigModal, handleSaveItem,

    // payment dialog
    showPaymentDialog, setShowPaymentDialog,
    tempPaid, setTempPaid,
    openPaymentDialog, confirmPayment,

    // notes dialog
    showNotesDialog, setShowNotesDialog,
    tempNotes, setTempNotes,
    openNotesDialog, confirmNotes,

    // images
    pickImage, removeOrderImage,

    // pickup confirm
    confirmingPickup,
    handleConfirmImagesOnly,
  };
}
