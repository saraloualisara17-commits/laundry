import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator, 
  RefreshControl,
  Modal,
  ScrollView,
  Platform,
  Dimensions,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { adminApi } from '../../src/services/adminApi';
import { AdminColors, AdminShadows } from '../../constants/AdminColors';
import { STATUS_COLORS } from '../../constants/StatusColors';
import { useDirections } from '../../src/hooks/useDirections';
import { useTranslation } from 'react-i18next';

export default function OrdersByStatusScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  const { status } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ordersData, setOrdersData] = useState<any>(null);
  const [showMap, setShowMap] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showAllRoutes, setShowAllRoutes] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const mapRef = useRef<MapView>(null);
  const { route, calculateRoute, clearRoute, loading: routeLoading } = useDirections();
  
  // Filters
  const [dateDebut, setDateDebut] = useState<Date | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [staffList, setStaffList] = useState<any[]>([]);
  
  // Modals
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Generate last 14 days
  const dateOptions = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    let label = d.toLocaleDateString(isArabic ? 'ar-EG' : 'fr-FR', { weekday: 'short' });
    let dayNum = d.getDate();
    if (i === 0) label = t('common.today');
    if (i === 1) label = t('common.yesterday');
    return { date: d, label, dayNum };
  });

  const sameDay = (d1: string | Date, d2: Date) => {
    const date1 = new Date(d1);
    return date1.getFullYear() === d2.getFullYear() &&
           date1.getMonth() === d2.getMonth() &&
           date1.getDate() === d2.getDate();
  };

  const getStatusConfig = (s: string) => {
    switch(s) {
      case 'PENDING_PICKUP': return { label: t('status.PENDING_PICKUP'), emoji: '⏳', color: STATUS_COLORS.PENDING_PICKUP, bg: STATUS_COLORS.PENDING_PICKUP };
      case 'PICKED_UP': return { label: t('status.PICKED_UP'), emoji: '📥', color: STATUS_COLORS.PICKED_UP, bg: STATUS_COLORS.PICKED_UP };
      case 'IN_PROCESS': return { label: t('status.IN_PROCESS'), emoji: '⚙️', color: STATUS_COLORS.IN_PROCESS, bg: STATUS_COLORS.IN_PROCESS };
      case 'READY_FOR_DELIVERY': return { label: t('status.READY_FOR_DELIVERY'), emoji: '✅', color: STATUS_COLORS.READY_FOR_DELIVERY, bg: STATUS_COLORS.READY_FOR_DELIVERY };
      case 'DELIVERED': return { label: t('status.DELIVERED'), emoji: '🚚', color: STATUS_COLORS.DELIVERED, bg: STATUS_COLORS.DELIVERED };
      default: return { label: s, emoji: '📦', color: AdminColors.primary, bg: AdminColors.primary };
    }
  };

  const statusConfig = getStatusConfig(status as string);

  const fetchFilters = async () => {
    try {
      const usersRes = await adminApi.getUsers();
      setStaffList(usersRes.data);
    } catch (e) {
      console.error('Failed to load staff list', e);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const params: any = {
        status: status,
        page: 0,
        limit: 100
      };
      
      if (dateDebut) {
        const d = new Date(dateDebut);
        d.setHours(0,0,0,0);
        params.dateDebut = d.toISOString().split('T')[0];
        params.dateFin = d.toISOString().split('T')[0];
      }
      if (selectedStaffId) params.livreurId = selectedStaffId;

      const res = await adminApi.getOrders(params);
      setOrdersData(res.data);
    } catch (error) {
      console.error('Error fetching orders by status:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFilters();
    fetchData();
    getUserLocation();
  }, [status, dateDebut, selectedStaffId]);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
    } catch (e) {
      console.warn('Get user location error:', e);
    }
  };

  // Update route when selected order changes
  useEffect(() => {
    if (selectedOrder && userLocation) {
      calculateRoute([
        { latitude: userLocation.latitude, longitude: userLocation.longitude },
        { latitude: parseFloat(selectedOrder.clientLatitude), longitude: parseFloat(selectedOrder.clientLongitude) }
      ]);
    } else {
      clearRoute();
    }
  }, [selectedOrder, userLocation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [status, dateDebut, selectedStaffId]);

  const clearFilters = () => {
    setDateDebut(null);
    setSelectedStaffId(null);
  };

  const centerOnUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setUserLocation(coords);
      
      mapRef.current?.animateToRegion({
        ...coords,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 500);
    } catch (e) {
      console.warn('Location error:', e);
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

  const ordersWithGps = useMemo(() => {
    return (ordersData?.content || []).map((o: any) => {
      let lat = parseFloat(o.clientLatitude);
      let lng = parseFloat(o.clientLongitude);

      // Fallback to client addresses if top-level is missing
      if ((isNaN(lat) || isNaN(lng)) && o.client?.addresses?.length > 0) {
        const addr = o.client.addresses[0];
        lat = parseFloat(addr.latitude);
        lng = parseFloat(addr.longitude);
      }

      if (isNaN(lat) || isNaN(lng)) return null;

      // Add tiny jitter to avoid perfect overlaps
      const jitterLat = lat + (Math.random() - 0.5) * 0.0001;
      const jitterLng = lng + (Math.random() - 0.5) * 0.0001;

      return {
        ...o,
        resolvedLat: jitterLat,
        resolvedLng: jitterLng
      };
    }).filter((o: any) => o !== null);
  }, [ordersData]);

  const renderOrderCard = ({ item }: { item: any }) => {
    const isReady = item.status === 'READY_FOR_DELIVERY';
    const statusCfg = require('../../constants/StatusColors').StatusColors[item.status] || { dot: statusConfig.bg };

    const hasDimensions = item.commandeTapis?.some((t: any) => t.modeTarification === 'PER_M2' && t.largeur && t.hauteur);
    const totalArea = hasDimensions ? item.commandeTapis.reduce((sum: number, t: any) => {
       if (t.modeTarification === 'PER_M2' && t.largeur && t.hauteur) {
           return sum + (parseFloat(t.largeur) * parseFloat(t.hauteur));
       }
       return sum;
    }, 0) : 0;

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => router.push(`/order/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={[isArabic ? styles.accentBarAr : styles.accentBar, { backgroundColor: statusCfg.dot }]} />

        <View style={[styles.orderTop, isArabic && { flexDirection: 'row-reverse' }]}>
          <Text style={styles.orderRef}>#{item.numeroCommande}</Text>
          {isReady ? (
            <View style={[styles.readyBadge, isArabic && { flexDirection: 'row-reverse' }]}>
              <View style={styles.readyDot} />
              <Text style={styles.readyText}>{t('admin.orders.ready')}</Text>
            </View>
          ) : (
            <StatusBadge status={item.status} />
          )}
        </View>

        <Text style={[styles.orderClientName, isArabic && { textAlign: 'right' }]}>{item.client?.name || item.clientNom}</Text>

        <View style={[styles.infoRow, isArabic && { flexDirection: 'row-reverse' }]}>
          <View style={[styles.infoItem, isArabic && { flexDirection: 'row-reverse' }]}>
            <Ionicons name="cube-outline" size={14} color={AdminColors.textSecondary} />
            <Text style={styles.infoText}>{item.commandeTapis?.length || 0} {t('dashboard.orders_count')}</Text>
          </View>
          <View style={[styles.infoItem, isArabic && { flexDirection: 'row-reverse' }]}>
            <Ionicons name="calendar-outline" size={14} color={AdminColors.textSecondary} />
            <Text style={styles.infoText}>{new Date(item.dateCreation).toLocaleDateString(isArabic ? 'ar-EG' : 'fr-FR')}</Text>
          </View>
          
          {totalArea > 0 && (
            <View style={[styles.areaChip, isArabic && { flexDirection: 'row-reverse' }]}>
              <Ionicons name="grid-outline" size={12} color="#0284C7" />
              <Text style={styles.areaText}>{totalArea.toFixed(2)} m²</Text>
            </View>
          )}
        </View>

        <View style={[styles.cardBottom, isArabic && { flexDirection: 'row-reverse' }]}>
          <View style={isArabic && { alignItems: 'flex-end' }}>
            <Text style={styles.amountText}>{item.montantTotal} {t('common.dh')}</Text>
            {(item.montantPaye > 0 || item.resteAPayer > 0) && (
              <View style={[styles.financialRow, isArabic && { flexDirection: 'row-reverse' }]}>
                <Text style={styles.payeText}>{t('financial.paid')}: {item.montantPaye || 0} {t('common.dh')}</Text>
                {item.resteAPayer > 0 && (
                  <Text style={styles.resteText}>{t('financial.remaining')}: {item.resteAPayer} {t('common.dh')}</Text>
                )}
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={[styles.header, isArabic && { flexDirection: 'row-reverse' }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name={isArabic ? "arrow-forward" : "arrow-back"} size={24} color={AdminColors.textPrimary} />
        </TouchableOpacity>
        <View style={[{ flex: 1, marginLeft: 8, flexDirection: 'row', alignItems: 'center' }, isArabic && { flexDirection: 'row-reverse', marginRight: 8, marginLeft: 0 }]}>
          <Text style={{ fontSize: 20, [isArabic ? 'marginLeft' : 'marginRight']: 6 }}>{statusConfig.emoji}</Text>
          <Text style={styles.headerTitle}>{statusConfig.label}</Text>
        </View>
        
        <TouchableOpacity 
          style={[
            styles.mapToggleBtn, 
            showMap ? { backgroundColor: AdminColors.primary } : { backgroundColor: 'rgba(0,0,0,0.06)' },
            isArabic && { marginRight: 0, marginLeft: 8 }
          ]}
          onPress={() => {
            setShowMap(!showMap);
            if (showMap) {
              setSelectedOrder(null);
              setShowAllRoutes(false);
            }
          }}
        >
          <Ionicons 
            name={showMap ? "list" : "map"} 
            size={18} 
            color={showMap ? "white" : AdminColors.textSecondary} 
          />
        </TouchableOpacity>

        {(dateDebut || selectedStaffId) && (
          <TouchableOpacity onPress={clearFilters} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>{t('admin.orders.reset_btn', { defaultValue: 'Effacer' })}</Text>
          </TouchableOpacity>
        )}
      </View>

      {showMap ? (
        <View style={{ flex: 1 }}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={{
              latitude: 33.9716,
              longitude: -6.8498,
              latitudeDelta: 1.5,
              longitudeDelta: 1.5,
            }}
            showsUserLocation={true}
            showsMyLocationButton={false}
          >
            {ordersWithGps.map((order: any) => (
              <Marker
                key={order.id}
                coordinate={{
                  latitude: order.resolvedLat,
                  longitude: order.resolvedLng,
                }}
                onPress={() => {
                  setSelectedOrder(order);
                  setShowAllRoutes(false);
                }}
              >
                <View style={{ alignItems: 'center' }}>
                  <View style={{
                    width: selectedOrder?.id === order.id ? 44 : 32,
                    height: selectedOrder?.id === order.id ? 44 : 32,
                    borderRadius: 22,
                    backgroundColor: STATUS_COLORS[order.status] || statusConfig.bg,
                    borderWidth: 3,
                    borderColor: 'white',
                    alignItems: 'center',
                    justifyContent: 'center',
                    ...AdminShadows.shadowSmall,
                  }} />
                  <View style={{
                    width: 0,
                    height: 0,
                    borderLeftWidth: 5,
                    borderRightWidth: 5,
                    borderTopWidth: 8,
                    borderLeftColor: 'transparent',
                    borderRightColor: 'transparent',
                    borderTopColor: STATUS_COLORS[order.status] || statusConfig.bg,
                    marginTop: -1,
                  }}/>
                </View>
              </Marker>
            ))}

            {showAllRoutes && userLocation && ordersWithGps.map((order: any) => (
              <Polyline
                key={`all-route-${order.id}`}
                coordinates={[
                  { latitude: userLocation.latitude, longitude: userLocation.longitude },
                  { latitude: order.resolvedLat, longitude: order.resolvedLng }
                ]}
                strokeWidth={2}
                strokeColor="rgba(0, 122, 255, 0.5)"
                lineDashPattern={[5, 5]}
              />
            ))}

            {route && !showAllRoutes && (
              <Polyline
                coordinates={route.polyline}
                strokeWidth={6}
                strokeColor="#007AFF"
                lineCap="round"
                lineJoin="round"
                zIndex={10}
              />
            )}
          </MapView>

          {/* Map overlay — pin count badge */}
          <View style={[styles.mapBadge, isArabic && { left: 'auto', right: 12, flexDirection: 'row-reverse' }]}>
            <View style={[styles.badgeDot, { backgroundColor: statusConfig.color }]} />
            <Text style={styles.badgeText}>
              {ordersWithGps.length} {t('admin.orders.on_map', { defaultValue: 'sur la carte' })}
            </Text>
          </View>

          {/* Floating Action Buttons */}
          <View style={[styles.floatingActionsMap, isArabic && { right: 'auto', left: 12 }]}>
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

          {/* SELECTED ORDER MINI CARD */}
          {selectedOrder && (
            <View style={[styles.miniCardFloating, isArabic && { flexDirection: 'row-reverse' }]}>
              <View style={[styles.miniCardIcon, { backgroundColor: (STATUS_COLORS[selectedOrder.status] || statusConfig.color) + '20' }]}>
                <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[selectedOrder.status] || statusConfig.color }]} />
              </View>

              <View style={[{ flex: 1, marginLeft: 12 }, isArabic && { marginLeft: 0, marginRight: 12, alignItems: 'flex-end' }]}>
                <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, isArabic && { flexDirection: 'row-reverse' }]}>
                  <Text style={styles.miniCardName}>{selectedOrder.client?.name || selectedOrder.clientName}</Text>
                  {route && (
                    <View style={[styles.routeBadge, isArabic && { flexDirection: 'row-reverse' }]}>
                      <Ionicons name="car-outline" size={12} color={AdminColors.primary} />
                      <Text style={styles.routeText}>{route.distanceKm}km • {route.durationMin}min</Text>
                    </View>
                  )}
                  {routeLoading && <ActivityIndicator size="small" color={AdminColors.primary} />}
                </View>
                <Text style={[styles.miniCardAddress, isArabic && { textAlign: 'right' }]} numberOfLines={1}>
                  {selectedOrder.clientAddress || t('admin.clients.no_address')}
                </Text>
                <Text style={[styles.miniCardPrice, { color: statusConfig.color }]}>
                  {selectedOrder.montantTotal?.toFixed(2)} {t('common.dh')}</Text>
              </View>

              <View style={[styles.cardActionsRow, isArabic && { flexDirection: 'row-reverse' }]}>
                <TouchableOpacity
                  style={[styles.navBtn, { backgroundColor: AdminColors.primary }]}
                  onPress={() => openInExternalMap(selectedOrder)}
                >
                  <Ionicons name="navigate" size={18} color="white" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.viewBtn, { backgroundColor: statusConfig.color }]}
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
        </View>
      ) : (
        <>
          {/* Summary Card */}
          <View style={[styles.summaryCard, { borderColor: statusConfig.bg }]}>
            <View style={[styles.summaryTop, isArabic && { flexDirection: 'row-reverse' }]}>
              <View style={styles.summaryCol}>
                <Text style={styles.summaryLabel}>{t('common.total', { defaultValue: 'TOTAL' })} {t('tabs.orders', { defaultValue: 'COMMANDES' }).toUpperCase()}</Text>
                <Text style={[styles.summaryValue, { color: statusConfig.color }]}>
                  {ordersData?.totalElements || 0}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryCol}>
                <Text style={styles.summaryLabel}>{t('common.total', { defaultValue: 'TOTAL' })} {t('financial.amount', { defaultValue: 'MONTANT' }).toUpperCase()}</Text>
                <Text style={[styles.summaryValue, { color: statusConfig.color }]}>
                  {ordersData?.totalValue?.toLocaleString() || 0} {t('common.dh')}
                </Text>
              </View>
            </View>
          </View>

          {/* Filters */}
          <View style={[styles.filtersContainer, isArabic && { flexDirection: 'row-reverse' }]}>
            <TouchableOpacity 
              style={[styles.filterBtn, isArabic && { flexDirection: 'row-reverse' }]}
              onPress={() => setShowStaffModal(true)}
            >
              <Ionicons name="person" size={16} color={selectedStaffId ? AdminColors.primary : AdminColors.textMuted} />
              <Text style={[styles.filterBtnText, selectedStaffId && styles.filterBtnTextActive]} numberOfLines={1}>
                {selectedStaffId ? staffList.find(s => s.id === selectedStaffId)?.name || t('common.staff') : t('common.staff')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.filterBtn, isArabic && { flexDirection: 'row-reverse' }]} 
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={16} color={dateDebut ? AdminColors.primary : AdminColors.textMuted} />
              <Text style={[styles.filterBtnText, dateDebut && styles.filterBtnTextActive]}>
                {dateDebut ? dateDebut.toLocaleDateString(isArabic ? 'ar-EG' : 'fr-FR') : t('common.all_dates')}
              </Text>
              {dateDebut && (
                 <TouchableOpacity onPress={(e) => { e.stopPropagation(); setDateDebut(null); }}>
                   <Ionicons name="close-circle" size={16} color={AdminColors.textMuted} />
                 </TouchableOpacity>
              )}
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={dateDebut || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) setDateDebut(selectedDate);
              }}
            />
          )}

          {/* List */}
          {loading && !refreshing ? (
            <ActivityIndicator size="large" color={statusConfig.color} style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={ordersData?.content || []}
              keyExtractor={(item) => item.id?.toString()}
              renderItem={renderOrderCard}
              contentContainerStyle={styles.listContainer}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={statusConfig.color} />}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', marginTop: 60, paddingHorizontal: 40 }}>
                  <Text style={{ fontSize: 48, marginBottom: 16 }}>📄</Text>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: AdminColors.textPrimary, textAlign: 'center' }}>
                    {t('admin.orders.empty_title')}
                  </Text>
                  <Text style={{ fontSize: 14, color: AdminColors.textSecondary, textAlign: 'center', marginTop: 8 }}>
                    {t('common.no_data')}
                  </Text>
                </View>
              }
            />
          )}
        </>
      )}

      {/* Staff Modal */}
      <Modal
        visible={showStaffModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowStaffModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismiss} onPress={() => setShowStaffModal(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('admin.orders.filter_driver')}</Text>
            
            <ScrollView style={{ maxHeight: 300, width: '100%' }}>
              <TouchableOpacity 
                style={[styles.staffOption, !selectedStaffId && styles.staffOptionActive, isArabic && { flexDirection: 'row-reverse' }]}
                onPress={() => { setSelectedStaffId(null); setShowStaffModal(false); }}
              >
                <Text style={[styles.staffOptionText, !selectedStaffId && styles.staffOptionTextActive]}>{t('admin.orders.all_drivers')}</Text>
                {!selectedStaffId && <Ionicons name="checkmark" size={20} color={AdminColors.primary} />}
              </TouchableOpacity>
              
              {staffList.map(staff => (
                <TouchableOpacity 
                  key={staff.id} 
                  style={[styles.staffOption, selectedStaffId === staff.id && styles.staffOptionActive, isArabic && { flexDirection: 'row-reverse' }]}
                  onPress={() => { setSelectedStaffId(staff.id); setShowStaffModal(false); }}
                >
                  <Text style={[styles.staffOptionText, selectedStaffId === staff.id && styles.staffOptionTextActive]}>{staff.name}</Text>
                  {selectedStaffId === staff.id && <Ionicons name="checkmark" size={20} color={AdminColors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity 
              style={styles.cancelBtn} 
              onPress={() => setShowStaffModal(false)}
            >
              <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    ...AdminShadows.shadowSmall,
    zIndex: 10,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AdminColors.textPrimary,
  },
  mapToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: AdminColors.primary50,
    borderRadius: 8,
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: AdminColors.primary,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    margin: 16,
    padding: 16,
    borderTopWidth: 4,
    ...AdminShadows.shadowSmall,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: AdminColors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  filtersContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  filterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'white',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: AdminColors.border,
    ...AdminShadows.shadowSmall,
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: AdminColors.textSecondary,
  },
  filterBtnTextActive: {
    color: AdminColors.primary,
    fontWeight: '700',
  },
  listContainer: {
    paddingBottom: 24,
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
    ...AdminShadows.shadowSmall,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  accentBarAr: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  orderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderRef: {
    fontSize: 13,
    fontWeight: '700',
    color: AdminColors.textMuted,
  },
  orderAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: AdminColors.primary,
  },
  orderClientName: {
    fontSize: 16,
    fontWeight: '700',
    color: AdminColors.textPrimary,
    marginBottom: 10,
  },
  orderDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: AdminColors.border,
  },
  orderDate: {
    fontSize: 12,
    color: AdminColors.textMuted,
  },
  orderDriver: {
    fontSize: 12,
    color: AdminColors.textSecondary,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalDismiss: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
    maxHeight: '80%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AdminColors.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  staffOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.border,
    paddingHorizontal: 8,
  },
  staffOptionActive: {
    backgroundColor: AdminColors.primary50,
    borderRadius: 12,
    borderBottomWidth: 0,
  },
  staffOptionText: {
    fontSize: 15,
    color: AdminColors.textPrimary,
  },
  staffOptionTextActive: {
    color: AdminColors.primary,
    fontWeight: '700',
  },
  cancelBtn: {
    marginTop: 20,
    width: '100%',
    paddingVertical: 14,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: AdminColors.textSecondary,
  },
  mapBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...AdminShadows.shadowSmall,
  },
  badgeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D1B2A',
  },
  miniCardName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0D1B2A',
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
  miniCardAddress: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  miniCardPrice: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewBtn: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  viewBtnText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
  },
  floatingActionsMap: {
    position: 'absolute',
    bottom: 120,
    right: 12,
    gap: 12,
    zIndex: 20,
  },
  fabBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    ...AdminShadows.shadowSmall,
  },
  miniCardFloating: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
    ...AdminShadows.shadowLarge,
  },
  miniCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  orderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderRef: {
    fontSize: 12,
    fontWeight: '700',
    color: AdminColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  orderClientName: {
    fontSize: 17,
    fontWeight: '700',
    color: AdminColors.textPrimary,
    marginTop: 6,
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  readyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  readyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    color: AdminColors.textSecondary,
    fontWeight: '500',
  },
  areaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  areaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  amountText: {
    fontSize: 18,
    fontWeight: '800',
    color: AdminColors.primary,
  },
  financialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  payeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  resteText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  dateCard: {
    width: 60,
    height: 70,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...AdminShadows.shadowSmall,
  },
  dateCardInactive: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  dateCardActive: {
    backgroundColor: AdminColors.primary,
  },
  dateDayLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: AdminColors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  dateDayNum: {
    fontSize: 18,
    fontWeight: '800',
    color: AdminColors.primary,
  },
  dateTextActive: {
    color: 'white',
  },
});
