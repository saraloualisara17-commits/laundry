import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Linking, Alert, RefreshControl, TextInput,
  Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallLogs, useLogCall } from '../../src/hooks/query/useCallLogs';
import { CallLog } from '../../src/services/api/callLogsApi';
import { AdminColors, AdminShadows } from '../../constants/AdminColors';
import { useRTL, row, font, textProps } from '../../src/utils/rtl';
import { toCallNumber, toWhatsAppNumber } from '../../src/hooks/useOrderDetailHandlers';
import { StatusColors } from '../../constants/StatusColors';

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) +
    ' · ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function CallLogsScreen() {
  const { t, isRTL: isArabic } = useRTL();
  const { mutate: logCall } = useLogCall();

  const [phoneSearch, setPhoneSearch] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch, isRefetching } = useCallLogs();
  const allLogs: CallLog[] = data?.pages.flatMap(p => p.content) ?? [];

  // Unique staff list derived from loaded data
  const staffList = useMemo(() => {
    const map = new Map<number, string>();
    allLogs.forEach(l => map.set(l.staff.id, l.staff.name));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allLogs]);

  const selectedStaffName = staffList.find(s => s.id === selectedStaffId)?.name ?? null;

  // Apply filters
  const logs = useMemo(() => {
    let result = allLogs;
    if (selectedStaffId !== null) {
      result = result.filter(l => l.staff.id === selectedStaffId);
    }
    const q = phoneSearch.trim();
    if (q.length > 0) {
      const lower = q.toLowerCase();
      result = result.filter(l =>
        l.phoneNumber.includes(q) ||
        l.client.name.toLowerCase().includes(lower)
      );
    }
    return result;
  }, [allLogs, selectedStaffId, phoneSearch]);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleCall = (log: CallLog) => {
    Alert.alert(
      t('call_confirm.title'),
      `${t('call_confirm.msg')} ${log.phoneNumber}?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.call'),
          onPress: () => {
            logCall({ clientId: log.client.id, orderId: log.orderId ?? undefined, phoneNumber: log.phoneNumber, callType: 'PHONE' });
            Linking.openURL(`tel:${toCallNumber(log.phoneNumber)}`);
          },
        },
      ]
    );
  };

  const handleWhatsApp = (log: CallLog) => {
    Alert.alert(
      t('call_confirm.wa_title'),
      `${t('call_confirm.wa_msg')} ${log.phoneNumber}?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'WhatsApp',
          onPress: () => {
            logCall({ clientId: log.client.id, orderId: log.orderId ?? undefined, phoneNumber: log.phoneNumber, callType: 'WHATSAPP' });
            Linking.openURL(`https://wa.me/${toWhatsAppNumber(log.phoneNumber)}`);
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: CallLog }) => {
    const statusCfg = item.orderStatus ? (StatusColors[item.orderStatus] || StatusColors.PENDING_PICKUP) : null;

    return (
      <View style={[styles.card, AdminShadows.shadowSmall]}>
        <View style={[styles.cardTop, row(isArabic)]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(item.staff.name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.staffName, font.bold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
              {item.staff.name}
            </Text>
            <Text style={styles.dateText} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
              {formatDate(item.calledAt)}
            </Text>
          </View>
          <View style={[styles.callTypeBadge, { backgroundColor: item.callType === 'WHATSAPP' ? '#dcfce7' : '#dbeafe' }]}>
            <Ionicons
              name={item.callType === 'WHATSAPP' ? 'logo-whatsapp' : 'call-outline'}
              size={13}
              color={item.callType === 'WHATSAPP' ? '#16a34a' : '#2563eb'}
            />
            <Text style={[styles.callTypeText, { color: item.callType === 'WHATSAPP' ? '#16a34a' : '#2563eb' }]}>
              {item.callType === 'WHATSAPP' ? 'WhatsApp' : t('common.call')}
            </Text>
          </View>
        </View>

        <Text style={[styles.clientName, font.semibold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
          {item.client.name}
        </Text>

        <View style={[styles.infoRow, row(isArabic)]}>
          <Ionicons name="call-outline" size={13} color={AdminColors.textMuted} />
          <Text style={styles.phoneText} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
            {item.phoneNumber}
          </Text>
        </View>

        {item.orderId && (
          <TouchableOpacity
            style={[styles.orderRow, row(isArabic)]}
            onPress={() => router.push(`/order/${item.orderId}`)}
            activeOpacity={0.7}
          >
            <Ionicons name="receipt-outline" size={13} color={AdminColors.textSecondary} />
            <Text style={[styles.orderRef, font.semibold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
              #{item.orderId}
            </Text>
            {statusCfg && (
              <View style={[styles.statusPill, { backgroundColor: statusCfg.bg, borderColor: statusCfg.dot }]}>
                <Text style={[styles.statusPillText, { color: statusCfg.text }]}>
                  {t(`status.${item.orderStatus}`)}
                </Text>
              </View>
            )}
            {item.orderTotal != null && (
              <Text style={[styles.orderTotal, font.bold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
                {item.orderTotal} {t('common.dh')}
              </Text>
            )}
            <Ionicons name="chevron-forward" size={13} color={AdminColors.textMuted} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        )}

        <View style={[styles.actionsRow, row(isArabic)]}>
          <TouchableOpacity style={styles.waBtn} onPress={() => handleWhatsApp(item)}>
            <Ionicons name="logo-whatsapp" size={16} color="white" />
            <Text style={[styles.actionBtnText, font.bold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
              WhatsApp
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.callBtn} onPress={() => handleCall(item)}>
            <Ionicons name="call-outline" size={16} color="white" />
            <Text style={[styles.actionBtnText, font.bold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
              {t('common.call')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, row(isArabic)]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name={isArabic ? 'chevron-forward' : 'chevron-back'} size={24} color={AdminColors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, font.bold(isArabic)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
          {t('call_logs.title')}
        </Text>
      </View>

      {/* Filter row: search + staff dropdown */}
      <View style={[styles.filterRow, row(isArabic)]}>
        {/* Phone / client search */}
        <View style={[styles.searchWrap, row(isArabic)]}>
          <Ionicons name="search-outline" size={15} color={AdminColors.textMuted} />
          <TextInput
            style={[styles.searchInput, font.regular(isArabic), { textAlign: isArabic ? 'right' : 'left' }]}
            placeholder={t('call_logs.search_placeholder')}
            placeholderTextColor={AdminColors.textMuted}
            value={phoneSearch}
            onChangeText={setPhoneSearch}
            maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}
          />
          {phoneSearch.length > 0 && (
            <TouchableOpacity onPress={() => setPhoneSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={15} color={AdminColors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Staff dropdown trigger */}
        <TouchableOpacity
          style={[styles.dropdownTrigger, selectedStaffId !== null && styles.dropdownTriggerActive]}
          onPress={() => setDropdownOpen(true)}
        >
          <Ionicons name="person-outline" size={15} color={selectedStaffId !== null ? 'white' : AdminColors.textSecondary} />
          <Text
            style={[styles.dropdownTriggerText, selectedStaffId !== null && styles.dropdownTriggerTextActive, font.semibold(isArabic)]}
            numberOfLines={1}
            maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}
          >
            {selectedStaffName ?? t('call_logs.all_staff')}
          </Text>
          <Ionicons name="chevron-down" size={13} color={selectedStaffId !== null ? 'white' : AdminColors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Staff dropdown modal */}
      <Modal visible={dropdownOpen} transparent animationType="fade" onRequestClose={() => setDropdownOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setDropdownOpen(false)}>
          <View style={styles.dropdownMenu}>
            {/* All option */}
            <TouchableOpacity
              style={[styles.dropdownItem, selectedStaffId === null && styles.dropdownItemActive]}
              onPress={() => { setSelectedStaffId(null); setDropdownOpen(false); }}
            >
              <Ionicons name="people-outline" size={16} color={selectedStaffId === null ? AdminColors.primary : AdminColors.textSecondary} />
              <Text style={[styles.dropdownItemText, selectedStaffId === null && styles.dropdownItemTextActive, font.semibold(isArabic)]}
                maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
                {t('call_logs.all_staff')}
              </Text>
              {selectedStaffId === null && <Ionicons name="checkmark" size={16} color={AdminColors.primary} style={{ marginLeft: 'auto' }} />}
            </TouchableOpacity>

            <View style={styles.dropdownDivider} />

            {staffList.map(staff => {
              const active = selectedStaffId === staff.id;
              return (
                <TouchableOpacity
                  key={staff.id}
                  style={[styles.dropdownItem, active && styles.dropdownItemActive]}
                  onPress={() => { setSelectedStaffId(staff.id); setDropdownOpen(false); }}
                >
                  <View style={[styles.dropdownAvatar, { backgroundColor: active ? AdminColors.primary : '#E2E8F0' }]}>
                    <Text style={[styles.dropdownAvatarText, { color: active ? 'white' : AdminColors.textSecondary }]}>
                      {getInitials(staff.name)}
                    </Text>
                  </View>
                  <Text style={[styles.dropdownItemText, active && styles.dropdownItemTextActive, font.semibold(isArabic)]}
                    maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
                    {staff.name}
                  </Text>
                  {active && <Ionicons name="checkmark" size={16} color={AdminColors.primary} style={{ marginLeft: 'auto' }} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={AdminColors.primary} />
        </View>
      ) : logs.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="call-outline" size={52} color={AdminColors.textMuted} style={{ opacity: 0.4 }} />
          <Text style={[styles.emptyText, font.regular(isArabic)]}>
            {selectedStaffId !== null || phoneSearch.trim().length > 0 ? t('call_logs.no_results') : t('call_logs.empty')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={AdminColors.primary} />
          }
          ListFooterComponent={
            isFetchingNextPage
              ? <ActivityIndicator size="small" color={AdminColors.primary} style={{ marginVertical: 16 }} />
              : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    gap: 10,
  },
  backBtn: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, backgroundColor: '#F1F5F9',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: AdminColors.textPrimary, flex: 1 },

  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  searchInput: {
    flex: 1, fontSize: 13,
    color: AdminColors.textPrimary,
    padding: 0,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    maxWidth: 140,
  },
  dropdownTriggerActive: {
    backgroundColor: AdminColors.primary,
  },
  dropdownTriggerText: {
    fontSize: 12, fontWeight: '600',
    color: AdminColors.textSecondary,
    flexShrink: 1,
  },
  dropdownTriggerTextActive: { color: 'white' },

  // Modal dropdown
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
    paddingBottom: 32,
    paddingHorizontal: 16,
  },
  dropdownMenu: {
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 6,
    ...AdminShadows.shadowSmall,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  dropdownItemActive: {
    backgroundColor: '#F0F9FF',
  },
  dropdownItemText: {
    fontSize: 14, fontWeight: '500',
    color: AdminColors.textPrimary,
    flex: 1,
  },
  dropdownItemTextActive: {
    color: AdminColors.primary,
    fontWeight: '700',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginHorizontal: 16,
    marginVertical: 2,
  },
  dropdownAvatar: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  dropdownAvatarText: { fontSize: 10, fontWeight: '800' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 14, color: AdminColors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  list: { paddingTop: 12, paddingBottom: 32 },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: AdminColors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: 'white', fontSize: 13, fontWeight: '700' },
  staffName: { fontSize: 14, fontWeight: '600', color: AdminColors.textPrimary },
  dateText: { fontSize: 11, color: AdminColors.textMuted, marginTop: 1 },
  callTypeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  callTypeText: { fontSize: 11, fontWeight: '700' },
  clientName: { fontSize: 15, fontWeight: '600', color: AdminColors.textPrimary, marginBottom: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  phoneText: { fontSize: 13, color: AdminColors.textSecondary },
  orderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F8FAFC', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10,
  },
  orderRef: { fontSize: 13, fontWeight: '600', color: AdminColors.textPrimary },
  statusPill: {
    borderRadius: 6, borderWidth: 1,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  statusPillText: { fontSize: 10, fontWeight: '700' },
  orderTotal: { fontSize: 13, fontWeight: '700', color: AdminColors.primary },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  waBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#25D366',
    borderRadius: 10, paddingVertical: 9,
  },
  callBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#0F172A',
    borderRadius: 10, paddingVertical: 9,
  },
  actionBtnText: { color: 'white', fontSize: 13, fontWeight: '700' },
});
