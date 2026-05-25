import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { row, textAlign } from '../../src/utils/rtl';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { AdminColors, AdminShadows } from '../../constants/AdminColors';
import { STATUS_COLORS } from '../../constants/StatusColors';
import { useDirections } from '../../src/hooks/useDirections';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../../src/store/store';
import { formatOrderItemsSummary } from '../../src/utils/orderSummary';
import { useFormStyles } from '../../src/hooks/useFormStyles';
import { useDriversList } from '../../src/hooks/query/useDrivers';
import { useOrders } from '../../src/hooks/query/useOrders';

export default function OrdersByStatusScreen() {
  const { t, i18n } = useTranslation();
  const f = useFormStyles();
  const isArabic = f.isArabic;
  const { user } = useSelector((state: RootState) => state.auth);
  const isEmploye = user?.role?.toUpperCase() === 'EMPLOYE';

  const { status, mode, specialFilter } = useLocalSearchParams();
  const [showMap, setShowMap] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showAllRoutes, setShowAllRoutes] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [dateDebut, setDateDebut] = useState<Date | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);

  const mapRef = useRef<MapView>(null);
  const { route, calculateRoute, clearRoute, loading: routeLoading } = useDirections();

  // Status configuration lookup
  const statusConfig = useMemo(() => {
    if (mode === 'IMMEDIATE') {
      return {
        label: t('dashboard.at_local'),
        emoji: '🏠',
        color: '#7C3AED',
        bg: '#F5F3FF'
      };
    }
    if (specialFilter === 'PAID_DEBTS') {
      return {
        label: t('dashboard.paid_debts'),
        emoji: '💰',
        color: '#10B981',
        bg: '#ECFDF5'
      };
    }

    const s = status as string;
    const colors = require('../../constants/StatusColors').StatusColors[s] || { dot: '#94A3B8', bg: 'rgba(148, 163, 184, 0.1)' };
    
    const emojiMap: Record<string, string> = {
      PENDING_PICKUP: '⏳',
      PICKED_UP: '📥',
      IN_PROCESS: '🧼',
      READY_FOR_DELIVERY: '✅',
      DELIVERED: '🚚',
      CANCELLED: '🗑️',
      PICKUP_FAILED: '❌',
      DELIVERY_FAILED: '🚫'
    };

    return {
      label: t(`status.${s}`),
      emoji: emojiMap[s] || '📋',
      color: colors.dot,
      bg: colors.bg
    };
  }, [status, mode, specialFilter, i18n.language]);

  const orderFilters = useMemo(() => {
    const base: any = {
      page: 0,
      size: 50,
      dateDebut: dateDebut ? dateDebut.toISOString().split('T')[0] : undefined,
      livreurId: selectedStaffId || undefined,
    };
    if (specialFilter === 'PAID_DEBTS') return { ...base, paidDebts: true };
    return {
      ...base,
      status: status as string,
      mode: mode as string,
      activeOnly: mode === 'IMMEDIATE' ? true : undefined,
    };
  }, [status, mode, specialFilter, dateDebut, selectedStaffId]);

  const { data: ordersData, isLoading: loading, isFetching, refetch } = useOrders(orderFilters);
  const refreshing = isFetching && !loading;
  const { data: allUsers = [] } = useDriversList();

  const ordersWithGps = useMemo(() => {
    return (ordersData?.content || []).filter((o: any) => o.clientLatitude && o.clientLongitude);
  }, [ordersData]);

  const markers = useMemo(() => {
    return ordersWithGps.map((order: any) => {
      const lat = parseFloat(order.clientLatitude);
      const lng = parseFloat(order.clientLongitude);

      if (isNaN(lat) || isNaN(lng)) return null;

      return (
        <Marker
          key={order.id}
          coordinate={{ latitude: lat, longitude: lng }}
          pinColor={STATUS_COLORS[order.status] || statusConfig.color}
          onPress={() => setSelectedOrder(order)}
        />
      );
    }).filter(Boolean);
  }, [ordersWithGps, selectedOrder?.id, statusConfig]);

  const staffList = useMemo(
    () => (allUsers as any[]).filter((u: any) => {
      const r = u.role?.toLowerCase();
      return r === 'livreur' || r === 'employe';
    }),
    [allUsers]
  );

  const onRefresh = () => { refetch(); };

  const clearFilters = () => {
    setDateDebut(null);
    setSelectedStaffId(null);
  };

  const centerOnUserLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const location = await Location.getCurrentPositionAsync({});
    setUserLocation(location.coords);
    mapRef.current?.animateToRegion({
      ...location.coords,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    });
  };

  const openInExternalMap = (order: any) => {
    const lat = parseFloat(order.clientLatitude);
    const lng = parseFloat(order.clientLongitude);
    const label = order.client?.name || order.clientName;
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`
    });
    if (url) Linking.openURL(url);
  };

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

  const renderOrderCard = ({ item }: { item: any }) => {
    const isReady = item.status === 'READY_FOR_DELIVERY';
    const statusCfg = require('../../constants/StatusColors').StatusColors[item.status] || { dot: statusConfig.color };

    const itemsSummary = formatOrderItemsSummary(item.commandeTapis, t);

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => router.push(`/order/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={[isArabic ? styles.accentBarAr : styles.accentBar, { backgroundColor: statusCfg.dot }]} />

        <View style={[styles.orderTop, row(isArabic)]}>
          <Text style={styles.orderRef}>#{item.numeroCommande}</Text>
          {isReady ? (
            <View style={[styles.readyBadge, row(isArabic)]}>
              <View style={styles.readyDot} />
              <Text style={styles.readyText}>{t('admin.orders.ready')}</Text>
            </View>
          ) : (
            <StatusBadge status={item.status} />
          )}
        </View>

        <Text style={[styles.orderClientName, isArabic && { textAlign: 'right' }]}>{item.client?.name || item.clientNom}</Text>

        <View style={[styles.infoRow, row(isArabic)]}>
          <View style={[styles.infoItem, row(isArabic)]}>
            <Ionicons name="cube-outline" size={14} color={AdminColors.textSecondary} />
            <Text style={styles.infoText}>{itemsSummary}</Text>
          </View>
          <View style={[styles.infoItem, row(isArabic)]}>
            <Ionicons name="calendar-outline" size={14} color={AdminColors.textSecondary} />
            <Text style={styles.infoText}>{new Date(item.dateCreation).toLocaleDateString(isArabic ? 'fr-FR' : 'fr-FR')}</Text>
          </View>
        </View>

        <View style={[styles.cardBottom, row(isArabic)]}>
          <View style={isArabic && { alignItems: 'flex-end' }}>
            <Text style={styles.amountText}>{item.montantTotal} {t('common.dh')}</Text>
            {(item.montantPaye > 0 || item.resteAPayer > 0) && (
              <View style={[styles.financialRow, row(isArabic)]}>
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
      {!showMap && (
        <View style={[styles.header, row(isArabic)]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name={isArabic ? "arrow-forward" : "arrow-back"} size={24} color={AdminColors.textPrimary} />
          </TouchableOpacity>
          <View style={[{ flex: 1, marginLeft: 8, flexDirection: 'row', alignItems: 'center' }, isArabic && { flexDirection: 'row-reverse', marginRight: 8, marginLeft: 0 }]}>
            <Text style={{ fontSize: 20, [isArabic ? 'marginLeft' : 'marginRight']: 6 }}>{statusConfig.emoji}</Text>
            <Text style={styles.headerTitle}>{statusConfig.label}</Text>
          </View>
          
          {!isEmploye && (
            <TouchableOpacity
              style={[
                styles.mapToggleBtn,
                { backgroundColor: 'rgba(0,0,0,0.06)' },
                isArabic && { marginRight: 0, marginLeft: 8 }
              ]}
              onPress={() => setShowMap(true)}
            >
              <Ionicons
                name="map"
                size={18}
                color={AdminColors.textSecondary}
              />
            </TouchableOpacity>
          )}

          {(dateDebut || selectedStaffId) && (
            <TouchableOpacity onPress={clearFilters} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>{t('admin.orders.reset_btn')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {showMap ? (
        <View style={{ flex: 1 }}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            provider={PROVIDER_GOOGLE}
            initialRegion={{
              latitude: 33.9716,
              longitude: -6.8498,
              latitudeDelta: 1.5,
              longitudeDelta: 1.5,
            }}
            showsUserLocation={true}
            showsMyLocationButton={false}
          >
            {markers}

            {showAllRoutes && userLocation && ordersWithGps.map((order: any) => (
              <Polyline
                key={`all-route-${order.id}`}
                coordinates={[
                  { latitude: userLocation.latitude, longitude: userLocation.longitude },
                  { latitude: order.clientLatitude ? parseFloat(order.clientLatitude) : 0, longitude: order.clientLongitude ? parseFloat(order.clientLongitude) : 0 }
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

          {/* Floating Back Button */}
          <TouchableOpacity 
            style={[styles.floatingBackBtn, isArabic && { left: 'auto', right: 20 }]} 
            onPress={() => {
              setShowMap(false);
              setSelectedOrder(null);
              setShowAllRoutes(false);
            }}
          >
            <Ionicons name={isArabic ? "arrow-forward" : "arrow-back"} size={22} color={AdminColors.textPrimary} />
          </TouchableOpacity>

          {/* Map overlay — pin count badge */}
          <View style={[styles.mapBadge, isArabic && { left: 'auto', right: 80, flexDirection: 'row-reverse' }]}>
            <View style={[styles.badgeDot, { backgroundColor: statusConfig.color }]} />
            <Text style={styles.badgeText}>
              {ordersWithGps.length} {t('admin.orders.on_map')}
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
            <View style={[styles.miniCardFloating, row(isArabic)]}>
              <View style={[styles.miniCardIcon, { backgroundColor: (STATUS_COLORS[selectedOrder.status] || statusConfig.color) + '20' }]}>
                <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[selectedOrder.status] || statusConfig.color }]} />
              </View>

              <View style={[{ flex: 1, marginLeft: 12 }, isArabic && { marginLeft: 0, marginRight: 12, alignItems: 'flex-end' }]}>
                <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, row(isArabic)]}>
                  <Text style={styles.miniCardName}>{selectedOrder.client?.name || selectedOrder.clientName}</Text>
                  {route && (
                    <View style={[styles.routeBadge, row(isArabic)]}>
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

              <View style={[styles.cardActionsRow, row(isArabic)]}>
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
            <View style={[styles.summaryTop, row(isArabic)]}>
              <View style={styles.summaryCol}>
                <Text style={[styles.summaryLabel, f.statLabel]}>{t('common.total')} {t('tabs.orders')}</Text>
                <Text style={[styles.summaryValue, { color: statusConfig.color }]}>
                  {ordersData?.totalElements || 0}
                </Text>
              </View>
              {!isEmploye && (
                <>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryCol}>
                    <View style={styles.summaryAmountRow}>
                      <View style={styles.summaryAmountItem}>
                        <Text style={[styles.summaryLabel, f.statLabel]}>{t('stats.total_paid')}</Text>
                        <Text style={[styles.summaryAmountValue, { color: '#10B981' }]}>
                          {ordersData?.totalValue?.toLocaleString() || 0} {t('common.dh')}
                        </Text>
                      </View>
                      <View style={styles.summaryAmountDivider} />
                      <View style={styles.summaryAmountItem}>
                        <Text style={[styles.summaryLabel, f.statLabel]}>{t('stats.total_unpaid')}</Text>
                        <Text style={[styles.summaryAmountValue, { color: '#EF4444' }]}>
                          {ordersData?.totalUnpaid?.toLocaleString() || 0} {t('common.dh')}
                        </Text>
                      </View>
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Filters */}
          <View style={[styles.filtersContainer, row(isArabic)]}>
            <TouchableOpacity
              style={[styles.filterBtn, selectedStaffId && styles.filterBtnActive, row(isArabic)]}
              onPress={() => setShowStaffModal(true)}
            >
              <Ionicons name="person" size={16} color={selectedStaffId ? AdminColors.primary : AdminColors.textMuted} />
              <Text style={[styles.filterBtnText, selectedStaffId && styles.filterBtnTextActive]} numberOfLines={1}>
                {selectedStaffId ? staffList.find(s => s.id === selectedStaffId)?.name || t('common.staff') : t('common.staff')}
              </Text>
              {selectedStaffId && (
                <TouchableOpacity onPress={(e) => { e.stopPropagation(); setSelectedStaffId(null); }} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={16} color={AdminColors.primary} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterBtn, dateDebut && styles.filterBtnActive, row(isArabic)]}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={16} color={dateDebut ? AdminColors.primary : AdminColors.textMuted} />
              <Text style={[styles.filterBtnText, dateDebut && styles.filterBtnTextActive]} numberOfLines={1}>
                {dateDebut ? dateDebut.toLocaleDateString(isArabic ? 'fr-FR' : 'fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : t('common.all_dates')}
              </Text>
              {dateDebut && (
                <TouchableOpacity onPress={(e) => { e.stopPropagation(); setDateDebut(null); }} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={16} color={AdminColors.primary} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </View>

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

      {/* Date Picker Modal */}
      <Modal visible={showDatePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismiss} onPress={() => setShowDatePicker(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={{ ...row(isArabic), justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={[styles.modalTitle, { marginBottom: 0 }]}>{t('admin.orders.filter_date')}</Text>
              <TouchableOpacity onPress={() => { setDateDebut(null); setShowDatePicker(false); }}>
                <Text style={{ color: AdminColors.primary, fontWeight: '700' }}>{t('admin.orders.reset_btn')}</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={dateDebut || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              themeVariant="light"
              onChange={(event, selectedDate) => {
                if (Platform.OS === 'android') {
                  setShowDatePicker(false);
                  if (event.type === 'set' && selectedDate) setDateDebut(selectedDate);
                } else {
                  if (selectedDate) setDateDebut(selectedDate);
                }
              }}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={{ marginTop: 20, backgroundColor: AdminColors.primary, borderRadius: 14, height: 48, alignItems: 'center', justifyContent: 'center' }}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>{t('common.confirm')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

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
                style={[styles.staffOption, !selectedStaffId && styles.staffOptionActive, row(isArabic)]}
                onPress={() => { setSelectedStaffId(null); setShowStaffModal(false); }}
              >
                <Text style={[styles.staffOptionText, !selectedStaffId && styles.staffOptionTextActive]}>{t('admin.orders.all_drivers')}</Text>
                {!selectedStaffId && <Ionicons name="checkmark" size={20} color={AdminColors.primary} />}
              </TouchableOpacity>
              
              {staffList.map(staff => (
                <TouchableOpacity 
                  key={staff.id} 
                  style={[styles.staffOption, selectedStaffId === staff.id && styles.staffOptionActive, row(isArabic)]}
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
  safeArea: { flex: 1, backgroundColor: '#F3F4F6' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: 'white', ...AdminShadows.shadowSmall, zIndex: 10,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: AdminColors.textPrimary },
  mapToggleBtn: {
    width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginLeft: 8,
  },
  clearBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: AdminColors.primary50, borderRadius: 8, marginLeft: 6 },
  clearBtnText: { fontSize: 12, fontWeight: '700', color: AdminColors.primary },

  // Summary
  summaryCard: {
    backgroundColor: 'white', borderRadius: 18, margin: 16, padding: 20,
    borderTopWidth: 4, ...AdminShadows.shadowSmall,
  },
  summaryTop: { flexDirection: 'row', alignItems: 'center' },
  summaryCol: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 11, fontWeight: '700', color: AdminColors.textSecondary, marginBottom: 6 },
  summaryValue: { fontSize: 26, fontWeight: '900' },
  summaryDivider: { width: 1, height: 44, backgroundColor: '#F1F5F9' },
  summaryAmountRow: { flexDirection: 'column', alignItems: 'center', gap: 6, width: '100%' },
  summaryAmountItem: { alignItems: 'center', width: '100%' },
  summaryAmountValue: { fontSize: 16, fontWeight: '800' },
  summaryAmountDivider: { height: 1, width: '60%', backgroundColor: '#F1F5F9' },

  // Filters
  filtersContainer: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, gap: 10 },
  filterBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'white', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12,
    borderWidth: 1, borderColor: AdminColors.border, ...AdminShadows.shadowSmall,
  },
  filterBtnActive: {
    borderColor: AdminColors.primary,
    borderWidth: 1.5,
    backgroundColor: AdminColors.primary100,
  },
  filterBtnText: { flex: 1, fontSize: 13, fontWeight: '500', color: AdminColors.textSecondary },
  filterBtnTextActive: { color: AdminColors.primary, fontWeight: '700' },

  // List
  listContainer: { paddingBottom: 24, paddingTop: 4 },

  // Order card — simple 3-row layout
  orderCard: {
    backgroundColor: 'white', borderRadius: 16, marginHorizontal: 16, marginBottom: 10,
    paddingVertical: 16, paddingHorizontal: 18, paddingLeft: 22,
    overflow: 'hidden', ...AdminShadows.shadowSmall,
  },
  accentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  accentBarAr: { position: 'absolute', right: 0, left: undefined, top: 0, bottom: 0, width: 5 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  orderRef: { fontSize: 12, fontWeight: '700', color: AdminColors.textMuted, letterSpacing: 0.5 },
  cardAmount: { fontSize: 16, fontWeight: '800' },
  cardClient: { fontSize: 17, fontWeight: '700', color: AdminColors.textPrimary, marginBottom: 8 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardMetaText: { fontSize: 13, color: AdminColors.textSecondary, fontWeight: '500' },
  orderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderClientName: {
    fontSize: 16,
    fontWeight: '700',
    color: AdminColors.textPrimary,
    marginBottom: 10,
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
  // Modal
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
  statusDot: { width: 14, height: 14, borderRadius: 7 },
  floatingBackBtn: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    ...AdminShadows.shadowMedium,
  },
});
