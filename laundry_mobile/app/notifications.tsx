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
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { fr, arDZ as ar } from 'date-fns/locale';
import { AdminColors, AdminShadows } from '../constants/AdminColors';
import { useRTL, row, font, textProps } from '../src/utils/rtl';
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from '../src/hooks/query/useNotifications';
import { AppNotification } from '../src/services/api/notificationsApi';

const NOTIFICATION_ICONS: Record<string, { name: any; color: string; bg: string }> = {
  NEW_ORDER:            { name: 'bag-add-outline',       color: AdminColors.primary, bg: AdminColors.primary100 },
  ORDER_STATUS_CHANGED: { name: 'refresh-circle-outline', color: AdminColors.info,    bg: AdminColors.infoBg },
  ORDER_ASSIGNED:       { name: 'car-outline',            color: AdminColors.primary, bg: AdminColors.primary100 },
  ORDER_PAYMENT_ADDED:  { name: 'cash-outline',           color: AdminColors.success, bg: AdminColors.successBg },
  UNPAID_REMINDER:      { name: 'warning-outline',        color: AdminColors.warning, bg: AdminColors.warningBg },
};

function getIconCfg(type: string) {
  return NOTIFICATION_ICONS[type] ?? {
    name: 'notifications-outline',
    color: AdminColors.textMuted,
    bg: AdminColors.primary50,
  };
}

function formatTs(ts: string, isRTL: boolean) {
  if (!ts) return '';
  try {
    return format(new Date(ts), 'dd MMM · HH:mm', { locale: isRTL ? ar : fr });
  } catch {
    return ts;
  }
}

function NotificationRow({
  item,
  isRTL,
  onPress,
}: {
  item: AppNotification;
  isRTL: boolean;
  onPress: () => void;
}) {
  const cfg = getIconCfg(item.type);

  return (
    <TouchableOpacity
      style={[styles.row, !item.read && styles.rowUnread]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconBox, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.name} size={22} color={cfg.color} />
      </View>

      <View style={{ flex: 1 }}>
        <View style={[styles.rowTop, row(isRTL)]}>
          <Text
            style={[styles.title, font.semibold(isRTL), !item.read && styles.titleUnread]}
            maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          {!item.read && <View style={styles.unreadDot} />}
        </View>

        <Text
          style={[styles.message, font.regular(isRTL)]}
          maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}
          numberOfLines={2}
        >
          {item.message}
        </Text>

        <Text style={[styles.timestamp, font.regular(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
          {formatTs(item.createdAt, isRTL)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const { isRTL, t } = useRTL();
  const { data: notifications = [], isLoading, isError, refetch } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const unreadCount = notifications.filter(n => !n.read).length;

  const handlePress = useCallback((item: AppNotification) => {
    if (!item.read) {
      markAsRead.mutate(item.id);
    }
    if (item.referenceId) {
      if (item.type === 'UNPAID_REMINDER') {
        router.push('/(admin)/unpaid-orders');
      } else {
        router.push(`/order/${item.referenceId}` as any);
      }
    }
  }, [markAsRead]);

  const renderItem = useCallback(({ item }: { item: AppNotification }) => (
    <NotificationRow item={item} isRTL={isRTL} onPress={() => handlePress(item)} />
  ), [isRTL, handlePress]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, row(isRTL)]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons
            name={isRTL ? 'arrow-forward' : 'arrow-back'}
            size={22}
            color={AdminColors.textPrimary}
          />
        </TouchableOpacity>

        <View style={styles.headerIcon}>
          <Ionicons name="notifications" size={18} color={AdminColors.primary} />
        </View>

        <Text
          style={[styles.headerTitle, font.bold(isRTL)]}
          maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}
        >
          {t('tabs.notifications')}
        </Text>

        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
          >
            {markAllAsRead.isPending ? (
              <ActivityIndicator size="small" color={AdminColors.primary} />
            ) : (
              <Text style={[styles.markAllText, font.semibold(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
                {t('notifications.mark_all_read')}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={AdminColors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={40} color={AdminColors.danger} />
          <Text style={[styles.emptyText, font.regular(isRTL)]}>{t('common.error')}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={[styles.retryText, font.semibold(isRTL)]}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="notifications-off-outline" size={52} color={AdminColors.textMuted} />
          <Text style={[styles.emptyText, font.regular(isRTL)]}>
            {t('notifications.empty')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          removeClippedSubviews
          maxToRenderPerBatch={15}
          windowSize={5}
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: AdminColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.border,
    ...AdminShadows.shadowSmall,
  },
  backBtn: {
    padding: 4,
  },
  headerIcon: {
    width: 34,
    height: 34,
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
  markAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: AdminColors.primary100,
    minWidth: 40,
    alignItems: 'center',
  },
  markAllText: {
    fontSize: 12,
    color: AdminColors.primary,
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
    paddingHorizontal: 12,
    backgroundColor: AdminColors.surface,
    borderRadius: 16,
    marginVertical: 3,
    ...AdminShadows.shadowSmall,
  },
  rowUnread: {
    borderLeftWidth: 3,
    borderLeftColor: AdminColors.primary,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  rowTop: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 14,
    color: AdminColors.textPrimary,
  },
  titleUnread: {
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AdminColors.primary,
  },
  message: {
    fontSize: 13,
    color: AdminColors.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 11,
    color: AdminColors.textMuted,
  },
});
