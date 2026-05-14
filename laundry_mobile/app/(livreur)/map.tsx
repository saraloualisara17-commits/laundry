import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Linking,
  ActivityIndicator, Alert, Animated, Platform, Dimensions,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useDriverLocation } from '../../src/hooks/useDriverLocation';
import { useDirections } from '../../src/hooks/useDirections';
import { fetchReadyDeliveries, fetchPaymentTypes, confirmPayment, cancelDelivery } from '../../src/store/livreurThunks';
import { RootState, AppDispatch } from '../../src/store/store';
import { Colors, Shadows, Typography, Radius, StatusColors } from '../../constants/theme';
import { useTranslation } from 'react-i18next';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const StopMarker = React.memo(({ order, index, isNext }: { order: any; index: number; isNext: boolean }) => {
  const addr = order.client?.addresses?.[0];
  const lat = parseFloat(addr?.latitude);
  const lng = parseFloat(addr?.longitude);
  if (isNaN(lat) || isNaN(lng)) return null;

  return (
    <Marker coordinate={{ latitude: lat, longitude: lng }} anchor={{ x: 0.5, y: 0.5 }}>
      <View style={[styles.markerOuter, isNext && styles.markerOuterNext]}>
        <View style={[styles.markerInner, isNext && styles.markerInnerNext]}>
          <Text style={styles.markerText}>{index + 1}</Text>
        </View>
      </View>
    </Marker>
  );
});

const DriverMarker = React.memo(({ latitude, longitude }: { latitude: number; longitude: number }) => (
  <Marker coordinate={{ latitude, longitude }} anchor={{ x: 0.5, y: 0.5 }}>
    <View style={styles.driverDot}>
      <View style={styles.driverDotInner} />
    </View>
  </Marker>
));

