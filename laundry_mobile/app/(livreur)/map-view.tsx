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
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';

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

  const gpsOrders = useMemo(() => allMissions.filter((o: any) => {
    const addr = o.client?.addresses?.[0];
    return addr?.latitude && addr?.longitude;
  }), [allMissions]);

  useEffect(() => {
    if (gpsOrders.length > 0 && mapRef.current) {
      const coords = gpsOrders.map((o: any) => ({
        latitude: parseFloat(o.client.addresses[0].latitude),
        longitude: parseFloat(o.client.addresses[0].longitude),
      }));
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(coords, {
          edgePadding: { top: 120, right: 40, bottom: 280, left: 40 },
          animated: true,
        });
      }, 600);
    }
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
        provider={PROVIDER_DEFAULT}
        showsUserLocation
        showsMyLocationButton={false}
        initialRegion={{ latitude: 33.5731, longitude: -7.5898, latitudeDelta: 0.5, longitudeDelta: 0.5 }}
      >
        {gpsOrders.map((order: any) => {
          const addr = order.client.addresses[0];
          const isDelivery = order._type === 'delivery';
          return (
            <Marker
              key={order.id}
              coordinate={{ latitude: parseFloat(addr.latitude), longitude: parseFloat(addr.longitude) }}
              onPress={() => setSelected(order)}
            >
              <View style={[styles.pin, { backgroundColor: isDelivery ? C.success : C.warning }]}>
                <Text style={{ color: isDelivery ? 'white' : C.textPrimary, fontSize: 12 }}>
                  {isDelivery ? '🚚' : '📦'}
                </Text>
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Header */}
      <SafeAreaView edges={['top']} pointerEvents="box-none">
        <View style={styles.mapHeader}>
          <TouchableOpacity style={styles.backCircle} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={C.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.mapTitle}>Carte des missions</Text>
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
                {f === 'all' ? 'Tous' : f === 'delivery' ? 'Livraisons' : 'Collectes'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

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
        const addr = selected.client?.addresses?.[0];
        const phone = selected.client?.phones?.[0]?.phoneNumber;
        const isDelivery = selected._type === 'delivery';
        return (
          <View style={styles.miniCard}>
            <View style={[styles.miniAccent, { backgroundColor: isDelivery ? C.success : C.warning }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.miniClient}>{selected.client?.name || selected.clientNom}</Text>
              <Text style={styles.miniAddress} numberOfLines={1}>{addr?.address || '—'}</Text>
              {isDelivery && <Text style={[styles.miniAmount, { color: C.primary }]}>{selected.montantTotal} DH</Text>}
            </View>
            <View style={styles.miniActions}>
              <TouchableOpacity style={styles.miniFab} onPress={() => openNav(addr?.latitude, addr?.longitude, addr?.address)}>
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
          <Text style={{ fontSize: 16, fontWeight: '700', color: C.textPrimary, marginTop: 12 }}>Aucune mission sur la carte</Text>
          <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 4, textAlign: 'center' }}>
            Les missions sans coordonnées GPS ne s'affichent pas
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
  emptyMap: {
    position: 'absolute', bottom: 40, left: 16, right: 16,
    backgroundColor: 'white', borderRadius: 20, padding: 32,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
  },
});
