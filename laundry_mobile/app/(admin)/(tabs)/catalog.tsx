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
  TextInput, 
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Platform,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AdminColors, AdminShadows } from '../../../constants/AdminColors';
import { adminApi } from '../../../src/services/adminApi';
import { BASE_URL } from '../../../src/api/axios';
import { SkeletonCard } from '../../../components/admin/SkeletonCard';
import { EmptyState } from '../../../components/admin/EmptyState';

const PRICING_METHODS: Record<string, { label: string, color: string, icon: any }> = {
  PER_M2: { label: 'par m²', color: AdminColors.primary, icon: 'square-outline' },
  PER_UNIT: { label: "à l'unité", color: '#3B82F6', icon: 'list-outline' },
  PER_KG: { label: 'au kg', color: '#F59E0B', icon: 'scale-outline' },
  PER_LINEAR_M: { label: 'au mètre', color: '#8B5CF6', icon: 'ruler-outline' },
  CUSTOM: { label: 'prix libre', color: AdminColors.textMuted, icon: 'create-outline' },
};

const ICONS = ['🧺', '🛋️', '👕', '🛏️', '🪟', '🧸', '📦', '🧣', '🧤', '🧦'];

export default function CatalogScreen() {
  const [categories, setCategories] = useState<any[]>([]);
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
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
    uniteLabel: 'pièce',
    processingDays: 2,
    imageUrl: ''
  });

  const fetchData = async () => {
    try {
      const res = await adminApi.getCategories();
      setCategories(res.data.data || res.data);
    } catch (error) {
      console.error('Fetch catalog error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleToggleCategory = async (id: number, current: boolean) => {
    try {
      await adminApi.toggleCategory(id);
      fetchData();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de changer le statut');
    }
  };

  const handleToggleProduct = async (id: number) => {
    try {
      await adminApi.toggleProduct(id);
      fetchData();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de changer le statut');
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
      
      const imageUrl = res.data[0]?.imageUrl;
      if (imageUrl) {
        if (type === 'category') {
          setCatForm(prev => ({ ...prev, imageUrl }));
        } else {
          setProdForm(prev => ({ ...prev, imageUrl }));
        }
      }
    } catch (error) {
      Alert.alert('Erreur', 'Échec de l\'envoi de l\'image');
    } finally {
      setIsUploading(false);
    }
  };

  const saveCategory = async () => {
    try {
      if (!catForm.nom) return Alert.alert('Erreur', 'Le nom est obligatoire');
      
      if (categoryModal.data) {
        await adminApi.updateCategory(categoryModal.data.id, catForm);
      } else {
        await adminApi.createCategory(catForm);
      }
      
      setCategoryModal({ open: false, data: null });
      fetchData();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'enregistrer la catégorie');
    }
  };

  const saveProduct = async () => {
    try {
      if (!prodForm.nom || !prodForm.prixUnitaire) return Alert.alert('Erreur', 'Nom et prix obligatoires');
      
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
      Alert.alert('Erreur', 'Impossible d\'enregistrer le produit');
    }
  };

  const renderProduct = (product: any) => {
    const method = PRICING_METHODS[product.pricingMethod] || PRICING_METHODS.PER_UNIT;
    return (
      <View key={product.id} style={[styles.productRow, !product.isActive && { opacity: 0.6 }]}>
        <View style={styles.productIconBox}>
          {product.imageUrl ? (
            <Image source={{ uri: `${adminApi.getOrderPdfUrl(1).split('/api/')[0]}${product.imageUrl}` }} style={styles.productImg} />
          ) : (
            <Ionicons name="cube-outline" size={20} color={AdminColors.primary} />
          )}
        </View>

        <View style={styles.productInfo}>
          <Text style={styles.productName}>{product.nom}</Text>
          <View style={[styles.pricingBadge, { backgroundColor: method.color + '15' }]}>
            <Text style={[styles.pricingBadgeText, { color: method.color }]}>{method.label.toUpperCase()}</Text>
          </View>
        </View>
        
        <Text style={styles.productPrice}>
          {product.pricingMethod === 'CUSTOM' ? 'Prix libre' : `${product.prixUnitaire} DH/${product.pricingMethod === 'PER_UNIT' ? product.uniteLabel : product.pricingMethod === 'PER_M2' ? 'm²' : product.pricingMethod === 'PER_KG' ? 'kg' : 'm'}`}
        </Text>

        <Switch 
          value={product.isActive}
          onValueChange={() => handleToggleProduct(product.id)}
          trackColor={{ false: '#D1D5DB', true: AdminColors.primary }}
          thumbColor="white"
          style={{ transform: [{ scale: 0.8 }] }}
        />
        
        <TouchableOpacity onPress={() => {
          setProdForm({
            nom: product.nom,
            description: product.description || '',
            pricingMethod: product.pricingMethod,
            prixUnitaire: product.prixUnitaire?.toString() || '',
            uniteLabel: product.uniteLabel || 'pièce',
            processingDays: product.processingDays || 2,
            imageUrl: product.imageUrl || ''
          });
          setProductModal({ open: true, categoryId: null, data: product });
        }}>
          <Ionicons name="pencil" size={16} color={AdminColors.textMuted} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderCategory = ({ item }: { item: any }) => {
    const isExpanded = expandedIds.includes(item.id);

    return (
      <View style={styles.categoryContainer}>
        <TouchableOpacity 
          style={styles.categoryHeader}
          onPress={() => toggleExpand(item.id)}
          activeOpacity={0.8}
        >
          <View style={styles.catIconBox}>
            {item.imageUrl ? (
              <Image source={{ uri: `${adminApi.getOrderPdfUrl(1).split('/api/')[0]}${item.imageUrl}` }} style={styles.catImg} />
            ) : (
              <Text style={{ fontSize: 22 }}>{item.icon || '📦'}</Text>
            )}
          </View>
          
          <View style={{ flex: 1 }}>
            <Text style={styles.catName}>{item.nom}</Text>
            <Text style={styles.catCount}>{item.products?.length || item.productCount || 0} produits</Text>
          </View>

          <View style={styles.catActions}>
            <Switch 
              value={item.isActive}
              onValueChange={() => handleToggleCategory(item.id, item.isActive)}
              trackColor={{ false: '#D1D5DB', true: AdminColors.primary }}
              thumbColor="white"
            />
            <TouchableOpacity onPress={() => {
              setCatForm({ nom: item.nom, nomAr: item.nomAr || '', icon: item.icon || '🧺', imageUrl: item.imageUrl || '' });
              setCategoryModal({ open: true, data: item });
            }}>
              <Ionicons name="pencil" size={18} color={AdminColors.textMuted} />
            </TouchableOpacity>
            <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={AdminColors.textMuted} />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.productsList}>
            {(item.products || []).map(renderProduct)}
            
            <TouchableOpacity 
              style={styles.addProductBtn}
              onPress={() => {
                setProdForm({ nom: '', description: '', pricingMethod: 'PER_UNIT', prixUnitaire: '', uniteLabel: 'pièce', processingDays: 2, imageUrl: '' });
                setProductModal({ open: true, categoryId: item.id, data: null });
              }}
            >
              <Text style={styles.addProductText}>+ Ajouter un produit</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Catalogue</Text>
          <TouchableOpacity 
            style={styles.addCatBtn}
            onPress={() => {
              setCatForm({ nom: '', nomAr: '', icon: '🧺', imageUrl: '' });
              setCategoryModal({ open: true, data: null });
            }}
          >
            <Ionicons name="add" size={18} color="white" />
            <Text style={styles.addCatBtnText}>Catégorie</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <FlatList
        data={categories}
        renderItem={renderCategory}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={AdminColors.primary} />}
        ListEmptyComponent={
          loading ? (
            <View style={{ padding: 16 }}>
              {Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)}
            </View>
          ) : (
            <EmptyState icon="🏷️" title="Catalogue vide" subtitle="Créez votre première catégorie de services" />
          )
        }
      />

      {/* Category Modal */}
      <Modal visible={categoryModal.open} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{categoryModal.data ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</Text>
            <TouchableOpacity onPress={() => setCategoryModal({ open: false, data: null })}>
              <Ionicons name="close" size={24} color={AdminColors.textPrimary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <View style={styles.formField}>
              <Text style={styles.label}>Image de la catégorie (Optionnel)</Text>
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
                        <Text style={styles.pickImageText}>Ajouter une image</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.formField}>
              <Text style={styles.label}>Nom de la catégorie</Text>
              <TextInput 
                style={styles.input} 
                value={catForm.nom} 
                onChangeText={t => setCatForm({...catForm, nom: t})}
                placeholder="Ex: Tapis, Rideaux..."
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.label}>Nom en arabe</Text>
              <TextInput 
                style={[styles.input, { textAlign: 'right' }]} 
                value={catForm.nomAr} 
                onChangeText={t => setCatForm({...catForm, nomAr: t})}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.label}>Icône (si pas d'image)</Text>
              <View style={styles.iconGrid}>
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
              <Text style={styles.primaryBtnText}>Enregistrer</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Product Modal */}
      <Modal visible={productModal.open} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{productModal.data ? 'Modifier le produit' : 'Nouveau produit'}</Text>
            <TouchableOpacity onPress={() => setProductModal({ open: false, categoryId: null, data: null })}>
              <Ionicons name="close" size={24} color={AdminColors.textPrimary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <View style={styles.formField}>
              <Text style={styles.label}>Image du produit (Optionnel)</Text>
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
                        <Text style={styles.pickImageText}>Ajouter une image</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.formField}>
              <Text style={styles.label}>Nom du produit</Text>
              <TextInput 
                style={styles.input} 
                value={prodForm.nom} 
                onChangeText={t => setProdForm({...prodForm, nom: t})}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.label}>Description</Text>
              <TextInput 
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
                multiline 
                value={prodForm.description} 
                onChangeText={t => setProdForm({...prodForm, description: t})}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.label}>Méthode de tarification</Text>
              <View style={styles.methodGrid}>
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
              <View style={styles.formRow}>
                <View style={[styles.formField, { flex: 1 }]}>
                  <Text style={styles.label}>Prix (DH)</Text>
                  <TextInput 
                    style={styles.input} 
                    keyboardType="numeric" 
                    value={prodForm.prixUnitaire}
                    onChangeText={t => setProdForm({...prodForm, prixUnitaire: t})}
                  />
                </View>
                {prodForm.pricingMethod === 'PER_UNIT' && (
                  <View style={[styles.formField, { flex: 1, marginLeft: 12 }]}>
                    <Text style={styles.label}>Unité</Text>
                    <TextInput 
                      style={styles.input} 
                      value={prodForm.uniteLabel}
                      onChangeText={t => setProdForm({...prodForm, uniteLabel: t})}
                    />
                  </View>
                )}
              </View>
            )}

            <View style={styles.formField}>
              <Text style={styles.label}>Délai (jours)</Text>
              <View style={styles.stepper}>
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
              <Text style={styles.primaryBtnText}>Enregistrer</Text>
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
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: AdminColors.textPrimary,
  },
  addCatBtn: {
    backgroundColor: AdminColors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addCatBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  categoryContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    ...AdminShadows.shadowSmall,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  catIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: AdminColors.primary100,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  catImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  catName: {
    fontSize: 16,
    fontWeight: '700',
    color: AdminColors.textPrimary,
  },
  catCount: {
    fontSize: 12,
    color: AdminColors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  catActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  productsList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  productRow: {
    backgroundColor: AdminColors.surface2,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  productIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: AdminColors.primary50,
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
    fontSize: 14,
    fontWeight: '600',
    color: AdminColors.textPrimary,
    marginBottom: 4,
  },
  pricingBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  pricingBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: AdminColors.primary,
  },
  addProductBtn: {
    marginTop: 8,
    backgroundColor: AdminColors.primary50,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: AdminColors.primary200,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addProductText: {
    color: AdminColors.primary,
    fontSize: 13,
    fontWeight: '600',
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
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
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
