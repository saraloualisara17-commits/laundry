/**
 * invalidationHelpers — canonical post-mutation cache invalidation recipes.
 *
 * Centralising these here means:
 *  - Every hook that touches the same entity invalidates the same keys.
 *  - Adding a new query key to a domain only requires updating one place.
 *  - WebSocket eventHandlers can call the same helper for consistency.
 *
 * Each function receives the QueryClient and any needed identifiers and
 * fires the invalidations.  Functions are intentionally synchronous (fire-and-
 * forget) — React Query batches them internally.
 */

import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../services/query/queryKeys';

// ─── Order ─────────────────────────────────────────────────────────────────────

/**
 * Invalidate the detail view plus all list views that would show this order.
 * Use after any mutation that changes an order's status, totals, or assignment.
 */
export function invalidateOrderDetail(qc: QueryClient, orderId: string | number) {
  qc.invalidateQueries({ queryKey: queryKeys.orders.details(orderId) });
  qc.invalidateQueries({ queryKey: queryKeys.orders.all });
}

/**
 * Invalidate order payment list and the order detail (montantPaye changes).
 */
export function invalidateOrderPayments(qc: QueryClient, orderId: string | number) {
  qc.invalidateQueries({ queryKey: queryKeys.orders.details(orderId) });
  qc.invalidateQueries({ queryKey: queryKeys.orders.payments(orderId) });
}

/**
 * Invalidate everything an order creation touches:
 * all order lists + dashboard stats + livreur pickup queues.
 */
export function invalidateAfterOrderCreate(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: queryKeys.orders.all });
  qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
}

/**
 * Full invalidation after a status change — order detail, history, lists,
 * dashboard, and livreur mission queues (status may change driver workload).
 */
export function invalidateAfterStatusChange(qc: QueryClient, orderId: string | number) {
  qc.invalidateQueries({ queryKey: queryKeys.orders.details(orderId) });
  qc.invalidateQueries({ queryKey: queryKeys.orders.history(orderId) });
  qc.invalidateQueries({ queryKey: queryKeys.orders.all });
  qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
}

/**
 * After a payment: order detail, payments list, dashboard (revenue changes),
 * and the clients debt list (outstanding balance changes).
 */
export function invalidateAfterPayment(qc: QueryClient, orderId: string | number) {
  qc.invalidateQueries({ queryKey: queryKeys.orders.details(orderId) });
  qc.invalidateQueries({ queryKey: queryKeys.orders.payments(orderId) });
  qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  qc.invalidateQueries({ queryKey: queryKeys.clients.debtList() });
}

/**
 * After assigning a driver: order detail (shows new driver) + livreur queues
 * (assignment may appear in driver's pickup / delivery list).
 */
export function invalidateAfterDriverAssign(qc: QueryClient, orderId: string | number) {
  qc.invalidateQueries({ queryKey: queryKeys.orders.details(orderId) });
  qc.invalidateQueries({ queryKey: queryKeys.livreur.deliveries() });
  qc.invalidateQueries({ queryKey: queryKeys.livreur.pickups() });
}

// ─── Client ────────────────────────────────────────────────────────────────────

/**
 * After creating or updating a client.
 */
export function invalidateAfterClientSave(qc: QueryClient, clientId?: string | number) {
  qc.invalidateQueries({ queryKey: queryKeys.clients.all });
  if (clientId) {
    qc.invalidateQueries({ queryKey: queryKeys.clients.detail(clientId) });
  }
}

// ─── Livreur missions ─────────────────────────────────────────────────────────

/**
 * After any livreur action (cancel, return, deliver, pick-up).
 */
export function invalidateAfterLivreurAction(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: queryKeys.livreur.deliveries() });
  qc.invalidateQueries({ queryKey: queryKeys.livreur.pickups() });
  qc.invalidateQueries({ queryKey: queryKeys.livreur.stats() });
}
