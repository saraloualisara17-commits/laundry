import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated,
  ActivityIndicator
} from 'react-native';
import { row, textAlign } from '../../src/utils/rtl';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { AdminColors, AdminShadows } from '../../constants/AdminColors';
import { useOrderCreation } from '../../src/context/OrderCreationContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useReceiptActions } from '../../src/hooks/useReceiptActions';

export default function OrderConfirmationScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const insets = useSafeAreaInsets();
  const { orderId, orderNumber } = useLocalSearchParams();
  const { clearOrder } = useOrderCreation();
  const { sharingAction, handleShareWhatsApp, handlePrint } = useReceiptActions(
    orderId as string,
    'PENDING_PICKUP',
    orderNumber as string,
    t
  );

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handleFinish = () => {
    clearOrder();
    // Safety check before back navigation
    if (router.canGoBack()) {
       router.dismissAll();
    }
    router.replace('/(admin)/(tabs)');
  };

  const handleViewOrder = () => {
    const id = orderId;
    clearOrder();
    router.replace(`/order/${id}`);
  };


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.View style={[
          styles.successCircle,
          { transform: [{ scale: scaleAnim }] }
        ]}>
          <Ionicons name="checkmark-circle" size={120} color={AdminColors.primary} />
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', width: '100%' }}>
          <Text style={styles.title}>{t('admin.orders.create.confirmation.success_title')}</Text>
          <View style={styles.orderBadge}>
             <Text style={styles.orderRef}>#{orderNumber}</Text>
          </View>
          <Text style={styles.subtitle}>
            {t('admin.orders.create.confirmation.success_msg')}
          </Text>

          {/* Quick Receipts */}
          <View style={[styles.receiptActions, row(isArabic)]}>
            <TouchableOpacity
              style={[styles.receiptBtn, { backgroundColor: '#E8F5E9' }]}
              onPress={handleShareWhatsApp}
              disabled={!!sharingAction}
            >
              {sharingAction === 'whatsapp'
                ? <ActivityIndicator color="#2E7D32" />
                : <Ionicons name="logo-whatsapp" size={24} color="#2E7D32" />}
              <Text style={[styles.receiptBtnText, { color: '#2E7D32' }]}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.receiptBtn, { backgroundColor: '#F3E5F5' }]}
              onPress={handlePrint}
              disabled={!!sharingAction}
            >
              {sharingAction === 'print'
                ? <ActivityIndicator color="#7B1FA2" />
                : <Ionicons name="print" size={24} color="#7B1FA2" />}
              <Text style={[styles.receiptBtnText, { color: '#7B1FA2' }]}>{t('common.print')}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleViewOrder}>
            <Ionicons name="document-text-outline" size={20} color="white" />
            <Text style={styles.primaryBtnText}>{t('common.details')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={handleFinish}>
            <Ionicons name="home-outline" size={20} color={AdminColors.primary} />
            <Text style={styles.secondaryBtnText}>{t('admin.orders.create.confirmation.back_dashboard')}</Text>
          </TouchableOpacity>
        </View>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  successCircle: {
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: AdminColors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  orderBadge: {
    backgroundColor: AdminColors.primary100,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 99,
    marginBottom: 16,
  },
  orderRef: {
    fontSize: 18,
    fontWeight: '800',
    color: AdminColors.primary,
  },
  subtitle: {
    fontSize: 15,
    color: AdminColors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  receiptActions: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 40,
  },
  receiptBtn: {
    flex: 1,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...AdminShadows.shadowSmall,
  },
  receiptBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: AdminColors.primary,
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...AdminShadows.shadowTeal,
  },
  primaryBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: 'white',
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: AdminColors.primary,
  },
  secondaryBtnText: {
    color: AdminColors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
});
