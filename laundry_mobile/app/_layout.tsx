import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { store, RootState } from '../src/store/store';
import * as SecureStore from 'expo-secure-store';
import { setCredentials } from '../src/store/authSlice';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { OrderCreationProvider } from '../src/context/OrderCreationContext';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../src/services/query/queryClient';
import { AppErrorBoundary } from '../components/ui/AppErrorBoundary';
import { syncManager } from '../src/services/offline';
import { uploadManager } from '../src/services/uploads';
import { socketClient } from '../src/services/realtime';
import { pushNotificationService } from '../src/services/notifications/pushNotificationService';
import { initI18n } from '../src/i18n';
import { settingsApi } from '../src/services/api/settingsApi';
import { queryKeys } from '../src/services/query/queryKeys';
import {
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
  Cairo_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/cairo';

function RootLayoutNav() {
  const { user } = useSelector((state: RootState) => state.auth);
  const segments = useSegments();
  const router = useRouter();
  const dispatch = useDispatch();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        // Init i18n first so language is correct before any screen renders
        await initI18n();

        // Prefetch settings into the React Query cache so every screen that
        // calls useSettings() gets data instantly without its own network hit.
        // staleTime: Infinity means this result is never invalidated by time —
        // only by an explicit updateSettings mutation.
        queryClient.prefetchQuery({
          queryKey: queryKeys.settings.all,
          queryFn: settingsApi.getSettings,
          staleTime: Infinity,
        });

        const storedUser = await SecureStore.getItemAsync('user');
        const storedToken = await SecureStore.getItemAsync('accessToken');
        if (storedUser && storedToken) {
          dispatch(setCredentials({
            user: JSON.parse(storedUser),
            token: storedToken,
          }));
        }
      } catch (e) {
        console.error('Failed to load user', e);
      } finally {
        setIsReady(true);
      }
    };
    loadUser();
  }, [dispatch]);

  useEffect(() => {
    if (user?.id) {
      socketClient.connect(user.id);
      pushNotificationService.registerForPushNotificationsAsync(user.id);
    } else {
      socketClient.disconnect();
    }

    const removeHandlers = pushNotificationService.initHandlers();

    return () => {
      removeHandlers();
    };
  }, [user?.id]);

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isLoggedIn = !!user;

    if (!isLoggedIn) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    } else {
      const role = user.role?.toLowerCase();
      const isLivreur  = role === 'livreur';
      const isEmploye  = role === 'employe';
      const rootSegment = segments[0];

      const inLivreurGroup = rootSegment === '(livreur)';
      const inAdminGroup   = rootSegment === '(admin)';
      const inEmployeGroup = rootSegment === '(employe)';
      // Employees can visit (admin) for the shared order-creation flow
      const isSharedRoute = ['order', 'client', 'modal'].includes(rootSegment);

      if (!isSharedRoute) {
        if (isLivreur && !inLivreurGroup) {
          router.replace('/(livreur)');
        } else if (isEmploye && !inEmployeGroup && !inAdminGroup) {
          router.replace('/(employe)');
        } else if (!isLivreur && !isEmploye && !inAdminGroup) {
          router.replace('/(admin)');
        }
      }
    }
  }, [user, segments, isReady]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0D7377" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(admin)" />
      <Stack.Screen name="(employe)" />
      <Stack.Screen name="(livreur)" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
    Cairo_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0D7377" />
      </View>
    );
  }

  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Provider store={store}>
            <OrderCreationProvider>
              <RootLayoutNav />
            </OrderCreationProvider>
          </Provider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
