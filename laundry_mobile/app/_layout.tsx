import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { Stack, useRouter, useSegments } from 'expo-router';
import { Provider, useSelector, useDispatch } from 'react-redux';

// Keep the splash visible until fonts are loaded. Must be called
// at module level before any rendering can occur.
SplashScreen.preventAutoHideAsync();
import { store, RootState } from '../src/store/store';
import * as SecureStore from 'expo-secure-store';
import { setCredentials } from '../src/store/authSlice';
import { ActivityIndicator, AppState, AppStateStatus, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { OrderCreationProvider } from '../src/context/OrderCreationContext';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../src/services/query/queryClient';
import { AppErrorBoundary } from '../components/ui/AppErrorBoundary';
import { syncManager } from '../src/services/offline/syncManager';
import { connectivity } from '../src/services/offline/connectivity';
import { uploadManager } from '../src/services/uploads';
import { socketClient } from '../src/services/realtime';
import { pushNotificationService } from '../src/services/notifications/pushNotificationService';
import { initI18n } from '../src/i18n';
import { settingsApi } from '../src/services/api/settingsApi';
import { queryKeys } from '../src/services/query/queryKeys';
import { fetchLogoBase64 } from '../src/utils/receiptHtml';
import {
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
  Cairo_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/cairo';
import { logger } from '../src/lib/logger';

const log = logger.ns('layout');

function isTokenValid(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // Give a 30-second buffer so a token expiring mid-startup still triggers refresh
    return typeof payload.exp === 'number' && payload.exp > Date.now() / 1000 + 30;
  } catch {
    return false;
  }
}

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
        }).then(() => {
          const settings = queryClient.getQueryData<any>(queryKeys.settings.all);
          if (settings?.logoUrl) fetchLogoBase64(settings.logoUrl).catch(() => {});
        });

        const storedUser = await SecureStore.getItemAsync('user');
        const storedToken = await SecureStore.getItemAsync('accessToken');
        if (storedUser && storedToken && isTokenValid(storedToken)) {
          dispatch(setCredentials({
            user: JSON.parse(storedUser),
            token: storedToken,
          }));
        } else if (storedToken && !isTokenValid(storedToken)) {
          // Token is expired — clear storage so the auth guard sends to login
          // instead of looping: expired token → 401 → refresh → fail → 401...
          await SecureStore.deleteItemAsync('accessToken');
          await SecureStore.deleteItemAsync('refreshToken');
          await SecureStore.deleteItemAsync('user');
        }
      } catch (e) {
        log.error('Failed to load user', { err: String(e) });
      } finally {
        setIsReady(true);
      }
    };
    loadUser();
  }, [dispatch]);

  // Start connectivity probing + offline queue sync once on mount.
  useEffect(() => {
    connectivity.start();
    syncManager.start();
    return () => {
      connectivity.stop();
      syncManager.stop();
    };
  }, []);

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

  // When the app returns to foreground: reconnect WebSocket if needed and
  // invalidate stale queries so drivers and employees see current order state.
  useEffect(() => {
    const appStateRef = { current: AppState.currentState };

    const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;

      if (prev.match(/inactive|background/) && next === 'active') {
        if (user?.id && !socketClient.active) {
          socketClient.connect(user.id);
        }
        syncManager.sync();
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['livreur'] });
      }
    });

    return () => subscription.remove();
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
      // Employees can visit (admin) for the shared order-creation flow.
      // Livreurs can visit specific (admin) screens:
      //   - order-items, order-summary: pickup confirmation flow
      //   - client-debt-detail: linked from livreur unpaid screen
      const livreurAdminScreens = ['order-items', 'order-summary', 'client-debt-detail', 'orders-by-status', 'order-client', 'map-picker'];
      const inLivreurPickupFlow = isLivreur && inAdminGroup && livreurAdminScreens.some(s => segments.includes(s));
      const isSharedRoute = ['order', 'client', 'modal', 'notifications', 'search', 'call-logs'].includes(rootSegment);

      if (!isSharedRoute) {
        if (isLivreur && !inLivreurGroup && !inLivreurPickupFlow) {
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
      <Stack.Screen name="notifications" />
      <Stack.Screen name="search" />
      <Stack.Screen name="order/[id]" />
      <Stack.Screen name="client/[id]" />
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

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    // Splash is still visible — return null to avoid a flash of unstyled content.
    return null;
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
