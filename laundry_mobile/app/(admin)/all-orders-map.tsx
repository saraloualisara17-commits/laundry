import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Dimensions,
  Platform,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { AdminColors, AdminShadows } from '../../constants/AdminColors';
import { STATUS_COLORS } from '../../constants/StatusColors';
import { useDirections } from '../../src/hooks/useDirections';
import { useTranslation } from 'react-i18next';
import { useOrdersForMap } from '../../src/hooks/query/useOrders';

const { width, height } = Dimensions.get('window');

export default function AllOrdersMapScreen() {
  const { t, i18n } = useTranslation();
  const { livreurId } = useLocalSearchParams();
  const isArabic = i18n.language === 'ar';
  const SELECTED_STATUSES = ['PENDING_PICKUP', 'PICKED_UP', 'IN_PROCESS', 'READY_FOR_DELIVERY', 'DELIVERED'];

  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showList, setShowList] = useState(false);
  const [showAllRoutes, setShowAllRoutes] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const mapRef = useRef<MapView>(null);
  const { route, calculateRoute, clearRoute, loading: routeLoading } = useDirections();

  const { data: mapData, isLoading: loading } = useOrdersForMap(livreurId as string);
  const orders: any[] = useMemo(() => {
    if (!mapData) return [];
    return mapData.success ? (mapData.data || []) : (Array.isArray(mapData) ? mapData : []);
  }, [mapData]);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation(location.coords);
      } catch {
        // location unavailable
      }
    })();
  }, []);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const location = await Location.getCurrentPositionAsync({});
      setUserLocation(location.coords);
    } catch {
      // location unavailable
    }
  };

  const filteredOrders = useMemo(() => {
    return (orders || []).map((o) => {
      // Prefer the order's own delivery coords (snapshotted at creation); fall back to legacy clientLatitude/Longitude
      const rawLat = o.deliveryLatitude ?? o.clientLatitude;
      const rawLng = o.deliveryLongitude ?? o.clientLongitude;
      let lat = parseFloat(rawLat);
      let lng = parseFloat(rawLng);

      if (isNaN(lat) || isNaN(lng)) return null;

      // Add tiny jitter to avoid perfect overlaps when two orders share the same address
      const jitterLat = lat + (Math.random() - 0.5) * 0.0001;
      const jitterLng = lng + (Math.random() - 0.5) * 0.0001;

      return {
        ...o,
        resolvedLat: jitterLat,
        resolvedLng: jitterLng,
        resolvedAddress: o.deliveryAddress ?? o.clientAddress ?? '',
      };
    }).filter(o => o !== null && SELECTED_STATUSES.includes(o.status));
  }, [orders]);

  const markers = useMemo(() => {
    return (filteredOrders || []).map((order) => (
      <Marker
        key={order.id}
        coordinate={{
          latitude: order.resolvedLat,
          longitude: order.resolvedLng,
        }}
        pinColor={STATUS_COLORS[order.status] || AdminColors.primary}
        onPress={() => {
          setSelectedOrder(order);
          setShowAllRoutes(false);
        }}
      />
    ));
  }, [filteredOrders, selectedOrder]);

  useEffect(() => {
    if (filteredOrders.length > 0 && mapRef.current && !showList) {
      const coordinates = filteredOrders.map(o => ({
        latitude: o.resolvedLat,
        longitude: o.resolvedLng,
      }));
      
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 150, right: 50, bottom: 150, left: 50 },
        animated: true,
      });
    }
  }, [filteredOrders, showList]);

  // Update route when selected order changes
  useEffect(() => {
    if (selectedOrder && userLocation) {
      calculateRoute([
        { latitude: userLocation.latitude, longitude: userLocation.longitude },
        { latitude: selectedOrder.resolvedLat, longitude: selectedOrder.resolvedLng }
      ]);
    } else {
      clearRoute();
    }
  }, [selectedOrder, userLocation]);

  const centerOnUserLocation = async () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 500);
    } else {
      getUserLocation();
    }
  };

  const openInExternalMap = (order: any) => {
    const lat = order.resolvedLat;
    const lng = order.resolvedLng;
    const label = encodeURIComponent(order.clientName || order.clientNom);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`
    });
    if (url) Linking.openURL(url);
  };

  const handleCall = (phone: string) => {
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  const renderOrderList = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.listCard}
      onPress={() => {
        setSelectedOrder(item);
        setShowList(false);
      }}
    >
      <View style={[styles.listCardAccent, { backgroundColor: STATUS_COLORS[item.status] || AdminColors.primary }]} />
      <View style={[styles.listCardContent, isArabic && { flexDirection: 'row-reverse' }]}>
        <View style={[{ flex: 1 }, isArabic && { alignItems: 'flex-end' }]}>
          <Text style={styles.listCardName}>{item.clientName || item.clientNom || t('common.unknown')}</Text>
          <Text style={styles.listCardStatus}>{t(`status.${item.status}`, { defaultValue: item.status })} • {item.numeroCommande}</Text>
        </View>
        <Ionicons name={isArabic ? "chevron-back" : "chevron-forward"} size={20} color={AdminColors.textMuted} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: 33.5731,
          longitude: -7.5898,
          latitudeDelta: 0.5,
          longitudeDelta: 0.5,
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}
      >
        {markers}

        {showAllRoutes && userLocation && filteredOrders.map((order) => (
          <Polyline
            key={`route-${order.id}`}
            coordinates={[
              { latitude: userLocation.latitude, longitude: userLocation.longitude },
              { latitude: order.resolvedLat, longitude: order.resolvedLng }
            ]}
            strokeWidth={2}
            strokeColor="rgba(0, 122, 255, 0.4)"
            lineDashPattern={[5, 5]}
          />
        ))}

        {route && !showAllRoutes && (
          <Polyline
            coordinates={route.polyline}
            strokeWidth={5}
            strokeColor="#007AFF"
            lineCap="round"
            lineJoin="round"
          />
        )}
      </MapView>

      {/* HEADER OVERLAY */}
      <SafeAreaView style={styles.headerOverlay}>
        <View style={[styles.headerContent, isArabic && { flexDirection: 'row-reverse' }]}>
          <TouchableOpacity 
            style={styles.circleBtn}
            onPress={() => router.back()}
          >
            <Ionicons name={isArabic ? "arrow-forward" : "arrow-back"} size={24} color={AdminColors.textPrimary} />
          </TouchableOpacity>
          
          <View style={[styles.titleBubble, isArabic && { flexDirection: 'row-reverse' }]}>
            <View style={styles.liveDot} />
            <Text style={styles.titleText}>{filteredOrders.length} {t('tabs.orders')}</Text>
          </View>

          <TouchableOpacity 
            style={[styles.circleBtn, showList && { backgroundColor: AdminColors.primary }]}
            onPress={() => setShowList(!showList)}
          >
            <Ionicons name={showList ? "map-outline" : "list-outline"} size={24} color={showList ? "white" : AdminColors.textPrimary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* FABs */}
      <View style={[styles.fabContainer, isArabic && { right: 'auto', left: 16 }]}>
        <TouchableOpacity 
          style={[styles.fabBtn, showAllRoutes && { backgroundColor: AdminColors.primary }]}
          onPress={() => setShowAllRoutes(!showAllRoutes)}
        >
          <Ionicons name="git-network-outline" size={24} color={showAllRoutes ? "white" : AdminColors.primary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.fabBtn}
          onPress={centerOnUserLocation}
        >
          <Ionicons name="locate" size={24} color={AdminColors.primary} />
        </TouchableOpacity>
      </View>

      {/* LIST MODAL */}
      {showList && (
        <View style={styles.listModal}>
          <View style={styles.modalHandle} />
          <Text style={[styles.modalTitle, isArabic && { textAlign: 'right' }]}>{t('admin.orders.title')}</Text>
          <FlatList
            data={filteredOrders}
            renderItem={renderOrderList}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        </View>
      )}

      {/* SELECTED ORDER MINI CARD */}
      {selectedOrder && !showList && (
        <View style={[styles.miniCardFloating, isArabic && { flexDirection: 'row-reverse' }]}>
          <View style={[styles.miniCardIcon, { backgroundColor: (STATUS_COLORS[selectedOrder.status] || AdminColors.primary) + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[selectedOrder.status] || AdminColors.primary }]} />
          </View>

          <View style={[{ flex: 1, marginLeft: 12 }, isArabic && { marginLeft: 0, marginRight: 12, alignItems: 'flex-end' }]}>
            <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, isArabic && { flexDirection: 'row-reverse' }]}>
              <Text style={styles.miniCardName}>{selectedOrder.clientName || selectedOrder.clientNom || t('common.unknown')}</Text>
              {route && (
                <View style={[styles.routeBadge, isArabic && { flexDirection: 'row-reverse' }]}>
                  <Ionicons name="car-outline" size={12} color={AdminColors.primary} />
                  <Text style={styles.routeText}>{route.distanceKm}km • {route.durationMin}min</Text>
                </View>
              )}
              {routeLoading && <ActivityIndicator size="small" color={AdminColors.primary} />}
            </View>
            <Text style={[styles.miniCardAddress, isArabic && { textAlign: 'right' }]} numberOfLines={1}>
              {selectedOrder.resolvedAddress || t('admin.clients.no_address')}
            </Text>
            <Text style={[styles.miniCardPrice, { color: STATUS_COLORS[selectedOrder.status] || AdminColors.primary }]}>
              {(selectedOrder.montantTotal || 0).toFixed(2)} {t('common.dh')} • {t('financial.remaining')}: {(selectedOrder.resteAPayer || 0).toFixed(2)} {t('common.dh')}
            </Text>
          </View>

          <View style={[styles.cardActionsRow, isArabic && { flexDirection: 'row-reverse' }]}>
            <TouchableOpacity 
              style={[styles.navBtn, { backgroundColor: AdminColors.primary }]}
              onPress={() => openInExternalMap(selectedOrder)}
            >
              <Ionicons name="navigate" size={18} color="white" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.navBtn, { backgroundColor: '#059669' }]}
              onPress={() => handleCall(selectedOrder.clientPhone || selectedOrder.client?.phone)}
            >
              <Ionicons name="call" size={18} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.viewBtn, { backgroundColor: STATUS_COLORS[selectedOrder.status] }]}
              onPress={() => router.push(`/order/${selectedOrder.id}`)}
            >
              <Text style={styles.viewBtnText}>{t('common.details')} →</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => setSelectedOrder(null)} style={{ padding: 4, [isArabic ? 'marginRight' : 'marginLeft']: 4 }}>
            <Ionicons name="close" size={20} color={AdminColors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={AdminColors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    ...AdminShadows.shadowMedium,
  },
  titleBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    gap: 8,
    ...AdminShadows.shadowMedium,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#059669',
  },
  titleText: {
    fontSize: 14,
    fontWeight: '700',
    color: AdminColors.textPrimary,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 120,
    right: 16,
    gap: 12,
  },
  fabBtn: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    ...AdminShadows.shadowMedium,
  },
  markerBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
    ...AdminShadows.shadowSmall,
  },
  markerSelected: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
  },
  markerArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  miniCardFloating: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    ...AdminShadows.shadowLarge,
  },
  miniCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'white',
  },
  miniCardName: {
    fontSize: 16,
    fontWeight: '700',
    color: AdminColors.textPrimary,
  },
  miniCardAddress: {
    fontSize: 12,
    color: AdminColors.textMuted,
    marginTop: 2,
  },
  miniCardPrice: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 4,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 12,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  viewBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  routeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AdminColors.primary50,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  routeText: {
    fontSize: 10,
    fontWeight: '700',
    color: AdminColors.primary,
  },
  listModal: {
    position: 'absolute',
    top: height * 0.25,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    ...AdminShadows.shadowLarge,
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#E2E8F0',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: AdminColors.textPrimary,
    marginBottom: 20,
  },
  listCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  listCardAccent: {
    width: 6,
  },
  listCardContent: {
    flex: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  listCardName: {
    fontSize: 15,
    fontWeight: '700',
    color: AdminColors.textPrimary,
  },
  listCardStatus: {
    fontSize: 12,
    color: AdminColors.textMuted,
    marginTop: 4,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
