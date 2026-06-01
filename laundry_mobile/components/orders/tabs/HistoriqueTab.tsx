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
import { Colors } from '../../../constants/theme';
import { useRTL, row, textAlign, font, textProps } from '../../../src/utils/rtl';
import { useOrderTimeline } from '../../../src/hooks/query/useAudit';
import { TimelineEntry } from '../../../src/services/api/auditApi';

interface HistoriqueTabProps {
  orderId: string | number;
}

const TYPE_CONFIG: Record<string, { icon: string; iconLib: 'ion' | 'feather'; color: string; bg: string; label: Record<string, string> }> = {
  STATUS_CHANGE: { icon: 'git-branch-outline', iconLib: 'ion',     color: Colors.primary,   bg: Colors.primary50, label: { fr: 'Statut',    ar: 'الحالة'  } },
  PAYMENT:       { icon: 'cash-outline',        iconLib: 'ion',     color: Colors.success,   bg: '#F0FDF4',        label: { fr: 'Paiement',  ar: 'دفع'     } },
  ATTEMPT_FAILED:{ icon: 'alert-circle-outline',iconLib: 'ion',     color: '#D97706',        bg: '#FFFBEB',        label: { fr: 'Tentative', ar: 'محاولة'  } },
  AUDIT:         { icon: 'shield',              iconLib: 'feather', color: Colors.textMuted, bg: '#F8FAFC',        label: { fr: 'Audit',     ar: 'تدقيق'  } },
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

function translateStatus(raw: string, t: (k: string, o?: any) => string): string {
  const key = `status.${raw.trim()}`;
  const translated = t(key, { defaultValue: raw.trim() });
  return translated;
}

const PAYMENT_MODES: Record<string, Record<string, string>> = {
  ESPECES:  { fr: 'Espèces',  ar: 'نقداً'   },
  CARTE:    { fr: 'Carte',    ar: 'بطاقة'   },
  CHEQUE:   { fr: 'Chèque',   ar: 'شيك'     },
  VIREMENT: { fr: 'Virement', ar: 'تحويل'   },
};

const ATTEMPT_TYPES: Record<string, Record<string, string>> = {
  PICKUP:   { fr: 'Collecte échouée',  ar: 'فشل الاستلام'  },
  DELIVERY: { fr: 'Livraison échouée', ar: 'فشل التوصيل'   },
};

function translateDescription(entry: TimelineEntry, t: (k: string, o?: any) => string, isRTL: boolean): string {
  const lang = isRTL ? 'ar' : 'fr';

  if (entry.type === 'STATUS_CHANGE') {
    return entry.description.split('→').map(s => translateStatus(s.trim(), t)).join(' → ');
  }

  if (entry.type === 'PAYMENT') {
    // Backend: "Paiement: 150.0 MAD (ESPECES)" — translate label + payment mode
    let desc = entry.description.replace(
      /^Paiement:/,
      t('audit.payment_label', { defaultValue: 'Paiement' }) + ':'
    );
    desc = desc.replace(/\((\w+)\)$/, (_, mode) => {
      const m = PAYMENT_MODES[mode];
      return m ? `(${m[lang]})` : `(${mode})`;
    });
    return desc;
  }

  if (entry.type === 'AUDIT') {
    const actionKey = `audit.actions.${entry.description.toLowerCase()}`;
    return t(actionKey, { defaultValue: entry.description });
  }

  if (entry.type === 'ATTEMPT_FAILED') {
    // Backend: "PICKUP — reason" or "DELIVERY — reason"
    const parts = entry.description.split('—');
    const typeRaw = parts[0]?.trim().toUpperCase();
    const reason = parts.slice(1).join('—').trim();
    const typeLabel = ATTEMPT_TYPES[typeRaw]?.[lang] ?? typeRaw;
    return reason ? `${typeLabel} — ${reason}` : typeLabel;
  }

  return entry.description;
}

const STATUS_KEYS = new Set([
  'PENDING_PICKUP', 'PICKED_UP', 'IN_PROCESS',
  'READY_FOR_DELIVERY', 'DELIVERED', 'CANCELLED',
  'PICKUP_FAILED', 'DELIVERY_FAILED',
]);

function maybeTranslateValue(raw: string, t: (k: string, o?: any) => string): string {
  if (!raw) return raw;
  const upper = raw.trim().toUpperCase();
  if (STATUS_KEYS.has(upper)) return translateStatus(upper, t);
  return raw;
}

function TimelineItem({ entry, isRTL, isLast, t }: { entry: TimelineEntry; isRTL: boolean; isLast: boolean; t: (k: string, o?: any) => string }) {
  const cfg = TYPE_CONFIG[entry.type] ?? TYPE_CONFIG.AUDIT;

  const prevTrans = entry.previousValue ? maybeTranslateValue(entry.previousValue, t) : '';
  const newTrans  = entry.newValue      ? maybeTranslateValue(entry.newValue, t)      : '';

  const lang = isRTL ? 'ar' : 'fr';
  const metaDisplay = (() => {
    const m = entry.metadata?.trim();
    if (!m) return '';
    // payment mode stored as enum name
    if (PAYMENT_MODES[m]) return PAYMENT_MODES[m][lang];
    // order number (starts with digits or contains dashes) — suppress, already in header
    if (/^\d|^[A-Z]{2,}-/.test(m)) return '';
    return m;
  })();

  const extra = [
    entry.note,
    entry.commentaire,
    entry.notes,
    prevTrans && newTrans
      ? `${prevTrans} → ${newTrans}`
      : prevTrans || newTrans,
    metaDisplay,
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
              {isRTL ? cfg.label.ar : cfg.label.fr}
            </Text>
          </View>
          <Text style={[styles.ts, font.regular(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
            {formatTs(entry.timestamp, isRTL)}
          </Text>
        </View>

        <Text style={[styles.description, textAlign(isRTL), font.semibold(isRTL)]}
          maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
          {translateDescription(entry, t, isRTL)}
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
          t={t}
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
