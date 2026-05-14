import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, Modal, Linking, RefreshControl, Platform
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { fetchReadyDeliveries, fetchPaymentTypes, confirmPayment, cancelDelivery } from '../../src/store/livreurThunks';
import { RootState, AppDispatch } from '../../src/store/store';
import { Colors, Shadows, Typography, Radius } from '../../constants/theme';

import { useTranslation } from 'react-i18next';

export default function DeliveriesScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  
  const dispatch = useDispatch<AppDispatch>();
  const { readyDeliveries, loading } = useSelector((state: RootState) => state.livreur);
  const [refreshing, setRefreshing] = useState(false);
  const [deliveryModal, setDeliveryModal] = useState<{ visible: boolean; order: any | null }>({ visible: false, order: null });
  const [collectedAmount, setCollectedAmount] = useState('0');
  const [confirmingDelivery, setConfirmingDelivery] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const loadData = useCallback(() => {
    dispatch(fetchReadyDeliveries());
    dispatch(fetchPaymentTypes());
  }, [dispatch]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchReadyDeliveries());
    setRefreshing(false);
  };
  const handleOpenMaps = (order: any) => {
    const addr = order.client?.addresses?.[0];
    const lat = addr?.latitude;
    const lng = addr?.longitude;
    const address = addr?.address;

    let url = '';
    if (lat && lng) {
      url = Platform.OS === 'ios'
        ? `maps:0,0?q=${lat},${lng}`
        : `geo:${lat},${lng}?q=${lat},${lng}`;
    } else if (address) {
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    } else {
      Alert.alert(t('common.error'), t('admin.map.empty_title'));
      return;
    }
    Linking.openURL(url);
  };

  const handleCall = (order: any) => {
    const phone = order.client?.phones?.[0]?.phoneNumber;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert(t('common.error'), t('admin.clients.no_phone'));
    }
  };

  const handleShareReceipt = async (orderId: number) => {
    try {
      const { adminApi } = require('../../src/services/adminApi');
      const res = await adminApi.getDeliveryReceipt(orderId);
      const { phone, message } = res.data.data;
      const encoded = encodeURIComponent(message);
      const waUrl = phone 
        ? `whatsapp://send?phone=${phone.replace(/\D/g, '')}&text=${encoded}`
        : `whatsapp://send?text=${encoded}`;
      
      const canOpen = await Linking.canOpenURL(waUrl);
      if (canOpen) {
        await Linking.openURL(waUrl);
      } else {
        await Linking.openURL(`https://wa.me/${phone?.replace(/\D/g, '')}?text=${encoded}`);
      }
    } catch (e) {
      Alert.alert(t('common.error'), t('common.error_msg'));
    }
  };

  const handleConfirmDelivery = async () => {
    if (!deliveryModal.order) return;
    const orderId = deliveryModal.order.id;
    const amount = parseFloat(collectedAmount) || 0;
    if (isNaN(amount) || amount < 0) {
      Alert.alert(t('common.error'), t('admin.unpaid.enter_valid_amount'));
      return;
    }
    if (amount > parseFloat(deliveryModal.order.montantTotal)) {
      Alert.alert(t('common.error'), t('common.error_msg'));
      return;
    }

    setConfirmingDelivery(true);
    try {
      const { adminApi } = require('../../src/services/adminApi');
      await adminApi.updateOrderStatus(orderId, 'DELIVERED', {
        montantCollecte: amount
      });
      setDeliveryModal({ visible: false, order: null });
      
      Alert.alert(
        t('delivery.delivery_success'),
        t('delivery.send_receipt_prompt'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: '📱 WhatsApp', onPress: () => handleShareReceipt(orderId) }
        ]
      );

      loadData();
    } catch (err: any) {
      Alert.alert(t('common.error'), t('common.error_msg'));
    } finally {
      setConfirmingDelivery(false);
    }
  };

  const handleCancel = (order: any) => {
    Alert.alert(
      t('common.cancel'),
      `${t('common.confirm_msg')} (${order.client?.nom || order.client?.name || t('tabs.clients')}) ?`,
      [
        { text: t('common.back'), style: 'cancel' },
        {
          text: t('common.supprimer'), style: 'destructive',
          onPress: async () => {
            setProcessingId(order.id);
            try {
              await dispatch(cancelDelivery(order.id)).unwrap();
              Alert.alert(t('status.CANCELLED'), t('delivery.delivery_cancelled'));
            } catch (err: any) {
              Alert.alert(t('common.error'), typeof err === 'string' ? err : t('common.error_msg'));
            } finally {
              setProcessingId(null);
              loadData();
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item: order }: { item: any }) => {
    const addr = order.client?.addresses?.[0];
    const clientName = order.client?.nom || order.client?.name || t('tabs.clients');
    const phone = order.client?.phones?.[0]?.phoneNumber;
    const totalItems = order.commandeTapis?.length || 0;
    const isProcessing = processingId === order.id;

    return (
      <View style={styles.card}>
        <View style={[styles.cardTop, isArabic && { flexDirection: 'row-reverse' }]}>
          <Text style={styles.orderRef}>#{order.numeroCommande}</Text>
          <View style={[styles.statusBadge, isArabic && { flexDirection: 'row-reverse' }]}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>{t('status.READY_FOR_DELIVERY').toUpperCase()}</Text>
          </View>
        </View>

        <Text style={[styles.clientName, isArabic && { textAlign: 'right' }]}>{clientName}</Text>

        {addr?.address && (
          <View style={[styles.infoRow, isArabic && { flexDirection: 'row-reverse' }]}>
            <Feather name="map-pin" size={14} color={Colors.primary} />
            <Text style={[styles.infoText, isArabic && { textAlign: 'right' }]} numberOfLines={2}>{addr.address}</Text>
          </View>
        )}

        {phone && (
          <View style={[styles.infoRow, isArabic && { flexDirection: 'row-reverse' }]}>
            <Feather name="phone" size={14} color={Colors.success} />
            <Text style={[styles.infoText, isArabic && { textAlign: 'right' }]}>{phone}</Text>
          </View>
        )}

        <View style={[styles.statsRow, isArabic && { flexDirection: 'row-reverse' }]}>
          <View style={[styles.statBox, isArabic && { alignItems: 'flex-end' }]}>
            <Text style={styles.statLabel}>{t('admin.catalog.title').toUpperCase()}</Text>
            <Text style={styles.statValue}>{totalItems}</Text>
          </View>
          <View style={[styles.statBox, styles.statBoxHighlight, isArabic && { alignItems: 'flex-end' }]}>
            <Text style={[styles.statLabel, { color: Colors.primary }]}>{t('financial.total').toUpperCase()}</Text>
            <Text style={[styles.statValue, { color: Colors.primary }]}>{order.montantTotal} <Text style={styles.currencyText}>{t('common.dh')}</Text></Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        {isProcessing ? (
          <View style={[styles.processingRow, isArabic && { flexDirection: 'row-reverse' }]}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.processingText}>{t('common.loading')}</Text>
          </View>
        ) : (
          <View style={[styles.actionsRow, isArabic && { flexDirection: 'row-reverse' }]}>
            <TouchableOpacity style={[styles.iconBtn, { backgroundColor: Colors.primary }]} onPress={() => handleOpenMaps(order)}>
              <Feather name="navigation" size={20} color="white" />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.iconBtn, { backgroundColor: Colors.success }]} onPress={() => handleCall(order)}>
              <Feather name="phone" size={20} color="white" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.payBtn, isArabic && { flexDirection: 'row-reverse' }]}
              onPress={() => {
                setCollectedAmount('0');
                setDeliveryModal({ visible: true, order });
              }}
            >
              <Feather name="truck" size={18} color={Colors.primary} />
              <Text style={styles.payBtnText}>{t('driver.dashboard.delivery').toUpperCase()}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.iconBtn, { backgroundColor: Colors.danger }]} onPress={() => handleCancel(order)}>
              <Feather name="x" size={20} color="white" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, isArabic && { flexDirection: 'row-reverse' }]}>
        <View style={isArabic && { alignItems: 'flex-end' }}>
          <Text style={styles.headerTitle}>{t('driver.dashboard.deliveries')}</Text>
          <Text style={styles.headerSubtitle}>{readyDeliveries.length} {t('status.READY_FOR_DELIVERY').toLowerCase()}</Text>
        </View>
        <View style={styles.countChip}>
          <Feather name="package" size={14} color={Colors.primary} />
          <Text style={styles.countText}>{readyDeliveries.length}</Text>
        </View>
      </View>

      {loading && readyDeliveries.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={readyDeliveries}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="truck" size={60} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>{t('driver.dashboard.no_missions')}</Text>
              <Text style={styles.emptySubtitle}>{t('driver.dashboard.no_missions')}</Text>
            </View>
          }
        />
      )}

      {/* Delivery Payment Modal */}
      <Modal visible={deliveryModal.visible} transparent animationType="slide" onRequestClose={() => setDeliveryModal({ visible: false, order: null })}>
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity style={styles.modalDismiss} activeOpacity={1} onPress={() => setDeliveryModal({ visible: false, order: null })} />
          <View style={[styles.modalSheet, { maxHeight: '85%' }]}>
            <View style={styles.modalHandle} />
            <ScrollView showsVerticalScrollIndicator={false} bounces={false} style={{ width: '100%' }}>
              <View style={styles.modalIconContainer}>
                <Feather name="truck" size={32} color={Colors.primary} />
              </View>
              <Text style={styles.modalTitle}>{t('delivery.confirm_title')}</Text>
              <Text style={{ fontSize: 14, color: Colors.textSecondary, marginBottom: 20, textAlign: 'center' }}>
                {t('delivery.declare_amount')} (#{deliveryModal.order?.numeroCommande})
              </Text>

              <View style={[styles.modalSummary, isArabic && { flexDirection: 'row-reverse' }]}>
                <View style={isArabic && { alignItems: 'flex-end' }}>
                  <Text style={styles.modalSummaryLabel}>{t('tabs.clients').toUpperCase()}</Text>
                  <Text style={styles.modalSummaryValue}>{deliveryModal.order?.client?.name}</Text>
                </View>
                <View style={{ alignItems: isArabic ? 'flex-start' : 'flex-end' }}>
                  <Text style={styles.modalSummaryLabel}>{t('financial.total').toUpperCase()}</Text>
                  <Text style={[styles.modalSummaryValue, { color: Colors.primary, fontSize: 24 }]}>
                    {deliveryModal.order?.montantTotal} {t('common.dh')}
                  </Text>
                </View>
              </View>

              <Text style={[styles.modalSectionLabel, isArabic && { alignSelf: 'flex-end' }]}>{t('delivery.collected_amount')}</Text>
              <TextInput
                style={{
                  width: '100%',
                  height: 60,
                  backgroundColor: Colors.surface2,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: 'rgba(0,0,0,0.12)',
                  fontSize: 24,
                  fontWeight: '700',
                  textAlign: 'center',
                  color: Colors.textPrimary,
                  marginBottom: 10
                }}
                value={collectedAmount}
                onChangeText={setCollectedAmount}
                keyboardType="decimal-pad"
                placeholder="0"
                autoFocus
              />

              <View style={[styles.paymentGrid, isArabic && { flexDirection: 'row-reverse' }]}>
                <TouchableOpacity 
                  style={{ flex: 1, height: 40, borderRadius: 10, backgroundColor: Colors.primary100, justifyContent: 'center', alignItems: 'center' }}
                  onPress={() => setCollectedAmount('0')}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.primary }}>0 {t('common.dh')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{ flex: 1, height: 40, borderRadius: 10, backgroundColor: Colors.primary100, justifyContent: 'center', alignItems: 'center' }}
                  onPress={() => setCollectedAmount(deliveryModal.order?.montantTotal.toString())}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.primary }}>{deliveryModal.order?.montantTotal} {t('common.dh')}</Text>
                </TouchableOpacity>
              </View>

              {/* Payment status preview */}
              <View style={{ 
                width: '100%',
                borderRadius: 12, 
                padding: 14,
                marginBottom: 24,
                backgroundColor: parseFloat(collectedAmount) === 0 ? Colors.dangerBg : parseFloat(collectedAmount) < parseFloat(deliveryModal.order?.montantTotal || 0) ? '#FFF7ED' : Colors.successBg,
                borderWidth: 1,
                borderColor: parseFloat(collectedAmount) === 0 ? 'rgba(239,68,68,0.2)' : parseFloat(collectedAmount) < parseFloat(deliveryModal.order?.montantTotal || 0) ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'
              }}>
                <Text style={{ 
                  fontSize: 14, 
                  fontWeight: '600', 
                  color: parseFloat(collectedAmount) === 0 ? Colors.danger : parseFloat(collectedAmount) < parseFloat(deliveryModal.order?.montantTotal || 0) ? '#D97706' : Colors.success,
                  textAlign: isArabic ? 'right' : 'left'
                }}>
                  {parseFloat(collectedAmount) === 0 ? `⚠️ ${t('delivery.unpaid_warning')}` : parseFloat(collectedAmount) < parseFloat(deliveryModal.order?.montantTotal || 0) ? `⚡ ${t('delivery.partial_payment')}` : `✅ ${t('delivery.full_payment')}`}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.confirmBtn, { width: '100%', marginBottom: 10, backgroundColor: Colors.primary }]}
                onPress={handleConfirmDelivery}
                disabled={confirmingDelivery}
              >
                {confirmingDelivery ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>
                    🚚 {t('delivery.confirm_btn').toUpperCase()}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cancelBtn, { width: '100%', marginBottom: 20 }]}
                onPress={() => setDeliveryModal({ visible: false, order: null })}
              >
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: 20, paddingBottom: 100 },

  headerRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: { 
    fontSize: Typography.size['2xl'], 
    fontWeight: Typography.weight.bold, 
    color: Colors.textPrimary 
  },
  headerSubtitle: {
    fontSize: Typography.size.base,
    color: Colors.textMuted,
    marginTop: 2,
  },
  countChip: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    backgroundColor: Colors.primary100, 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: Radius.full 
  },
  countText: { 
    fontSize: 13, 
    fontWeight: Typography.weight.bold, 
    color: Colors.primary 
  },

  card: {
    backgroundColor: Colors.surface, 
    borderRadius: Radius.xl, 
    padding: 20, 
    marginBottom: 16,
    borderWidth: 1, 
    borderColor: Colors.border,
    ...Shadows.sm
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderRef: { fontSize: 11, fontWeight: Typography.weight.bold, color: Colors.textMuted, letterSpacing: 0.5 },
  statusBadge: { 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(201,168,76,0.10)', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: Radius.full, 
    borderWidth: 1, 
    borderColor: 'rgba(201,168,76,0.25)',
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent,
  },
  statusText: { fontSize: 10, fontWeight: Typography.weight.bold, color: '#92400E', letterSpacing: 0.5 },
  clientName: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Colors.textPrimary, marginBottom: 12 },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  infoText: { flex: 1, fontSize: 14, color: Colors.textSecondary },

  statsRow: { flexDirection: 'row', gap: 12, marginTop: 12, marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: Colors.surface2, borderRadius: Radius.md, padding: 12, borderWidth: 1, borderColor: Colors.border },
  statBoxHighlight: { backgroundColor: Colors.primary50, borderColor: Colors.primary100 },
  statLabel: { fontSize: 10, fontWeight: Typography.weight.bold, color: Colors.textMuted, letterSpacing: 0.5, marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: Typography.weight.bold, color: Colors.textPrimary },
  currencyText: { fontSize: 12, fontWeight: Typography.weight.medium },

  cardDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 16,
  },

  actionsRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  iconBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', ...Shadows.sm },
  payBtn: {
    flex: 1, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.primary,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: 'white'
  },
  payBtnText: { color: Colors.primary, fontSize: 12, fontWeight: Typography.weight.bold, letterSpacing: 0.5 },
  processingRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 10 },
  processingText: { color: Colors.primary, fontWeight: Typography.weight.bold },

  emptyState: { paddingVertical: 80, alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: Typography.weight.bold, color: Colors.textSecondary },
  emptySubtitle: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', maxWidth: 260 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalDismiss: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 24, alignItems: 'center'
  },
  modalHandle: { width: 40, height: 4, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 2, marginBottom: 20 },
  modalIconContainer: { width: 64, height: 64, backgroundColor: Colors.primary100, borderRadius: Radius.lg, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Colors.textPrimary, marginBottom: 4 },
  modalSectionLabel: { fontSize: 12, fontWeight: Typography.weight.bold, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, alignSelf: 'flex-start' },
  modalSummary: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', backgroundColor: Colors.surface2, borderRadius: Radius.md, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: Colors.border },
  modalSummaryLabel: { fontSize: 10, fontWeight: Typography.weight.bold, color: Colors.textMuted, textTransform: 'uppercase', marginBottom: 4 },
  modalSummaryValue: { fontSize: 18, fontWeight: Typography.weight.bold, color: Colors.textPrimary },
  paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', width: '100%', marginBottom: 24 },
  paymentChip: {
    width: '47%', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 10,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface2
  },
  paymentChipText: { fontSize: 13, fontWeight: Typography.weight.bold, color: Colors.textPrimary, textTransform: 'uppercase' },
  cancelBtn: { width: '100%', backgroundColor: Colors.surface2, padding: 14, borderRadius: Radius.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  cancelBtnText: { fontSize: 14, fontWeight: Typography.weight.bold, color: Colors.textSecondary, textTransform: 'uppercase' },
  confirmBtn: { height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', ...Shadows.teal },
  confirmBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
});
