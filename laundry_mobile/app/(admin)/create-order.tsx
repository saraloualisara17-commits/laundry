import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AdminColors, AdminShadows } from '../../constants/AdminColors';
import { useOrderCreation } from '../../src/context/OrderCreationContext';
import { useTranslation } from 'react-i18next';

export default function CreateOrderEntry() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  
  const { setMode, clearOrder } = useOrderCreation();

  const handleSelectMode = (mode: 'immediate' | 'scheduled') => {
    clearOrder();
    setMode(mode);
    router.push({
      pathname: '/(admin)/order-client',
      params: { mode }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, isArabic && { flexDirection: 'row-reverse' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name={isArabic ? "arrow-forward" : "arrow-back"} size={24} color={AdminColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('dashboard.create_order')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, isArabic && { textAlign: 'right' }]}>{t('admin.orders.create.question')}</Text>
        <Text style={[styles.subtitle, isArabic && { textAlign: 'right' }]}>{t('admin.orders.create.subtitle')}</Text>

        <TouchableOpacity 
          style={[styles.card, styles.immediateCard, isArabic && { alignItems: 'flex-end' }]} 
          onPress={() => handleSelectMode('immediate')}
          activeOpacity={0.9}
        >
          <View style={[styles.iconCircle, { backgroundColor: AdminColors.primary100 }]}>
            <Text style={{ fontSize: 28 }}>🏪</Text>
          </View>
          <Text style={styles.cardTitle}>{t('admin.orders.create.mode_immediate')}</Text>
          <Text style={[styles.cardDesc, isArabic && { textAlign: 'right' }]}>
            {t('admin.orders.create.mode_immediate_desc')}
          </Text>
          <View style={[styles.tagRow, isArabic && { flexDirection: 'row-reverse' }]}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>📍 {t('admin.orders.create.tags.on_site')}</Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>⚡ {t('admin.orders.create.tags.immediate')}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.cardBtn} onPress={() => handleSelectMode('immediate')}>
            <Text style={styles.cardBtnText}>{t('admin.orders.create.start')} {isArabic ? '←' : '→'}</Text>
          </TouchableOpacity>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.card, styles.scheduledCard, isArabic && { alignItems: 'flex-end' }]} 
          onPress={() => handleSelectMode('scheduled')}
          activeOpacity={0.9}
        >
          <View style={[styles.iconCircle, { backgroundColor: AdminColors.accent100 }]}>
            <Text style={{ fontSize: 28 }}>📞</Text>
          </View>
          <Text style={styles.cardTitle}>{t('admin.orders.create.mode_scheduled')}</Text>
          <Text style={[styles.cardDesc, isArabic && { textAlign: 'right' }]}>
            {t('admin.orders.create.mode_scheduled_desc')}
          </Text>
          <View style={[styles.tagRow, isArabic && { flexDirection: 'row-reverse' }]}>
            <View style={[styles.tag, { backgroundColor: AdminColors.accent100, borderColor: AdminColors.accent }]}>
              <Text style={[styles.tagText, { color: AdminColors.accent }]}>🚚 {t('admin.orders.create.tags.pickup')}</Text>
            </View>
            <View style={[styles.tag, { backgroundColor: AdminColors.accent100, borderColor: AdminColors.accent }]}>
              <Text style={[styles.tagText, { color: AdminColors.accent }]}>📅 {t('admin.orders.create.tags.scheduled')}</Text>
            </View>
          </View>
          <TouchableOpacity style={[styles.cardBtn, { backgroundColor: AdminColors.accent }]} onPress={() => handleSelectMode('scheduled')}>
            <Text style={[styles.cardBtnText, { color: '#0D1B2A' }]}>{t('admin.orders.create.start')} {isArabic ? '←' : '→'}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8',
  },
  header: {
    backgroundColor: 'white',
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    ...AdminShadows.shadowSmall,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: AdminColors.textPrimary,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: AdminColors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: AdminColors.textMuted,
    marginBottom: 32,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 2,
    ...AdminShadows.shadowMedium,
  },
  immediateCard: {
    borderColor: AdminColors.primary,
  },
  scheduledCard: {
    borderColor: AdminColors.accent,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: AdminColors.textPrimary,
    marginTop: 16,
  },
  cardDesc: {
    fontSize: 14,
    color: AdminColors.textSecondary,
    lineHeight: 22,
    marginTop: 8,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  tag: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: AdminColors.primary50,
    borderWidth: 1,
    borderColor: AdminColors.primary200,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: AdminColors.primary,
  },
  cardBtn: {
    backgroundColor: AdminColors.primary,
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
    alignItems: 'center',
  },
  cardBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: 'white',
  },
});
