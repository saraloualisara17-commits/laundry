import { Stack } from 'expo-router';
import { OrderCreationProvider } from '../../src/context/OrderCreationContext';

export default function AdminLayout() {
  return (
    <OrderCreationProvider>
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
        <Stack.Screen name="order-confirmation" options={{ presentation: 'fullScreenModal' }} />
      </Stack>
    </OrderCreationProvider>
  );
}
