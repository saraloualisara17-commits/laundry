import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { adminApi } from '../../src/services/adminApi';
import { AdminColors, AdminShadows } from '../../constants/AdminColors';
import { StatusBadge } from '../../components/admin/StatusBadge';
import AddPaymentModal from '../../components/admin/AddPaymentModal';
import { Alert } from 'react-native';

export default function ClientDebtDetailScreen() {
  const { clientId, clientName } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clientData, setClientData] = useState<any>(null);
  
  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedOrderAmount, setSelectedOrderAmount] = useState<number>(0);
  const [selectedOrderRestant, setSelectedOrderRestant] = useState<number>(0);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getClientDebtDetail(clientId as string);
      setClientData(res.data);
    } catch (error) {
      console.error('Error fetching client debt detail:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (clientId) fetchData();
  }, [clientId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [clientId]);

  const openWhatsApp = async () => {
    if (!clientData?.clientPhone) return;
    
    // Format phone for WhatsApp wa.me (digits only)
    let waPhone = clientData.clientPhone.replace(/\D/g, '');
    if (clientData.clientPhone.startsWith('0')) {
      waPhone = '212' + clientData.clientPhone.slice(1).replace(/\D/g, '');
    }
    
    const text = `Bonjour ${clientData.clientName},\nVous avez un solde restant de ${clientData.totalRemaining} DH sur ${clientData.orderCount} commande(s).\nMerci de régulariser votre situation.`;
    const encodedText = encodeURIComponent(text);
    
    try {
      await Linking.openURL(`https://wa.me/${waPhone}?text=${encodedText}`);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible d\'ouvrir WhatsApp');
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    Alert.alert(
      'Paiement enregistré',
      'Le solde a été mis à jour avec succès.'
    );
    fetchData(); // Refresh data to recalculate remaining amounts
  };

  const getDebtColorLevel = (amount: number) => {
    if (amount > 1000) return { main: '#EF4444', bg: 'rgba(239,68,68,0.15)' };
    if (amount >= 200) return { main: '#F59E0B', bg: 'rgba(245,158,11,0.15)' };
    return { main: '#C9A84C', bg: 'rgba(201,168,76,0.15)' };
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={AdminColors.primary} />
      </SafeAreaView>
    );
  }

  if (!clientData) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Données introuvables.</Text>
        <TouchableOpacity style={{ marginTop: 20 }} onPress={() => router.back()}>
          <Text style={{ color: AdminColors.primary }}>Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const debtColor = getDebtColorLevel(clientData.totalRemaining);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={AdminColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{clientName}</Text>
        {clientData.clientPhone ? (
          <TouchableOpacity style={styles.waIconBtn} onPress={openWhatsApp}>
            <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
          </TouchableOpacity>
        ) : <View style={{ width: 40 }} />}
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AdminColors.primary} />}
      >
        <View style={styles.clientInfoCard}>
          <View style={[styles.avatarLarge, { backgroundColor: debtColor.bg, borderColor: debtColor.main }]}>
            <Text style={[styles.avatarTextLarge, { color: debtColor.main }]}>
              {clientData.clientName?.charAt(0)?.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.clientNameLarge}>{clientData.clientName}</Text>
          {clientData.clientPhone && (
            <Text style={styles.clientPhoneText}>{clientData.clientPhone}</Text>
          )}
        </View>

        <View style={styles.debtSummaryCard}>
          <Text style={styles.debtLabel}>DETTE TOTALE</Text>
          <Text style={styles.debtAmountLarge}>{clientData.totalRemaining} DH</Text>
          
          <View style={styles.debtDetailsRow}>
            <Text style={styles.debtDetailText}>{clientData.orderCount} commandes</Text>
            <View style={styles.dot} />
            <Text style={styles.debtDetailText}>{clientData.totalAmount} DH facturé</Text>
            <View style={styles.dot} />
            <Text style={styles.debtDetailText}>{clientData.totalPaid} DH encaissé</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Commandes impayées</Text>

        {clientData.orders?.map((order: any) => (
          <TouchableOpacity 
            key={order.orderId} 
            style={styles.orderMiniCard}
            onPress={() => router.push(`/order/${order.orderId}`)}
          >
            <View style={styles.orderTopRow}>
              <Text style={styles.orderRef}>#{order.reference}</Text>
              <StatusBadge status={order.status} />
            </View>
            <Text style={styles.orderDate}>
              {new Date(order.dateCreation).toLocaleDateString()}
            </Text>
            
            <View style={styles.finRow}>
              <View style={styles.finCol}>
                <Text style={styles.finLabel}>Total</Text>
                <Text style={styles.finValue}>{order.montantTotal} DH</Text>
              </View>
              <View style={styles.finCol}>
                <Text style={styles.finLabel}>Payé</Text>
                <Text style={styles.finValueSuccess}>{order.montantPaye} DH</Text>
              </View>
              <View style={styles.finCol}>
                <Text style={styles.finLabel}>Reste</Text>
                <Text style={styles.finValueDanger}>{order.montantRestant} DH</Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <View style={{ flex: 1 }} />
              <TouchableOpacity 
                style={styles.payBtn}
                onPress={() => {
                  setSelectedOrderId(order.orderId);
                  setSelectedOrderAmount(order.montantTotal);
                  setSelectedOrderRestant(order.montantRestant);
                  setShowPaymentModal(true);
                }}
              >
                <Text style={styles.payBtnText}>💰 Payer</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Payment Modal */}
      {selectedOrderId && (
        <AddPaymentModal
          visible={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          orderId={selectedOrderId}
          totalAmount={selectedOrderAmount}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    ...AdminShadows.shadowSmall,
    zIndex: 10,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AdminColors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  waIconBtn: {
    padding: 8,
    backgroundColor: 'rgba(37,211,102,0.1)',
    borderRadius: 12,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  clientInfoCard: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: 12,
  },
  avatarTextLarge: {
    fontSize: 24,
    fontWeight: '800',
  },
  clientNameLarge: {
    fontSize: 20,
    fontWeight: '700',
    color: AdminColors.textPrimary,
  },
  clientPhoneText: {
    fontSize: 14,
    color: AdminColors.textSecondary,
    marginTop: 4,
  },
  debtSummaryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(239,68,68,0.3)',
    ...AdminShadows.shadowSmall,
  },
  debtLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: AdminColors.danger,
    letterSpacing: 1,
    marginBottom: 8,
  },
  debtAmountLarge: {
    fontSize: 36,
    fontWeight: '800',
    color: AdminColors.danger,
    marginBottom: 12,
  },
  debtDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  debtDetailText: {
    fontSize: 11,
    color: AdminColors.textSecondary,
    fontWeight: '500',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: AdminColors.textMuted,
    marginHorizontal: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: AdminColors.textPrimary,
    marginBottom: 12,
    marginLeft: 4,
  },
  orderMiniCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    ...AdminShadows.shadowSmall,
  },
  orderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderRef: {
    fontSize: 12,
    fontWeight: '600',
    color: AdminColors.textMuted,
  },
  orderDate: {
    fontSize: 12,
    color: AdminColors.textMuted,
    marginTop: 6,
  },
  finRow: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  finCol: {
    flex: 1,
    alignItems: 'center',
  },
  finLabel: {
    fontSize: 11,
    color: AdminColors.textMuted,
    marginBottom: 2,
  },
  finValue: {
    fontSize: 13,
    fontWeight: '600',
    color: AdminColors.textPrimary,
  },
  finValueSuccess: {
    fontSize: 13,
    fontWeight: '600',
    color: AdminColors.success,
  },
  finValueDanger: {
    fontSize: 13,
    fontWeight: '800',
    color: AdminColors.danger,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  payBtn: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: AdminColors.success,
  },
});