export default function MapScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  
  const dispatch = useDispatch<AppDispatch>();
  const { readyDeliveries, paymentTypes, loading } = useSelector((s: RootState) => s.livreur);
  const { coords, isTracking } = useDriverLocation();
  const { route, calculateRoute } = useDirections();

  const mapRef = useRef<MapView>(null);
  const sheetRef = useRef<BottomSheet>(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.6, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useFocusEffect(useCallback(() => {
    dispatch(fetchReadyDeliveries());
    dispatch(fetchPaymentTypes());
  }, [dispatch]));

  const ordersWithGPS = useMemo(() =>
    readyDeliveries.filter((o: any) => {
      const a = o.client?.addresses?.[0];
      return a?.latitude && a?.longitude;
    }),
    [readyDeliveries]
  );

  const activeOrder = ordersWithGPS[activeIndex] ?? null;

  useEffect(() => {
    if (!coords || ordersWithGPS.length === 0) return;
    const waypoints = [
      { latitude: coords.latitude, longitude: coords.longitude },
      ...ordersWithGPS.slice(activeIndex).map((o: any) => ({
        latitude: parseFloat(o.client.addresses[0].latitude),
        longitude: parseFloat(o.client.addresses[0].longitude),
      })),
    ];
    calculateRoute(waypoints);
  }, [activeIndex, ordersWithGPS.length, coords]);

  useEffect(() => {
    if (!activeOrder) return;
    const addr = activeOrder.client?.addresses?.[0];
    mapRef.current?.animateToRegion({
      latitude: parseFloat(addr.latitude),
      longitude: parseFloat(addr.longitude),
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 800);
  }, [activeIndex]);

  useEffect(() => {
    if (!coords || !activeOrder) return;
    const addr = activeOrder.client?.addresses?.[0];
    if (!addr?.latitude) return;
    const dist = haversine(coords.latitude, coords.longitude, parseFloat(addr.latitude), parseFloat(addr.longitude));
    if (dist < 100) sheetRef.current?.snapToIndex(1);
  }, [coords]);

  const centerOnDriver = () => {
    if (!coords) return;
    mapRef.current?.animateToRegion({
      latitude: coords.latitude,
      longitude: coords.longitude,
      latitudeDelta: 0.008,
      longitudeDelta: 0.008,
    }, 500);
  };

  const centerOnRoute = () => {
    if (!coords && ordersWithGPS.length === 0) return;
    const points = [
      ...(coords ? [coords] : []),
      ...ordersWithGPS.map((o: any) => ({
        latitude: parseFloat(o.client.addresses[0].latitude),
        longitude: parseFloat(o.client.addresses[0].longitude),
      })),
    ];
    mapRef.current?.fitToCoordinates(points, { edgePadding: { top: 80, right: 40, bottom: SCREEN_HEIGHT * 0.45, left: 40 }, animated: true });
  };

  const handleOpenMaps = () => {
    if (!activeOrder) return;
    const addr = activeOrder.client?.addresses?.[0];
    const lat = addr?.latitude;
    const lng = addr?.longitude;
    const address = addr?.address;
    const url = lat && lng
      ? (Platform.OS === 'ios' ? `maps:0,0?q=${lat},${lng}` : `geo:${lat},${lng}?q=${lat},${lng}`)
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || '')}`;
    Linking.openURL(url);
  };

  const handleCall = () => {
    const phone = activeOrder?.client?.phones?.[0]?.phoneNumber;
    if (phone) Linking.openURL(`tel:${phone}`);
    else Alert.alert(t('common.error'), t('admin.clients.no_phone'));
  };

  const handleConfirmPayment = async (methodId: number) => {
    if (!activeOrder) return;
    setPaymentVisible(false);
    setProcessingId(activeOrder.id);
    try {
      await dispatch(confirmPayment({ orderId: activeOrder.id, methodId })).unwrap();
      Alert.alert(t('delivery.delivery_success'), t('common.success_msg'));
      const next = activeIndex < ordersWithGPS.length - 1 ? activeIndex + 1 : activeIndex;
      setActiveIndex(next);
    } catch (err: any) {
      Alert.alert(t('common.error'), typeof err === 'string' ? err : t('common.error_msg'));
    } finally {
      setProcessingId(null);
      dispatch(fetchReadyDeliveries());
    }
  };

  const handleCancel = () => {
    Alert.alert(t('admin.users.actions.suspend'), t('common.confirm_msg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.supprimer'), style: 'destructive', onPress: async () => {
          setProcessingId(activeOrder!.id);
          try {
            await dispatch(cancelDelivery(activeOrder!.id)).unwrap();
          } catch { }
          finally {
            setProcessingId(null);
            dispatch(fetchReadyDeliveries());
          }
        }
      }
    ]);
  };

  if (loading && readyDeliveries.length === 0) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  const initialRegion = coords
    ? { latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : { latitude: 33.5731, longitude: -7.5898, latitudeDelta: 0.1, longitudeDelta: 0.1 };

  const clientName = activeOrder?.client?.nom || activeOrder?.client?.name || t('common.unspecified');
  const phone = activeOrder?.client?.phones?.[0]?.phoneNumber;
  const addr = activeOrder?.client?.addresses?.[0];
  const isProcessing = processingId === activeOrder?.id;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>

        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          provider={PROVIDER_DEFAULT}
          initialRegion={initialRegion}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          showsTraffic={false}
          toolbarEnabled={false}
        >
          {route && route.polyline.length > 1 && (
            <Polyline
              coordinates={route.polyline}
              strokeColor={Colors.primary}
              strokeWidth={4}
            />
          )}

          {ordersWithGPS.map((order: any, index: number) => (
            <StopMarker key={order.id} order={order} index={index} isNext={index === activeIndex} />
          ))}

          {coords && <DriverMarker latitude={coords.latitude} longitude={coords.longitude} />}
        </MapView>

        <View style={[styles.topBar, isArabic && { flexDirection: 'row-reverse' }]}>
          <View style={[styles.topBarPill, isArabic && { flexDirection: 'row-reverse' }]}>
            <Animated.View style={[styles.trackingDot, { transform: [{ scale: pulseAnim }] }]} />
            <Text style={styles.topBarText}>
              {isTracking ? `${ordersWithGPS.length} ${t('driver.map.stop').toLowerCase()}${ordersWithGPS.length !== 1 ? 's' : ''} ${t('financial.remaining').toLowerCase()}` : `${t('common.loading')}…`}
            </Text>
          </View>
        </View>

        <View style={styles.fabs}>
          <TouchableOpacity style={styles.fab} onPress={centerOnDriver}>
            <Feather name="crosshair" size={22} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.fab} onPress={centerOnRoute}>
            <Feather name="layers" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {ordersWithGPS.length === 0 ? (
          <View style={styles.emptySheet}>
            <Feather name="truck" size={36} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>{t('driver.dashboard.no_missions')}</Text>
            <Text style={styles.emptySubtitle}>{t('driver.dashboard.no_missions')}</Text>
          </View>
        ) : (
          <BottomSheet
            ref={sheetRef}
            index={0}
            snapPoints={['35%', '60%']}
            backgroundStyle={styles.sheetBg}
            handleIndicatorStyle={styles.sheetHandle}
          >
            <BottomSheetView style={styles.sheetContent}>

              <View style={[styles.stopNav, isArabic && { flexDirection: 'row-reverse' }]}>
                <TouchableOpacity
                  style={[styles.navBtn, activeIndex === 0 && styles.navBtnDisabled]}
                  onPress={() => setActiveIndex(i => Math.max(0, i - 1))}
                  disabled={activeIndex === 0}
                >
                  <Feather name={isArabic ? "chevron-right" : "chevron-left"} size={18} color={activeIndex === 0 ? '#D1D5DB' : Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.stopLabel}>{t('driver.map.stop').toUpperCase()} {activeIndex + 1} / {ordersWithGPS.length}</Text>
                <TouchableOpacity
                  style={[styles.navBtn, activeIndex === ordersWithGPS.length - 1 && styles.navBtnDisabled]}
                  onPress={() => setActiveIndex(i => Math.min(ordersWithGPS.length - 1, i + 1))}
                  disabled={activeIndex === ordersWithGPS.length - 1}
                >
                  <Feather name={isArabic ? "chevron-left" : "chevron-right"} size={18} color={activeIndex === ordersWithGPS.length - 1 ? '#D1D5DB' : Colors.primary} />
                </TouchableOpacity>
              </View>

              {route && route.durationMin > 0 && (
                <View style={[styles.etaRow, isArabic && { flexDirection: 'row-reverse' }]}>
                  <View style={[styles.etaChip, isArabic && { flexDirection: 'row-reverse' }]}>
                    <Feather name="clock" size={14} color={Colors.primary} />
                    <Text style={styles.etaText}>{route.durationMin} min</Text>
                  </View>
                  <View style={[styles.etaChip, isArabic && { flexDirection: 'row-reverse' }]}>
                    <Feather name="map" size={14} color={Colors.primary} />
                    <Text style={styles.etaText}>{route.distanceKm} km</Text>
                  </View>
                </View>
              )}

              <Text style={[styles.clientName, isArabic && { textAlign: 'right' }]}>{clientName}</Text>
              {addr?.address && (
                <View style={[styles.infoRow, isArabic && { flexDirection: 'row-reverse' }]}>
                  <Feather name="map-pin" size={14} color={Colors.textMuted} />
                  <Text style={[styles.infoText, isArabic && { textAlign: 'right' }]} numberOfLines={2}>{addr.address}</Text>
                </View>
              )}
              {phone && (
                <View style={[styles.infoRow, isArabic && { flexDirection: 'row-reverse' }]}>
                  <Feather name="phone" size={14} color={Colors.textMuted} />
                  <Text style={[styles.infoText, isArabic && { textAlign: 'right' }]}>{phone}</Text>
                </View>
              )}

              <View style={[styles.amountRow, isArabic && { flexDirection: 'row-reverse' }]}>
                <Text style={styles.amountLabel}>{t('delivery.collected_amount')}</Text>
                <Text style={styles.amountValue}>{activeOrder?.montantTotal} {t('common.dh')}</Text>
              </View>

              {isProcessing ? (
                <View style={[styles.processingRow, isArabic && { flexDirection: 'row-reverse' }]}>
                  <ActivityIndicator color={Colors.primary} />
                  <Text style={styles.processingText}>{t('common.loading')}…</Text>
                </View>
              ) : (
                <View style={[styles.actions, isArabic && { flexDirection: 'row-reverse' }]}>
                  <TouchableOpacity style={styles.actionBtn} onPress={handleCall}>
                    <Feather name="phone" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={handleOpenMaps}>
                    <Feather name="navigation" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={handleCancel}>
                    <Feather name="x" size={20} color={Colors.danger} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.deliveredBtn, isArabic && { flexDirection: 'row-reverse' }]} onPress={() => setPaymentVisible(true)}>
                    <Feather name="check-circle" size={18} color="white" />
                    <Text style={styles.deliveredText}>{t('status.DELIVERED').toUpperCase()}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </BottomSheetView>
          </BottomSheet>
        )}

        {paymentVisible && (
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setPaymentVisible(false)} />
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <View style={styles.modalIcon}>
                <Feather name="credit-card" size={28} color={Colors.primary} />
              </View>
              <Text style={styles.modalTitle}>{t('delivery.confirm_title')}</Text>
              <View style={[styles.modalSummary, isArabic && { flexDirection: 'row-reverse' }]}>
                <Text style={styles.modalRef}>#{activeOrder?.numeroCommande}</Text>
                <Text style={styles.modalAmount}>{activeOrder?.montantTotal} {t('common.dh')}</Text>
              </View>
              <Text style={[styles.modalSubtitle, isArabic && { textAlign: 'right' }]}>{t('admin.orders.create.summary.payment_mode')}</Text>
              <View style={[styles.payGrid, isArabic && { flexDirection: 'row-reverse' }]}>
                {paymentTypes.map((t_item: any) => (
                  <TouchableOpacity key={t_item.id} style={styles.payChip} onPress={() => handleConfirmPayment(t_item.id)}>
                    <Feather name={t_item.code === 'especes' ? 'dollar-sign' : 'credit-card'} size={22} color={Colors.primary} />
                    <Text style={styles.payChipText}>{t_item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setPaymentVisible(false)}>
                <Text style={styles.cancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },

  topBar: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 20, left: 0, right: 0, alignItems: 'center', zIndex: 10 },
  topBarPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, ...Shadows.md },
  trackingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  topBarText: { fontSize: 13, fontWeight: 'bold', color: Colors.textPrimary },

  fabs: { position: 'absolute', right: 16, bottom: '40%', gap: 12, zIndex: 10 },
  fab: { width: 48, height: 48, backgroundColor: 'white', borderRadius: 14, justifyContent: 'center', alignItems: 'center', ...Shadows.md },

  markerOuter: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(13,115,119,0.2)', justifyContent: 'center', alignItems: 'center' },
  markerOuterNext: { backgroundColor: 'rgba(13,115,119,0.35)' },
  markerInner: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white' },
  markerInnerNext: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primaryDark },
  markerText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  driverDot: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(59,130,246,0.2)', justifyContent: 'center', alignItems: 'center' },
  driverDotInner: { width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.info, borderWidth: 3, borderColor: 'white' },

  sheetBg: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetHandle: { backgroundColor: Colors.border, width: 40, height: 4 },
  sheetContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24 },

  stopNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  navBtn: { width: 36, height: 36, backgroundColor: Colors.surface2, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  navBtnDisabled: { opacity: 0.4 },
  stopLabel: { fontSize: 12, fontWeight: Typography.weight.bold, color: Colors.primary, letterSpacing: 1 },

  etaRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  etaChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary50, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.primary100 },
  etaText: { fontSize: 13, fontWeight: Typography.weight.bold, color: Colors.primary },

  clientName: { fontSize: 22, fontWeight: Typography.weight.bold, color: Colors.textPrimary, marginBottom: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  infoText: { flex: 1, fontSize: 13, color: Colors.textSecondary },

  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.successBg, borderRadius: 12, padding: 16, marginVertical: 16, borderWidth: 1, borderColor: 'rgba(16,185,129,0.20)' },
  amountLabel: { fontSize: 12, fontWeight: Typography.weight.bold, color: '#065F46', textTransform: 'uppercase' },
  amountValue: { fontSize: 22, fontWeight: Typography.weight.bold, color: Colors.success },

  actions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  actionBtn: { width: 48, height: 48, backgroundColor: Colors.surface2, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  deliveredBtn: { flex: 1, height: 48, backgroundColor: Colors.primary, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, ...Shadows.teal },
  deliveredText: { color: 'white', fontSize: 13, fontWeight: Typography.weight.bold, letterSpacing: 1 },

  processingRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, paddingVertical: 14 },
  processingText: { color: Colors.primary, fontWeight: 'bold' },

  emptySheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 32, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.textSecondary },
  emptySubtitle: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },

  modalOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 100, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet: { backgroundColor: 'white', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: Platform.OS === 'ios' ? 44 : 28, alignItems: 'center' },
  modalHandle: { width: 40, height: 4, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 2, marginBottom: 20 },
  modalIcon: { width: 64, height: 64, backgroundColor: Colors.primary50, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 16 },
  modalSummary: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', backgroundColor: Colors.surface2, borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: Colors.border },
  modalRef: { fontSize: 14, fontWeight: 'bold', color: Colors.textMuted },
  modalAmount: { fontSize: 22, fontWeight: 'bold', color: Colors.primary },
  modalSubtitle: { fontSize: 11, fontWeight: 'bold', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14, alignSelf: 'flex-start' },
  payGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', width: '100%', marginBottom: 16 },
  payChip: { width: '47%', alignItems: 'center', padding: 18, gap: 8, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface2 },
  payChipText: { fontSize: 13, fontWeight: 'bold', color: Colors.textPrimary, textTransform: 'uppercase' },
  cancelBtn: { width: '100%', padding: 14, borderRadius: 14, alignItems: 'center', backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border },
  cancelText: { fontSize: 14, fontWeight: 'bold', color: Colors.textSecondary },
});
