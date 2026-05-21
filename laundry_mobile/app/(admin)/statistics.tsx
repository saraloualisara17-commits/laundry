import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Animated, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Modal } from 'react-native';
import statisticsApi from '../../src/services/statistics/statisticsApi';
import { AdminColors, AdminShadows } from '../../constants/AdminColors';
import { useTranslation } from 'react-i18next';

type Period = 'today' | 'yesterday' | 'week' | 'month' | 'all';

const PERIODS: { key: Period; labelKey: string }[] = [
  { key: 'today',     labelKey: 'common.today' },
  { key: 'yesterday', labelKey: 'common.yesterday' },
  { key: 'week',      labelKey: 'stats.this_week' },
  { key: 'month',     labelKey: 'stats.this_month' },
  { key: 'all',       labelKey: 'stats.all_time' },
];

function getDateRange(period: Period): { start: string; end: string } {
  const now = new Date();
  // Use local date parts to avoid UTC offset shifting the date (e.g. UTC+1 at midnight)
  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case 'today':
      return { start: fmt(today), end: fmt(today) };
    case 'yesterday': {
      const y = new Date(today); y.setDate(y.getDate() - 1);
      return { start: fmt(y), end: fmt(y) };
    }
    case 'week': {
      const day = today.getDay(); // 0=Sun
      const mon = new Date(today); mon.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
      return { start: fmt(mon), end: fmt(today) };
    }
    case 'month': {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: fmt(first), end: fmt(today) };
    }
    case 'all':
    default:
      return { start: '2020-01-01', end: fmt(today) };
  }
}

interface StatData {
  revenue: number;
  totalOrders: number;
  totalClients: number;
  unpaidAmount: number;
  unpaidCount: number;
  // Commandes Reçues (event-based, immutable)
  recuesCount: number;
  recuesItems: number;
  recuesM2: number;
  recuesTotal: number;
  // Commandes Livrées (event-based, immutable)
  livreesCount: number;
  livreesItems: number;
  livreesM2: number;
  livreesTotal: number;
  livreesPaid: number;
  livreesUnpaid: number;
}

function parseStats(data: any): StatData {
  const revenue = Number(
    data?.totalRevenue ?? data?.totalRevenues ?? data?.revenuesToday ?? 0
  );
  const totalOrders  = Number(data?.totalCommandes ?? data?.totalCommandesToday ?? 0);
  const totalClients = Number(data?.totalClients ?? 0);

  const unpaidRaw    = data?.unpaid ?? {};
  const unpaidAmount = Number(unpaidRaw?.amount ?? 0);
  const unpaidCount  = Number(unpaidRaw?.count  ?? 0);

  return {
    revenue,
    totalOrders,
    totalClients,
    unpaidAmount,
    unpaidCount,
    recuesCount:   Number(data?.recuesCount  ?? 0),
    recuesItems:   Number(data?.recuesItems  ?? 0),
    recuesM2:      Number(data?.recuesM2     ?? 0),
    recuesTotal:   Number(data?.recuesTotal  ?? 0),
    livreesCount:  Number(data?.livreesCount ?? 0),
    livreesItems:  Number(data?.livreesItems ?? 0),
    livreesM2:     Number(data?.livreesM2    ?? 0),
    livreesTotal:  Number(data?.livreesTotal ?? 0),
    livreesPaid:   Number(data?.livreesPaid  ?? 0),
    livreesUnpaid: Number(data?.livreesUnpaid ?? 0),
  };
}

