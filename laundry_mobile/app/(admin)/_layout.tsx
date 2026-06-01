import { Stack } from 'expo-router';
import { OrderCreationProvider } from '../../src/context/OrderCreationContext';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="create-order" />
      <Stack.Screen name="order-client" />
      <Stack.Screen name="order-items" />
      <Stack.Screen name="order-summary" />
      <Stack.Screen name="map-picker" />
      <Stack.Screen name="unpaid-orders" />
      <Stack.Screen name="client-debt-detail" />
      <Stack.Screen name="all-orders-map" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="gallery" options={{ headerShown: false }} />
      <Stack.Screen name="late-orders" options={{ headerShown: false }} />
      <Stack.Screen name="order-confirmation" options={{ presentation: 'fullScreenModal' }} />
    </Stack>
  );
}
