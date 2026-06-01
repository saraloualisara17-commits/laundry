import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Shadows } from '../../../constants/theme';
import { row } from '../../../src/utils/rtl';

interface OrderFinancialCardProps {
  order: any;
  isArabic: boolean;
  t: (key: string, options?: any) => string;
  totalAmount: number;
  paidAmount: number;
  remaining: number;
  progressPercentage: number;
  fullyPaid: boolean;
}

export default function OrderFinancialCard({
  order, isArabic, t,
  totalAmount, paidAmount, remaining, progressPercentage, fullyPaid,
}: OrderFinancialCardProps) {
  const totalM2 = (order.commandeTapis || []).reduce(
    (acc: number, item: any) => acc + ((item.largeur || 0) * (item.hauteur || 0) * (item.quantite || 1)),
    0
  );

  const rows = [
    { label: t('orders.total_m2', { defaultValue: 'المساحة الإجمالية' }), value: `${totalM2.toFixed(2)} m²`, color: Colors.textPrimary },
    { label: t('financial.total'), value: `${totalAmount.toFixed(2)} ${t('common.dh')}`, color: Colors.textPrimary },
    { label: t('financial.paid'), value: `${paidAmount.toFixed(2)} ${t('common.dh')}`, color: fullyPaid ? Colors.success : Colors.warning },
    { label: t('financial.remaining'), value: fullyPaid ? '✓' : `${remaining.toFixed(2)} ${t('common.dh')}`, color: fullyPaid ? Colors.success : Colors.danger },
  ];

  return (
    <View style={styles.card}>
      {rows.map((r, i) => (
        <View key={i} style={[styles.row, row(isArabic), i < rows.length - 1 && styles.rowBorder]}>
          <Text style={[styles.label, isArabic && { textAlign: 'right' }]}>{r.label}</Text>
          <Text style={[styles.value, { color: r.color }]}>{r.value}</Text>
        </View>
      ))}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progressPercentage}%`, backgroundColor: fullyPaid ? Colors.success : Colors.warning }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'white', marginHorizontal: 16, marginTop: 12, borderRadius: 20, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, ...Shadows.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  label: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  value: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  progressBar: { height: 5, borderRadius: 3, backgroundColor: '#F1F5F9', marginTop: 10, overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 3 },
});
