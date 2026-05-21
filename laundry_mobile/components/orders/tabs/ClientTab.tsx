import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Colors, Shadows } from '../../../constants/theme';
import { useFormStyles } from '../../../src/hooks/useFormStyles';

interface ClientTabProps {
  order: any;
  isArabic: boolean;
  t: (key: string, options?: any) => string;
  onClientPress: (clientId: number | string) => void;
  handleShareReceipt: () => void;
  sharing: boolean;
  getClientPhone: (client: any) => string;
  setShowDriverModal: (visible: boolean) => void;
}

const ClientTab: React.FC<ClientTabProps> = ({
  order,
  isArabic,
  t,
  onClientPress,
  handleShareReceipt,
  sharing,
  getClientPhone,
  setShowDriverModal,
}) => {
  const f = useFormStyles();
  return (
    <View>
      <View style={styles.infoCard}>
        <Text style={[styles.sectionLabel, f.sectionLabel]}>
          {t('admin.orders.create.client_info')}
        </Text>

        <View style={[styles.infoRow, isArabic && { flexDirection: 'row-reverse' }]}>
          <View style={[styles.infoIconCircle, { backgroundColor: Colors.primary100 }]}>
            <Ionicons name="person" size={20} color={Colors.primary} />
          </View>
          <TouchableOpacity
            style={[styles.infoCol, isArabic && { alignItems: 'flex-end' }]}
            onPress={() => onClientPress(order.client?.id)}
          >
            <Text style={[styles.infoLabel, f.label]}>{t('tabs.clients')}</Text>
            <Text
              style={[
                styles.infoValue,
                { color: Colors.primary, textDecorationLine: 'underline' },
              ]}
            >
              {order.client?.name}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.infoRow, isArabic && { flexDirection: 'row-reverse' }]}
          onPress={() => Linking.openURL(`tel:${getClientPhone(order.client)}`)}
        >
          <View style={[styles.infoIconCircle, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
            <Ionicons name="call" size={20} color={Colors.success} />
          </View>
          <View style={[styles.infoCol, isArabic && { alignItems: 'flex-end' }]}>
            <Text style={[styles.infoLabel, f.label]}>{t('admin.clients.phone')}</Text>
            <Text style={styles.infoValue}>{getClientPhone(order.client)}</Text>
          </View>
          <Feather name="external-link" size={14} color={Colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.infoRow, isArabic && { flexDirection: 'row-reverse' }]}
          onPress={handleShareReceipt}
          disabled={sharing}
        >
          <View style={[styles.infoIconCircle, { backgroundColor: 'rgba(37,211,102,0.1)' }]}>
            <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
          </View>
          <View style={[styles.infoCol, isArabic && { alignItems: 'flex-end' }]}>
            <Text style={styles.infoLabel}>{t('admin.items.whatsapp_label')}</Text>
            <Text style={styles.infoValue}>
              {sharing ? t('common.loading') : t('admin.orders.create.confirmation.send_receipt')}
            </Text>
          </View>
          {sharing ? (
            <ActivityIndicator size="small" color="#25D366" />
          ) : (
            <Feather
              name={isArabic ? 'chevron-left' : 'chevron-right'}
              size={14}
              color={Colors.textMuted}
            />
          )}
        </TouchableOpacity>

        {order.livreur && (
          <View style={[styles.infoRow, isArabic && { flexDirection: 'row-reverse' }]}>
            <View style={[styles.infoIconCircle, { backgroundColor: 'rgba(201,168,76,0.1)' }]}>
              <MaterialIcons name="local-shipping" size={20} color={Colors.accent} />
            </View>
            <View style={[styles.infoCol, isArabic && { alignItems: 'flex-end' }]}>
              <Text style={[styles.infoLabel, f.label]}>{t('admin.orders.driver_pickup')}</Text>
              <Text style={styles.infoValue}>{order.livreur.name}</Text>
            </View>
          </View>
        )}

        {order.deliveryDriver && (
          <View style={[styles.infoRow, isArabic && { flexDirection: 'row-reverse' }]}>
            <View style={[styles.infoIconCircle, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
              <MaterialIcons name="local-shipping" size={20} color={Colors.success} />
            </View>
            <View style={[styles.infoCol, isArabic && { alignItems: 'flex-end' }]}>
              <Text style={[styles.infoLabel, f.label]}>{t('admin.orders.driver_delivery')}</Text>
              <Text style={styles.infoValue}>{order.deliveryDriver.name}</Text>
            </View>
          </View>
        )}

        {order.status !== 'DELIVERED' && !order.deliveryDriver && (
          <TouchableOpacity
            style={[styles.infoRow, isArabic && { flexDirection: 'row-reverse' }]}
            onPress={() => setShowDriverModal(true)}
          >
            <View style={[styles.infoIconCircle, { backgroundColor: Colors.primary100 }]}>
              <Feather name="plus" size={20} color={Colors.primary} />
            </View>
            <View style={[styles.infoCol, isArabic && { alignItems: 'flex-end' }]}>
              <Text style={[styles.infoLabel, f.label]}>{t('admin.orders.driver_delivery')}</Text>
              <Text style={[styles.infoValue, { color: Colors.primary }]}>
                {t('admin.orders.filter_driver')}
              </Text>
            </View>
            <Feather
              name={isArabic ? 'chevron-left' : 'chevron-right'}
              size={16}
              color={Colors.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>

      {order.client?.addresses?.[0]?.latitude && (
        <View style={styles.mapSection}>
          <View style={[styles.mapHeaderRow, isArabic && { flexDirection: 'row-reverse' }]}>
            <Ionicons name="location" size={16} color={Colors.primary} />
            <Text style={styles.mapTitle}>{t('admin.clients.address')}</Text>
          </View>
          <Text style={[styles.addressText, isArabic && { textAlign: 'right' }]}>
            {order.client.addresses[0].address}
          </Text>

          <View style={styles.mapWrapper}>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
              initialRegion={{
                latitude: parseFloat(order.client.addresses[0].latitude),
                longitude: parseFloat(order.client.addresses[0].longitude),
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
            >
              <Marker
                coordinate={{
                  latitude: parseFloat(order.client.addresses[0].latitude),
                  longitude: parseFloat(order.client.addresses[0].longitude),
                }}
              >
                <View style={styles.markerContainer}>
                  <View style={styles.markerPin} />
                </View>
              </Marker>
            </MapView>
            <TouchableOpacity
              style={[styles.openMapBtn, isArabic ? { left: 12, right: undefined } : { right: 12 }]}
              onPress={() =>
                Linking.openURL(
                  `https://maps.google.com/?q=${order.client.addresses[0].latitude},${order.client.addresses[0].longitude}`
                )
              }
            >
              <Text style={styles.openMapText}>{t('admin.clients.map')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  infoCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    ...Shadows.sm,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textMuted,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  infoIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  mapSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  mapHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    marginLeft: 4,
  },
  mapTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  addressText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
    marginLeft: 4,
  },
  mapWrapper: {
    height: 200,
    borderRadius: 24,
    overflow: 'hidden',
    ...Shadows.md,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    padding: 4,
    backgroundColor: 'white',
    borderRadius: 20,
    ...Shadows.md,
  },
  markerPin: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: 'white',
  },
  openMapBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    ...Shadows.sm,
  },
  openMapText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
});

export default React.memo(ClientTab);

