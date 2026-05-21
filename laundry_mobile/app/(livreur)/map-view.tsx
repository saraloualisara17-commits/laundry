import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Platform, Linking, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../src/store/store';
import { fetchReadyDeliveries, fetchPendingPickups } from '../../src/store/livreurThunks';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { STATUS_COLORS } from '../../constants/StatusColors';
import { useTranslation } from 'react-i18next';

const C = {
  primary: '#0D7377',
  success: '#10B981',
  warning: '#F59E0B',
  bg: '#F4F6F8',
  surface: '#FFFFFF',
  textPrimary: '#0D1B2A',
  textSecondary: '#4A5568',
  textMuted: '#94A3B8',
};

type Filter = 'all' | 'delivery' | 'pickup';

function openNav(lat?: any, lng?: any, address?: string) {
  const url = Platform.select({
    ios: lat && lng ? `maps://?daddr=${lat},${lng}` : `maps://?daddr=${encodeURIComponent(address || '')}`,
    android: lat && lng ? `geo:${lat},${lng}?q=${lat},${lng}` : `geo:0,0?q=${encodeURIComponent(address || '')}`,
  });
  Linking.openURL(url || '').catch(() =>
    Linking.openURL(`https://maps.google.com/?daddr=${lat},${lng}`)
  );
}

