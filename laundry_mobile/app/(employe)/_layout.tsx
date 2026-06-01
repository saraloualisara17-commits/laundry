import { Stack } from 'expo-router';

export default function EmployeLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="gallery" />
    </Stack>
  );
}
