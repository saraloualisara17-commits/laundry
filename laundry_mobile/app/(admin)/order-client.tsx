import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView, 
  TextInput, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  Animated,
  Dimensions
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AdminColors, AdminShadows } from '../../constants/AdminColors';
import { useOrderCreation } from '../../src/context/OrderCreationContext';
import { adminApi } from '../../src/services/adminApi';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DELIVERY_TYPES = [
  { id: 'home', label: 'Home delivery', emoji: '🏠' },
  { id: 'hotel', label: 'Hotel', emoji: '🏨' },
  { id: 'office', label: 'Office', emoji: '🏢' },
  { id: 'shop', label: 'Store / Shop', emoji: '🏪' },
  { id: 'car', label: 'Car pickup', emoji: '🚗' },
  { id: 'self', label: 'Self pickup', emoji: '🏃' },
];

export default function OrderClientScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  
  // Mode parsing
  const modeRaw = (params.mode as string) || 'immediate';
  const mode = modeRaw.trim().toLowerCase();
  const isImmediate = mode === 'immediate';
  const isScheduled = mode === 'scheduled';

  const { 
    pendingLocation, 
    setPendingLocation,
    client: contextClient,
    setClient, 
    setDeliveryType: setCtxDeliveryType, 
    deliveryType: contextDeliveryType,
    livreurId: contextLivreurId,
    scheduledDate: contextScheduledDate,
    setLivreur, 
    setScheduledDate 
  } = useOrderCreation();
  
  // States
  const [phone, setPhone] = useState(contextClient?.phone || '');
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [clientFound, setClientFound] = useState(!!contextClient);
  const [showForm, setShowForm] = useState(!!contextClient);
  
  const [clientId, setClientId] = useState<number | null>(contextClient?.id || null);
  const [clientName, setClientName] = useState(contextClient?.name || '');
  const [clientNotes, setClientNotes] = useState(contextClient?.notes || '');
  const [address, setAddress] = useState(contextClient?.address || '');
  const [region, setRegion] = useState(contextClient?.quartier || '');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number, lng: number } | null>(
    contextClient?.latitude && contextClient?.longitude ? { lat: contextClient.latitude, lng: contextClient.longitude } : null
  );
  
  const [deliveryType, setDeliveryType] = useState<string | null>(contextDeliveryType);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [pickupDate, setPickupDate] = useState<Date | null>(
    contextScheduledDate ? new Date(contextScheduledDate) : null
  );
  const [pickupTime, setPickupTime] = useState<Date | null>(
    contextScheduledDate ? new Date(contextScheduledDate) : null
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // Animation
  const formOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showForm) {
      Animated.timing(formOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [showForm]);

  useEffect(() => {
    if (isScheduled) {
      fetchDrivers();
    }
  }, [isScheduled]);

  // Location picker listener
  useEffect(() => {
    if (pendingLocation) {
      setAddress(pendingLocation.address);
      setRegion(pendingLocation.region);
      setGpsCoords({ lat: pendingLocation.lat, lng: pendingLocation.lng });
      setPendingLocation(null);
      setShowForm(true);
    }
  }, [pendingLocation]);

  const fetchDrivers = async () => {
    try {
      const res = await adminApi.getUsers();
      const allUsers = res.data?.data || res.data || [];
      const livreurs = allUsers.filter(
        (u: any) => u.role?.toUpperCase() === 'LIVREUR'
      );
      setDrivers(livreurs);
    } catch (error) {
      console.warn('Could not load drivers:', error);
    }
  };

  const searchClient = async () => {
    const cleanedPhone = phone.trim();
    if (cleanedPhone.length < 8) return;
    
    setSearching(true);
    try {
      const res = await adminApi.getClients({ search: cleanedPhone });
      const clients = res.data.content || res.data;
      
      if (clients && clients.length > 0) {
        const found = clients[0];
        setClientFound(true);
        setClientId(found.id);
        setClientName(found.name || '');
        // When client is found, we don't display location fields per requirement
      } else {
        setClientFound(false);
        setClientId(null);
        setClientName('');
        setAddress('');
        setRegion('');
        setGpsCoords(null);
      }
      setShowForm(true);
    } catch (e) {
      Alert.alert('Error', 'Search failed. Try again.');
    } finally {
      setSearching(false);
    }
  };

  const captureLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Enable location in settings');
      return;
    }

    try {
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setGpsCoords({ lat: latitude, lng: longitude });

      const result = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (result.length > 0) {
        const geo = result[0];
        const fullAddr = [geo.streetNumber, geo.street, geo.name].filter(Boolean).join(' ');
        setAddress(fullAddr || geo.name || '');
        setRegion(geo.region || geo.district || geo.city || '');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not capture location');
    }
  };

  const isFormValid = () => {
    if (!clientName || clientName.trim() === '') return false;
    if (!phone || phone.trim().length < 8) return false;
    
    if (isImmediate) {
      if (!deliveryType) return false;
    }
    
    if (isScheduled) {
      if (!selectedDriver) return false;
      if (!pickupDate || !pickupTime) return false;
    }
    
    return true;
  };

  const handleContinue = async () => {
    if (!isFormValid()) return;

    setSubmitting(true);
    try {
      let finalClientId = clientId;

      const clientBody = {
        name: clientName,
        notes: clientNotes,
        phones: [{ phoneNumber: phone }],
        addresses: (!clientFound && (gpsCoords || address || region)) ? [{
          address: address || region,
          latitude: gpsCoords?.lat,
          longitude: gpsCoords?.lng,
          notes: region
        }] : []
      };

      if (!clientFound) {
        const res = await adminApi.createClient({
          ...clientBody,
          registrationSource: isImmediate ? 'staff_walkin' : 'staff_phone'
        });
        finalClientId = res.data.id;
      }

      setClient({
        id: finalClientId!,
        name: clientName,
        phone: phone,
        address: address,
        quartier: region,
        latitude: gpsCoords?.lat,
        longitude: gpsCoords?.lng,
        notes: clientNotes
      });
      
      if (isImmediate) {
        setCtxDeliveryType(deliveryType);
      } else {
        setLivreur(selectedDriver.id);
        
        // Combine pickupDate and pickupTime into one Date object
        const finalScheduledDate = new Date(pickupDate!);
        finalScheduledDate.setHours(pickupTime!.getHours());
        finalScheduledDate.setMinutes(pickupTime!.getMinutes());
        finalScheduledDate.setSeconds(0);
        
        setScheduledDate(finalScheduledDate.toISOString());
      }

      router.push('/(admin)/order-items');
    } catch (error) {
      Alert.alert('Error', 'Failed to save client info');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={AdminColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Informations client</Text>
        <View style={[styles.modeBadge, { backgroundColor: isImmediate ? AdminColors.primary50 : AdminColors.accent100 }]}>
          <Text style={[styles.modeBadgeText, { color: isImmediate ? AdminColors.primary : AdminColors.accent }]}>
            {isImmediate ? 'Au local' : 'Téléphonique'}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Search Section (Single Phone Input) */}
          <View style={styles.searchSection}>
            <Text style={styles.fieldLabel}>Numéro de téléphone</Text>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder="0600000000"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                onBlur={() => phone.length >= 8 && searchClient()}
              />
              <TouchableOpacity style={styles.searchBtn} onPress={searchClient}>
                {searching ? <ActivityIndicator color="white" /> : <Ionicons name="search" size={22} color="white" />}
              </TouchableOpacity>
            </View>
          </View>

          {showForm && (
            <Animated.View style={{ opacity: formOpacity }}>
              {/* Client Info Section */}
              <View style={styles.sectionHeader}>
                <View style={styles.headerIconBox}>
                  <Ionicons name="person" size={18} color={AdminColors.primary} />
                </View>
                <Text style={styles.sectionTitle}>Information Client</Text>
              </View>

              <View style={styles.formField}>
                <Text style={styles.label}>Nom Complet *</Text>
                <TextInput 
                  style={styles.input} 
                  value={clientName}
                  onChangeText={setClientName}
                  placeholder="Nom du client"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.label}>Notes</Text>
                <TextInput 
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
                  multiline 
                  placeholder="Instructions spéciales..."
                  value={clientNotes}
                  onChangeText={setClientNotes}
                />
              </View>

              {/* Location Section - Only show if NEW client or SCHEDULED mode */}
              {(!clientFound || isScheduled) && (
                <>
                  <View style={styles.sectionHeader}>
                    <View style={styles.headerIconBox}>
                      <Ionicons name="pin" size={18} color={AdminColors.primary} />
                    </View>
                    <Text style={styles.sectionTitle}>Localisation</Text>
                  </View>

                  <View style={styles.formField}>
                    <Text style={styles.label}>Région / Zone (ou coller localisation)</Text>
                    <TextInput 
                      style={styles.input} 
                      value={region}
                      onChangeText={setRegion}
                      placeholder="Coller ici..."
                    />
                  </View>

                  {!clientFound && (
                    <>
                      <View style={styles.formField}>
                        <Text style={styles.label}>Adresse</Text>
                        <TextInput 
                          style={styles.input} 
                          value={address}
                          onChangeText={setAddress}
                        />
                      </View>

                      <View style={styles.locationButtonsRow}>
                        <TouchableOpacity 
                          style={styles.locBtnPrimary} 
                          onPress={() => router.push({
                            pathname: '/(admin)/map-picker',
                            params: { returnTo: 'order-client' }
                          })}
                        >
                          <Ionicons name="map" size={18} color="white" />
                          <Text style={styles.locBtnText}>Carte</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.locBtnSecondary} onPress={captureLocation}>
                          <Ionicons name="locate" size={18} color="white" />
                          <Text style={styles.locBtnText}>GPS Actuel</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </>
              )}

              <View style={styles.sectionHeader}>
                <View style={styles.headerIconBox}>
                  {isImmediate ? (
                    <MaterialCommunityIcons name="truck-delivery" size={18} color={AdminColors.primary} />
                  ) : (
                    <Ionicons name="calendar" size={18} color={AdminColors.primary} />
                  )}
                </View>
                <Text style={styles.sectionTitle}>{isImmediate ? 'Delivery Details' : 'Scheduling'}</Text>
              </View>


              {isImmediate ? (
                <View style={styles.formField}>
                  <Text style={styles.label}>Type de Livraison</Text>
                  <TouchableOpacity 
                    style={styles.dropdown} 
                    onPress={() => setShowDeliveryModal(true)}
                  >
                    <View style={styles.dropdownLeft}>
                      {deliveryType ? (
                        <>
                          <Text style={{ fontSize: 20, marginRight: 10 }}>
                            {DELIVERY_TYPES.find(t => t.id === deliveryType)?.emoji}
                          </Text>
                          <Text style={styles.dropdownValue}>
                            {DELIVERY_TYPES.find(t => t.id === deliveryType)?.label}
                          </Text>
                        </>
                      ) : (
                        <Text style={styles.placeholderText}>Sélectionner le type...</Text>
                      )}
                    </View>
                    <Ionicons name="chevron-down" size={18} color={AdminColors.textMuted} />
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.dateTimeRow}>
                    <View style={[styles.formField, { flex: 1 }]}>
                      <Text style={styles.label}>Date de récupération</Text>
                      <TouchableOpacity 
                        style={styles.input} 
                        onPress={() => setShowDatePicker(true)}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', height: '100%', gap: 8 }}>
                          <Ionicons name="calendar-outline" size={20} color={AdminColors.primary} />
                          <Text style={{ color: pickupDate ? AdminColors.textPrimary : AdminColors.textMuted }}>
                            {pickupDate ? pickupDate.toLocaleDateString() : 'Choisir date'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>

                    <View style={[styles.formField, { flex: 1 }]}>
                      <Text style={styles.label}>Heure</Text>
                      <TouchableOpacity 
                        style={styles.input} 
                        onPress={() => setShowTimePicker(true)}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', height: '100%', gap: 8 }}>
                          <Ionicons name="time-outline" size={20} color={AdminColors.primary} />
                          <Text style={{ color: pickupTime ? AdminColors.textPrimary : AdminColors.textMuted }}>
                            {pickupTime ? pickupTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Choisir heure'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {showDatePicker && (
                    <DateTimePicker
                      value={pickupDate || new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(event, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) setPickupDate(selectedDate);
                      }}
                    />
                  )}

                  {showTimePicker && (
                    <DateTimePicker
                      value={pickupTime || new Date()}
                      mode="time"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(event, selectedTime) => {
                        setShowTimePicker(false);
                        if (selectedTime) setPickupTime(selectedTime);
                      }}
                    />
                  )}

                  <Text style={styles.label}>Assigner un Livreur</Text>
                  {drivers.length === 0 ? (
                    <Text style={styles.emptyText}>Aucun livreur disponible</Text>
                  ) : (
                    drivers.map(driver => (
                      <TouchableOpacity 
                        key={driver.id} 
                        style={[styles.driverCard, selectedDriver?.id === driver.id && styles.driverCardSelected]}
                        onPress={() => setSelectedDriver(driver)}
                      >
                        <View style={styles.driverAvatar}>
                          <Text style={styles.avatarText}>{driver.name?.[0]?.toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.driverName}>{driver.name}</Text>
                          <Text style={styles.driverPhone}>{driver.phone}</Text>
                        </View>
                        <View style={[styles.radio, selectedDriver?.id === driver.id && styles.radioActive]}>
                          {selectedDriver?.id === driver.id && <View style={styles.radioDot} />}
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </>
              )}
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity 
          style={[
            styles.continueBtn, 
            !isFormValid() && styles.continueBtnDisabled
          ]} 
          onPress={handleContinue}
          disabled={!isFormValid() || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.continueBtnText}>Continuer →</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Delivery Type Modal */}
      <Modal visible={showDeliveryModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowDeliveryModal(false)} />
          <View style={styles.modalSheet}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Type de Livraison</Text>
               <TouchableOpacity onPress={() => setShowDeliveryModal(false)}>
                 <Ionicons name="close" size={24} color={AdminColors.textPrimary} />
               </TouchableOpacity>
             </View>
             <ScrollView>
               {DELIVERY_TYPES.map(type => (
                 <TouchableOpacity 
                   key={type.id} 
                   style={styles.modalRow}
                   onPress={() => { setDeliveryType(type.id); setShowDeliveryModal(false); }}
                 >
                   <View style={styles.emojiCircle}>
                     <Text style={{ fontSize: 24 }}>{type.emoji}</Text>
                   </View>
                   <Text style={styles.modalRowLabel}>{type.label}</Text>
                   {deliveryType === type.id && <Ionicons name="checkmark" size={24} color={AdminColors.primary} />}
                 </TouchableOpacity>
               ))}
             </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  header: {
    backgroundColor: 'white',
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    ...AdminShadows.shadowSmall,
    zIndex: 20,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: AdminColors.textPrimary },
  modeBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  modeBadgeText: { fontSize: 12, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
  searchSection: { marginBottom: 24 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: AdminColors.textSecondary, marginBottom: 8 },
  searchRow: { flexDirection: 'row', gap: 10 },
  searchInput: {
    flex: 1,
    height: 52,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.10)',
    ...AdminShadows.shadowSmall,
  },
  searchBtn: {
    width: 52,
    height: 52,
    backgroundColor: AdminColors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, marginTop: 8 },
  headerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: AdminColors.primary100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: AdminColors.textPrimary },
  dateTimeRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  formField: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: AdminColors.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 15,
    color: AdminColors.textPrimary,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.10)',
    ...AdminShadows.shadowSmall,
  },
  locationButtonsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  locBtnPrimary: {
    flex: 1,
    height: 48,
    backgroundColor: AdminColors.primary,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  locBtnSecondary: {
    flex: 1,
    height: 48,
    backgroundColor: '#0D1B2A',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  locBtnText: { color: 'white', fontSize: 14, fontWeight: '600' },
  dropdown: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.10)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...AdminShadows.shadowSmall,
  },
  dropdownLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  dropdownValue: { fontSize: 15, color: AdminColors.textPrimary, fontWeight: '500' },
  placeholderText: { fontSize: 15, color: AdminColors.textMuted },
  driverCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.08)',
    marginBottom: 8,
    ...AdminShadows.shadowSmall,
  },
  driverCardSelected: { borderColor: AdminColors.primary, ...AdminShadows.shadowTeal },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AdminColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: 'white' },
  driverName: { fontSize: 15, fontWeight: '600', color: AdminColors.textPrimary },
  driverPhone: { fontSize: 13, color: AdminColors.textSecondary, marginTop: 2 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: AdminColors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: AdminColors.primary },
  emptyText: { textAlign: 'center', color: AdminColors.textMuted, paddingVertical: 10 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F4F6F8',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    zIndex: 30,
  },
  continueBtn: {
    backgroundColor: AdminColors.primary,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...AdminShadows.shadowTeal,
  },
  continueBtnDisabled: { backgroundColor: 'rgba(13,115,119,0.4)' },
  continueBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: Dimensions.get('window').height * 0.5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: AdminColors.textPrimary },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    gap: 14,
  },
  emojiCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: AdminColors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalRowLabel: { fontSize: 16, fontWeight: '500', color: AdminColors.textPrimary, flex: 1 },
});
