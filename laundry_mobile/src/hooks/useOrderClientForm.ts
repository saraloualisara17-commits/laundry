import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { adminApi } from '../services/adminApi';
import { useOrderCreation } from '../context/OrderCreationContext';
import { logger } from '../lib/logger';

const log = logger.ns('order-client');

export function useOrderClientForm(
  mode: string,
  t: (key: string, options?: any) => string,
) {
  const isImmediate = mode === 'immediate';
  const isScheduled = mode === 'scheduled';

  const {
    pendingLocation, setPendingLocation,
    client: contextClient, setClient,
    setDeliveryType: setCtxDeliveryType,
    deliveryType: contextDeliveryType,
    livreurId: contextLivreurId,
    scheduledDate: contextScheduledDate,
    setLivreur, setScheduledDate,
    clearOrder, creationIdempotencyKey,
  } = useOrderCreation();

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
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(
    contextClient?.latitude && contextClient?.longitude
      ? { lat: contextClient.latitude, lng: contextClient.longitude }
      : null
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

  useEffect(() => {
    if (isScheduled) fetchDrivers();
  }, [isScheduled]);

  useEffect(() => {
    if (pendingLocation) {
      setAddress(pendingLocation.address);
      setRegion(pendingLocation.region);
      setGpsCoords({ lat: pendingLocation.lat, lng: pendingLocation.lng });
      setPendingLocation(null);
      setShowForm(true);
    }
  }, [pendingLocation]);

  const fetchDrivers = useCallback(async () => {
    try {
      const res = await adminApi.getUsers();
      const allUsers = res.data?.data || res.data || [];
      setDrivers(allUsers.filter((u: any) => ['LIVREUR', 'ADMIN'].includes(u.role?.toUpperCase())));
    } catch (error) {
      log.warn('Could not load drivers', { err: String(error) });
    }
  }, []);

  const searchClient = useCallback(async () => {
    const cleaned = phone.trim();
    if (cleaned.length < 8) return;
    setSearching(true);
    try {
      const res = await adminApi.getClients({ search: cleaned });
      const clients = res.data.content || res.data;
      if (clients && clients.length > 0) {
        const found = clients[0];
        setClientFound(true);
        setClientId(found.id);
        setClientName(found.name || '');
      } else {
        setClientFound(false);
        setClientId(null);
        setClientName('');
        setAddress('');
        setRegion('');
        setGpsCoords(null);
      }
      setShowForm(true);
    } catch {
      Alert.alert(t('common.error'), t('common.error_msg'));
    } finally {
      setSearching(false);
    }
  }, [phone, t]);

  const captureLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), t('admin.orders.location_permission_denied'));
      return;
    }
    try {
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setGpsCoords({ lat: latitude, lng: longitude });
      const result = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (result.length > 0) {
        const geo = result[0];
        setAddress([geo.streetNumber, geo.street, geo.name].filter(Boolean).join(' ') || geo.name || '');
        setRegion(geo.region || geo.district || geo.city || '');
      }
    } catch {
      Alert.alert(t('common.error'), t('admin.orders.location_capture_error'));
    }
  }, [t]);

  const isFormValid = useCallback(() => {
    if (!clientName || clientName.trim() === '') return false;
    if (!phone || phone.trim().length < 8) return false;
    if (isImmediate && !deliveryType) return false;
    if (isScheduled && (!selectedDriver || !pickupDate || !pickupTime)) return false;
    return true;
  }, [clientName, phone, isImmediate, deliveryType, isScheduled, selectedDriver, pickupDate, pickupTime]);

  const handleContinue = useCallback(async () => {
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
          notes: region,
        }] : [],
      };

      if (!clientFound) {
        const res = await adminApi.createClient({
          ...clientBody,
          registrationSource: isImmediate ? 'staff_walkin' : 'staff_phone',
        });
        finalClientId = res.data.id;
      }

      let scheduledIso: string | null = null;
      if (isScheduled) {
        const finalScheduledDate = new Date(pickupDate!);
        finalScheduledDate.setHours(pickupTime!.getHours());
        finalScheduledDate.setMinutes(pickupTime!.getMinutes());
        finalScheduledDate.setSeconds(0);
        scheduledIso = finalScheduledDate.toISOString();
      }

      const orderRes = await adminApi.createOrder({
        clientId: finalClientId,
        tapis: [],
        imageUrls: [],
        mode: isImmediate ? 'IMMEDIATE' : 'SCHEDULED',
        deliveryType: isImmediate ? deliveryType : undefined,
        pickupDriverId: isScheduled ? selectedDriver?.id : undefined,
        scheduledPickupDate: scheduledIso ?? undefined,
        paymentMethod: 'especes',
        montantPaye: 0,
        notes: '',
        source: 'ADMIN_APP',
        deliveryAddress: address || region || null,
        deliveryLatitude: gpsCoords?.lat ?? null,
        deliveryLongitude: gpsCoords?.lng ?? null,
        creationIdempotencyKey,
      });

      const savedOrder = orderRes.data?.data ?? orderRes.data;
      const orderId = savedOrder?.id;
      if (!orderId) throw new Error('Server did not return an order ID');

      clearOrder();
      router.push({ pathname: '/(admin)/order-confirmation', params: { orderId, orderNumber: savedOrder?.numeroCommande } });
    } catch (error: any) {
      const status = error?.status ?? error?.response?.status;
      const data = error?.details ?? error?.response?.data;
      if (status === 400) {
        const firstMsg = data?.errors ? (Object.values(data.errors)[0] as string) : data?.message;
        Alert.alert(t('common.error'), firstMsg || t('admin.users.required_fields'));
      } else if (status === 409) {
        Alert.alert(t('common.error'), data?.message || t('admin.clients.already_exists'));
      } else {
        Alert.alert(t('common.error'), t('common.error_msg'));
      }
    } finally {
      setSubmitting(false);
    }
  }, [isFormValid, clientId, clientName, clientNotes, phone, clientFound, gpsCoords, address, region, isImmediate, isScheduled, deliveryType, selectedDriver, pickupDate, pickupTime, creationIdempotencyKey, clearOrder, t]);

  return {
    phone, setPhone,
    searching, submitting,
    clientFound, showForm, setShowForm,
    clientName, setClientName,
    clientNotes, setClientNotes,
    address, setAddress,
    region, setRegion,
    gpsCoords,
    deliveryType, setDeliveryType,
    showDeliveryModal, setShowDeliveryModal,
    drivers, selectedDriver, setSelectedDriver,
    pickupDate, setPickupDate,
    pickupTime, setPickupTime,
    showDatePicker, setShowDatePicker,
    showTimePicker, setShowTimePicker,
    searchClient, captureLocation,
    isFormValid, handleContinue,
  };
}
