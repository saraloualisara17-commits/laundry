import React from 'react';
import {
  View, Text, Modal, TouchableOpacity, TextInput, ScrollView,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/theme';
import { row } from '../../../src/utils/rtl';

interface EditAddressModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  onOpenMapPicker: () => void;
  onCaptureGps: () => void;
  clientName: string;
  isArabic: boolean;
  t: (key: string, options?: any) => string;
  addressText: string;
  setAddressText: (v: string) => void;
  regionText: string;
  setRegionText: (v: string) => void;
  gpsCoords: { lat: number; lng: number } | null;
  capturingGps: boolean;
  saving: boolean;
}

export default function EditAddressModal({
  visible, onClose, onSave, onOpenMapPicker, onCaptureGps,
  clientName, isArabic, t,
  addressText, setAddressText,
  regionText, setRegionText,
  gpsCoords, capturingGps, saving,
}: EditAddressModalProps) {
  const canSave = !!(addressText.trim() || regionText.trim() || gpsCoords);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismiss} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { maxHeight: '90%' }]}>
          <View style={styles.handle} />
          <View style={[styles.headerRow, row(isArabic)]}>
            <View style={[styles.iconBadge, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="location-outline" size={20} color="#8B5CF6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, isArabic && { textAlign: 'right' }]}>
                {t('orders.edit_address', { defaultValue: 'تعديل العنوان' })}
              </Text>
              <Text style={[styles.subtitle, isArabic && { textAlign: 'right' }]}>{clientName}</Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={[styles.body, { gap: 12 }]}>
              <View>
                <Text style={[styles.inputLabel, isArabic && { textAlign: 'right' }]}>
                  {t('admin.orders.create.region_label', { defaultValue: 'Quartier / Région' })}
                </Text>
                <TextInput
                  style={[styles.input, isArabic && { textAlign: 'right' }]}
                  value={regionText}
                  onChangeText={setRegionText}
                  placeholder={t('admin.orders.create.region_placeholder', { defaultValue: 'Ex: Agadir, Guéliz...' })}
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View>
                <Text style={[styles.inputLabel, isArabic && { textAlign: 'right' }]}>
                  {t('admin.clients.address', { defaultValue: 'Adresse' })}
                </Text>
                <TextInput
                  style={[styles.input, { minHeight: 72, textAlignVertical: 'top', paddingTop: 12 }, isArabic && { textAlign: 'right' }]}
                  value={addressText}
                  onChangeText={setAddressText}
                  placeholder={t('admin.clients.address')}
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={[styles.twoCol, row(isArabic)]}>
                <TouchableOpacity
                  style={[styles.locBtn, { backgroundColor: '#0D1B2A', flex: 1 }, row(isArabic)]}
                  onPress={onCaptureGps}
                  disabled={capturingGps}
                >
                  {capturingGps
                    ? <ActivityIndicator size="small" color="white" />
                    : <Ionicons name="locate" size={18} color="white" />}
                  <Text style={styles.locBtnText}>
                    {t('admin.orders.create.location_gps', { defaultValue: 'GPS' })}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.locBtn, { backgroundColor: Colors.primary, flex: 1 }, row(isArabic)]}
                  onPress={onOpenMapPicker}
                >
                  <Ionicons name="map" size={18} color="white" />
                  <Text style={styles.locBtnText}>
                    {t('admin.orders.create.location_map', { defaultValue: 'Carte' })}
                  </Text>
                </TouchableOpacity>
              </View>

              {gpsCoords && (
                <View style={[styles.coordsRow, row(isArabic)]}>
                  <Ionicons name="location" size={14} color="#8B5CF6" />
                  <Text style={styles.coordsText}>
                    {gpsCoords.lat.toFixed(5)}, {gpsCoords.lng.toFixed(5)}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          <View style={[styles.actions, row(isArabic), { margin: 24, marginTop: 12 }]}>
            <TouchableOpacity style={[styles.cancelBtn, { flex: 1 }]} onPress={onClose}>
              <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, { flex: 1.5 }, !canSave && { opacity: 0.5 }]}
              onPress={onSave}
              disabled={saving || !canSave}
            >
              {saving
                ? <ActivityIndicator color="white" size="small" />
                : <Text style={styles.confirmBtnText}>{t('common.save')}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  dismiss: { ...StyleSheet.absoluteFillObject },
  sheet: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16 },
  iconBadge: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  body: { paddingHorizontal: 20, paddingBottom: 8 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: Colors.textPrimary },
  twoCol: { flexDirection: 'row', gap: 10 },
  locBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 12 },
  locBtnText: { color: 'white', fontSize: 13, fontWeight: '700' },
  coordsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F3E8FF', padding: 10, borderRadius: 10 },
  coordsText: { fontSize: 12, color: '#8B5CF6', fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { height: 50, borderRadius: 14, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  confirmBtn: { height: 50, borderRadius: 14, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center' },
  confirmBtnText: { fontSize: 15, fontWeight: '700', color: 'white' },
});
