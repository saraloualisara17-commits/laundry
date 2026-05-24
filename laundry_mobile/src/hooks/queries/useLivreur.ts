import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { ordersApi } from '../../services/api/ordersApi';
import { statisticsApi } from '../../services/api/statisticsApi';
import { queryKeys } from '../../services/query/queryKeys';
import { RootState } from '../../store/store';

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
 */
export const useCancelDelivery = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (orderId: number | string) => ordersApi.cancelDelivery(orderId),

    onMutate: async (orderId) => {
      await qc.cancelQueries({ queryKey: queryKeys.livreur.deliveries() });
      const previous = qc.getQueryData<any[]>(queryKeys.livreur.deliveries());
      qc.setQueryData<any[]>(queryKeys.livreur.deliveries(), (old = []) =>
        old.filter(o => String(o.id) !== String(orderId))
      );
      return { previous };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(queryKeys.livreur.deliveries(), ctx.previous);
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.livreur.deliveries() });
      qc.invalidateQueries({ queryKey: queryKeys.livreur.stats() });
    },
  });
};

/**
 * Returns an order to the workshop. Optimistically removes from the deliveries
 * list; rolls back on failure.
 */
export const useReturnToWorkplace = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (orderId: number | string) => ordersApi.returnToWorkplace(orderId),

    onMutate: async (orderId) => {
      await qc.cancelQueries({ queryKey: queryKeys.livreur.deliveries() });
      const previous = qc.getQueryData<any[]>(queryKeys.livreur.deliveries());
      qc.setQueryData<any[]>(queryKeys.livreur.deliveries(), (old = []) =>
        old.filter(o => String(o.id) !== String(orderId))
      );
      return { previous };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(queryKeys.livreur.deliveries(), ctx.previous);
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.livreur.deliveries() });
      qc.invalidateQueries({ queryKey: queryKeys.livreur.stats() });
    },
  });
};

/**
 * Updates order status during a mission (PICKED_UP or DELIVERED).
 * Invalidates the specific order detail plus whichever mission list it
 * belonged to — pickups for PICKED_UP, deliveries for DELIVERED.
 * Also refreshes stats so dashboard counters update immediately.
 */
export const useUpdateOrderStatusMission = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      status,
      amount,
      notesPaiement,
    }: {
      orderId: number | string;
      status: 'PICKED_UP' | 'DELIVERED';
      amount?: number;
      notesPaiement?: string;
    }) => ordersApi.updateStatus(orderId, { status, amount, notesPaiement }),

    onSuccess: (_data, variables) => {
      // Invalidate the individual order so the order detail screen refreshes
      qc.invalidateQueries({
        queryKey: queryKeys.orders.details(variables.orderId),
      });

      if (variables.status === 'PICKED_UP') {
        qc.invalidateQueries({ queryKey: queryKeys.livreur.pickups() });
      } else {
        qc.invalidateQueries({ queryKey: queryKeys.livreur.deliveries() });
      }

      qc.invalidateQueries({ queryKey: queryKeys.livreur.stats() });
    },
  });
};

/**
 * Creates a new order from the livreur flow.
 * On success invalidates the global orders namespace so any admin list also
 * reflects the new entry.
 */
export const useLivreurCreateOrder = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (orderData: any) => ordersApi.createOrder(orderData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orders.all });
      qc.invalidateQueries({ queryKey: queryKeys.livreur.stats() });
    },
  });
};
