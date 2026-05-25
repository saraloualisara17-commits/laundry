import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { ordersApi } from '../../services/api/ordersApi';
import { statisticsApi } from '../../services/api/statisticsApi';
import { queryKeys } from '../../services/query/queryKeys';
import { RootState } from '../../store/store';
import { useAppMutation } from '../../lib/query/mutationFactory';
import { invalidateAfterLivreurAction } from '../../lib/query/invalidationHelpers';

const useIsLivreur = () => {
  const role = useSelector((state: RootState) => state.auth.user?.role);
  return role === 'LIVREUR';
};

// 30 seconds — delivery and pickup lists are time-sensitive; drivers act on
// this data immediately and need near-live freshness without manual refresh.
const MISSION_STALE_TIME = 1000 * 30;

// ─── QUERIES ─────────────────────────────────────────────────────────────────

export const useLivreurStats = () => {
  const isLivreur = useIsLivreur();
  return useQuery({
    queryKey: queryKeys.livreur.stats(),
    queryFn: () => statisticsApi.getLivreurDashboardStats().then(res => res.data),
    enabled: isLivreur,
  });
};

export const useReadyDeliveries = () => {
  const isLivreur = useIsLivreur();
  return useQuery({
    queryKey: queryKeys.livreur.deliveries(),
    queryFn: () =>
      ordersApi.getReadyDeliveries().then(res => res.data.data ?? res.data ?? []),
    staleTime: MISSION_STALE_TIME,
    enabled: isLivreur,
  });
};

export const usePendingPickups = () => {
  const isLivreur = useIsLivreur();
  return useQuery({
    queryKey: queryKeys.livreur.pickups(),
    queryFn: () =>
      ordersApi.getPendingPickups().then(res => res.data.data ?? res.data ?? []),
    staleTime: MISSION_STALE_TIME,
    enabled: isLivreur,
  });
};

export const useCancelledDeliveries = () => {
  const isLivreur = useIsLivreur();
  return useQuery({
    queryKey: queryKeys.livreur.cancelled(),
    queryFn: () =>
      ordersApi.getPastDeliveries().then(res => res.data.data ?? res.data ?? []),
    enabled: isLivreur,
  });
};

// ─── MUTATIONS ───────────────────────────────────────────────────────────────

/**
 * Cancels a delivery. Optimistically removes the order from the deliveries
 * list so the driver sees instant feedback; rolls back on failure.
 * Dedup guard: only one cancel per order can be in-flight at a time.
 */
export const useCancelDelivery = () => {
  const qc = useQueryClient();

  return useAppMutation<any, number | string>({
    name: 'cancelDelivery',
    mutationFn: (orderId) => ordersApi.cancelDelivery(orderId),
    dedupKey: (orderId) => `cancelDelivery:${orderId}`,
    optimistic: {
      cancelKeys: () => [queryKeys.livreur.deliveries()],
      snapshot: () => qc.getQueryData<any[]>(queryKeys.livreur.deliveries()) ?? [],
      apply: (orderId) => {
        qc.setQueryData<any[]>(queryKeys.livreur.deliveries(), (old = []) =>
          old.filter((o) => String(o.id) !== String(orderId))
        );
      },
      restore: (snap) => {
        qc.setQueryData(queryKeys.livreur.deliveries(), snap);
      },
    },
    onSettled: () => invalidateAfterLivreurAction(qc),
  });
};

/**
 * Returns an order to the workshop. Optimistically removes from the deliveries
 * list; rolls back on failure.
 */
export const useReturnToWorkplace = () => {
  const qc = useQueryClient();

  return useAppMutation<any, number | string>({
    name: 'returnToWorkplace',
    mutationFn: (orderId) => ordersApi.returnToWorkplace(orderId),
    dedupKey: (orderId) => `returnToWorkplace:${orderId}`,
    optimistic: {
      cancelKeys: () => [queryKeys.livreur.deliveries()],
      snapshot: () => qc.getQueryData<any[]>(queryKeys.livreur.deliveries()) ?? [],
      apply: (orderId) => {
        qc.setQueryData<any[]>(queryKeys.livreur.deliveries(), (old = []) =>
          old.filter((o) => String(o.id) !== String(orderId))
        );
      },
      restore: (snap) => {
        qc.setQueryData(queryKeys.livreur.deliveries(), snap);
      },
    },
    onSettled: () => invalidateAfterLivreurAction(qc),
  });
};

/**
 * Updates order status during a mission (PICKED_UP or DELIVERED).
 * Dedup: one status change per order in-flight at a time — prevents double-tap
 * in the confirm modal from firing two concurrent PATCH requests.
 */
export const useUpdateOrderStatusMission = () => {
  const qc = useQueryClient();

  return useAppMutation<
    any,
    {
      orderId: number | string;
      status: 'PICKED_UP' | 'DELIVERED';
      amount?: number;
      notesPaiement?: string;
      // Per-attempt UUID for the payment embedded in a DELIVERED transition.
      // The server uses it to prevent a duplicate payment if the network drops
      // after commit and the client retries. Must be generated once per tap,
      // not per session (a new delivery attempt = a new UUID).
      paymentIdempotencyKey?: string;
    }
  >({
    name: 'updateOrderStatusMission',
    mutationFn: ({ orderId, status, amount, notesPaiement, paymentIdempotencyKey }) =>
      ordersApi.updateStatus(orderId, { status, amount, notesPaiement, paymentIdempotencyKey }),
    dedupKey: (vars) => `missionStatus:${vars.orderId}`,
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.orders.details(vars.orderId) });
      invalidateAfterLivreurAction(qc);
    },
  });
};

export const useLivreurCreateOrder = () => {
  const qc = useQueryClient();

  return useAppMutation<any, any>({
    name: 'livreurCreateOrder',
    mutationFn: (orderData) => ordersApi.createOrder(orderData),
    dedupKey: (data) => `createOrder:${data?.creationIdempotencyKey ?? 'unknown'}`,
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orders.all });
      qc.invalidateQueries({ queryKey: queryKeys.livreur.stats() });
    },
  });
};
