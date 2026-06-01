import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AdminColors, AdminShadows } from '../../constants/AdminColors';
import { row, font, arabicSafe, pos, textProps } from '../../src/utils/rtl';
import { useFormStyles } from '../../src/hooks/useFormStyles';

interface OrderStatsBannerProps {
  orders: any[];
  isArabic: boolean;
  t: (key: string, options?: any) => string;
}

const OrderStatsBanner = React.memo(function OrderStatsBanner({ orders, isArabic, t }: OrderStatsBannerProps) {
  const f = useFormStyles();
  const totalAmount = orders.reduce((sum, o) => sum + (o.montantTotal || 0), 0);
  const totalPending = orders.filter(o => o.status === 'PENDING_PICKUP').length;

  return (
    <View style={styles.banner}>
      <View style={[styles.decoCircle, pos.end(-30, isArabic), { top: -30 }]} />
      <View style={[styles.row, row(isArabic)]}>
        <View style={styles.item}>
          <Text style={[styles.value, font.extrabold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{orders.length}</Text>
          <Text style={[styles.label, f.statLabel, arabicSafe(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{t('common.all')}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.item}>
          <Text style={[styles.value, font.extrabold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
            {totalAmount} <Text style={{ fontSize: 14 }}>{t('common.dh')}</Text>
          </Text>
          <Text style={[styles.label, f.statLabel, arabicSafe(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{t('common.total')}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.item}>
          <Text style={[styles.value, font.extrabold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{totalPending}</Text>
          <Text style={[styles.label, f.statLabel, arabicSafe(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{t('status.PENDING_PICKUP')}</Text>
        </View>
      </View>
    </View>
  );
});

export default OrderStatsBanner;

const styles = StyleSheet.create({
  banner: { backgroundColor: '#0D7377', marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 16, ...AdminShadows.shadowMedium, overflow: 'hidden', position: 'relative' },
  decoCircle: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.08)' },
  row: { flexDirection: 'row', alignItems: 'center' },
  item: { flex: 1, alignItems: 'center' },
  value: { fontSize: 22, fontWeight: '800', color: 'white', marginBottom: 4 },
  label: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  divider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },
});