export default function StatisticsScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  const [period, setPeriod] = useState<Period>('today');
  const [stats, setStats] = useState<StatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd,   setCustomEnd]   = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker,   setShowEndPicker]   = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const fetchStats = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(false);
    try {
      let statRes: any;

      if (period === 'today' && !customStart) {
        const res = await statisticsApi.getTodayStats();
        statRes = res.data;
      } else {
        let range: { start: string; end: string };
        if (customStart && customEnd) {
          const fmtDate = (d: Date) => {
            const y = d.getFullYear();
            const mo = String(d.getMonth() + 1).padStart(2, '0');
            const da = String(d.getDate()).padStart(2, '0');
            return `${y}-${mo}-${da}`;
          };
          range = { start: fmtDate(customStart), end: fmtDate(customEnd) };
        } else {
          range = getDateRange(period);
        }
        const res = await statisticsApi.getStatsByDateRange(range.start, range.end);
        statRes = res.data;
      }

      setStats(parseStats(statRes));
    } catch (err: any) {
      setError(true);
      const msg = err?.message || err?.status || JSON.stringify(err);
      setErrorMsg(String(msg));
      console.error('[Statistics] fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, customStart, customEnd]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handlePeriod = (p: Period) => {
    setCustomStart(null);
    setCustomEnd(null);
    setPeriod(p);
  };

  const fmt = (d: Date) =>
    d.toLocaleDateString(isArabic ? 'fr-FR' : 'fr-FR', { day: '2-digit', month: 'short' });

  const fmtDH = (n: number) =>
    n.toLocaleString(isArabic ? 'fr-FR' : 'fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  const periodLabel = (): string => {
    if (customStart && customEnd) return `${fmt(customStart)} – ${fmt(customEnd)}`;
    return t(PERIODS.find(p => p.key === period)?.labelKey || 'common.today');
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerWrap}>
        <View style={[styles.headerRow, isArabic && { flexDirection: 'row-reverse' }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={22} color="white" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: isArabic ? 0 : 10, marginRight: isArabic ? 10 : 0 }}>
            <Text style={styles.headerTitle}>{t('stats.title')}</Text>
            <Text style={styles.headerSub}>{periodLabel()}</Text>
          </View>
          <TouchableOpacity
            style={styles.customDateBtn}
            onPress={() => setShowStartPicker(true)}
          >
            <Ionicons name="calendar-outline" size={18} color="white" />
          </TouchableOpacity>
        </View>

        {/* Period tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.tabsRow, isArabic && { flexDirection: 'row-reverse' }]}
        >
          {PERIODS.map(({ key, labelKey }) => (
            <TouchableOpacity
              key={key}
              style={[styles.tab, period === key && !customStart && styles.tabActive]}
              onPress={() => handlePeriod(key)}
            >
              <Text style={[styles.tabText, period === key && !customStart && styles.tabTextActive]}>
                {t(labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>

      {loading && !refreshing ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={AdminColors.primary} size="large" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      ) : error ? (
        <View style={styles.errorWrap}>
          <Text style={styles.errorEmoji}>📊</Text>
          <Text style={styles.errorText}>{t('dashboard.stats_error')}</Text>
          {!!errorMsg && <Text style={{ fontSize: 12, color: AdminColors.textMuted, textAlign: 'center', marginTop: 4, paddingHorizontal: 20 }}>{errorMsg}</Text>}
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchStats()}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchStats(true); }}
              tintColor={AdminColors.primary}
            />
          }
        >
          {/* Revenue Hero */}
          <Animated.View style={[styles.heroCard, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={[styles.heroLabel, isArabic && { textAlign: 'right' }]}>
              {t('dashboard.revenue')}
            </Text>
            <Text style={[styles.heroAmount, isArabic && { textAlign: 'right' }]}>
              {fmtDH(stats?.revenue ?? 0)}{' '}
              <Text style={styles.heroCurrency}>{t('common.dh')}</Text>
            </Text>
            <View style={[styles.heroMetaRow, isArabic && { flexDirection: 'row-reverse' }]}>
              {(stats?.totalClients ?? 0) > 0 && (
                <View style={[styles.heroMeta, isArabic && { flexDirection: 'row-reverse' }]}>
                  <Ionicons name="people-outline" size={13} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.heroMetaText}>{stats!.totalClients} {t('dashboard.total_clients')}</Text>
                </View>
              )}
              {(stats?.totalOrders ?? 0) > 0 && (
                <View style={[styles.heroMeta, isArabic && { flexDirection: 'row-reverse' }]}>
                  <Ionicons name="cube-outline" size={13} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.heroMetaText}>{stats!.totalOrders} {t('dashboard.orders')}</Text>
                </View>
              )}
            </View>
          </Animated.View>

          {/* Commandes Reçues — event-based, immutable */}
          <StatCard
            color="#C0392B"
            bg="#FFF5F5"
            icon="download-outline"
            title={t('stats.received_orders')}
            amount={stats?.recuesTotal ?? 0}
            currency={t('common.dh')}
            isArabic={isArabic}
            fmtDH={fmtDH}
            rows={[
              { label: t('stats.orders_count'), value: String(stats?.recuesCount ?? 0) },
              { label: t('stats.total_items'),  value: String(stats?.recuesItems ?? 0) },
              { label: t('stats.total_m2'),     value: `${fmtDH(stats?.recuesM2 ?? 0)} m²` },
              { label: t('stats.total_price'),  value: `${fmtDH(stats?.recuesTotal ?? 0)} ${t('common.dh')}` },
            ]}
          />

          {/* Commandes Livrées — event-based, immutable */}
          <StatCard
            color="#27AE60"
            bg="#F0FFF4"
            icon="checkmark-circle-outline"
            title={t('stats.delivered_orders')}
            amount={stats?.livreesTotal ?? 0}
            currency={t('common.dh')}
            isArabic={isArabic}
            fmtDH={fmtDH}
            rows={[
              { label: t('stats.orders_count'),  value: String(stats?.livreesCount  ?? 0) },
              { label: t('stats.total_items'),   value: String(stats?.livreesItems  ?? 0) },
              { label: t('stats.total_m2'),      value: `${fmtDH(stats?.livreesM2 ?? 0)} m²` },
              { label: t('stats.total_paid'),    value: `${fmtDH(stats?.livreesPaid   ?? 0)} ${t('common.dh')}` },
              { label: t('stats.total_unpaid'),  value: `${fmtDH(stats?.livreesUnpaid ?? 0)} ${t('common.dh')}` },
            ]}
          />
        </ScrollView>
      )}

      {/* Custom date pickers */}
      <Modal visible={showStartPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismiss} onPress={() => setShowStartPicker(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('common.date_start')}</Text>
            <DateTimePicker
              value={customStart || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              themeVariant="light"
              onChange={(e, d) => {
                if (Platform.OS === 'android') {
                  setShowStartPicker(false);
                  if (e.type === 'set' && d) { setCustomStart(d); setShowEndPicker(true); }
                } else {
                  if (d) setCustomStart(d);
                }
              }}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={() => { setShowStartPicker(false); setShowEndPicker(true); }}
              >
                <Text style={styles.confirmBtnText}>{t('common.confirm')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={showEndPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismiss} onPress={() => setShowEndPicker(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('common.date_end')}</Text>
            <DateTimePicker
              value={customEnd || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              themeVariant="light"
              onChange={(e, d) => {
                if (Platform.OS === 'android') {
                  setShowEndPicker(false);
                  if (e.type === 'set' && d) setCustomEnd(d);
                } else {
                  if (d) setCustomEnd(d);
                }
              }}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={() => setShowEndPicker(false)}
              >
                <Text style={styles.confirmBtnText}>{t('common.confirm')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ─── StatCard ─── */
interface StatCardProps {
  color: string;
  bg: string;
  icon: any;
  title: string;
  amount: number;
  currency: string;
  isArabic: boolean;
  fmtDH: (n: number) => string;
  rows: { label: string; value: string }[];
}

function StatCard({ color, bg, icon, title, amount, currency, isArabic, fmtDH, rows }: StatCardProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <View style={[styles.card, { backgroundColor: bg }]}>
      {/* Header */}
      <TouchableOpacity
        style={[styles.cardHeader, { backgroundColor: color }, isArabic && { flexDirection: 'row-reverse' }]}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.85}
      >
        <View style={[styles.cardHeaderLeft, isArabic && { flexDirection: 'row-reverse' }]}>
          <Ionicons name={icon} size={18} color="white" style={{ marginRight: isArabic ? 0 : 8, marginLeft: isArabic ? 8 : 0 }} />
          <Text style={styles.cardHeaderTitle}>{title}</Text>
        </View>
        <View style={[styles.cardHeaderRight, isArabic && { alignItems: 'flex-start' }]}>
          {currency ? (
            <Text style={styles.cardHeaderAmount}>{fmtDH(amount)} {currency}</Text>
          ) : null}
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color="rgba(255,255,255,0.7)"
            style={{ marginLeft: isArabic ? 0 : 6, marginRight: isArabic ? 6 : 0 }}
          />
        </View>
      </TouchableOpacity>

      {/* Rows */}
      {expanded && (
        <View style={styles.cardBody}>
          {rows.map((row, i) => (
            <View
              key={i}
              style={[
                styles.cardRow,
                isArabic && { flexDirection: 'row-reverse' },
                i < rows.length - 1 && styles.cardRowBorder,
              ]}
            >
              <Text style={[styles.cardRowLabel, isArabic && { textAlign: 'right' }]}>{row.label}</Text>
              <Text style={[styles.cardRowValue, isArabic && { textAlign: 'left' }]}>{row.value}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },

  /* Header */
  headerWrap: { backgroundColor: AdminColors.primary },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: 'white' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  customDateBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  /* Period tabs */
  tabsRow: {
    flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 12, gap: 8,
  },
  tab: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)',
  },
  tabActive: { backgroundColor: 'white' },
  tabText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  tabTextActive: { color: AdminColors.primary },

  /* States */
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: AdminColors.textMuted, fontSize: 14 },
  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorEmoji: { fontSize: 52 },
  errorText: { fontSize: 15, color: AdminColors.textSecondary, fontWeight: '600' },
  retryBtn: {
    backgroundColor: AdminColors.primary, borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 10,
  },
  retryText: { color: 'white', fontWeight: '700', fontSize: 14 },

  /* Scroll */
  scroll: { flex: 1 },

  /* Hero */
  heroCard: {
    margin: 16, borderRadius: 20, padding: 24,
    backgroundColor: AdminColors.primary,
    ...AdminShadows.shadowTeal,
  },
  heroLabel: {
    fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
  },
  heroAmount: { fontSize: 40, fontWeight: '900', color: 'white', lineHeight: 46 },
  heroCurrency: { fontSize: 22, fontWeight: '700' },
  heroMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroMetaText: { fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: '500' },

  /* Stat card */
  card: {
    marginHorizontal: 16, marginBottom: 14, borderRadius: 16,
    overflow: 'hidden', ...AdminShadows.shadowSmall,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cardHeaderTitle: { fontSize: 15, fontWeight: '700', color: 'white' },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center' },
  cardHeaderAmount: { fontSize: 16, fontWeight: '800', color: 'white' },
  cardBody: { paddingHorizontal: 16, paddingVertical: 4 },
  cardRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12,
  },
  cardRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  cardRowLabel: { fontSize: 14, color: '#4A5568', fontWeight: '500' },
  cardRowValue: { fontSize: 14, fontWeight: '700', color: '#0D1B2A' },

  /* Modals */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalDismiss: { flex: 1 },
  modalSheet: {
    backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: {
    fontSize: 17, fontWeight: '700', color: '#0D1B2A',
    marginBottom: 16, textAlign: 'center',
  },
  confirmBtn: {
    marginTop: 20, backgroundColor: AdminColors.primary,
    borderRadius: 14, height: 48, alignItems: 'center', justifyContent: 'center',
  },
  confirmBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
});
