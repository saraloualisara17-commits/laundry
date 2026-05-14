import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'expo-router';
import { fetchCarpetTypes, createOrder } from '../../src/store/livreurThunks';
import { RootState, AppDispatch } from '../../src/store/store';
import { Feather, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { Colors, Shadows, Typography, Radius } from '../../constants/theme';
import { useTranslation } from 'react-i18next';

export default function CreateOrder() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  
  const { pendingClient, carpetTypes, loading } = useSelector((state: RootState) => state.livreur);

  const [articles, setArticles] = useState([{
    id: Date.now(),
    carpetTypeId: '',
    carpetTypeNom: '',
    pricePerM2: 0,
    pricingMode: 'SIZE_BASED', 
    largeur: '',
    hauteur: '',
    prixCalcule: '0',
    prixFinal: '',
    prixEstime: '',
    quantite: 1,
    notes: ''
  }]);

  useEffect(() => {
    dispatch(fetchCarpetTypes());
  }, [dispatch]);

  if (!pendingClient) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconContainer}>
            <Feather name="shopping-bag" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>{t('driver.dashboard.next_mission')}</Text>
          <View style={[styles.emptyNotice, isArabic && { flexDirection: 'row-reverse' }]}>
            <Feather name="alert-circle" size={16} color={Colors.warning} style={{ marginTop: 2 }} />
            <Text style={[styles.emptyNoticeText, isArabic && { textAlign: 'right' }]}>
              {t('admin.orders.create.items.select_client_first')}
            </Text>
          </View>

          <TouchableOpacity style={[styles.emptyPrimaryBtn, isArabic && { flexDirection: 'row-reverse' }]} onPress={() => router.push('/(livreur)/clients')}>
            <Feather name="users" size={20} color="white" />
            <Text style={styles.emptyPrimaryBtnText}>{t('admin.orders.create.items.select_client_btn')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.emptySecondaryBtn} onPress={() => router.push('/(livreur)')}>
            <Text style={styles.emptySecondaryBtnText}>{t('admin.orders.create.confirmation.back_dashboard').toUpperCase()}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleAddArticle = () => {
    setArticles([...articles, {
      id: Date.now(),
      carpetTypeId: '',
      carpetTypeNom: '',
      pricePerM2: 0,
      pricingMode: 'SIZE_BASED',
      largeur: '',
      hauteur: '',
      prixCalcule: '0',
      prixFinal: '',
      prixEstime: '',
      quantite: 1,
      notes: ''
    }]);
  };

  const handleRemoveArticle = (id: number) => {
    if (articles.length > 1) {
      setArticles(articles.filter(a => a.id !== id));
    } else {
      Alert.alert(t('common.info'), t('admin.orders.create.summary.empty_order'));
    }
  };

  const updateArticle = (index: number, field: string, value: any) => {
    const newArticles = [...articles];
    newArticles[index] = { ...newArticles[index], [field]: value };
    
    if (field === 'largeur' || field === 'hauteur' || field === 'carpetTypeId') {
      const art = newArticles[index];
      if (art.pricingMode === 'SIZE_BASED' && art.largeur && art.hauteur && art.pricePerM2) {
        const calc = (parseFloat(art.largeur) * parseFloat(art.hauteur) * art.pricePerM2).toFixed(2);
        art.prixCalcule = calc;
        if (!art.prixFinal || art.prixFinal === newArticles[index].prixCalcule) {
          art.prixFinal = calc;
        }
      }
    }
    setArticles(newArticles);
  };

  const handleTypeChange = (index: number, typeId: string) => {
    const type = carpetTypes.find(t => t.id.toString() === typeId.toString());
    if (type) {
      const newArticles = [...articles];
      newArticles[index].carpetTypeId = type.id;
      newArticles[index].carpetTypeNom = type.nom;
      newArticles[index].pricePerM2 = type.prixParM2;
      setArticles(newArticles);
      updateArticle(index, 'carpetTypeId', type.id);
    }
  };

  const getEffectivePrice = (a: any) => {
    if (a.pricingMode === 'MANUAL') return parseFloat(a.prixEstime) || 0;
    return parseFloat(a.prixFinal) || parseFloat(a.prixCalcule) || 0;
  };

  const totalAmount = articles.reduce((sum, a) => sum + (getEffectivePrice(a) * a.quantite), 0);
  const totalItems = articles.reduce((sum, a) => sum + a.quantite, 0);

  const handleSubmit = async () => {
    const invalid = articles.some(a => {
      if (!a.carpetTypeNom) return true;
      if (a.pricingMode === 'MANUAL') return !a.prixEstime;
      return !a.largeur || !a.hauteur || !a.prixFinal;
    });

    if (invalid) {
      Alert.alert(t('common.error'), t('driver.register_client.toasts.required_fields'));
      return;
    }

    const payload = {
      clientId: pendingClient.id,
      tapis: articles.map(a => {
        const finalPrice = a.pricingMode === 'MANUAL' ? (parseFloat(a.prixEstime) || 0) : (parseFloat(a.prixFinal) || parseFloat(a.prixCalcule) || 0);
        return {
          nom: a.carpetTypeNom,
          description: a.notes,
          prixUnitaire: finalPrice,
          quantite: a.quantite,
          imageUrls: [],
          mainImageIndex: 0,
          carpetTypeId: a.carpetTypeId,
          largeur: a.pricingMode === 'SIZE_BASED' ? parseFloat(a.largeur) : 0,
          hauteur: a.pricingMode === 'SIZE_BASED' ? parseFloat(a.hauteur) : 0,
          prixCalcule: a.pricingMode === 'SIZE_BASED' ? parseFloat(a.prixCalcule) : 0,
          prixFinal: finalPrice,
          modeTarification: a.pricingMode
        };
      })
    };

    try {
      await dispatch(createOrder(payload)).unwrap();
      Alert.alert(t('common.success'), t('common.success_msg'));
      router.replace('/(livreur)');
    } catch (err: any) {
      const errorMessage = typeof err === 'string' ? err : 
                           (err?.message || JSON.stringify(err) || t('common.error_msg'));
      Alert.alert(t('common.error'), errorMessage);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      {/* Header Bar */}
      <View style={[styles.appBar, isArabic && { flexDirection: 'row-reverse' }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name={isArabic ? "arrow-right" : "arrow-left"} size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>{t('dashboard.create_order')}</Text>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{pendingClient.name?.[0]?.toUpperCase()}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Client Summary */}
        <View style={styles.clientCard}>
          <View style={[styles.clientHeader, isArabic && { flexDirection: 'row-reverse' }]}>
            <Feather name="user" size={14} color={Colors.primary} />
            <Text style={styles.clientHeaderText}>{t('admin.orders.create.client_info').toUpperCase()}</Text>
          </View>
          <Text style={[styles.clientName, isArabic && { textAlign: 'right' }]}>{pendingClient.name}</Text>
          <View style={[styles.clientInfoRow, isArabic && { flexDirection: 'row-reverse' }]}>
            <Feather name="phone" size={14} color={Colors.success} />
            <Text style={styles.clientInfoText}>{pendingClient.phones?.[0]?.phoneNumber || t('admin.clients.no_phone')}</Text>
          </View>
          <View style={[styles.clientInfoRow, isArabic && { flexDirection: 'row-reverse' }]}>
            <Feather name="map-pin" size={14} color={Colors.primary} />
            <Text style={[styles.clientInfoText, isArabic && { textAlign: 'right' }]} numberOfLines={2}>
              {pendingClient.addresses?.[0]?.address || t('admin.clients.no_address')}
            </Text>
          </View>
        </View>

        <View style={[styles.sectionHeader, isArabic && { flexDirection: 'row-reverse' }]}>
          <Text style={styles.sectionTitle}>{t('admin.orders.title')}</Text>
          <Text style={styles.sectionCount}>{articles.length} {t('admin.catalog.title').toUpperCase()}</Text>
        </View>

        {articles.map((article, index) => (
          <View key={article.id} style={styles.articleCard}>
            <View style={[styles.articleHeader, isArabic && { flexDirection: 'row-reverse' }]}>
              <View style={styles.articleBadge}>
                <Text style={styles.articleBadgeText}>{t('admin.orders.title').toUpperCase()} {index + 1}</Text>
              </View>
              {articles.length > 1 && (
                <TouchableOpacity onPress={() => handleRemoveArticle(article.id)}>
                  <Feather name="trash-2" size={18} color={Colors.danger} />
                </TouchableOpacity>
              )}
            </View>

            {/* Type */}
            <Text style={[styles.label, isArabic && { textAlign: 'right' }]}>{t('admin.catalog.add_category')}</Text>
            <View style={styles.pickerContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[isArabic && { flexDirection: 'row-reverse' }, { gap: 8 }]}>
                {carpetTypes.map(t_item => (
                  <TouchableOpacity 
                    key={t_item.id} 
                    style={[styles.typeChip, article.carpetTypeId === t_item.id && styles.typeChipActive]}
                    onPress={() => handleTypeChange(index, t_item.id)}
                  >
                    <Text style={[styles.typeChipText, article.carpetTypeId === t_item.id && styles.typeChipTextActive]}>
                      {isArabic && t_item.nomAr ? t_item.nomAr : t_item.nom}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Pricing Mode */}
            <Text style={[styles.label, isArabic && { textAlign: 'right' }]}>{t('admin.catalog.pricing_method')}</Text>
            <View style={[styles.modeToggle, isArabic && { flexDirection: 'row-reverse' }]}>
              <TouchableOpacity 
                style={[styles.modeBtn, article.pricingMode === 'SIZE_BASED' && styles.modeBtnActive, isArabic && { flexDirection: 'row-reverse' }]}
                onPress={() => updateArticle(index, 'pricingMode', 'SIZE_BASED')}
              >
                <FontAwesome5 name="ruler-combined" size={12} color={article.pricingMode === 'SIZE_BASED' ? 'white' : Colors.textSecondary} />
                <Text style={[styles.modeBtnText, article.pricingMode === 'SIZE_BASED' && styles.modeBtnTextActive]}>{t('admin.orders.create.items.area').toUpperCase()}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modeBtn, article.pricingMode === 'MANUAL' && styles.modeBtnActive, isArabic && { flexDirection: 'row-reverse' }]}
                onPress={() => updateArticle(index, 'pricingMode', 'MANUAL')}
              >
                <Feather name="dollar-sign" size={14} color={article.pricingMode === 'MANUAL' ? 'white' : Colors.textSecondary} />
                <Text style={[styles.modeBtnText, article.pricingMode === 'MANUAL' && styles.modeBtnTextActive]}>{t('admin.catalog.pricing.custom').toUpperCase()}</Text>
              </TouchableOpacity>
            </View>

            {/* Dimensions */}
            {article.pricingMode === 'SIZE_BASED' && (
              <View style={[styles.row, isArabic && { flexDirection: 'row-reverse' }]}>
                <View style={styles.col}>
                  <Text style={[styles.label, isArabic && { textAlign: 'right' }]}>{t('admin.orders.create.items.width')}</Text>
                  <TextInput
                    style={[styles.input, isArabic && { textAlign: 'right' }]}
                    placeholder="2.00"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                    value={article.largeur}
                    onChangeText={(val) => updateArticle(index, 'largeur', val)}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={[styles.label, isArabic && { textAlign: 'right' }]}>{t('admin.orders.create.items.height')}</Text>
                  <TextInput
                    style={[styles.input, isArabic && { textAlign: 'right' }]}
                    placeholder="3.00"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                    value={article.hauteur}
                    onChangeText={(val) => updateArticle(index, 'hauteur', val)}
                  />
                </View>
              </View>
            )}

            {/* Pricing display */}
            {article.pricingMode === 'SIZE_BASED' && article.prixCalcule !== '0' && (
              <View style={styles.priceCalcBox}>
                <View style={[styles.priceCalcRow, isArabic && { flexDirection: 'row-reverse' }]}>
                  <Text style={styles.priceCalcLabel}>{t('admin.orders.create.items.calculated')}</Text>
                  <Text style={styles.priceCalcValue}>{article.prixCalcule} {t('common.dh')}</Text>
                </View>
                <Text style={[styles.label, isArabic && { textAlign: 'right' }]}>{t('admin.catalog.price_dh')}</Text>
                <TextInput
                  style={[styles.priceInput, isArabic && { textAlign: 'right' }]}
                  keyboardType="numeric"
                  value={article.prixFinal}
                  onChangeText={(val) => updateArticle(index, 'prixFinal', val)}
                />
              </View>
            )}

            {article.pricingMode === 'MANUAL' && (
              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.label, isArabic && { textAlign: 'right' }]}>{t('admin.catalog.price_dh')}</Text>
                <TextInput
                  style={[styles.priceInput, isArabic && { textAlign: 'right' }]}
                  placeholder="Ex: 150"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  value={article.prixEstime}
                  onChangeText={(val) => updateArticle(index, 'prixEstime', val)}
                />
              </View>
            )}

            {/* Quantity */}
            <Text style={[styles.label, isArabic && { textAlign: 'right' }]}>{t('admin.orders.create.items.pieces')}</Text>
            <View style={[styles.qtyControl, isArabic && { flexDirection: 'row-reverse' }]}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => updateArticle(index, 'quantite', Math.max(1, article.quantite - 1))}>
                <Feather name="minus" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{article.quantite}</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => updateArticle(index, 'quantite', article.quantite + 1)}>
                <Feather name="plus" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Notes */}
            <Text style={[styles.label, isArabic && { textAlign: 'right' }]}>{t('common.notes')}</Text>
            <TextInput
              style={[styles.input, styles.textArea, isArabic && { textAlign: 'right' }]}
              placeholder={t('admin.orders.create.items.workshop_notes_placeholder')}
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={2}
              value={article.notes}
              onChangeText={(val) => updateArticle(index, 'notes', val)}
            />
          </View>
        ))}

        <TouchableOpacity style={[styles.addBtn, isArabic && { flexDirection: 'row-reverse' }]} onPress={handleAddArticle}>
          <Feather name="plus" size={20} color={Colors.primary} />
          <Text style={styles.addBtnText}>{t('admin.orders.create.items.add_to_bag').toUpperCase()}</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Footer / Submit */}
      <View style={styles.footer}>
        <View style={[styles.footerTotals, isArabic && { flexDirection: 'row-reverse' }]}>
          <Text style={styles.footerItemsText}>{totalItems} {t('admin.orders.title').toUpperCase()}</Text>
          <Text style={styles.footerTotalText}>{totalAmount.toFixed(2)} {t('common.dh')}</Text>
        </View>
        <TouchableOpacity style={[styles.submitBtn, isArabic && { flexDirection: 'row-reverse' }]} onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Feather name="check-circle" size={20} color="white" />
              <Text style={styles.submitBtnText}>{t('admin.orders.create.summary.create_btn').toUpperCase()}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    height: Platform.OS === 'ios' ? 100 : 60,
    paddingTop: Platform.OS === 'ios' ? 40 : 0,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  appBarTitle: { fontSize: 17, fontWeight: Typography.weight.semibold, color: Colors.textPrimary },
  avatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center'
  },
  avatarText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  
  scrollContent: { padding: 20, paddingBottom: 160 },
  
  clientCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, marginBottom: 24,
    borderWidth: 1, borderColor: Colors.border, ...Shadows.sm
  },
  clientHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  clientHeaderText: { fontSize: 10, fontWeight: Typography.weight.bold, color: Colors.textMuted, letterSpacing: 0.5 },
  clientName: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.textPrimary, marginBottom: 12 },
  clientInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  clientInfoText: { fontSize: 14, color: Colors.textSecondary },
  
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.textPrimary },
  sectionCount: { fontSize: 10, fontWeight: Typography.weight.bold, color: Colors.textMuted, letterSpacing: 1 },
  
  articleCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 20, marginBottom: 20,
    borderWidth: 1, borderColor: Colors.border, ...Shadows.sm
  },
  articleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  articleBadge: { backgroundColor: Colors.primary100, paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radius.full },
  articleBadgeText: { color: Colors.primary, fontSize: 10, fontWeight: Typography.weight.bold, letterSpacing: 0.5 },
  
  label: { fontSize: 11, fontWeight: Typography.weight.bold, color: Colors.textMuted, textTransform: 'uppercase', marginBottom: 8 },
  
  pickerContainer: { marginBottom: 16 },
  typeChip: { 
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface2
  },
  typeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeChipText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  typeChipTextActive: { color: 'white' },
  
  modeToggle: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface2
  },
  modeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary, ...Shadows.sm },
  modeBtnText: { fontSize: 12, fontWeight: Typography.weight.bold, color: Colors.textSecondary },
  modeBtnTextActive: { color: 'white' },
  
  row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  col: { flex: 1 },
  
  input: {
    backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: 16, height: 48, fontSize: 14, color: Colors.textPrimary
  },
  priceInput: {
    backgroundColor: Colors.surface, borderWidth: 2, borderColor: Colors.primary, borderRadius: Radius.md,
    paddingHorizontal: 16, height: 54, fontSize: 18, fontWeight: Typography.weight.bold, color: Colors.textPrimary
  },
  textArea: { height: 80, paddingTop: 16, textAlignVertical: 'top', marginBottom: 16 },
  
  priceCalcBox: { backgroundColor: Colors.primary50, padding: 16, borderRadius: Radius.md, marginBottom: 16, borderWidth: 1, borderColor: Colors.primary100 },
  priceCalcRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  priceCalcLabel: { fontSize: 11, fontWeight: Typography.weight.bold, color: Colors.primary, textTransform: 'uppercase' },
  priceCalcValue: { fontSize: 16, fontWeight: Typography.weight.bold, color: Colors.primary },
  
  qtyControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface2, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, marginBottom: 16, height: 48 },
  qtyBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' },
  qtyValue: { width: 60, textAlign: 'center', fontSize: 18, fontWeight: Typography.weight.bold, color: Colors.textPrimary },
  
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed', borderRadius: Radius.lg,
    paddingVertical: 18, backgroundColor: Colors.primary50
  },
  addBtnText: { color: Colors.primary, fontSize: 13, fontWeight: Typography.weight.bold },
  
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    ...Shadows.md
  },
  footerTotals: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  footerItemsText: { fontSize: 12, fontWeight: Typography.weight.bold, color: Colors.textMuted, letterSpacing: 0.5 },
  footerTotalText: { fontSize: 24, fontWeight: Typography.weight.bold, color: Colors.primary },
  
  submitBtn: {
    backgroundColor: Colors.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 14, borderRadius: Radius.md, gap: 10, ...Shadows.teal
  },
  submitBtnText: { color: 'white', fontSize: Typography.size.md, fontWeight: Typography.weight.semibold },
  
  centerContainer: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyCard: { 
    backgroundColor: Colors.surface, padding: 32, borderRadius: Radius.xl, width: '100%',
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border, ...Shadows.md
  },
  emptyIconContainer: { 
    width: 80, height: 80, backgroundColor: Colors.primary100, borderRadius: Radius.lg, 
    justifyContent: 'center', alignItems: 'center', marginBottom: 24 
  },
  emptyTitle: { fontSize: 24, fontWeight: Typography.weight.bold, color: Colors.textPrimary, textAlign: 'center', marginBottom: 16 },
  emptyNotice: { 
    flexDirection: 'row', backgroundColor: Colors.warningBg, borderWidth: 1, borderColor: 'rgba(245,158,11,0.20)', 
    padding: 16, borderRadius: Radius.lg, gap: 12, marginBottom: 32 
  },
  emptyNoticeText: { flex: 1, fontSize: 13, color: '#92400E', fontWeight: '500', lineHeight: 20 },
  emptyPrimaryBtn: { 
    backgroundColor: Colors.primary, width: '100%', flexDirection: 'row', justifyContent: 'center', 
    alignItems: 'center', paddingVertical: 16, borderRadius: Radius.md, gap: 10, marginBottom: 12, ...Shadows.teal
  },
  emptyPrimaryBtnText: { color: 'white', fontSize: 14, fontWeight: Typography.weight.bold },
  emptySecondaryBtn: { 
    backgroundColor: Colors.surface, width: '100%', borderWidth: 1.5, borderColor: Colors.primary, 
    justifyContent: 'center', alignItems: 'center', paddingVertical: 16, borderRadius: Radius.md 
  },
  emptySecondaryBtnText: { color: Colors.primary, fontSize: 13, fontWeight: Typography.weight.bold },
});