export default function MapViewScreen() {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { readyDeliveries, readyOrders, loading } = useSelector((s: RootState) => s.livreur);

  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<any>(null);
  const mapRef = useRef<MapView>(null);

  useFocusEffect(useCallback(() => {
    dispatch(fetchReadyDeliveries());
    dispatch(fetchPendingPickups());
  }, [dispatch]));

  const allMissions = useMemo(() => {
    const deliveries = (readyDeliveries || []).map((o: any) => ({ ...o, _type: 'delivery' }));
    const pickups = (readyOrders || []).map((o: any) => ({ ...o, _type: 'pickup' }));
    if (filter === 'delivery') return deliveries;
    if (filter === 'pickup') return pickups;
    return [...deliveries, ...pickups];
  }, [readyDeliveries, readyOrders, filter]);

  // Resolve lat/lng for an order: prefer snapshotted delivery coords, fall back to client profile
  const resolveCoords = (o: any) => {
    if (o.deliveryLatitude != null && o.deliveryLongitude != null) {
      return { lat: parseFloat(o.deliveryLatitude), lng: parseFloat(o.deliveryLongitude) };
    }
    const addr = o.client?.addresses?.[0];
    if (addr?.latitude && addr?.longitude) {
      return { lat: parseFloat(addr.latitude), lng: parseFloat(addr.longitude) };
    }
    return null;
  };

  const resolveAddress = (o: any): string =>
    o.deliveryAddress ?? o.client?.addresses?.[0]?.address ?? '—';

  const gpsOrders = useMemo(() => allMissions.filter((o: any) => resolveCoords(o) !== null), [allMissions]);

  const markers = useMemo(() => {
    return gpsOrders.map((order: any) => {
      const coords = resolveCoords(order)!;
      const isDelivery = order._type === 'delivery';
      const status = isDelivery ? 'READY_FOR_DELIVERY' : 'PENDING_PICKUP';
      return (
        <Marker
          key={order.id}
          coordinate={{ latitude: coords.lat, longitude: coords.lng }}
          pinColor={STATUS_COLORS[status] || (isDelivery ? C.success : C.warning)}
          onPress={() => setSelected(order)}
        />
      );
    });
  }, [gpsOrders, selected]);

  useEffect(() => {
    if (gpsOrders.length === 0 || !mapRef.current) return;
    const coords = gpsOrders.map((o: any) => {
      const c = resolveCoords(o)!;
      return { latitude: c.lat, longitude: c.lng };
    });
    setTimeout(() => {
      if (coords.length === 1) {
        mapRef.current?.animateToRegion(
          { latitude: coords[0].latitude, longitude: coords[0].longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 },
          600
        );
      } else {
        mapRef.current?.fitToCoordinates(coords, {
          edgePadding: { top: 120, right: 60, bottom: 300, left: 60 },
          animated: true,
        });
      }
    }, 600);
  }, [gpsOrders.length]);

  if (loading && allMissions.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_GOOGLE}
        showsUserLocation
        showsMyLocationButton={false}
        initialRegion={{ latitude: 33.5731, longitude: -7.5898, latitudeDelta: 0.5, longitudeDelta: 0.5 }}
      >
        {markers}
      </MapView>

      {/* Floating Header Actions */}
      <View style={[styles.floatingHeader, { top: 50 }]}>
        <View style={[styles.mapHeader, { marginTop: 0 }]}>
          <TouchableOpacity style={styles.backCircle} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={C.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.mapTitle}>{t('livreur.map_title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Filter pills */}
        <View style={styles.filterRow}>
          {(['all', 'delivery', 'pickup'] as Filter[]).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterPill, filter === f && styles.filterPillActive]}
              onPress={() => { setFilter(f); setSelected(null); }}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === 'all' ? t('livreur.filter_all') : f === 'delivery' ? t('livreur.filter_deliveries') : t('livreur.filter_pickups')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* My location FAB */}
      <TouchableOpacity
        style={styles.locationFab}
        onPress={() => mapRef.current?.animateToRegion(
          { latitude: 33.5731, longitude: -7.5898, latitudeDelta: 0.05, longitudeDelta: 0.05 },
          600
        )}
      >
        <Ionicons name="locate" size={22} color={C.primary} />
      </TouchableOpacity>

      {/* Selected order mini card */}
      {selected && (() => {
        const coords = resolveCoords(selected);
        const address = resolveAddress(selected);
        const phone = selected.client?.phones?.[0]?.phoneNumber;
        const isDelivery = selected._type === 'delivery';
        return (
          <View style={styles.miniCard}>
            <View style={[styles.miniAccent, { backgroundColor: isDelivery ? C.success : C.warning }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.miniClient}>{selected.client?.name || selected.clientNom}</Text>
              <Text style={styles.miniAddress} numberOfLines={1}>{address}</Text>
              {isDelivery && <Text style={[styles.miniAmount, { color: C.primary }]}>{selected.montantTotal} DH</Text>}
            </View>
            <View style={styles.miniActions}>
              <TouchableOpacity style={styles.miniFab} onPress={() => openNav(coords?.lat, coords?.lng, address)}>
                <Ionicons name="navigate" size={18} color={C.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.miniFab} onPress={() => router.push(`/order/${selected.id}`)}>
                <Ionicons name="eye-outline" size={18} color={C.primary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.miniClose} onPress={() => setSelected(null)}>
              <Ionicons name="close" size={16} color={C.textMuted} />
            </TouchableOpacity>
          </View>
        );
      })()}

      {gpsOrders.length === 0 && (
        <View style={styles.emptyMap}>
          <Text style={{ fontSize: 48 }}>🗺️</Text>
          <Text style={{ fontSize: 16, fontWeight: '700', color: C.textPrimary, marginTop: 12 }}>{t('livreur.no_missions_map')}</Text>
          <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 4, textAlign: 'center' }}>
            {t('livreur.no_missions_map_sub')}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mapHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 16, marginTop: 8,
  },
  backCircle: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'white',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
  },
  mapTitle: {
    fontSize: 16, fontWeight: '700', color: C.textPrimary,
    backgroundColor: 'white', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  filterRow: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 10 },
  filterPill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
    backgroundColor: 'white',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  filterPillActive: { backgroundColor: C.primary },
  filterText: { fontSize: 12, fontWeight: '600', color: C.textMuted },
  filterTextActive: { color: 'white' },
  pin: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'white' },
  locationFab: {
    position: 'absolute', bottom: 200, right: 16,
    width: 48, height: 48, borderRadius: 24, backgroundColor: 'white',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 5,
  },
  miniCard: {
    position: 'absolute', bottom: 40, left: 16, right: 16,
    backgroundColor: 'white', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8,
  },
  miniAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  miniClient: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  miniAddress: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  miniAmount: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  miniActions: { flexDirection: 'row', gap: 8 },
  miniFab: {
    width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(13,115,119,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  miniClose: { position: 'absolute', top: 8, right: 8, padding: 4 },
  floatingHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
  },
  emptyMap: {
    position: 'absolute', bottom: 40, left: 16, right: 16,
    backgroundColor: 'white', borderRadius: 20, padding: 32,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
  },
});
