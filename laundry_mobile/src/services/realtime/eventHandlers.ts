import { queryClient } from '../query/queryClient';
import { queryKeys } from '../query/queryKeys';
import { RealtimeEventType, RealtimeEvent } from './realtimeEvents';

/**
 * Main entry point for processing incoming realtime WebSocket events.
 *
 * Invalidation strategy:
 *   - Use the most specific key possible so unrelated queries are not
 *     forced to refetch.
 *   - Invalidating a parent key (e.g. queryKeys.orders.all) cascades to all
 *     children, so prefer a child key when only part of the data changed.
 */
export const handleRealtimeEvent = (event: RealtimeEvent) => {
  if (__DEV__) {
    console.log(`[Realtime] Received event: ${event.type}`, event.data);
  }

  switch (event.type) {
    case RealtimeEventType.ORDER_STATUS_CHANGED:
    case RealtimeEventType.ORDER_ASSIGNED:
      invalidateOrderQueries(event.data?.id || event.data?.orderId);
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.livreur.deliveries() });
      queryClient.invalidateQueries({ queryKey: queryKeys.livreur.pickups() });
      queryClient.invalidateQueries({ queryKey: queryKeys.livreur.stats() });
      break;

    case RealtimeEventType.ORDER_PAYMENT_ADDED:
      invalidateOrderQueries(event.data?.id || event.data?.orderId);
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.debtList() });
      queryClient.invalidateQueries({ queryKey: queryKeys.livreur.deliveries() });
      queryClient.invalidateQueries({ queryKey: queryKeys.livreur.pickups() });
      queryClient.invalidateQueries({ queryKey: queryKeys.livreur.stats() });
      break;

    case RealtimeEventType.ORDER_CREATED:
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.livreur.pickups() });
      queryClient.invalidateQueries({ queryKey: queryKeys.livreur.stats() });
      break;

    case RealtimeEventType.STATS_UPDATED:
      queryClient.invalidateQueries({ queryKey: queryKeys.statistics.all });
      break;

    default:
      // Fallback: if the event name contains "ORDER" invalidate order lists only
      if (event.type?.toString().includes('ORDER')) {
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      }
      break;
  }
};

/**
 * Invalidates all cache entries related to a specific order.
 * Falls back to the full orders namespace when no id is available.
 */
const invalidateOrderQueries = (orderId?: string | number) => {
  if (!orderId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    return;
  }

  // Invalidate the detail entry — this also cascades to payments and history
  // because their keys are children of queryKeys.orders.details(id).
  queryClient.invalidateQueries({ queryKey: queryKeys.orders.details(orderId) });

  // Invalidate list views so the updated status/amount is reflected there too.
  queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
};
