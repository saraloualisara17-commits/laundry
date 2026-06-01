import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Colors } from '../../../constants/theme';
import { isDelivered, WorkflowAction } from '../../../constants/orderWorkflow';

interface OrderActionGridProps {
  order: any;
  t: (key: string, options?: any) => string;
  permissions: any;
  canAddPayment: boolean;
  canChangeStatus: boolean;
  canAssignDriver: boolean;
  statusAction: WorkflowAction | null;
  statusUpdating: boolean;
  sharingAction: 'whatsapp' | 'print' | null;
  clientPhone: string;
  onEditOrder: () => void;
  onChangeStatus: () => void;
  onEditAddress: () => void;
  onAddPayment: () => void;
  onRemise: () => void;
  onSendSms: () => void;
  onCamera: () => void;
  onGallery: () => void;
  onWhatsAppReceipt: () => void;
  onPrint: () => void;
  onEditResponsible: () => void;
}

export default React.memo(function OrderActionGrid({
  order, t, permissions,
  canAddPayment, canChangeStatus, canAssignDriver,
  statusAction, statusUpdating, sharingAction, clientPhone,
  onEditOrder, onChangeStatus, onEditAddress,
  onAddPayment, onRemise, onSendSms,
  onCamera, onGallery,
  onWhatsAppReceipt, onPrint,
  onEditResponsible,
}: OrderActionGridProps) {
  const delivered = isDelivered(order.status);
  const canAct = permissions.isAdmin || permissions.isEmploye || permissions.isLivreur;

  return (
    <View style={styles.container}>
      {/* Row 1: Edit order | Change status | Edit address */}
      <View style={styles.row}>
        {canAct && (
          <TouchableOpacity style={[styles.btn, { backgroundColor: Colors.primary }]} onPress={onEditOrder}>
            <Feather name="edit-3" size={16} color="white" />
            <Text style={styles.btnText}>{t('orders.edit_order', { defaultValue: 'تعديل الطلبية' })}</Text>
          </TouchableOpacity>
        )}
        {canChangeStatus && statusAction && !delivered && (
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: statusAction.bg }]}
            onPress={onChangeStatus}
            disabled={statusUpdating}
          >
            {statusUpdating
              ? <ActivityIndicator size="small" color="white" />
              : <Feather name="refresh-cw" size={16} color="white" />}
            <Text style={styles.btnText}>{t(statusAction.labelKey, { defaultValue: t('orders.change_status') })}</Text>
          </TouchableOpacity>
        )}
        {canAct && !delivered && (
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#8B5CF6' }]} onPress={onEditAddress}>
            <Ionicons name="location-outline" size={16} color="white" />
            <Text style={styles.btnText}>{t('orders.edit_address', { defaultValue: 'تعديل العنوان' })}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Row 2: Add payment | Remise | Send SMS */}
      <View style={styles.row}>
        {canAddPayment && (
          <TouchableOpacity style={[styles.btn, { backgroundColor: Colors.success }]} onPress={onAddPayment}>
            <Ionicons name="cash-outline" size={16} color="white" />
            <Text style={styles.btnText}>{t('orders.add_payment', { defaultValue: 'إضافة دفعة' })}</Text>
          </TouchableOpacity>
        )}
        {(permissions.isAdmin || permissions.isEmploye) && order.commandeTapis?.length > 0 && (
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#F59E0B' }]} onPress={onRemise}>
            <Ionicons name="pricetag-outline" size={16} color="white" />
            <Text style={styles.btnText}>{t('orders.remise', { defaultValue: 'Remise' })}</Text>
          </TouchableOpacity>
        )}
        {!!clientPhone && (
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#0EA5E9' }]} onPress={onSendSms}>
            <Ionicons name="chatbubble-outline" size={16} color="white" />
            <Text style={styles.btnText}>{t('orders.send_sms', { defaultValue: 'إرسال رسالة نصية' })}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Row 3: Camera | Gallery */}
      {canAct && (
        <View style={styles.row}>
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#0F172A' }]} onPress={onCamera}>
            <Ionicons name="camera-outline" size={16} color="white" />
            <Text style={styles.btnText}>{t('orders.take_photo', { defaultValue: 'التقاط صورة' })}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#475569' }]} onPress={onGallery}>
            <Ionicons name="images-outline" size={16} color="white" />
            <Text style={styles.btnText}>{t('orders.from_gallery', { defaultValue: 'من المعرض' })}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Row 4: WhatsApp receipt | Print */}
      <View style={styles.row}>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#25D366' }]} onPress={onWhatsAppReceipt} disabled={!!sharingAction}>
          {sharingAction === 'whatsapp'
            ? <ActivityIndicator size="small" color="white" />
            : <Ionicons name="logo-whatsapp" size={16} color="white" />}
          <Text style={styles.btnText}>{t('orders.whatsapp_receipt', { defaultValue: 'واتساب الوصل' })}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#64748B' }]} onPress={onPrint} disabled={sharingAction === 'print'}>
          {sharingAction === 'print'
            ? <ActivityIndicator size="small" color="white" />
            : <Ionicons name="print-outline" size={16} color="white" />}
          <Text style={styles.btnText}>{t('orders.print', { defaultValue: 'طباعة' })}</Text>
        </TouchableOpacity>
      </View>

      {/* Row 5: Edit responsible — full width yellow button */}
      {canAct && (
        <TouchableOpacity style={[styles.btn, styles.fullWidthBtn, { backgroundColor: '#F59E0B' }]} onPress={onEditResponsible}>
          <Ionicons name="people-outline" size={16} color="white" />
          <Text style={styles.btnText}>{t('orders.edit_responsible', { defaultValue: 'تعديل المسؤولين' })}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, gap: 10 },
  row: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 12 },
  fullWidthBtn: { flex: 0, width: '100%' },
  btnText: { color: 'white', fontSize: 12, fontWeight: '700' },
});
