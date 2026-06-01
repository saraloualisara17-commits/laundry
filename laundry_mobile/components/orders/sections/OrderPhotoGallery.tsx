import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { BASE_URL } from '../../../src/services/api/client';
import { row } from '../../../src/utils/rtl';

interface OrderPhotoGalleryProps {
  images: any[];
  isArabic: boolean;
  t: (key: string, options?: any) => string;
  onImagePress: (uri: string) => void;
}

const STATUS_MAP: Record<string, string> = {
  pending_pickup:       'status.PENDING_PICKUP',
  picked_up:            'status.PICKED_UP',
  reception:            'status.PICKED_UP',
  in_process:           'status.IN_PROCESS',
  apres_traitement:     'status.IN_PROCESS',
  ready_for_delivery:   'status.READY_FOR_DELIVERY',
  delivered:            'status.DELIVERED',
  livraison:            'status.DELIVERED',
  pickup_failed:        'status.PICKUP_FAILED',
  delivery_failed:      'status.DELIVERY_FAILED',
  cancelled:            'status.CANCELLED',
};

export default function OrderPhotoGallery({ images, isArabic, t, onImagePress }: OrderPhotoGalleryProps) {
  if (!images || images.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[row(isArabic), { gap: 10, paddingHorizontal: 16 }]}
    >
      {images.map((img: any, idx: number) => (
        <TouchableOpacity key={idx} onPress={() => onImagePress(`${BASE_URL}${img.imageUrl}`)}>
          <Image
            source={{ uri: `${BASE_URL}${img.imageUrl}` }}
            style={styles.img}
            contentFit="cover"
            transition={150}
            cachePolicy="memory-disk"
            recyclingKey={`${img.id}-${img.imageUrl}`}
          />
          <View style={[styles.badge, isArabic ? { left: 6, right: undefined } : { right: 6 }]}>
            <Text style={styles.badgeText}>
              {STATUS_MAP[img.photoType] ? t(STATUS_MAP[img.photoType]) : img.photoType}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  img: { width: 100, height: 100, borderRadius: 12 },
  badge: { position: 'absolute', bottom: 6, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeText: { color: 'white', fontSize: 9, fontWeight: '700' },
});
