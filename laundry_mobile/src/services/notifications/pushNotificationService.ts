import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import client from '../api/client';
import { router } from 'expo-router';

/**
 * Note: We use dynamic requires for expo-notifications because 
 * SDK 53+ triggers a crash/warning in Expo Go on Android during module evaluation 
 * due to removed functionality.
 */

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export const pushNotificationService = {
  /**
   * Request permissions and get Expo Push Token
   */
  async registerForPushNotificationsAsync(userId: number | string) {
    if (!Device.isDevice || isExpoGo) {
      if (isExpoGo) {
        console.warn('[PushNotification] Registration skipped: Push notifications are not supported in Expo Go (SDK 53+).');
      }
      return null;
    }

    try {
      const Notifications = require('expo-notifications');

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }

      // Get project ID from constants
      const projectId = 
        Constants?.expoConfig?.extra?.eas?.projectId ?? 
        Constants?.easConfig?.projectId;

      if (!projectId) {
        console.warn('[PushNotification] Registration skipped: No projectId found in app.json.');
        return null;
      }

      // Get the token from Expo
      const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId
      });
      const token = tokenData.data;

      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      // Register token with the backend
      try {
        await client.post(`/api/users/${userId}/push-token`, { token });
        console.log('Push token registered with backend successfully');
      } catch (error) {
        console.error('Failed to register push token with backend', error);
      }

      return token;
    } catch (e) {
      console.error('[PushNotification] Error during registration:', e);
      return null;
    }
  },

  /**
   * Set up notification listeners
   */
  initHandlers() {
    if (isExpoGo) return () => {};

    try {
      const Notifications = require('expo-notifications');

      // Configure how notifications are displayed when the app is in the foreground
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });

      // This listener is fired whenever a notification is received while the app is foregrounded
      const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
        console.log('Notification received in foreground:', notification);
      });

      // This listener is fired whenever a user taps on or interacts with a notification 
      const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
        const { data } = response.notification.request.content;
        console.log('Notification interaction:', data);
        
        this.handleNotificationNavigation(data);
      });

      return () => {
        foregroundSubscription.remove();
        responseSubscription.remove();
      };
    } catch (e) {
      console.error('[PushNotification] Failed to init handlers:', e);
      return () => {};
    }
  },

  /**
   * Deep linking logic based on notification data
   */
  handleNotificationNavigation(data: any) {
    if (!data) return;

    const { type, referenceId } = data;

    switch (type) {
      case 'NEW_ORDER':
      case 'ORDER_STATUS_CHANGED':
      case 'ORDER_ASSIGNED':
      case 'ORDER_PAYMENT_ADDED':
        if (referenceId) {
          router.push(`/order/${referenceId}`);
        }
        break;
      
      case 'UNPAID_REMINDER':
        router.push('/(admin)/unpaid-orders');
        break;

      default:
        console.log('Unknown notification type or no reference ID:', type);
    }
  }
};
