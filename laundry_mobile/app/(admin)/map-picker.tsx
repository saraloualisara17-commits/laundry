import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
  Platform
} from 'react-native';
import MapView, { Marker, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AdminColors, AdminShadows } from '../../constants/AdminColors';
import { useOrderCreation } from '../../src/context/OrderCreationContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { logger } from '../../src/lib/logger';

const log = logger.ns('map-picker');

export default function MapPickerScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { setPendingLocation } = useOrderCreation();
  const mapRef = useRef<MapView>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [markerCoords, setMarkerCoords] = useState<{ latitude: number, longitude: number } | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState('');
  const [resolvedRegion, setResolvedRegion] = useState('');

  const searchAddress = async (query: string) => {
    setSearching(true);
    try {
      const encoded = encodeURIComponent(query + ', Morocco');
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `format=json&q=${encoded}&limit=5&` +
        `addressdetails=1&accept-language=fr`,
        { headers: { 'User-Agent': 'AstraPro-LaundryApp/1.0' } }
      );
      const data = await res.json();
      setSearchResults(data);
    } catch(e) {
      log.warn('Search failed', { err: String(e) });
    } finally {
      setSearching(false);
    }
  };

  const selectSearchResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    setMarkerCoords({ latitude: lat, longitude: lng });

    // Animate map imperatively — avoids the controlled-region re-render race on Android
    mapRef.current?.animateToRegion({
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 400);

    const addr = result.address;
    const street = addr.road || addr.neighbourhood || addr.suburb || '';
    const city = addr.city || addr.town || addr.village || addr.municipality || '';
    const region = addr.state || addr.county || '';

    setResolvedAddress([street, city].filter(Boolean).join(', '));
    setResolvedRegion(region);
    setSearchQuery(result.display_name.split(',')[0]);
    setSearchResults([]);
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?` +
        `format=json&lat=${lat}&lon=${lng}&` +
        `accept-language=fr`,
        { headers: { 'User-Agent': 'AstraPro-LaundryApp/1.0' } }
      );
      const data = await res.json();
      const addr = data.address || {};

      const street = addr.road || addr.neighbourhood || addr.suburb || '';
      const city = addr.city || addr.town || addr.village || addr.municipality || '';
      const region = addr.state || addr.county || '';

      setResolvedAddress([street, city].filter(Boolean).join(', '));
      setResolvedRegion(region);
      setSearchQuery(data.display_name?.split(',')[0] || '');
    } catch(e) {
      log.warn('Reverse geocode failed', { err: String(e) });
      setResolvedAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  };

  const handleConfirm = () => {
    if (!markerCoords) return;
    
    setPendingLocation({
      address: resolvedAddress,
      region: resolvedRegion,
      lat: markerCoords.latitude,
      lng: markerCoords.longitude
    });
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

      {/* Absolute Overlay Header & Search */}
      <View style={[styles.overlayTop, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={AdminColors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.titleBadge}>
            <Text style={styles.titleText}>{t('admin.map_picker.title')}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={AdminColors.primary} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('admin.map_picker.search_placeholder')}
            placeholderTextColor={AdminColors.textMuted}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              if (text.length > 2) {
                searchAddress(text);
              } else {
                setSearchResults([]);
              }
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
              <Ionicons name="close-circle" size={18} color={AdminColors.textMuted} />
            </TouchableOpacity>
          )}
          {searching && <ActivityIndicator size="small" color={AdminColors.primary} style={{ marginLeft: 8 }} />}
        </View>

        {searchResults.length > 0 && (
          <View style={styles.resultsDropdown}>
            <FlatList
              data={searchResults}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.resultItem}
                  onPress={() => selectSearchResult(item)}
                >
                  <Ionicons name="pin" size={18} color={AdminColors.primary} />
                  <View style={styles.resultTextCol}>
                    <Text style={styles.resultName}>{item.display_name.split(',')[0]}</Text>
                    <Text style={styles.resultFullAddr} numberOfLines={1}>
                      {item.display_name.split(',').slice(1).join(',').trim()}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>

      {/* Bottom Confirmation Card */}
      {markerCoords && (
        <View style={[styles.confirmCard, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.dragHandle} />
          <Text style={styles.cardLabel}>{t('admin.map_picker.selected_location')}</Text>
          <Text style={styles.resolvedAddr}>{resolvedAddress || t('admin.map_picker.unknown_address')}</Text>
          {resolvedRegion ? <Text style={styles.resolvedRegion}>{resolvedRegion}</Text> : null}
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
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
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
    maxHeight: 250,
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
