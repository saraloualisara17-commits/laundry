export enum RealtimeEventType {
  ORDER_STATUS_CHANGED = 'ORDER_STATUS_CHANGED',
  ORDER_PAYMENT_ADDED = 'ORDER_PAYMENT_ADDED',
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_ASSIGNED = 'ORDER_ASSIGNED',
  STATS_UPDATED = 'STATS_UPDATED',
}

export interface RealtimeEvent {
  type: RealtimeEventType;
  data: any;
  timestamp: number;
}
