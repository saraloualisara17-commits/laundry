import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr, arDZ as ar } from 'date-fns/locale';
import { Colors, Shadows } from '../../../constants/theme';
import { useRTL, row, textAlign, font, textProps } from '../../../src/utils/rtl';
import { useOrderTimeline } from '../../../src/hooks/query/useAudit';
import { TimelineEntry } from '../../../src/services/api/auditApi';

interface HistoriqueTabProps {
  orderId: string | number;
}

const TYPE_CONFIG: Record<string, { icon: string; iconLib: 'ion' | 'feather'; color: string; bg: string; label: string }> = {
  STATUS_CHANGE: { icon: 'git-branch-outline', iconLib: 'ion',    color: Colors.primary,   bg: Colors.primary50,   label: 'Statut' },
  PAYMENT:       { icon: 'cash-outline',        iconLib: 'ion',    color: Colors.success,   bg: '#F0FDF4',          label: 'Paiement' },
  ATTEMPT_FAILED:{ icon: 'alert-circle-outline',iconLib: 'ion',    color: '#D97706',        bg: '#FFFBEB',          label: 'Tentative' },
  AUDIT:         { icon: 'shield',              iconLib: 'feather', color: Colors.textMuted, bg: '#F8FAFC',          label: 'Audit' },
};

function formatTs(ts: string, isRTL: boolean) {
  if (!ts) return '';
  try {
    return format(new Date(ts), 'dd MMM yyyy · HH:mm', { locale: isRTL ? ar : fr });
  } catch {
    return ts;
  }
}

function EntryIcon({ type }: { type: string }) {
  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.AUDIT;
  if (cfg.iconLib === 'feather') {
    return <Feather name={cfg.icon as any} size={16} color={cfg.color} />;
  }
  return <Ionicons name={cfg.icon as any} size={16} color={cfg.color} />;
}

function TimelineItem({ entry, isRTL, isLast }: { entry: TimelineEntry; isRTL: boolean; isLast: boolean }) {
  const cfg = TYPE_CONFIG[entry.type] ?? TYPE_CONFIG.AUDIT;

  const extra = [
    entry.note,
    entry.commentaire,
    entry.notes,
    entry.previousValue && entry.newValue
      ? `${entry.previousValue} → ${entry.newValue}`
      : entry.previousValue || entry.newValue,
    entry.metadata,
  ].filter(Boolean).join(' · ');

  return (
    <View style={[styles.item, row(isRTL)]}>
      {/* Connector column */}
      <View style={styles.connectorCol}>
        <View style={[styles.dot, { backgroundColor: cfg.bg, borderColor: cfg.color }]}>
          <EntryIcon type={entry.type} />
        </View>
        {!isLast && <View style={styles.line} />}
      </View>

      {/* Content */}
      <View style={[styles.itemBody, { marginStart: 12, marginEnd: 4 }]}>
        <View style={[styles.itemHeader, row(isRTL)]}>
          <View style={[styles.typePill, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.typePillText, { color: cfg.color }, font.semibold(isRTL)]}
              maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
              {cfg.label}
            </Text>
          </View>
          <Text style={[styles.ts, font.regular(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
            {formatTs(entry.timestamp, isRTL)}
          </Text>
        </View>

        <Text style={[styles.description, textAlign(isRTL), font.semibold(isRTL)]}
          maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
          {entry.description}
        </Text>

        {!!entry.actor && (
          <View style={[styles.actorRow, row(isRTL)]}>
            <Ionicons name="person-outline" size={11} color={Colors.textMuted} />
            <Text style={[styles.actor, font.regular(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
              {entry.actor}
            </Text>
          </View>
        )}

        {!!extra && (
          <Text style={[styles.extra, textAlign(isRTL), font.regular(isRTL)]}
            maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
            {extra}
          </Text>
        )}
      </View>
    </View>
  );
}

export default function HistoriqueTab({ orderId }: HistoriqueTabProps) {
  const { isRTL, t } = useRTL();
  const { data, isLoading, isError, refetch } = useOrderTimeline(orderId);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={[styles.emptyText, font.regular(isRTL)]}>{t('common.error')}</Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
          <Text style={[styles.retryText, font.semibold(isRTL)]}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="time-outline" size={40} color={Colors.textMuted} />
        <Text style={[styles.emptyText, font.regular(isRTL)]}>{t('common.no_data')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {data.map((entry, idx) => (
        <TimelineItem
          key={`${entry.type}-${entry.timestamp}-${idx}`}
          entry={entry}
          isRTL={isRTL}
          isLast={idx === data.length - 1}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  center: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.primary50,
  },
  retryText: {
    fontSize: 14,
    color: Colors.primary,
  },
  item: {
    marginBottom: 0,
  },
  connectorCol: {
    alignItems: 'center',
    width: 40,
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    width: 1.5,
    flex: 1,
    minHeight: 16,
    backgroundColor: '#E2E8F0',
    marginVertical: 2,
  },
  itemBody: {
    flex: 1,
    paddingBottom: 20,
  },
  itemHeader: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  typePillText: {
    fontSize: 11,
  },
  ts: {
    fontSize: 11,
    color: Colors.textMuted,
    flex: 1,
  },
  description: {
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  actorRow: {
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  actor: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  extra: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
});
