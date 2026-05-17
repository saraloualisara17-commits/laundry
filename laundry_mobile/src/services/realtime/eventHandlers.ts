import { queryClient } from '../query/queryClient';
import { RealtimeEventType, RealtimeEvent } from './realtimeEvents';

/**
 * Main entry point for processing incoming realtime events.
 * Handles cache invalidation and data synchronization.
 */
export const handleRealtimeEvent = (event: RealtimeEvent) => {
  console.log(`[Realtime] Received event: ${event.type}`, event.data);

  switch (event.type) {
    case RealtimeEventType.ORDER_STATUS_CHANGED:
    case RealtimeEventType.ORDER_PAYMENT_ADDED:
    case RealtimeEventType.ORDER_ASSIGNED:
      invalidateOrderQueries(event.data?.id || event.data?.orderId);
      // Invalidate analytics when revenue or status changes
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      break;

    case RealtimeEventType.ORDER_CREATED:
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      break;

    case RealtimeEventType.STATS_UPDATED:
      queryClient.invalidateQueries({ queryKey: ['statistics'] });
      break;

    default:
      // Fallback for general invalidation if type is unknown or matches generic notifications
      if (event.type?.toString().includes('ORDER')) {
        queryClient.invalidateQueries({ queryKey: ['orders'] });
      }
  }
};

/**
 * Helper to invalidate specific order related queries
 */
const invalidateOrderQueries = (orderId?: string | number) => {
  if (!orderId) {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    return;
  }

  const id = String(orderId);
  
  // Invalidate specific order details
  queryClient.invalidateQueries({ queryKey: ['orders', 'detail', id] });
  
  // Invalidate list of orders as status/info changed
  queryClient.invalidateQueries({ queryKey: ['orders'] });
  
  // Invalidate related payments if needed
  queryClient.invalidateQueries({ queryKey: ['orders', 'detail', id, 'payments'] });
};
