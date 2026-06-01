import React from 'react';
import {
  View, Text, Modal, TouchableOpacity, ActivityIndicator, StyleSheet, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { fr, arDZ as ar } from 'date-fns/locale';
import { Colors } from '../../../constants/theme';
import { row } from '../../../src/utils/rtl';

interface EditDateModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  numeroCommande: string;
  isArabic: boolean;
  t: (key: string, options?: any) => string;
  mode: 'date' | 'time';
  variant: 'pickup' | 'delivery';
  dateValue: Date;
  setDateValue: (d: Date) => void;
  saving: boolean;
}

const VARIANT_COLORS = {
  pickup: { icon: '#7C3AED', bg: '#EDE9FE' },
  delivery: { icon: '#059669', bg: '#D1FAE5' },
};

export default function EditDateModal({
  visible, onClose, onSave, numeroCommande, isArabic, t,
  mode, variant, dateValue, setDateValue, saving,
}: EditDateModalProps) {
  const vc = VARIANT_COLORS[variant];
  const titleKey = variant === 'pickup'
    ? (mode === 'date' ? 'orders.edit_pickup_date' : 'orders.edit_pickup_time')
    : (mode === 'date' ? 'orders.edit_delivery_date' : 'orders.edit_delivery_time');

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismiss} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { height: 'auto' }]}>
          <View style={styles.handle} />
          <View style={[styles.headerRow, row(isArabic)]}>
            <View style={[styles.iconBadge, { backgroundColor: vc.bg }]}>
              <Ionicons name={mode === 'date' ? 'calendar-outline' : 'time-outline'} size={20} color={vc.icon} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, isArabic && { textAlign: 'right' }]}>
                {t(titleKey, { defaultValue: titleKey })}
              </Text>
              <Text style={[styles.subtitle, isArabic && { textAlign: 'right' }]}>#{numeroCommande}</Text>
            </View>
          </View>

          <View style={styles.body}>
            <Text style={[styles.currentValue, { color: vc.icon }, isArabic && { textAlign: 'right' }]}>
              {mode === 'date'
                ? format(dateValue, 'dd MMM yyyy', { locale: isArabic ? ar : fr })
                : format(dateValue, 'HH:mm')}
            </Text>
            <DateTimePicker
              value={dateValue}
              mode={mode}
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              themeVariant="light"
              is24Hour={mode === 'time'}
              onChange={(e, d) => {
                if (Platform.OS === 'android') {
                  onClose();
                  if (e.type === 'set' && d) setDateValue(d);
                } else {
                  if (d) setDateValue(d);
                }
              }}
            />
          </View>

          <View style={[styles.actions, row(isArabic), { margin: 24, marginTop: 8 }]}>
            <TouchableOpacity style={[styles.cancelBtn, { flex: 1 }]} onPress={onClose}>
              <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, { flex: 1.5, backgroundColor: vc.icon }]}
              onPress={onSave}
              disabled={saving}
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
  body: { paddingHorizontal: 20 },
  currentValue: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { height: 50, borderRadius: 14, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  confirmBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  confirmBtnText: { fontSize: 15, fontWeight: '700', color: 'white' },
});
