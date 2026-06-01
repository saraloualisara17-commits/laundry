import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/theme';
import { row } from '../../../src/utils/rtl';
import { isDelivered } from '../../../constants/orderWorkflow';

interface OrderWorkflowAreaProps {
  order: any;
  isArabic: boolean;
  t: (key: string, options?: any) => string;
  fullyPaid: boolean;
  totalAmount: number;
  permissions: any;
}

export default function OrderWorkflowArea({
  order, isArabic, t, fullyPaid, totalAmount, permissions,
}: OrderWorkflowAreaProps) {
  const isReadyNoDriver = order.status === 'READY_FOR_DELIVERY' && !order.deliveryDriver;

  return (
    <View style={styles.container}>
      {/* Settled banner */}
      {isDelivered(order.status) && fullyPaid && (
        <View style={styles.settledBanner}>
          <Ionicons name="checkmark-done-circle" size={26} color={Colors.success} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.settledTitle, isArabic && { textAlign: 'right' }]}>{t('dashboard.all_settled')}</Text>
            <Text style={[styles.settledSub, isArabic && { textAlign: 'right' }]}>{totalAmount.toFixed(2)} {t('common.dh')}</Text>
          </View>
        </View>
      )}

      {/* Ready — no driver warning */}
      {isReadyNoDriver && (permissions.isAdmin || permissions.isEmploye || permissions.isLivreur) && (
        <View style={styles.waitingBanner}>
          <Ionicons name="time-outline" size={22} color="#0284C7" />
          <Text style={[styles.waitingText, isArabic && { textAlign: 'right' }]}>
            {t('admin.orders.actions.waiting_driver')}
          </Text>
        </View>
      )}

      {/* Pickup driver info */}
      {order.livreur && (
        <View style={[styles.driverRow, row(isArabic)]}>
          <View style={[styles.driverAvatar, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="person-outline" size={16} color="#D97706" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.driverLabel}>{t('orders.pickup_driver', { defaultValue: 'Livreur de collecte' })}</Text>
            <Text style={styles.driverName}>{order.livreur.name}</Text>
          </View>
        </View>
      )}

      {/* Delivery driver info */}
      {order.deliveryDriver && (
        <View style={[styles.driverRow, row(isArabic)]}>
          <View style={[styles.driverAvatar, { backgroundColor: '#DCFCE7' }]}>
            <Ionicons name="car-outline" size={16} color="#16A34A" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.driverLabel}>{t('orders.delivery_driver', { defaultValue: 'Livreur de livraison' })}</Text>
            <Text style={styles.driverName}>{order.deliveryDriver.name}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, marginTop: 12, gap: 10 },
  settledBanner: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Colors.successBg, borderRadius: 18, padding: 18, borderWidth: 1.5, borderColor: Colors.success + '40' },
  settledTitle: { fontSize: 15, fontWeight: '800', color: Colors.success },
  settledSub: { fontSize: 13, fontWeight: '600', color: Colors.success, opacity: 0.75, marginTop: 2 },
  waitingBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F0F9FF', borderRadius: 16, padding: 18, borderWidth: 1.5, borderColor: '#BAE6FD' },
  waitingText: { fontSize: 15, fontWeight: '700', color: '#0284C7', flex: 1 },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'white', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  driverAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  driverLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  driverName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginTop: 2 },
});
