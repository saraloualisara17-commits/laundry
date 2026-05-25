import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { fr, arDZ as ar } from 'date-fns/locale';
import { AdminColors, AdminShadows } from '../../../constants/AdminColors';
import { useRTL, row, textAlign, font, textProps } from '../../../src/utils/rtl';
import { useRecentAuditLogs } from '../../../src/hooks/query/useAudit';
import { AuditLogEntry } from '../../../src/services/api/auditApi';

// ─── Color categories ────────────────────────────────────────────────────────

const ACTION_CATEGORIES: Record<string, { color: string; bg: string; label: string }> = {
  // Order operations
  ORDER_CREATED:           { color: AdminColors.primary,  bg: AdminColors.primary100, label: 'Commande créée' },
  ORDER_STATUS_CHANGED:    { color: AdminColors.info,     bg: AdminColors.infoBg,     label: 'Statut modifié' },
  ORDER_UPDATED:           { color: AdminColors.info,     bg: AdminColors.infoBg,     label: 'Commande modifiée' },
  ORDER_DELETED:           { color: AdminColors.danger,   bg: AdminColors.dangerBg,   label: 'Commande supprimée' },
  ORDER_DRIVER_ASSIGNED:   { color: AdminColors.primary,  bg: AdminColors.primary100, label: 'Livreur assigné' },
  ORDER_ITEMS_UPDATED_BY_DRIVER: { color: AdminColors.warning, bg: AdminColors.warningBg, label: 'Articles modifiés' },
  // Payment operations
  PAYMENT_RECORDED:        { color: AdminColors.success,  bg: AdminColors.successBg,  label: 'Paiement enregistré' },
  PAYMENT_ADDED:           { color: AdminColors.success,  bg: AdminColors.successBg,  label: 'Paiement ajouté' },
  // User operations
  USER_CREATED:            { color: '#7C3AED',            bg: '#F5F3FF',              label: 'Utilisateur créé' },
  USER_UPDATED:            { color: '#7C3AED',            bg: '#F5F3FF',              label: 'Utilisateur modifié' },
  USER_DEACTIVATED:        { color: AdminColors.danger,   bg: AdminColors.dangerBg,   label: 'Désactivé' },
  USER_ACTIVATED:          { color: AdminColors.success,  bg: AdminColors.successBg,  label: 'Activé' },
  USER_DELETED:            { color: AdminColors.danger,   bg: AdminColors.dangerBg,   label: 'Utilisateur supprimé' },
  USER_PASSWORD_CHANGED:   { color: AdminColors.warning,  bg: AdminColors.warningBg,  label: 'Mot de passe changé' },
  // Catalog operations
  CATALOG_CATEGORY_CREATED:{ color: '#0891B2',            bg: '#ECFEFF',              label: 'Catégorie créée' },
  CATALOG_CATEGORY_UPDATED:{ color: '#0891B2',            bg: '#ECFEFF',              label: 'Catégorie modifiée' },
  CATALOG_CATEGORY_TOGGLED:{ color: '#0891B2',            bg: '#ECFEFF',              label: 'Catégorie activée/désact.' },
  CATALOG_CATEGORY_DELETED:{ color: AdminColors.danger,   bg: AdminColors.dangerBg,   label: 'Catégorie supprimée' },
  CATALOG_PRODUCT_CREATED: { color: '#0891B2',            bg: '#ECFEFF',              label: 'Produit créé' },
  CATALOG_PRODUCT_UPDATED: { color: '#0891B2',            bg: '#ECFEFF',              label: 'Produit modifié' },
  CATALOG_PRODUCT_TOGGLED: { color: '#0891B2',            bg: '#ECFEFF',              label: 'Produit activé/désact.' },
  CATALOG_PRODUCT_DELETED: { color: AdminColors.danger,   bg: AdminColors.dangerBg,   label: 'Produit supprimé' },
  // Client operations
  CLIENT_UPDATED:          { color: '#D97706',            bg: '#FFFBEB',              label: 'Client modifié' },
};

function getCfg(actionType: string) {
  return ACTION_CATEGORIES[actionType] ?? {
    color: AdminColors.textMuted,
    bg: AdminColors.primary50,
    label: actionType,
  };
}

function entityNav(entityType: string, entityId: number): string | null {
  switch (entityType) {
    case 'COMMANDE': return `/order/${entityId}`;
    case 'CLIENT':   return `/client/${entityId}`;
    default:         return null;
  }
}

function formatTs(ts: string, isRTL: boolean) {
  if (!ts) return '';
  try {
    return format(new Date(ts), 'dd MMM yyyy · HH:mm', { locale: isRTL ? ar : fr });
  } catch {
    return ts;
  }
}

// ─── Row component ────────────────────────────────────────────────────────────

