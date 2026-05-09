import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { store, RootState } from '../src/store/store';
import * as SecureStore from 'expo-secure-store';
import { setCredentials } from '../src/store/authSlice';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { OrderCreationProvider } from '../src/context/OrderCreationContext';

function RootLayoutNav() {
  const { user } = useSelector((state: RootState) => state.auth);
  const segments = useSegments();
  const router = useRouter();
  const dispatch = useDispatch();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await SecureStore.getItemAsync('user');
        const storedToken = await SecureStore.getItemAsync('accessToken');
        if (storedUser && storedToken) {
          dispatch(setCredentials({ 
            user: JSON.parse(storedUser), 
            token: storedToken 
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
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isLoggedIn = !!user;

    if (!isLoggedIn) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    } else {
      const isLivreur = user.role?.toLowerCase() === 'livreur';
      const rootSegment = segments[0];
      
      const inLivreurGroup = rootSegment === '(livreur)';
      const inAdminGroup = rootSegment === '(admin)';
      const isSharedRoute = ['order', 'client', 'modal'].includes(rootSegment);

      if (!isSharedRoute) {
        if (isLivreur && !inLivreurGroup) {
          router.replace('/(livreur)');
        } else if (!isLivreur && !inAdminGroup) {
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
      <Stack.Screen name="(livreur)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <OrderCreationProvider>
          <RootLayoutNav />
        </OrderCreationProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}
