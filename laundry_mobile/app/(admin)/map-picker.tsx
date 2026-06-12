import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
  Platform,
  Image,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { AdminColors, AdminShadows } from '../../constants/AdminColors';
import { useOrderCreation } from '../../src/context/OrderCreationContext';
import { pendingMapResult } from '../../src/utils/pendingMapResult';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { logger } from '../../src/lib/logger';

const log = logger.ns('map-picker');

const GOOGLE_API_KEY = 'AIzaSyDBkvT5ZWrBXZVLEYwxD5igvySCKTES_3w';

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export default function MapPickerScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const { setPendingLocation } = useOrderCreation();
  const mapRef = useRef<MapView>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [searching, setSearching] = useState(false);
  const [markerCoords, setMarkerCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState('');
  const [resolvedRegion, setResolvedRegion] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPredictions = async (input: string) => {
    if (input.length < 2) {
      setPredictions([]);
      return;
    }
    setSearching(true);
    try {
      const url =
        `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
        `?input=${encodeURIComponent(input)}` +
        `&key=${GOOGLE_API_KEY}` +
        `&language=${isArabic ? 'ar' : 'fr'}` +
        `&components=country:ma`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
        setPredictions(data.predictions || []);
      } else {
        log.warn('Places autocomplete error', { status: data.status });
        setPredictions([]);
      }
    } catch (e) {
      log.warn('Places autocomplete failed', { err: String(e) });
      setPredictions([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(text), 300);
  };

  const selectPrediction = async (prediction: PlacePrediction) => {
    setPredictions([]);
    setSearchQuery(prediction.structured_formatting.main_text);
    setSearching(true);
    try {
      const url =
        `https://maps.googleapis.com/maps/api/place/details/json` +
        `?place_id=${prediction.place_id}` +
        `&key=${GOOGLE_API_KEY}` +
        `&fields=geometry,formatted_address,address_components` +
        `&language=${isArabic ? 'ar' : 'fr'}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'OK') {
        const loc = data.result.geometry.location;
        const lat = loc.lat;
        const lng = loc.lng;
        setMarkerCoords({ latitude: lat, longitude: lng });
        mapRef.current?.animateToRegion(
          { latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 },
          400
        );
        const components: any[] = data.result.address_components || [];
        const getComponent = (type: string) =>
          components.find((c: any) => c.types.includes(type))?.long_name || '';
        const route = getComponent('route');
        const locality =
          getComponent('locality') ||
          getComponent('administrative_area_level_2') ||
          getComponent('sublocality');
        const region = getComponent('administrative_area_level_1');
        setResolvedAddress(
          data.result.formatted_address ||
            [route, locality].filter(Boolean).join(', ')
        );
        setResolvedRegion(region);
      }
    } catch (e) {
      log.warn('Place details failed', { err: String(e) });
    } finally {
      setSearching(false);
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const url =
        `https://maps.googleapis.com/maps/api/geocode/json` +
        `?latlng=${lat},${lng}` +
        `&key=${GOOGLE_API_KEY}` +
        `&language=${isArabic ? 'ar' : 'fr'}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        const components: any[] = result.address_components || [];
        const getComponent = (type: string) =>
          components.find((c: any) => c.types.includes(type))?.long_name || '';
        const region = getComponent('administrative_area_level_1');
        setResolvedAddress(result.formatted_address || '');
        setResolvedRegion(region);
        setSearchQuery(result.formatted_address?.split(',')[0] || '');
      } else {
        setResolvedAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        setResolvedRegion('');
      }
    } catch (e) {
      log.warn('Reverse geocode failed', { err: String(e) });
      setResolvedAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  };

  const handleMyLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const loc = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = loc.coords;
    setMarkerCoords({ latitude, longitude });
    mapRef.current?.animateToRegion(
      { latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      400
    );
    reverseGeocode(latitude, longitude);
  };

  const handleConfirm = () => {
    if (!markerCoords) return;
    if (params.returnTo === 'order-address') {
      pendingMapResult.set({
        address: resolvedAddress,
        region: resolvedRegion,
        lat: markerCoords.latitude,
        lng: markerCoords.longitude,
      });
    } else {
      setPendingLocation({
        address: resolvedAddress,
        region: resolvedRegion,
        lat: markerCoords.latitude,
        lng: markerCoords.longitude,
      });
    }
    router.back();
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: 33.9716,
          longitude: -6.8498,
          latitudeDelta: 0.5,
          longitudeDelta: 0.5,
        }}
        onPress={(e) => {
          const { latitude, longitude } = e.nativeEvent.coordinate;
          setMarkerCoords({ latitude, longitude });
          setPredictions([]);
          reverseGeocode(latitude, longitude);
        }}
      >
        {markerCoords && (
          <Marker coordinate={markerCoords}>
            <View style={styles.markerContainer}>
              <View style={styles.markerOuter}>
                <View style={styles.markerInner} />
              </View>
            </View>
          </Marker>
        )}
      </MapView>

      {/* Overlay Header & Search */}
      <View style={[styles.overlayTop, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons
              name={isArabic ? 'arrow-forward' : 'arrow-back'}
              size={24}
              color={AdminColors.textPrimary}
            />
          </TouchableOpacity>
          <View style={styles.titleBadge}>
            <Text style={styles.titleText}>{t('admin.map_picker.title')}</Text>
          </View>
          {/* My location button */}
          <TouchableOpacity style={styles.backBtn} onPress={handleMyLocation}>
            <Ionicons name="locate" size={22} color={AdminColors.primary} />
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={AdminColors.primary} />
          <TextInput
            style={[styles.searchInput, isArabic && { textAlign: 'right' }]}
            placeholder={t('admin.map_picker.search_placeholder')}
            placeholderTextColor={AdminColors.textMuted}
            value={searchQuery}
            onChangeText={handleSearchChange}
            returnKeyType="search"
            onSubmitEditing={() => fetchPredictions(searchQuery)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setPredictions([]);
              }}
            >
              <Ionicons name="close-circle" size={18} color={AdminColors.textMuted} />
            </TouchableOpacity>
          )}
          {searching && (
            <ActivityIndicator size="small" color={AdminColors.primary} style={{ marginLeft: 8 }} />
          )}
        </View>

        {/* Predictions dropdown */}
        {predictions.length > 0 && (
          <View style={styles.resultsDropdown}>
            <FlatList
              data={predictions}
              keyExtractor={(item) => item.place_id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.resultItem}
                  onPress={() => selectPrediction(item)}
                >
                  <Ionicons name="pin" size={18} color={AdminColors.primary} />
                  <View style={styles.resultTextCol}>
                    <Text style={styles.resultName}>
                      {item.structured_formatting.main_text}
                    </Text>
                    <Text style={styles.resultFullAddr} numberOfLines={1}>
                      {item.structured_formatting.secondary_text}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              ListFooterComponent={
                <View style={styles.poweredByRow}>
                  <Text style={styles.poweredByText}>powered by </Text>
                  <Text style={[styles.poweredByText, { fontWeight: '700', color: '#4285F4' }]}>G</Text>
                  <Text style={[styles.poweredByText, { fontWeight: '700', color: '#EA4335' }]}>o</Text>
                  <Text style={[styles.poweredByText, { fontWeight: '700', color: '#FBBC05' }]}>o</Text>
                  <Text style={[styles.poweredByText, { fontWeight: '700', color: '#4285F4' }]}>g</Text>
                  <Text style={[styles.poweredByText, { fontWeight: '700', color: '#34A853' }]}>l</Text>
                  <Text style={[styles.poweredByText, { fontWeight: '700', color: '#EA4335' }]}>e</Text>
                </View>
              }
            />
          </View>
        )}
      </View>

      {/* Bottom Confirmation Card */}
      {markerCoords && (
        <View style={[styles.confirmCard, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.dragHandle} />
          <Text style={styles.cardLabel}>{t('admin.map_picker.selected_location')}</Text>
          <Text style={styles.resolvedAddr}>
            {resolvedAddress || t('admin.map_picker.unknown_address')}
          </Text>
          {resolvedRegion ? (
            <Text style={styles.resolvedRegion}>{resolvedRegion}</Text>
          ) : null}
          <Text style={styles.coordsText}>
            lat: {markerCoords.latitude.toFixed(4)}, lng: {markerCoords.longitude.toFixed(4)}
          </Text>
          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
            <Text style={styles.confirmBtnText}>{t('admin.map_picker.confirm_btn')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  overlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    ...AdminShadows.shadowSmall,
  },
  titleBadge: {
    backgroundColor: 'white',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    ...AdminShadows.shadowSmall,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '700',
    color: AdminColors.textPrimary,
  },
  searchBar: {
    margin: 8,
    marginHorizontal: 16,
    backgroundColor: 'white',
    borderRadius: 14,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    ...AdminShadows.shadowMedium,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: AdminColors.textPrimary,
    marginLeft: 10,
  },
  resultsDropdown: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 16,
    maxHeight: 280,
    overflow: 'hidden',
    ...AdminShadows.shadowMedium,
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  resultTextCol: {
    flex: 1,
    marginLeft: 12,
  },
  resultName: {
    fontSize: 14,
    fontWeight: '600',
    color: AdminColors.textPrimary,
  },
  resultFullAddr: {
    fontSize: 12,
    color: AdminColors.textMuted,
    marginTop: 2,
  },
  poweredByRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  poweredByText: {
    fontSize: 11,
    color: AdminColors.textMuted,
  },
  markerContainer: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerOuter: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(13,115,119,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: AdminColors.primary,
    borderWidth: 3,
    borderColor: 'white',
    ...AdminShadows.shadowSmall,
  },
  confirmCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 16,
    ...AdminShadows.shadowMedium,
    shadowOpacity: 0.15,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: AdminColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  resolvedAddr: {
    fontSize: 17,
    fontWeight: '700',
    color: AdminColors.textPrimary,
    lineHeight: 24,
  },
  resolvedRegion: {
    fontSize: 14,
    color: AdminColors.textSecondary,
    marginTop: 4,
  },
  coordsText: {
    fontSize: 11,
    color: AdminColors.textMuted,
    marginTop: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  confirmBtn: {
    backgroundColor: AdminColors.primary,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    ...AdminShadows.shadowTeal,
  },
  confirmBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
});
