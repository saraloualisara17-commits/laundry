import { Platform, Linking } from 'react-native';

export function openMapsNavigation(lat?: any, lng?: any, address?: string) {
  const url = Platform.select({
    ios: lat && lng
      ? `maps://?daddr=${lat},${lng}`
      : `maps://?daddr=${encodeURIComponent(address || '')}`,
    android: lat && lng
      ? `geo:${lat},${lng}?q=${lat},${lng}`
      : `geo:0,0?q=${encodeURIComponent(address || '')}`,
  });
  Linking.openURL(url || '').catch(() =>
    Linking.openURL(`https://maps.google.com/?daddr=${lat},${lng}`)
  );
}
