import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { Colors, Shadows } from '../../../constants/theme';
import { useFormStyles } from '../../../src/hooks/useFormStyles';
import { row, textAlign } from '../../../src/utils/rtl';

interface ArticlesTabProps {
  order: any;
  isArabic: boolean;
  t: (key: string, options?: any) => string;
  setViewImage: (url: string) => void;
  BASE_URL: string;
}

const ArticlesTab: React.FC<ArticlesTabProps> = ({
  order,
  isArabic,
  t,
  setViewImage,
  BASE_URL,
}) => {
  const f = useFormStyles();
  return (
    <View>
      {order.commandeTapis?.map((item: any, index: number) => {
        const area = item.largeur && (item.hauteur || item.longueur)
          ? (parseFloat(item.largeur) * parseFloat(item.hauteur || item.longueur)).toFixed(2)
          : null;

        return (
          <View key={item.id} style={styles.itemCard}>
            <View style={[styles.itemHeader, row(isArabic)]}>
              <View style={[styles.itemTitleRow, row(isArabic)]}>
                <View style={styles.tagBadge}>
                  <Text style={styles.tagText}>TAG-{String(index + 1).padStart(3, '0')}</Text>
                </View>
                <Text
                  style={[
                    styles.itemName,
                    textAlign(isArabic),
                    { marginEnd: isArabic ? 10 : 0 },
                  ]}
                >
                  {isArabic && item.productNomAr ? item.productNomAr : item.productNom || t('admin.items.default_item_name')}
                </Text>
              </View>
              <Text style={styles.itemPrice}>
                {parseFloat(item.prixFinal || 0).toFixed(2)} {t('common.dh')}
              </Text>
            </View>

            {item.images && item.images.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: 12 }}
                contentContainerStyle={[row(isArabic), { gap: 8 }]}
              >
                {item.images.map((img: any, i: number) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setViewImage(`${BASE_URL}${img.imageUrl}`)}
                  >
                    <Image
                      source={{ uri: `${BASE_URL}${img.imageUrl}` }}
                      style={styles.itemGalleryImg}
                      contentFit="cover"
                      transition={150}
                      cachePolicy="memory-disk"
                      recyclingKey={`${img.id ?? i}-${img.imageUrl}`}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {item.modeTarification === 'PER_M2' && (
              <View style={[styles.chipsRow, row(isArabic)]}>
                <View style={[styles.dimensionChip, isArabic && { alignItems: 'flex-end' }]}>
                  <Text style={[styles.chipLabel, f.chipLabel]}>
                    {t('admin.orders.create.items.dimensions')}
                  </Text>
                  <Text style={styles.chipValue}>
                    {item.largeur || '—'} × {item.hauteur || item.longueur || '—'} m
                  </Text>
                </View>
                <View style={[styles.dimensionChip, isArabic && { alignItems: 'flex-end' }]}>
                  <Text style={[styles.chipLabel, f.chipLabel]}>
                    {t('admin.orders.create.items.area')}
                  </Text>
                  <Text style={styles.chipValue}>{area ? `${area} m²` : '— m²'}</Text>
                </View>
              </View>
            )}

            {item.modeTarification === 'PER_UNIT' && (
              <View
                style={[
                  styles.dimensionChip,
                  { marginTop: 12, alignSelf: isArabic ? 'flex-end' : 'flex-start' },
                  isArabic && { alignItems: 'flex-end' },
                ]}
              >
                <Text style={[styles.chipLabel, f.chipLabel]}>
                  {t('admin.orders.create.items.pieces')}
                </Text>
                <Text style={styles.chipValue}>{item.quantite}</Text>
              </View>
            )}

            {item.notes && (
              <View style={[styles.noteContainer, row(isArabic)]}>
                <Feather
                  name="info"
                  size={14}
                  color={Colors.textSecondary}
                  style={{ marginTop: 2 }}
                />
                <Text
                  style={[styles.itemNotes, textAlign(isArabic), { marginStart: 8 }]}
                >
                  {item.notes}
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  itemCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    padding: 16,
    ...Shadows.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  tagBadge: {
    backgroundColor: Colors.primary50,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
  },
  itemGalleryImg: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  dimensionChip: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  chipLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: 2,
  },
  chipValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  noteContainer: {
    flexDirection: 'row',
    marginTop: 12,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  itemNotes: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
});

export default React.memo(ArticlesTab);
