import React from 'react';
import {
  View, Text, Modal, TouchableOpacity, TextInput, ScrollView,
  ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/theme';
import { row } from '../../../src/utils/rtl';

interface RemiseModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  numeroCommande: string;
  isArabic: boolean;
  t: (key: string, options?: any) => string;
  items: any[];
  remiseForms: Record<number, { montant: string; raison: string }>;
  setRemiseForms: (forms: Record<number, { montant: string; raison: string }>) => void;
  saving: boolean;
}

export default function RemiseModal({
  visible, onClose, onSave, numeroCommande, isArabic, t,
  items, remiseForms, setRemiseForms, saving,
}: RemiseModalProps) {
  const updateForm = (itemId: number, field: 'montant' | 'raison', value: string) => {
    setRemiseForms({ ...remiseForms, [itemId]: { ...remiseForms[itemId], [field]: value } });
  };

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
        <View style={styles.card}>
          <View style={[styles.headerRow, row(isArabic), { marginBottom: 16 }]}>
            <View style={[styles.iconBadge, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="pricetag-outline" size={20} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, isArabic && { textAlign: 'right' }]}>
                {t('orders.remise', { defaultValue: 'Remise' })}
              </Text>
              <Text style={[styles.subtitle, isArabic && { textAlign: 'right' }]}>#{numeroCommande}</Text>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={{ flexShrink: 1 }}
            contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
          >
            {items.map((item: any) => {
              const f = remiseForms[item.id] || { montant: '', raison: '' };
              const basePrice = parseFloat(item.prixFinal || 0) + parseFloat(item.remiseMontant || 0);
              return (
                <View key={item.id} style={styles.itemCard}>
                  <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }, row(isArabic)]}>
                    <Text style={styles.itemName} numberOfLines={1}>{item.productNom || item.nom}</Text>
                    <Text style={styles.itemPrice}>{basePrice.toFixed(2)} {t('common.dh')}</Text>
                  </View>
                  <Text style={[styles.inputLabel, isArabic && { textAlign: 'right' }]}>
                    {t('admin.orders.create.items.remise_amount', { defaultValue: 'Remise' })} ({t('common.dh')})
                  </Text>
                  <TextInput
                    style={[styles.input, { marginBottom: 8 }, isArabic && { textAlign: 'right' }]}
                    value={f.montant}
                    onChangeText={v => updateForm(item.id, 'montant', v)}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor="#94A3B8"
                  />
                  <Text style={[styles.inputLabel, isArabic && { textAlign: 'right' }]}>
                    {t('admin.orders.create.items.remise_reason', { defaultValue: 'Raison' })}
                  </Text>
                  <TextInput
                    style={[styles.input, isArabic && { textAlign: 'right' }]}
                    value={f.raison}
                    onChangeText={v => updateForm(item.id, 'raison', v)}
                    placeholder={t('common.optional', { defaultValue: 'Optionnel' })}
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              );
            })}
          </ScrollView>

          <View style={[styles.actions, row(isArabic), { marginTop: 16 }]}>
            <TouchableOpacity style={[styles.cancelBtn, { flex: 1 }]} onPress={onClose}>
              <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, { flex: 1.5 }]}
              onPress={onSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="white" size="small" />
                : <Text style={styles.confirmBtnText}>{t('common.save')}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,18,25,0.6)', justifyContent: 'center', paddingHorizontal: 20 },
  card: { backgroundColor: 'white', borderRadius: 24, padding: 20, maxHeight: '85%' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBadge: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  itemCard: { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  itemName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  itemPrice: { fontSize: 13, fontWeight: '800', color: Colors.primary },
  inputLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4 },
  input: { backgroundColor: 'white', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.textPrimary },
  actions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { height: 50, borderRadius: 14, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  confirmBtn: { height: 50, borderRadius: 14, backgroundColor: '#D97706', alignItems: 'center', justifyContent: 'center' },
  confirmBtnText: { fontSize: 15, fontWeight: '700', color: 'white' },
});
