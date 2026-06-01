import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AdminColors, AdminShadows } from '../../constants/AdminColors';
import { StatusColors } from '../../constants/StatusColors';
import { StatusBadge } from './StatusBadge';
import { row, font, arabicSafe, textAlign, textProps } from '../../src/utils/rtl';
import { formatOrderItemsSummary } from '../../src/utils/orderSummary';

interface OrderCardProps {
  item: any;
  isArabic: boolean;
  t: (key: string, options?: any) => string;
  onValidate?: (id: number) => void;
  showDebtSettled?: boolean;
}

const OrderCard = React.memo(function OrderCard({ item, isArabic, t, onValidate, showDebtSettled }: OrderCardProps) {
  const statusCfg = StatusColors[item.status] || StatusColors.PENDING_PICKUP;
  const itemsSummary = formatOrderItemsSummary(item.commandeTapis, t);
  const address = item.client?.addresses?.[0]?.address || item.clientAdresse || null;

  return (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => router.push(`/order/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={[styles.cardTop, row(isArabic)]}>
        <StatusBadge status={item.status} />
        <Text style={[styles.orderRef, arabicSafe(isArabic), { color: statusCfg.dot, fontSize: 17 }]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>#{item.id}</Text>
      </View>

      <Text style={[styles.clientName, textAlign(isArabic), font.bold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
        {item.client?.name || item.clientNom}
      </Text>

      {address && (
        <View style={[styles.infoItem, { marginTop: 4 }, row(isArabic)]}>
          <Ionicons name="location-outline" size={13} color={AdminColors.textMuted} />
          <Text style={[styles.addressText, textAlign(isArabic)]} numberOfLines={1} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{address}</Text>
        </View>
      )}

      <View style={[styles.infoRow, row(isArabic)]}>
        <View style={[styles.infoItem, row(isArabic)]}>
          <Ionicons name="cube-outline" size={13} color={AdminColors.textSecondary} />
          <Text style={[styles.infoText, font.regular(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>{itemsSummary}</Text>
        </View>
        <View style={[styles.infoItem, row(isArabic)]}>
          <Ionicons name="calendar-outline" size={13} color={AdminColors.textSecondary} />
          <Text style={[styles.infoText, font.regular(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
            {new Date(item.dateCreation).toLocaleDateString('fr-FR')}
          </Text>
        </View>
      </View>

      <View style={[styles.cardBottom, row(isArabic)]}>
        <View style={isArabic ? { alignItems: 'flex-end' } : {}}>
          <Text style={[styles.amountText, font.extrabold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
            {item.montantTotal} {t('common.dh')}
          </Text>
          {(item.montantPaye > 0 || item.resteAPayer > 0) && (
            <View style={[styles.financialRow, row(isArabic)]}>
              <Text style={[styles.payeText, font.semibold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
                {t('financial.paid')}: {item.montantPaye || 0} {t('common.dh')}
              </Text>
              {item.resteAPayer > 0 && (
                <Text style={[styles.resteText, font.semibold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
                  {t('financial.remaining')}: {item.resteAPayer} {t('common.dh')}
                </Text>
              )}
            </View>
          )}
          {showDebtSettled && !!item.debtSettledAt && (
            <View style={[styles.financialRow, row(isArabic)]}>
              <Ionicons name="checkmark-circle" size={13} color="#10B981" />
              <Text style={[styles.settledText, font.semibold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
                {t('dashboard.settled_on')}: {new Date(item.debtSettledAt).toLocaleDateString('fr-FR')}
              </Text>
            </View>
          )}
        </View>

        {item.status === 'PENDING_PICKUP' && onValidate && (
          <TouchableOpacity style={styles.validateBtn} onPress={() => onValidate(item.id)}>
            <Text style={[styles.validateBtnText, font.bold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
              {t('admin.orders.validate')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
});

export default OrderCard;

const styles = StyleSheet.create({
  orderCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginHorizontal: 16, marginBottom: 12, ...AdminShadows.shadowSmall },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  orderRef: { fontSize: 17, fontWeight: '800' },
  clientName: { fontSize: 17, fontWeight: '700', color: AdminColors.textPrimary, marginTop: 2 },
  addressText: { fontSize: 12, color: AdminColors.textMuted, fontWeight: '500', flex: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginTop: 10 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 13, color: AdminColors.textSecondary, fontWeight: '500' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  amountText: { fontSize: 18, fontWeight: '800', color: AdminColors.primary },
  financialRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  payeText: { fontSize: 12, fontWeight: '600', color: '#059669' },
  resteText: { fontSize: 12, fontWeight: '600', color: '#DC2626' },
  settledText: { fontSize: 12, fontWeight: '600', color: '#10B981' },
  validateBtn: { backgroundColor: AdminColors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  validateBtnText: { color: 'white', fontSize: 13, fontWeight: '700' },
});
