import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import 'text-encoding'; // Required for STOMP in some environments
import { handleRealtimeEvent } from './eventHandlers';
import { logger } from '../../lib/logger';
import * as SecureStore from 'expo-secure-store';

// Build the WebSocket URL from the API base URL.
// - http:// → ws://  (local dev)
// - https:// → wss:// (production)
const _apiBase = process.env.EXPO_PUBLIC_API_URL || 'https://resourceful-gratitude-production-6f76.up.railway.app';
const WS_URL = _apiBase.replace(/^https?/, (m) => (m === 'https' ? 'wss' : 'ws')) + '/ws';

const RECONNECT_BASE_MS = 2000;
const RECONNECT_MAX_MS = 60000;
// After this many consecutive failures we assume the token is stale and attempt
// a refresh before scheduling the next reconnect, rather than looping forever.
const AUTH_REFRESH_ATTEMPT_THRESHOLD = 2;

class SocketClient {
  private client: Client | null = null;
  private isConnected: boolean = false;
  private userId: string | number | null = null;
  private reconnectCount: number = 0;
  private subscriptions: Map<string, StompSubscription> = new Map();

  public connect(userId: string | number) {
    if (this.client?.active && this.userId === userId) return;

    if (this.client) {
      this.disconnect();
    }

    this.userId = userId;
    this.reconnectCount = 0;

    this.client = new Client({
      brokerURL: WS_URL,
      // reconnectDelay is overridden per-attempt in onWebSocketClose via client.reconnectDelay
      reconnectDelay: RECONNECT_BASE_MS,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: (str) => {
        logger.socket.debug(str);
      },
    });

    this.client.onConnect = () => {
      this.isConnected = true;
      if (this.reconnectCount > 0) {
        logger.socket.info('Reconnected', { attempts: this.reconnectCount });
      } else {
        logger.socket.info('Connected');
      }
      this.reconnectCount = 0;
      this.unsubscribeAll();
      this.subscribe();
    };

    this.client.onStompError = (frame) => {
      this.isConnected = false;
      logger.socket.error('STOMP error', { message: frame.headers['message'] });
    };

    this.client.onWebSocketClose = () => {
      if (this.isConnected) {
        this.reconnectCount += 1;
        // Exponential back-off: 2 s → 4 s → 8 s → … capped at 60 s
        const delay = Math.min(RECONNECT_BASE_MS * Math.pow(2, this.reconnectCount - 1), RECONNECT_MAX_MS);
        if (this.client) this.client.reconnectDelay = delay;
        logger.socket.warn('Connection closed — scheduling reconnect', { attempt: this.reconnectCount, delayMs: delay });

        // After repeated failures the access token may be expired. Attempt a
        // token refresh so the reconnect uses a valid credential instead of
        // looping forever at 60-second intervals on an auth-rejected connection.
        if (this.reconnectCount === AUTH_REFRESH_ATTEMPT_THRESHOLD) {
          this.refreshTokenAndReconnect();
        }
      }
      this.isConnected = false;
    };

    this.client.activate();
  }

  private subscribe() {
    if (!this.client || !this.userId) return;

    this.subscriptions.set(
      'orders',
      this.client.subscribe('/topic/orders', (msg: IMessage) => this.onMessageReceived(msg))
    );

    this.subscriptions.set(
      'userEvents',
      this.client.subscribe(`/user/${this.userId}/queue/events`, (msg: IMessage) => this.onMessageReceived(msg))
    );

    this.subscriptions.set(
      'notifications',
      this.client.subscribe(`/user/${this.userId}/queue/notifications`, (msg: IMessage) => this.onMessageReceived(msg))
    );
  }

  private unsubscribeAll() {
    this.subscriptions.forEach((sub) => {
      try { sub.unsubscribe(); } catch { /* already gone */ }
    });
    this.subscriptions.clear();
  }

  private onMessageReceived(message: IMessage) {
    try {
      const event = JSON.parse(message.body);
      logger.socket.debug('Event received', { type: event.type });
      handleRealtimeEvent(event);
    } catch (e) {
      logger.socket.error('Failed to parse message', { err: String(e) });
    }
  }

  private async refreshTokenAndReconnect() {
    try {
      logger.socket.info('Attempting token refresh before WebSocket reconnect');
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (!refreshToken) {
        logger.socket.warn('No refresh token — cannot recover WebSocket connection');
        return;
      }
      // Dynamically import to avoid circular dependency with client.ts
      const axios = require('axios').default;
      const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://resourceful-gratitude-production-6f76.up.railway.app';
      const res = await axios.post(`${BASE_URL}/auth/refresh`, null, {
        headers: { 'X-Refresh-Token': refreshToken },
      });
      const newToken: string = res.data.token;
      if (!newToken) return;

      const { store } = require('../../store/store');
      const { setCredentials } = require('../../store/authSlice');
      await SecureStore.setItemAsync('accessToken', newToken);
      store.dispatch(setCredentials({ token: newToken }));

      // Force a fresh connect with the new token; reset counter so backoff restarts
      logger.socket.info('Token refreshed — forcing fresh WebSocket connect');
      this.reconnectCount = 0;
      if (this.client) {
        this.client.deactivate().then(() => {
          if (this.userId) this.connect(this.userId);
        });
      }
    } catch (e) {
      logger.socket.error('Token refresh for WebSocket failed', { err: String(e) });
      // Refresh failed — force logout so the user re-authenticates
      const { store } = require('../../store/store');
      const { logOut } = require('../../store/authSlice');
      store.dispatch(logOut());
    }
  }

  public disconnect() {
    if (this.client) {
      this.unsubscribeAll();
      this.client.deactivate();
      this.client = null;
      this.isConnected = false;
      this.userId = null;
    }
  }

  public get active() {
    return this.isConnected;
  }
}

export const socketClient = new SocketClient();
