import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView, 
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AdminColors, AdminShadows } from '../../constants/AdminColors';
import { useOrderCreation } from '../../src/context/OrderCreationContext';
import { adminApi } from '../../src/services/adminApi';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PAYMENT_METHODS = [
  { id: 'especes', label: 'Espèces', emoji: '💵' },
  { id: 'carte', label: 'Carte', emoji: '💳' },
  { id: 'cheque', label: 'Chèque', emoji: '✍️' },
  { id: 'virement', label: 'Virement', emoji: '📱' },
];

export default function OrderSummaryScreen() {
  const insets = useSafeAreaInsets();
  const { 
    mode, client, items, totalAmount, orderNotes, setOrderNotes,
    deliveryType, livreurId, scheduledDate, paymentMethod, setPaymentMethod,
    paidAmount, remainingAmount,
    clearOrder, editingOrderId 
  } = useOrderCreation();
  
  const [loading, setLoading] = useState(false);

  const totalDiscount = useMemo(() => 
    items.reduce((sum, item) => sum + (item.remiseMontant || 0), 0), 
  [items]);

  const subTotal = useMemo(() => 
    items.reduce((sum, item) => sum + (item.prixFinal + (item.remiseMontant || 0)), 0), 
  [items]);

  const handleSubmit = async () => {
    if (items.length === 0) return Alert.alert('Erreur', 'La commande est vide');
    if (mode === 'immediate' && !paymentMethod) {
      return Alert.alert('Paiement', 'Veuillez sélectionner un mode de paiement');
    }

    setLoading(true);
    try {
      // 1. Upload Images if any (only local ones)
      const itemsWithRemoteImages = await Promise.all(items.map(async (item) => {
        const localImages = (item.imageUrls || []).filter(uri => uri.startsWith('file://')).map(uri => ({
          uri,
          name: `item_${Date.now()}.jpg`,
          type: 'image/jpeg'
        }));

        const existingRemoteImages = (item.imageUrls || []).filter(uri => !uri.startsWith('file://'));

        if (localImages.length > 0) {
          const uploadRes = await adminApi.uploadFiles(localImages);
          return { ...item, remoteImageUrls: [...existingRemoteImages, ...uploadRes.data] };
        }
        return { ...item, remoteImageUrls: existingRemoteImages };
      }));

      const payload = {
        clientId: client?.id,
        mode: mode,
        deliveryType: mode === 'immediate' ? deliveryType : undefined,
        pickupDriverId: mode === 'scheduled' ? livreurId : undefined,
        scheduledPickupDate: mode === 'scheduled' ? scheduledDate : undefined,
        paymentMethod: mode === 'immediate' ? paymentMethod : undefined,
        montantPaye: paidAmount || 0,
        notes: orderNotes,
        tapis: itemsWithRemoteImages.map(item => ({
          productId: item.productId,
          quantite: item.quantite || 1,
          largeur: item.largeur,
          hauteur: item.hauteur,
          longueur: item.longueur,
          poids: item.poids,
          prixUnitaire: item.prixUnitaire || 0,
          prixFinal: item.prixFinal || 0,
          modeTarification: item.pricingMethod,
          remiseMontant: item.remiseMontant,
          remiseRaison: item.remiseRaison,
          couleur: item.couleur,
          notes: item.notes,
          imageUrls: item.remoteImageUrls
        }))
      };

      if (editingOrderId) {
        await adminApi.updateOrder(editingOrderId, payload);
        Alert.alert('Succès', 'Commande mise à jour');
        clearOrder();
        router.dismissAll();
        router.push(`/order/${editingOrderId}`);
      } else {
        const res = await adminApi.createOrder(payload);
        const order = res.data.data || res.data;
        
        clearOrder();

        router.push({
          pathname: '/(admin)/order-confirmation',
          params: {
            orderId: order.id.toString(),
            reference: order.numeroCommande,
            clientName: client?.name,
            total: totalAmount.toFixed(2),
            paid: paidAmount.toFixed(2),
            remaining: remainingAmount.toFixed(2)
          }
        });
      }
    } catch (error: any) {
      console.error('Order submission error:', error);
      Alert.alert('Erreur', error.response?.data?.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={AdminColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{editingOrderId ? 'Modifier Commande' : 'Récapitulatif'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 + insets.bottom }]}>
        {/* Mode Banner */}
        <View style={[styles.modeBanner, { backgroundColor: mode === 'immediate' ? AdminColors.primary50 : AdminColors.accent100 }]}>
          <Text style={{ fontSize: 22, marginRight: 12 }}>{mode === 'immediate' ? '🏪' : '📞'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.modeTitle, { color: mode === 'immediate' ? AdminColors.primary : '#92400E' }]}>
              {mode === 'immediate' ? 'Client au local' : 'Commande téléphonique'}
            </Text>
            <Text style={styles.modeSub}>
              {mode === 'immediate' ? `Livraison: ${deliveryType || 'Standard'}` : `Livreur assigné · ${new Date(scheduledDate!).toLocaleDateString('fr-FR')}`}
            </Text>
          </View>
        </View>

        {/* Client Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardLabel}>CLIENT</Text>
            <TouchableOpacity onPress={() => router.push('/(admin)/order-client')}>
              <Text style={styles.editLink}>Modifier</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.clientInfoRow}>
            <View style={styles.clientAvatar}>
              <Text style={styles.avatarText}>{client?.name?.[0]?.toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.clientName}>{client?.name}</Text>
              <Text style={styles.clientSub}>{client?.phone}</Text>
              <Text style={styles.clientSub} numberOfLines={1}>{client?.address || 'Pas d\'adresse'}</Text>
            </View>
          </View>
        </View>

        {/* Articles List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>ARTICLES</Text>
          <View style={styles.badge}><Text style={styles.badgeText}>{items.length} article(s)</Text></View>
          <Text style={styles.sectionTotal}>{totalAmount.toFixed(2)} DH</Text>
        </View>

        {items.map((item, index) => (
          <View key={item.cartId} style={styles.itemRow}>
            <View style={styles.tagBadge}>
              <Text style={styles.tagText}>TAG-{String(index + 1).padStart(3, '0')}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.nom}</Text>
              <Text style={styles.itemDetails}>
                {item.pricingMethod === 'PER_UNIT' ? `${item.quantite} pièces` : 
                 item.pricingMethod === 'PER_M2' ? `${item.largeur}m × ${item.hauteur}m · ${(item.largeur! * item.hauteur!).toFixed(2)}m²` :
                 item.pricingMethod === 'PER_KG' ? `${item.poids}kg` : ''}
              </Text>
              
              {item.imageUrls && item.imageUrls.length > 0 && (
                <View style={styles.summaryImageRow}>
                  {item.imageUrls.map((uri, i) => (
                    <Image key={i} source={{ uri }} style={styles.summaryThumb} />
                  ))}
                </View>
              )}

              {item.remiseMontant ? (
                <Text style={[styles.itemDetails, { color: AdminColors.danger, fontSize: 11 }]}>
                  Remise: -{item.remiseMontant.toFixed(2)} DH {item.remiseRaison ? `(${item.remiseRaison})` : ''}
                </Text>
              ) : null}
              {item.notes ? <Text style={styles.itemNotes}>Note: {item.notes}</Text> : null}
            </View>
            <Text style={styles.itemPrice}>{item.prixFinal.toFixed(2)} DH</Text>
          </View>
        ))}

        {/* Pricing Breakdown */}
        <View style={styles.card}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Sous-total</Text>
            <Text style={styles.priceValue}>{subTotal.toFixed(2)} DH</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Remise(s)</Text>
            <Text style={[styles.priceValue, { color: AdminColors.danger }]}>-{totalDiscount.toFixed(2)} DH</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.priceRow}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <Text style={styles.totalValue}>{totalAmount.toFixed(2)} DH</Text>
          </View>
        </View>

        {/* General Notes */}
        <Text style={styles.sectionLabel}>NOTES GÉNÉRALES</Text>
        <TextInput 
          style={styles.notesInput} 
          multiline 
          placeholder="Instructions pour l'atelier..."
          value={orderNotes}
          onChangeText={setOrderNotes}
        />

        {/* Payment Selection */}
        <Text style={styles.sectionLabel}>MODE DE PAIEMENT</Text>
        {mode === 'immediate' ? (
          <View style={styles.paymentGrid}>
            {PAYMENT_METHODS.map(m => (
              <TouchableOpacity 
                key={m.id}
                style={[styles.paymentCard, paymentMethod === m.id && styles.paymentCardActive]}
                onPress={() => setPaymentMethod(m.id)}
              >
                <Text style={{ fontSize: 24, marginBottom: 8 }}>{m.emoji}</Text>
                <Text style={[styles.paymentLabel, paymentMethod === m.id && { color: AdminColors.primary }]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.payInfoBanner}>
            <Ionicons name="card-outline" size={20} color={AdminColors.primary} />
            <Text style={styles.payInfoText}>Paiement à la livraison</Text>
          </View>
        )}
      </ScrollView>

      {/* Footer Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity 
          style={[styles.submitBtn, loading && { opacity: 0.8 }]} 
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="white" /> : (
            <>
              <Text style={styles.submitBtnText}>{editingOrderId ? 'Mettre à jour' : 'Créer la commande'}</Text>
              <Ionicons name="checkmark-circle" size={20} color="white" style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>
      </View>
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
    zIndex: 10,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: AdminColors.textPrimary,
  },
  content: {
    padding: 20,
  },
  modeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    ...AdminShadows.shadowSmall,
  },
  modeTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modeSub: {
    fontSize: 12,
    color: AdminColors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    ...AdminShadows.shadowSmall,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: AdminColors.textMuted,
    letterSpacing: 1,
  },
  editLink: {
    fontSize: 13,
    color: AdminColors.primary,
    fontWeight: '600',
  },
  clientInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: AdminColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  clientName: {
    fontSize: 16,
    fontWeight: '700',
    color: AdminColors.textPrimary,
  },
  clientSub: {
    fontSize: 13,
    color: AdminColors.textSecondary,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: AdminColors.textMuted,
    letterSpacing: 1,
  },
  badge: {
    backgroundColor: AdminColors.primary100,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: AdminColors.primary,
  },
  sectionTotal: {
    flex: 1,
    textAlign: 'right',
    fontSize: 16,
    fontWeight: '800',
    color: AdminColors.primary,
  },
  itemRow: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...AdminShadows.shadowSmall,
  },
  tagBadge: {
    backgroundColor: AdminColors.primary100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 9,
    fontWeight: '800',
    color: AdminColors.primary,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: AdminColors.textPrimary,
  },
  itemDetails: {
    fontSize: 13,
    color: AdminColors.textSecondary,
    marginTop: 2,
  },
  itemNotes: {
    fontSize: 11,
    fontStyle: 'italic',
    color: AdminColors.textMuted,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: AdminColors.primary,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  priceLabel: {
    fontSize: 14,
    color: AdminColors.textSecondary,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: AdminColors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: AdminColors.textPrimary,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: AdminColors.primary,
  },
  notesInput: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    height: 100,
    textAlignVertical: 'top',
    fontSize: 15,
    marginTop: 10,
    marginBottom: 20,
    ...AdminShadows.shadowSmall,
  },
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
  },
  paymentCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...AdminShadows.shadowSmall,
  },
  paymentCardActive: {
    borderColor: AdminColors.primary,
    backgroundColor: AdminColors.primary50,
  },
  paymentLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: AdminColors.textSecondary,
  },
  payInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: AdminColors.primary50,
    padding: 16,
    borderRadius: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: AdminColors.primary100,
  },
  payInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: AdminColors.primary,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    zIndex: 20,
  },
  submitBtn: {
    backgroundColor: AdminColors.primary,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...AdminShadows.shadowTeal,
  },
  submitBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  summaryImageRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  summaryThumb: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#F1F5F9' },
});
