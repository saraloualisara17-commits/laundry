import { Client, IMessage } from '@stomp/stompjs';
import 'text-encoding'; // Required for STOMP in some environments
import { RealtimeEventType } from './realtimeEvents';
import { handleRealtimeEvent } from './eventHandlers';

const WS_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.105:8080').replace('http', 'ws') + '/ws/websocket';

class SocketClient {
  private client: Client | null = null;
  private isConnected: boolean = false;
  private userId: string | number | null = null;

  public connect(userId: string | number) {
    if (this.client?.active && this.userId === userId) return;
    
    if (this.client) {
      this.disconnect();
    }

    this.userId = userId;
    
    this.client = new Client({
      brokerURL: WS_URL,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: (str) => {
        if (__DEV__) console.log('[Socket] ' + str);
      },
    });

    this.client.onConnect = (frame) => {
      this.isConnected = true;
      console.log('[Socket] Connected');
      this.subscribe();
    };

    this.client.onStompError = (frame) => {
      console.error('[Socket] Stomp error', frame.headers['message']);
      this.isConnected = false;
    };

    this.client.onWebSocketClose = () => {
      this.isConnected = false;
      console.log('[Socket] Connection closed');
    };

    this.client.activate();
  }

  private subscribe() {
    if (!this.client || !this.userId) return;

    // Subscribe to general topics
    this.client.subscribe('/topic/orders', (message: IMessage) => {
      this.onMessageReceived(message);
    });

    // Subscribe to user-specific notifications/events
    this.client.subscribe(`/user/${this.userId}/queue/events`, (message: IMessage) => {
      this.onMessageReceived(message);
    });

    // Support for the notification slice as well
    this.client.subscribe('/user/queue/notifications', (message: IMessage) => {
      this.onMessageReceived(message);
    });
  }

  private onMessageReceived(message: IMessage) {
    try {
      const event = JSON.parse(message.body);
      handleRealtimeEvent(event);
    } catch (e) {
      console.error('[Socket] Failed to parse message', e);
    }
  }

  public disconnect() {
    if (this.client) {
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
