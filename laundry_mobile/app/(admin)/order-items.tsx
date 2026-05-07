import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  ScrollView, 
  Modal, 
  TextInput, 
  Switch,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  Image,
  Share
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AdminColors, AdminShadows } from '../../constants/AdminColors';
import { useOrderCreation, OrderItem } from '../../src/context/OrderCreationContext';
import { adminApi } from '../../src/services/adminApi';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { SkeletonCard } from '../../components/admin/SkeletonCard';
import * as ImagePicker from 'expo-image-picker';

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
  const insets = useSafeAreaInsets();
  const { 
    client, items, addItem, removeItem, updateItem, 
    totalAmount, totalArea, totalCarpets, itemCount,
    paidAmount, setPaidAmount, remainingAmount,
    orderNotes, setOrderNotes
  } = useOrderCreation();
  
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
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
    customPrice: '', noteAtelier: '', couleur: '', 
    hasRemise: false, remiseMontant: '', remiseRaison: ''
  });

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getCategories();
      
      // Backend returns ApiResponse<List<CategoryDto>>
      // The wrapper has { success: boolean, data: T, message: string }
      const responseData = res.data;
      const categories = responseData.data || [];
      
      console.log(`Loaded ${categories.length} categories from API`);

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

      console.log(`Mapped ${allProducts.length} active products`);
      setProducts(allProducts);
    } catch (e: any) {
      console.error('Catalog load error:', e.response?.data || e.message);
      Alert.alert('Error', 'Could not load catalog');
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
      return Alert.alert('Error', 'Entrez les dimensions');
    }
    if (product.pricingMethod === 'CUSTOM' && !configForm.customPrice) {
      return Alert.alert('Error', 'Entrez un prix');
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
      remiseMontant: configForm.hasRemise ? (parseFloat(configForm.remiseMontant) || 0) : undefined,
      remiseRaison: configForm.hasRemise ? configForm.remiseRaison : undefined,
      couleur: configForm.couleur,
      notes: configForm.noteAtelier,
      pricingMethod: product.pricingMethod,
      uniteLabel: product.uniteLabel
    };

    if (editCartId) {
      updateItem(editCartId, newItem);
    } else {
      addItem(newItem);
    }

    setConfigModal({ open: false, product: null, editCartId: null });
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'L\'accès à la caméra est nécessaire');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled) {
       Alert.alert("Succès", "Photo capturée.");
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Reçu de commande pour ${client?.name}\nTotal: ${totalAmount.toFixed(2)} DH\nPayé: ${paidAmount.toFixed(2)} DH\nReste: ${remainingAmount.toFixed(2)} DH`,
      });
    } catch (error) {
      console.log(error);
    }
  };

  const renderActionBar = () => (
    <View style={styles.actionBar}>
      <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
        <View style={[styles.actionIcon, { backgroundColor: '#E3F2FD' }]}>
          <Ionicons name="share-social" size={20} color="#1976D2" />
        </View>
        <Text style={styles.actionText}>Partager</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.actionBtn}>
        <View style={[styles.actionIcon, { backgroundColor: '#F3E5F5' }]}>
          <Ionicons name="print" size={20} color="#7B1FA2" />
        </View>
        <Text style={styles.actionText}>Imprimer</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.actionBtn} onPress={pickImage}>
        <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
          <Ionicons name="camera" size={20} color="#388E3C" />
        </View>
        <Text style={styles.actionText}>Photos</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSummaryCard = () => (
    <View style={styles.summaryCard}>
      <View style={styles.summaryGrid}>
        <View style={styles.gridItem}>
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={[styles.summaryValue, { color: AdminColors.textPrimary }]}>{totalAmount.toFixed(2)} DH</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.summaryLabel}>Surface</Text>
          <Text style={styles.summaryValue}>{totalArea.toFixed(2)} m²</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.summaryLabel}>Pièces</Text>
          <Text style={styles.summaryValue}>{itemCount}</Text>
        </View>
      </View>
      
      <View style={styles.paymentRow}>
        <TouchableOpacity style={styles.paymentSection} onPress={() => { setTempPaid(paidAmount.toString()); setShowPaymentModal(true); }}>
          <Text style={styles.summaryLabel}>Payé</Text>
          <Text style={[styles.summaryValue, { color: AdminColors.success }]}>{paidAmount.toFixed(2)} DH</Text>
        </TouchableOpacity>
        
        <View style={styles.divider} />
        
        <View style={styles.paymentSection}>
          <Text style={styles.summaryLabel}>Reste</Text>
          <Text style={[styles.summaryValue, { color: remainingAmount > 0 ? AdminColors.danger : AdminColors.textMuted }]}>
            {remainingAmount.toFixed(2)} DH
          </Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.addNoteBtn} 
        onPress={() => { setTempNotes(orderNotes); setShowNotesModal(true); }}
      >
        <Ionicons name="document-text-outline" size={16} color={AdminColors.primary} />
        <Text style={styles.addNoteText}>{orderNotes ? 'Modifier Note' : 'Ajouter Note'}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCartItem = (item: OrderItem) => (
    <View key={item.cartId} style={styles.cartItemCard}>
      <View style={styles.cartActions}>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => removeItem(item.cartId)}>
          <Ionicons name="trash-outline" size={16} color={AdminColors.danger} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.editBtn, { marginTop: 6 }]} onPress={() => openEdit(item)}>
          <Ionicons name="pencil-outline" size={16} color={AdminColors.textSecondary} />
        </TouchableOpacity>
      </View>
      <View style={styles.cartInfo}>
        <Text style={styles.cartItemName}>{item.nom} ({item.quantite})</Text>
        {item.pricingMethod === 'PER_M2' && (
          <Text style={styles.cartItemDetails}>{item.largeur}×{item.hauteur}={(item.largeur! * item.hauteur!).toFixed(2)}m²</Text>
        )}
        <Text style={styles.cartItemPrice}>{item.prixFinal.toFixed(2)} DH</Text>
      </View>
      <View style={styles.cartItemImgBox}>
         <Text style={{ fontSize: 28 }}>{item.categoryIcon || '🧺'}</Text>
      </View>
    </View>
  );

  const renderProductRow = ({ item }: { item: any }) => (
    <View style={styles.productRow}>
      <TouchableOpacity style={styles.addIconBtn} onPress={() => openAdd(item)}>
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>
      <View style={styles.productInfoCol}>
        <Text style={styles.productName}>{item.nom}</Text>
        <View style={styles.priceRowSmall}>
          <Text style={styles.productPriceText}>{item.prixUnitaire} DH</Text>
          <Text style={styles.unitSmall}> / {item.uniteLabel || 'unité'}</Text>
        </View>
      </View>
      <View style={styles.productImgBox}>
        <Text style={{ fontSize: 28 }}>{item.categoryIcon}</Text>
      </View>
    </View>
  );

  const openAdd = (product: any) => {
    setConfigForm({
      qty: 1, largura: '', hauteur: '', longueur: '', poids: '', 
      customPrice: '', noteAtelier: '', couleur: '', 
      hasRemise: false, remiseMontant: '', remiseRaison: ''
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
      couleur: item.couleur || '',
      hasRemise: !!item.remiseMontant,
      remiseMontant: item.remiseMontant?.toString() || '',
      remiseRaison: item.remiseRaison || ''
    });
    setConfigModal({ open: true, product, editCartId: item.cartId });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={AdminColors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {client ? `${client.name}` : 'Nouvelle Commande'}
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.nextBtn, items.length === 0 && { opacity: 0.3 }]} 
              disabled={items.length === 0}
              onPress={() => router.push('/(admin)/order-summary')}
            >
              <Ionicons name="checkmark" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <FlatList
        data={products}
        renderItem={renderProductRow}
        keyExtractor={item => item.id.toString()}
        ListHeaderComponent={
          <View>
            {renderActionBar()}
            {renderSummaryCard()}

            <View style={styles.bagSection}>
               <View style={styles.sectionHeader}>
                  <View style={styles.bagIconBox}>
                    <MaterialCommunityIcons name="shopping" size={16} color="white" />
                  </View>
                  <Text style={styles.sectionTitle}>Panier (Le sac)</Text>
                  <View style={styles.pillBadge}><Text style={styles.pillText}>{items.length}</Text></View>
               </View>
               
               {items.length === 0 ? (
                 <View style={styles.emptyBag}>
                    <Ionicons name="basket-outline" size={48} color={AdminColors.textMuted} />
                    <Text style={styles.emptyBagText}>Le sac est vide</Text>
                 </View>
               ) : (
                 items.map(renderCartItem)
               )}
            </View>

            <View style={[styles.section, { marginTop: 24, marginBottom: 8 }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="list" size={20} color={AdminColors.primary} />
                <Text style={styles.sectionTitle}>Produits disponibles</Text>
              </View>
            </View>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={loading ? (
          <View style={{ paddingHorizontal: 16 }}>
            {Array(5).fill(0).map((_, i) => <SkeletonCard key={i} />)}
          </View>
        ) : null}
      />

      {/* Config Modal */}
      <Modal visible={configModal.open} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setConfigModal({ open: false, product: null, editCartId: null })} />
          <View style={styles.modalSheet}>
            <View style={styles.dragHandle} />
            
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderImgBox}>
                <Text style={{ fontSize: 24 }}>{configModal.product?.categoryIcon || '📦'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalProductName}>{configModal.product?.nom}</Text>
                <Text style={styles.modalProductPrice}>{configModal.product?.prixUnitaire} DH / {configModal.product?.uniteLabel || 'unité'}</Text>
              </View>
            </View>

            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              {configModal.product?.pricingMethod === 'PER_M2' && (
                <View style={styles.dimRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Largeur (m)</Text>
                    <TextInput 
                      style={styles.dimInput} 
                      keyboardType="decimal-pad" 
                      value={configForm.largura}
                      onChangeText={t => setConfigForm({...configForm, largura: t})}
                    />
                  </View>
                  <View style={{ width: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Hauteur (m)</Text>
                    <TextInput 
                      style={styles.dimInput} 
                      keyboardType="decimal-pad" 
                      value={configForm.hauteur}
                      onChangeText={t => setConfigForm({...configForm, hauteur: t})}
                    />
                  </View>
                </View>
              )}

              {configModal.product?.pricingMethod === 'PER_UNIT' && (
                <View style={styles.unitStepper}>
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
                <View style={styles.dimRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Poids (kg)</Text>
                    <TextInput 
                      style={styles.dimInput} 
                      keyboardType="decimal-pad" 
                      value={configForm.poids}
                      onChangeText={t => setConfigForm({...configForm, poids: t})}
                    />
                  </View>
                </View>
              )}

              {configModal.product?.pricingMethod === 'PER_LINEAR_M' && (
                <View style={styles.dimRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Longueur (m)</Text>
                    <TextInput 
                      style={styles.dimInput} 
                      keyboardType="decimal-pad" 
                      value={configForm.longueur}
                      onChangeText={t => setConfigForm({...configForm, longueur: t})}
                    />
                  </View>
                </View>
              )}

              {configModal.product?.pricingMethod === 'CUSTOM' && (
                <View style={styles.dimRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Prix (DH)</Text>
                    <TextInput 
                      style={styles.dimInput} 
                      keyboardType="numeric" 
                      value={configForm.customPrice}
                      onChangeText={t => setConfigForm({...configForm, customPrice: t})}
                    />
                  </View>
                </View>
              )}

              <View style={styles.calcBox}>
                  <Text style={styles.calcFormula}>
                    {configModal.product?.pricingMethod === 'PER_M2' ? `${configForm.largura || 0}m × ${configForm.hauteur || 0}m × ${configModal.product?.prixUnitaire} DH/m²` : 
                     configModal.product?.pricingMethod === 'PER_UNIT' ? `${configForm.qty} × ${configModal.product?.prixUnitaire} DH` : 
                     configModal.product?.pricingMethod === 'PER_KG' ? `${configForm.poids || 0}kg × ${configModal.product?.prixUnitaire} DH/kg` :
                     configModal.product?.pricingMethod === 'PER_LINEAR_M' ? `${configForm.longueur || 0}m × ${configModal.product?.prixUnitaire} DH/m` : ''}
                  </Text>
                  <Text style={styles.calcResult}>= {calculateItemPrice(configModal.product, configForm).toFixed(2)} DH</Text>
              </View>

              <Text style={[styles.inputLabel, { marginTop: 20 }]}>Couleur / Description</Text>
              <TextInput 
                style={styles.formInput} 
                placeholder="Ex: Bleu, avec tâches..." 
                value={configForm.couleur}
                onChangeText={t => setConfigForm({...configForm, couleur: t})}
              />

              <Text style={[styles.inputLabel, { marginTop: 16 }]}>Notes d'atelier</Text>
              <TextInput 
                style={[styles.formInput, { height: 80, textAlignVertical: 'top' }]} 
                multiline 
                placeholder="Instructions de nettoyage..."
                value={configForm.noteAtelier}
                onChangeText={t => setConfigForm({...configForm, noteAtelier: t})}
              />

              {/* REMISE SECTION */}
              <View style={styles.remiseSection}>
                <View style={styles.remiseHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="pricetag-outline" size={18} color={AdminColors.primary} />
                    <Text style={styles.remiseTitle}>Appliquer une remise</Text>
                  </View>
                  <Switch 
                    value={configForm.hasRemise} 
                    onValueChange={v => setConfigForm({...configForm, hasRemise: v})}
                    trackColor={{ false: '#E2E8F0', true: AdminColors.primary }}
                    thumbColor="white"
                  />
                </View>

                {configForm.hasRemise && (
                  <View style={styles.remiseInputs}>
                    <View style={styles.dimRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Montant remise (DH)</Text>
                        <TextInput 
                          style={styles.dimInput} 
                          keyboardType="decimal-pad" 
                          placeholder="0.00"
                          value={configForm.remiseMontant}
                          onChangeText={t => setConfigForm({...configForm, remiseMontant: t})}
                        />
                      </View>
                    </View>
                    <Text style={styles.inputLabel}>Motif de la remise</Text>
                    <TextInput 
                      style={styles.formInput} 
                      placeholder="Ex: Fidélité, promotion..." 
                      value={configForm.remiseRaison}
                      onChangeText={t => setConfigForm({...configForm, remiseRaison: t})}
                    />
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.sheetFooter}>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveItem}>
                <Text style={styles.saveBtnText}>Ajouter au sac — {calculateItemPrice(configModal.product, configForm).toFixed(2)} DH</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal visible={paymentModal} transparent animationType="fade">
        <View style={styles.overlayCenter}>
          <View style={styles.dialogBox}>
            <Text style={styles.dialogTitle}>Montant Payé</Text>
            <TextInput
              style={styles.dialogInput}
              keyboardType="numeric"
              value={tempPaid}
              onChangeText={setTempPaid}
              autoFocus
            />
            <View style={styles.dialogButtons}>
              <TouchableOpacity style={styles.dialogBtn} onPress={() => setShowPaymentModal(false)}>
                <Text style={styles.dialogBtnCancel}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dialogBtn} onPress={() => { setPaidAmount(parseFloat(tempPaid) || 0); setShowPaymentModal(false); }}>
                <Text style={styles.dialogBtnConfirm}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Notes Modal */}
      <Modal visible={notesModal} transparent animationType="fade">
        <View style={styles.overlayCenter}>
          <View style={styles.dialogBox}>
            <Text style={styles.dialogTitle}>Note de Commande</Text>
            <TextInput
              style={[styles.dialogInput, { height: 100, textAlignVertical: 'top' }]}
              multiline
              value={tempNotes}
              onChangeText={setTempNotes}
              placeholder="Instructions générales..."
            />
            <View style={styles.dialogButtons}>
              <TouchableOpacity style={styles.dialogBtn} onPress={() => setShowNotesModal(false)}>
                <Text style={styles.dialogBtnCancel}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dialogBtn} onPress={() => { setOrderNotes(tempNotes); setShowNotesModal(false); }}>
                <Text style={styles.dialogBtnConfirm}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  nextBtn: { backgroundColor: AdminColors.primary, width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', ...AdminShadows.shadowTeal },
  
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

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: SCREEN_HEIGHT * 0.85 },
  dragHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginTop: 12, marginBottom: 20 },
  modalHeaderRow: { flexDirection: 'row', gap: 14, alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  modalHeaderImgBox: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  modalProductName: { fontSize: 18, fontWeight: '700', color: AdminColors.textPrimary },
  modalProductPrice: { fontSize: 14, color: AdminColors.primary, fontWeight: '600', marginTop: 2 },
  modalBody: { paddingHorizontal: 20 },
  dimRow: { flexDirection: 'row', marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: AdminColors.textSecondary, marginBottom: 6 },
  dimInput: { flex: 1, height: 52, fontSize: 16, textAlign: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, backgroundColor: 'white' },
  calcBox: { backgroundColor: '#F1F5F9', borderRadius: 14, padding: 16, marginTop: 12, alignItems: 'center' },
  calcFormula: { fontSize: 14, color: AdminColors.textSecondary, textAlign: 'center' },
  calcResult: { fontSize: 22, fontWeight: '800', color: AdminColors.primary, marginTop: 4, textAlign: 'center' },
  unitStepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginVertical: 10 },
  stepBtn: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: AdminColors.primary, alignItems: 'center', justifyContent: 'center' },
  stepBtnDisabled: { borderColor: '#E2E8F0' },
  stepSymbol: { fontSize: 24, fontWeight: '300', color: AdminColors.primary },
  stepValue: { fontSize: 32, fontWeight: '800', color: AdminColors.textPrimary, minWidth: 50, textAlign: 'center' },
  formInput: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, fontSize: 15, backgroundColor: 'white' },
  sheetFooter: { padding: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  saveBtn: { backgroundColor: AdminColors.primary, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', ...AdminShadows.shadowTeal },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },

  remiseSection: { marginTop: 24, padding: 16, backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  remiseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  remiseTitle: { fontSize: 15, fontWeight: '600', color: AdminColors.textPrimary },
  remiseInputs: { marginTop: 16, gap: 12 },

  overlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  dialogBox: { backgroundColor: 'white', borderRadius: 20, padding: 20, ...AdminShadows.shadowSmall },
  dialogTitle: { fontSize: 18, fontWeight: '700', color: AdminColors.textPrimary, marginBottom: 15 },
  dialogInput: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, fontSize: 16, backgroundColor: '#F8FAFC' },
  dialogButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, gap: 12 },
  dialogBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  dialogBtnCancel: { color: AdminColors.textSecondary, fontWeight: '600' },
  dialogBtnConfirm: { color: AdminColors.primary, fontWeight: '700' },
});
