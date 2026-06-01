import React from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Colors, Shadows } from '../../../constants/theme';
import { textAlign } from '../../../src/utils/rtl';

interface OrderAddressMapProps {
  address: string;
  lat: number | null;
  lng: number | null;
  isArabic: boolean;
  t: (key: string, options?: any) => string;
}

export default React.memo(function OrderAddressMap({ address, lat, lng, isArabic, t }: OrderAddressMapProps) {
  if (!address && !(lat && lng)) return null;

  return (
    <View>
      {!!address && (
        <Text style={[styles.addressText, isArabic && { textAlign: 'right', paddingHorizontal: 16 }]}>
          {address}
        </Text>
      )}
      {!!(lat && lng) && (
        <View style={styles.mapWrapper}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            scrollEnabled={false}
            zoomEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
            initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.005, longitudeDelta: 0.005 }}
          >
            <Marker coordinate={{ latitude: lat, longitude: lng }}>
              <View style={styles.markerContainer}>
                <View style={styles.markerPin} />
              </View>
            </Marker>
          </MapView>
          <TouchableOpacity
            style={[styles.openMapBtn, isArabic ? { left: 12, right: undefined } : { right: 12 }]}
            onPress={() => Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`)}
          >
            <Text style={styles.openMapText}>{t('admin.clients.map')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  addressText: { fontSize: 14, color: Colors.textSecondary, paddingHorizontal: 20, marginBottom: 12 },
  mapWrapper: { height: 200, marginHorizontal: 16, borderRadius: 24, overflow: 'hidden', ...Shadows.md },
  map: { flex: 1 },
  markerContainer: { padding: 4, backgroundColor: 'white', borderRadius: 20, ...Shadows.sm },
  markerPin: { width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.primary, borderWidth: 2, borderColor: 'white' },
  openMapBtn: { position: 'absolute', bottom: 12, backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, ...Shadows.sm },
  openMapText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
});