function AuditRow({ entry, isRTL, onPress }: { entry: AuditLogEntry; isRTL: boolean; onPress?: () => void }) {
  const cfg = getCfg(entry.actionType);
  const tappable = !!onPress;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={tappable ? 0.7 : 1}
      disabled={!tappable}
    >
      {/* Color dot */}
      <View style={[styles.rowDot, { backgroundColor: cfg.bg, borderColor: cfg.color }]}>
        <View style={[styles.rowDotInner, { backgroundColor: cfg.color }]} />
      </View>

      <View style={{ flex: 1 }}>
        {/* Action label + entity */}
        <View style={[styles.rowTop, row(isRTL)]}>
          <View style={[styles.actionPill, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.actionPillText, { color: cfg.color }, font.semibold(isRTL)]}
              maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
              {cfg.label}
            </Text>
          </View>
          <Text style={[styles.entityChip, font.regular(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
            {entry.entityType} #{entry.entityId}
          </Text>
          {tappable && (
            <Ionicons
              name={isRTL ? 'chevron-back' : 'chevron-forward'}
              size={14}
              color={AdminColors.textMuted}
            />
          )}
        </View>

        {/* Actor + timestamp */}
        <View style={[styles.rowMeta, row(isRTL)]}>
          <Ionicons name="person-outline" size={11} color={AdminColors.textMuted} />
          <Text style={[styles.metaText, font.regular(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
            {entry.userName ?? '—'}
          </Text>
          <Text style={[styles.metaDot, font.regular(isRTL)]}>·</Text>
          <Text style={[styles.metaText, font.regular(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
            {formatTs(entry.timestamp, isRTL)}
          </Text>
        </View>

        {/* Change summary */}
        {(entry.previousValue || entry.newValue) && (
          <Text style={[styles.changeLine, textAlign(isRTL), font.regular(isRTL)]}
            maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}
            numberOfLines={1}>
            {entry.previousValue && entry.newValue
              ? `${entry.previousValue} → ${entry.newValue}`
              : entry.newValue || entry.previousValue}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AuditScreen() {
  const { isRTL, t } = useRTL();
  const router = useRouter();

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useRecentAuditLogs();

  const entries: AuditLogEntry[] = data?.pages.flatMap((p) => p.content) ?? [];

  const handlePress = useCallback((entry: AuditLogEntry) => {
    const path = entityNav(entry.entityType, entry.entityId);
    if (path) router.push(path as any);
  }, [router]);

  const renderItem = useCallback(({ item }: { item: AuditLogEntry }) => {
    const path = entityNav(item.entityType, item.entityId);
    return (
      <AuditRow
        entry={item}
        isRTL={isRTL}
        onPress={path ? () => handlePress(item) : undefined}
      />
    );
  }, [isRTL, handlePress]);

  const renderFooter = useCallback(() => {
    if (!hasNextPage) return null;
    return (
      <TouchableOpacity style={styles.loadMoreBtn} onPress={() => fetchNextPage()} disabled={isFetchingNextPage}>
        {isFetchingNextPage
          ? <ActivityIndicator color={AdminColors.primary} />
          : <Text style={[styles.loadMoreText, font.semibold(isRTL)]}>{t('common.load_more', { defaultValue: 'Charger plus' })}</Text>}
      </TouchableOpacity>
    );
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, isRTL, t]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, row(isRTL)]}>
        <View style={styles.headerIcon}>
          <Ionicons name="shield-checkmark" size={20} color={AdminColors.primary} />
        </View>
        <Text style={[styles.headerTitle, font.bold(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
          {t('audit.title', { defaultValue: 'Journal d\'audit' })}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={AdminColors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={40} color={AdminColors.danger} />
          <Text style={[styles.emptyText, font.regular(isRTL)]}>{t('common.error')}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={[styles.retryText, font.semibold(isRTL)]}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="shield-outline" size={48} color={AdminColors.textMuted} />
          <Text style={[styles.emptyText, font.regular(isRTL)]}>{t('common.no_data')}</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={20}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AdminColors.bg,
  },
  header: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: AdminColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.border,
    ...AdminShadows.shadowSmall,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: AdminColors.primary100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    color: AdminColors.textPrimary,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: AdminColors.textMuted,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: AdminColors.primary100,
  },
  retryText: {
    fontSize: 14,
    color: AdminColors.primary,
  },
  list: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  separator: {
    height: 1,
    backgroundColor: AdminColors.border,
    marginHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
    backgroundColor: AdminColors.surface,
    borderRadius: 14,
    paddingHorizontal: 12,
    marginVertical: 3,
    ...AdminShadows.shadowSmall,
  },
  rowDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  rowDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rowTop: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 5,
    flexWrap: 'wrap',
  },
  actionPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  actionPillText: {
    fontSize: 12,
  },
  entityChip: {
    fontSize: 12,
    color: AdminColors.textMuted,
    flex: 1,
  },
  rowMeta: {
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  },
  metaText: {
    fontSize: 12,
    color: AdminColors.textMuted,
  },
  metaDot: {
    fontSize: 12,
    color: AdminColors.textMuted,
  },
  changeLine: {
    fontSize: 12,
    color: AdminColors.textSecondary,
    fontStyle: 'italic',
  },
  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadMoreText: {
    fontSize: 14,
    color: AdminColors.primary,
  },
});
