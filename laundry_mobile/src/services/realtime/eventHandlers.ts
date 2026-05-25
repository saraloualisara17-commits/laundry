/**
 * WebSocket event → cache invalidation dispatcher.
 *
 * Every invalidation goes through the centralized helpers in
 * src/lib/query/invalidationHelpers.ts so that adding a new query key to a
 * domain only requires a change in one place.
 *
 * Reconciliation rule: React Query's invalidateQueries marks the entry stale
 * and triggers a background refetch.  If an optimistic update is still pending
 * (onMutate ran but onSettled hasn't yet), React Query holds the new fetch in
 * a "stale" queue and applies it after onSettled completes — so a WebSocket
 * event arriving during an in-flight optimistic update will never silently
 * overwrite optimistic data with server state mid-flight.
 */

import { queryClient } from '../query/queryClient';
import { queryKeys } from '../query/queryKeys';
import { RealtimeEventType, RealtimeEvent } from './realtimeEvents';
import { logger } from '../../lib/logger';
import {
  invalidateAfterStatusChange,
  invalidateAfterPayment,
  invalidateAfterOrderCreate,
  invalidateAfterDriverAssign,
} from '../../lib/query/invalidationHelpers';

export const handleRealtimeEvent = (event: RealtimeEvent) => {
  logger.socket.debug(`Event: ${event.type}`, { data: __DEV__ ? event.data : undefined } as any);

  const orderId: string | number | undefined = event.data?.id ?? event.data?.orderId;

  switch (event.type) {
    case RealtimeEventType.ORDER_STATUS_CHANGED:
      if (orderId) {
        invalidateAfterStatusChange(queryClient, orderId);
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.livreur.deliveries() });
      queryClient.invalidateQueries({ queryKey: queryKeys.livreur.pickups() });
      queryClient.invalidateQueries({ queryKey: queryKeys.livreur.stats() });
      break;

    case RealtimeEventType.ORDER_ASSIGNED:
    case RealtimeEventType.ORDER_DRIVER_ASSIGNED:
    case RealtimeEventType.ORDER_PICKUP_DRIVER_ASSIGNED:
      if (orderId) {
        invalidateAfterDriverAssign(queryClient, orderId);
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.livreur.deliveries() });
        queryClient.invalidateQueries({ queryKey: queryKeys.livreur.pickups() });
      }
      // Also refresh the list summary so the driver column shows the new name
      // without needing a full list reload — invalidate only list, not all
      if (orderId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.list() });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.livreur.stats() });
      break;

    case RealtimeEventType.ORDER_PAYMENT_ADDED:
      if (orderId) {
        invalidateAfterPayment(queryClient, orderId);
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.clients.debtList() });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.livreur.deliveries() });
      queryClient.invalidateQueries({ queryKey: queryKeys.livreur.pickups() });
      queryClient.invalidateQueries({ queryKey: queryKeys.livreur.stats() });
      break;

    case RealtimeEventType.ORDER_CREATED:
      invalidateAfterOrderCreate(queryClient);
      queryClient.invalidateQueries({ queryKey: queryKeys.livreur.pickups() });
      queryClient.invalidateQueries({ queryKey: queryKeys.livreur.stats() });
      break;

    case RealtimeEventType.ORDER_UPDATED:
      // Only invalidate the specific order's detail. The list order/count has
      // not changed — invalidating orders.all on every field-level edit causes
      // constant list re-fetches on busy days (30+ orders) and visible flicker.
      if (orderId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.details(orderId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.livreur.deliveries() });
        queryClient.invalidateQueries({ queryKey: queryKeys.livreur.pickups() });
      } else {
        // No orderId in event — fall back to broad invalidation
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.livreur.deliveries() });
        queryClient.invalidateQueries({ queryKey: queryKeys.livreur.pickups() });
      }
      break;

    case RealtimeEventType.ORDER_DELETED:
      // Remove from cache immediately to prevent stale detail views
      if (orderId) {
        queryClient.removeQueries({ queryKey: queryKeys.orders.details(orderId) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.livreur.pickups() });
      queryClient.invalidateQueries({ queryKey: queryKeys.livreur.deliveries() });
      queryClient.invalidateQueries({ queryKey: queryKeys.livreur.stats() });
      break;

    case RealtimeEventType.STATS_UPDATED:
      queryClient.invalidateQueries({ queryKey: queryKeys.statistics.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
      break;

    default:
      if (typeof event.type === 'string' && event.type.includes('ORDER')) {
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      }
      break;
  }
};
