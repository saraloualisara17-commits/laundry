import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  Animated,
  Linking,
  Platform,
  Dimensions,
  ScrollView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { AdminColors, AdminShadows } from '../../constants/AdminColors';
import { useOrderCreation } from '../../src/context/OrderCreationContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OrderConfirmationScreen() {
  const insets = useSafeAreaInsets();
  const { clearOrder } = useOrderCreation();
  const params = useLocalSearchParams<{ 
    orderId: string, 
    reference: string, 
    clientName: string,
    total: string,
    paid: string,
    remaining: string
  }>();

  const checkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(checkScale, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true
    }).start();
  }, []);

  const handleFinish = () => {
    clearOrder();
    router.replace('/(admin)/(tabs)');
  };

  const handleNewOrder = () => {
    clearOrder();
    router.replace('/(admin)/create-order');
  };

  const sendWhatsApp = () => {
    const msg = `Bonjour ${params.clientName || 'Cher client'}, votre commande #${params.reference} a bien été enregistrée pour un montant de ${params.total} DH. Merci de votre confiance !`;
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <SafeAreaView style={styles.safeArea}>
          <TouchableOpacity 
            style={[styles.closeBtn, { top: insets.top + 10 }]} 
            onPress={handleFinish}
          >
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
          
          <Animated.View style={[styles.checkCircle, { transform: [{ scale: checkScale }] }]}>
            <Ionicons name="checkmark" size={60} color={AdminColors.primary} />
          </Animated.View>
          <Text style={styles.successTitle}>Commande créée !</Text>
          <Text style={styles.orderRef}>#{params.reference}</Text>
        </SafeAreaView>
      </View>

      <View style={styles.bottomSection}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>CLIENT</Text>
                <Text style={styles.infoValue}>{params.clientName}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>TOTAL</Text>
                <Text style={styles.infoValue}>{params.total} DH</Text>
              </View>
            </View>

            <View style={[styles.infoRow, { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' }]}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>PAYÉ</Text>
                <Text style={[styles.infoValue, { color: AdminColors.success }]}>{params.paid} DH</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>RESTE</Text>
                <Text style={[styles.infoValue, { color: (parseFloat(params.remaining || '0') > 0) ? AdminColors.danger : AdminColors.textPrimary }]}>
                  {params.remaining} DH
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Envoyer le reçu</Text>
          
          <TouchableOpacity style={styles.whatsappBtn} onPress={sendWhatsApp}>
            <Ionicons name="logo-whatsapp" size={24} color="white" />
            <Text style={styles.whatsappBtnText}>Envoyer sur WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.ghostBtn} onPress={() => Alert.alert('Email', 'Envoi d\'email bientôt disponible')}>
            <Ionicons name="mail-outline" size={22} color={AdminColors.primary} />
            <Text style={styles.ghostBtnText}>Envoyer par email</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.ghostBtn} onPress={() => Alert.alert('PDF', 'Génération PDF bientôt disponible')}>
            <Ionicons name="print-outline" size={22} color={AdminColors.primary} />
            <Text style={styles.ghostBtnText}>Voir le reçu PDF</Text>
          </TouchableOpacity>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleNewOrder}>
              <Text style={styles.primaryBtnText}>Nouvelle commande</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleFinish}>
              <Text style={styles.secondaryBtnLabel}>Retour au tableau de bord</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8',
  },
  topSection: {
    backgroundColor: AdminColors.primary,
    height: '38%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeArea: {
    alignItems: 'center',
    width: '100%',
  },
  closeBtn: {
    position: 'absolute',
    right: 20,
    zIndex: 30,
    padding: 8,
  },
  checkCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    ...AdminShadows.shadowMedium,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: 'white',
    marginTop: 20,
  },
  orderRef: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    opacity: 0.85,
    marginTop: 4,
  },
  bottomSection: {
    flex: 1,
    backgroundColor: '#F4F6F8',
    marginTop: -24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    ...AdminShadows.shadowSmall,
  },
  infoRow: {
    flexDirection: 'row',
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: AdminColors.textMuted,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: AdminColors.textPrimary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245,158,11,0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: AdminColors.textPrimary,
    marginBottom: 16,
  },
  whatsappBtn: {
    backgroundColor: '#25D366',
    height: 54,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
    ...AdminShadows.shadowSmall,
  },
  whatsappBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
  ghostBtn: {
    backgroundColor: 'white',
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: AdminColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  ghostBtnText: {
    color: AdminColors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  actions: {
    marginTop: 20,
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: AdminColors.primary,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...AdminShadows.shadowTeal,
  },
  primaryBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: 'white',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  secondaryBtnLabel: {
    color: AdminColors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  textBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  textBtnLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: AdminColors.textMuted,
  },
});
