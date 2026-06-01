import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Modal, KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import { Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AdminColors } from '../../constants/AdminColors';
import { BASE_URL } from '../../src/services/api/client';
import { row } from '../../src/utils/rtl';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ConfigForm {
  qty: number;
  largura: string;
  hauteur: string;
  longueur: string;
  poids: string;
  customPrice: string;
  noteAtelier: string;
}

interface ProductConfigModalProps {
  visible: boolean;
  product: any;
  editCartId: string | null;
  form: ConfigForm;
  setForm: (f: ConfigForm) => void;
  onClose: () => void;
  onSave: () => void;
  calculatePrice: (product: any, form: ConfigForm) => number;
  isArabic: boolean;
  t: (key: string, options?: any) => string;
}

export default React.memo(function ProductConfigModal({
  visible, product, editCartId, form, setForm,
  onClose, onSave, calculatePrice, isArabic, t,
}: ProductConfigModalProps) {
  const scrollRef = useRef<ScrollView>(null);

  if (!product) return null;

  const price = calculatePrice(product, form);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={[styles.headerRow, row(isArabic)]}>
            <View style={styles.imgBox}>
              {product.imageUrl ? (
                <Image source={{ uri: `${BASE_URL}${product.imageUrl}` }} style={styles.imgFull} />
              ) : (
                <Text style={styles.emoji}>{product.categoryIcon || '📦'}</Text>
              )}
            </View>
            <View style={[{ flex: 1 }, isArabic && { alignItems: 'flex-end' }]}>
              <Text style={styles.productName}>{product.nom}</Text>
              <Text style={styles.productPrice}>
                {product.prixUnitaire} {t('common.dh')} / {product.uniteLabel || t('common.unit')}
              </Text>
            </View>
          </View>

          <ScrollView ref={scrollRef} style={styles.body} keyboardShouldPersistTaps="handled">
            {product.pricingMethod === 'PER_M2' && (
              <View style={[styles.dimRow, row(isArabic)]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, isArabic && { textAlign: 'right' }]}>{t('admin.orders.create.items.width')}</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="decimal-pad"
                    value={form.largura}
                    onChangeText={v => setForm({ ...form, largura: v })}
                    onFocus={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, isArabic && { textAlign: 'right' }]}>{t('admin.orders.create.items.height')}</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="decimal-pad"
                    value={form.hauteur}
                    onChangeText={v => setForm({ ...form, hauteur: v })}
                    onFocus={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
                  />
                </View>
              </View>
            )}

            {product.pricingMethod === 'PER_UNIT' && (
              <View style={[styles.stepper, row(isArabic)]}>
                <TouchableOpacity
                  style={[styles.stepBtn, form.qty === 1 && styles.stepBtnDisabled]}
                  disabled={form.qty === 1}
                  onPress={() => setForm({ ...form, qty: form.qty - 1 })}
                >
                  <Text style={[styles.stepSymbol, form.qty === 1 && { color: AdminColors.textMuted }]}>-</Text>
                </TouchableOpacity>
                <Text style={styles.stepValue}>{form.qty}</Text>
                <TouchableOpacity
                  style={[styles.stepBtn, { backgroundColor: AdminColors.primary }]}
                  onPress={() => setForm({ ...form, qty: form.qty + 1 })}
                >
                  <Text style={[styles.stepSymbol, { color: 'white' }]}>+</Text>
                </TouchableOpacity>
              </View>
            )}

            {product.pricingMethod === 'PER_KG' && (
              <View style={[styles.dimRow, row(isArabic)]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, isArabic && { textAlign: 'right' }]}>{t('admin.catalog.pricing.per_kg')} (kg)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="decimal-pad"
                    value={form.poids}
                    onChangeText={v => setForm({ ...form, poids: v })}
                    onFocus={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
                  />
                </View>
              </View>
            )}

            {product.pricingMethod === 'PER_LINEAR_M' && (
              <View style={[styles.dimRow, row(isArabic)]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, isArabic && { textAlign: 'right' }]}>{t('admin.catalog.pricing.per_linear_m')} (m)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="decimal-pad"
                    value={form.longueur}
                    onChangeText={v => setForm({ ...form, longueur: v })}
                    onFocus={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
                  />
                </View>
              </View>
            )}

            {product.pricingMethod === 'CUSTOM' && (
              <View style={[styles.dimRow, row(isArabic)]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, isArabic && { textAlign: 'right' }]}>{t('financial.amount')} ({t('common.dh')})</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={form.customPrice}
                    onChangeText={v => setForm({ ...form, customPrice: v })}
                    onFocus={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
                  />
                </View>
              </View>
            )}

            <View style={styles.calcBox}>
              <Text style={styles.calcFormula}>
                {product.pricingMethod === 'PER_M2' ? `${form.largura || 0}m × ${form.hauteur || 0}m × ${product.prixUnitaire} ${t('common.dh')}/m²` :
                 product.pricingMethod === 'PER_UNIT' ? `${form.qty} × ${product.prixUnitaire} ${t('common.dh')}` :
                 product.pricingMethod === 'PER_KG' ? `${form.poids || 0}kg × ${product.prixUnitaire} ${t('common.dh')}/kg` :
                 product.pricingMethod === 'PER_LINEAR_M' ? `${form.longueur || 0}m × ${product.prixUnitaire} ${t('common.dh')}/m` : ''}
              </Text>
              <Text style={styles.calcResult}>= {price.toFixed(2)} {t('common.dh')}</Text>
            </View>

            <Text style={[styles.label, { marginTop: 12 }, isArabic && { textAlign: 'right' }]}>{t('admin.orders.create.items.workshop_notes')}</Text>
            <TextInput
              style={[styles.formInput, { height: 64, textAlignVertical: 'top', marginBottom: 8 }, isArabic && { textAlign: 'right', writingDirection: 'rtl' }]}
              multiline
              placeholder={t('admin.orders.create.items.workshop_notes_placeholder')}
              value={form.noteAtelier}
              onChangeText={v => setForm({ ...form, noteAtelier: v })}
            />
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
              <Text style={styles.saveBtnText}>
                {editCartId ? t('common.save') : t('admin.orders.create.items.add_to_bag')} — {price.toFixed(2)} {t('common.dh')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', paddingHorizontal: 20 },
  sheet: { backgroundColor: 'white', borderRadius: 24, maxHeight: SCREEN_HEIGHT * 0.72, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 24 },
  headerRow: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 16 },
  imgBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  imgFull: { width: '100%', height: '100%', borderRadius: 12 },
  emoji: { fontSize: 24 },
  productName: { fontSize: 16, fontWeight: '700', color: AdminColors.textPrimary },
  productPrice: { fontSize: 13, color: AdminColors.primary, fontWeight: '600', marginTop: 2 },
  body: {},
  dimRow: { flexDirection: 'row', marginBottom: 12, gap: 12 },
  label: { fontSize: 13, fontWeight: '600', color: AdminColors.textSecondary, marginBottom: 4 },
  input: { flex: 1, height: 48, fontSize: 16, textAlign: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, backgroundColor: 'white', color: '#1E293B' },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginVertical: 8 },
  stepBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: AdminColors.primary, alignItems: 'center', justifyContent: 'center' },
  stepBtnDisabled: { borderColor: '#E2E8F0' },
  stepSymbol: { fontSize: 20, fontWeight: '300', color: AdminColors.primary },
  stepValue: { fontSize: 28, fontWeight: '800', color: AdminColors.textPrimary, minWidth: 40, textAlign: 'center' },
  calcBox: { backgroundColor: '#F1F5F9', borderRadius: 14, padding: 12, marginTop: 8, alignItems: 'center' },
  calcFormula: { fontSize: 13, color: AdminColors.textSecondary, textAlign: 'center' },
  calcResult: { fontSize: 20, fontWeight: '800', color: AdminColors.primary, marginTop: 2, textAlign: 'center' },
  formInput: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, fontSize: 15, backgroundColor: 'white', color: '#1E293B' },
  footer: { paddingTop: 14 },
  saveBtn: { backgroundColor: AdminColors.primary, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
});
