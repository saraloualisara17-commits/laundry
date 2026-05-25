import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Colors, Shadows } from '../../../constants/theme';
import Timeline from '../timeline/Timeline';
import { useFormStyles } from '../../../src/hooks/useFormStyles';
import { row, textAlign } from '../../../src/utils/rtl';

interface SuiviTabProps {
  order: any;
  isArabic: boolean;
  t: (key: string, options?: any) => string;
  totalAmount: number;
  paidAmount: number;
  remaining: number;
  payments: any[];
  history: any[];
  canAddPayment: boolean;
  setShowPaymentModal: (val: boolean) => void;
}

const SuiviTab: React.FC<SuiviTabProps> = ({
  order,
  isArabic,
  t,
  totalAmount,
  paidAmount,
  remaining,
  payments,
  history,
  canAddPayment,
  setShowPaymentModal,
}) => {
  const f = useFormStyles();
  return (
    <View>
      <View
        style={[styles.sectionHeader, row(isArabic), { justifyContent: 'space-between', alignItems: 'center' }]}
      >
        <Text style={[styles.sectionTitle, f.sectionLabel]}>{t('financial.details')}</Text>
        {canAddPayment ? (
          <TouchableOpacity onPress={() => setShowPaymentModal(true)}>
            <Text style={styles.addPaymentLink}>+ {t('common.new')}</Text>
          </TouchableOpacity>
        ) : order.status !== 'DELIVERED' ? (
          <Text style={{ fontSize: 12, color: Colors.textMuted, fontStyle: 'italic' }}>
            {t('admin.orders.payment_at_delivery')}
          </Text>
        ) : null}
      </View>

      <View style={styles.paymentSummaryCard}>
        <View style={[styles.paymentRow, row(isArabic)]}>
          <Text style={styles.paymentLabel}>{t('financial.total')}</Text>
          <Text style={[styles.paymentValue, { color: Colors.primary }]}>
            {totalAmount.toFixed(2)} {t('common.dh')}
          </Text>
        </View>
        <View style={[styles.paymentRow, row(isArabic)]}>
          <Text style={styles.paymentLabel}>{t('financial.paid')}</Text>
          <Text style={[styles.paymentValue, { color: Colors.success }]}>
            {paidAmount.toFixed(2)} {t('common.dh')}
          </Text>
        </View>
        <View
          style={[
            styles.paymentRow,
            { borderBottomWidth: 0, paddingBottom: 0 },
            row(isArabic),
          ]}
        >
          <Text style={styles.paymentLabel}>{t('financial.remaining')}</Text>
          <Text
            style={[
              styles.paymentValue,
              remaining > 0 ? { color: Colors.warning } : { color: Colors.textMuted },
            ]}
          >
            {remaining.toFixed(2)} {t('common.dh')}
          </Text>
        </View>

        {payments.length > 0 && (
          <View style={styles.paymentsList}>
            <View style={styles.listDivider} />
            {payments.map((p) => (
              <View key={p.id} style={styles.paymentHistoryItem}>
                <View style={[styles.historyTop, row(isArabic)]}>
                  <Text style={styles.historyAmount}>
                    {parseFloat(p.montant).toFixed(2)} {t('common.dh')}
                  </Text>
                  <Text style={styles.historyDate}>
                    {format(new Date(p.datePaiement), 'dd/MM/yy HH:mm')}
                  </Text>
                </View>
                {p.note && (
                  <View style={[styles.historyNoteBox, row(isArabic)]}>
                    <Feather name="info" size={10} color={Colors.textMuted} />
                    <Text
                      style={[
                        styles.historyNote,
                        textAlign(isArabic),
                        { marginStart: 6 },
                      ]}
                    >
                      {p.note}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={[styles.sectionHeader, row(isArabic)]}>
        <Text style={[styles.sectionTitle, f.sectionLabel]}>{t('admin.orders.history')}</Text>
      </View>
      <Timeline items={history} isArabic={isArabic} t={t} />
    </View>
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  addPaymentLink: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  paymentSummaryCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    ...Shadows.sm,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  paymentLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  paymentValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  paymentsList: {
    marginTop: 8,
  },
  listDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  paymentHistoryItem: {
    marginBottom: 12,
  },
  historyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.success,
  },
  historyDate: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  historyNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  historyNote: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
});

export default React.memo(SuiviTab);
