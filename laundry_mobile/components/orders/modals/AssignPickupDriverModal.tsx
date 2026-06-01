import React from 'react';
import {
  View, Text, Modal, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/theme';
import { row } from '../../../src/utils/rtl';

interface AssignPickupDriverModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  numeroCommande: string;
  isArabic: boolean;
  t: (key: string, options?: any) => string;
  drivers: any[];
  driversLoading: boolean;
  selectedDriverId: string | null;
  setSelectedDriverId: (id: string) => void;
  confirming: boolean;
}

export default React.memo(function AssignPickupDriverModal({
  visible, onClose, onConfirm, numeroCommande, isArabic, t,
  drivers, driversLoading,
  selectedDriverId, setSelectedDriverId,
  confirming,
}: AssignPickupDriverModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismiss} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { height: '70%' }]}>
          <View style={styles.handle} />
          <View style={[styles.headerRow, row(isArabic)]}>
            <View style={[styles.iconBadge, { backgroundColor: '#FEF3C7' }]}>
              <Feather name="package" size={20} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, isArabic && { textAlign: 'right' }]}>{t('orders.assign_pickup_driver')}</Text>
              <Text style={[styles.subtitle, isArabic && { textAlign: 'right' }]}>#{numeroCommande}</Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            <View style={styles.body}>
              <Text style={[styles.inputLabel, isArabic && { textAlign: 'right' }]}>
                {t('admin.orders.filter_driver')}
              </Text>

              {driversLoading && <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 16 }} />}
              {!driversLoading && drivers.length === 0 && (
                <Text style={{ color: Colors.textMuted, textAlign: 'center', padding: 16 }}>{t('admin.orders.no_drivers')}</Text>
              )}

              {drivers.map((driver: any) => {
                const selected = selectedDriverId === String(driver.id);
                return (
                  <TouchableOpacity
                    key={driver.id}
                    style={[styles.driverOption, selected && styles.driverOptionSelected, row(isArabic)]}
                    onPress={() => setSelectedDriverId(String(driver.id))}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.driverAvatar, { backgroundColor: selected ? 'rgba(255,255,255,0.25)' : Colors.primary100 }]}>
                      <Text style={[styles.driverAvatarText, { color: selected ? 'white' : Colors.primaryDark }]}>
                        {driver.name?.[0]?.toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.driverName, selected && { color: 'white' }]}>{driver.name}</Text>
                      {driver.phone && (
                        <Text style={{ fontSize: 12, color: selected ? 'rgba(255,255,255,0.75)' : Colors.textMuted, marginTop: 2 }}>
                          {driver.phone}
                        </Text>
                      )}
                    </View>
                    {selected
                      ? <Ionicons name="checkmark-circle" size={22} color="white" />
                      : <View style={styles.radioEmpty} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={[styles.actions, row(isArabic)]}>
            <TouchableOpacity style={[styles.cancelBtn, { flex: 1 }]} onPress={onClose}>
              <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, { flex: 1.5 }, !selectedDriverId && { opacity: 0.5 }]}
              onPress={onConfirm}
              disabled={!selectedDriverId || confirming}
            >
              {confirming
                ? <ActivityIndicator color="white" size="small" />
                : <Text style={styles.confirmBtnText}>{t('common.confirm')}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  dismiss: { ...StyleSheet.absoluteFillObject },
  sheet: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16 },
  iconBadge: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.primary100, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  body: { paddingHorizontal: 20, paddingBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  driverOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, backgroundColor: '#F8FAFC', marginBottom: 8, borderWidth: 1.5, borderColor: '#E2E8F0' },
  driverOptionSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  driverAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  driverAvatarText: { fontSize: 16, fontWeight: '800' },
  driverName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  radioEmpty: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#CBD5E1' },
  actions: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  cancelBtn: { height: 50, borderRadius: 14, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  confirmBtn: { height: 50, borderRadius: 14, backgroundColor: '#D97706', alignItems: 'center', justifyContent: 'center' },
  confirmBtnText: { fontSize: 15, fontWeight: '700', color: 'white' },
});
