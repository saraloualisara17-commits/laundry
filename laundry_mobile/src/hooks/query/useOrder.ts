import { useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from '../../utils/uuid';
import { adminApi } from '../../services/adminApi';
import { queryKeys } from '../../services/query/queryKeys';
import { useAppMutation } from '../../lib/query/mutationFactory';
import {
  orderStatusOptimistic,
  paymentOptimistic,
  orderImagesOptimistic,
} from '../../lib/query/optimisticHelpers';
import {
  invalidateAfterStatusChange,
  invalidateOrderPayments,
  invalidateOrderDetail,
} from '../../lib/query/invalidationHelpers';

export const useOrder = (id: string | number) => {
  const orderQuery = useQuery({
    queryKey: queryKeys.orders.details(id),
    queryFn: () => adminApi.getOrder(String(id)).then(res => res.data),
    enabled: !!id,
  });

  const paymentsQuery = useQuery({
    queryKey: queryKeys.orders.payments(id),
    queryFn: () => adminApi.getOrderPayments(String(id)).then(res => res.data).catch(() => []),
    enabled: !!id,
  });

  const historyQuery = useQuery({
    queryKey: queryKeys.orders.history(id),
    queryFn: () => adminApi.getOrderHistory(String(id)).then(res => res.data).catch(() => []),
    enabled: !!id,
  });

  return {
    order: orderQuery.data,
    payments: paymentsQuery.data || [],
    history: historyQuery.data || [],
    loading: orderQuery.isLoading,
    isError: orderQuery.isError,
    error: orderQuery.error,
    refetch: () => Promise.all([orderQuery.refetch(), paymentsQuery.refetch(), historyQuery.refetch()]),
    isRefreshing: orderQuery.isRefetching,
  };
};

/**
 * Status update with optimistic UI and dedup guard.
 * Only one status change per order can be in-flight at a time — prevents
 * double-tap from firing two concurrent PATCH requests.
 */
export const useUpdateOrderStatus = () => {
  const qc = useQueryClient();

  return useAppMutation<any, { id: string | number; status: string; data?: any }>({
    name: 'updateOrderStatus',
    mutationFn: ({ id, status, data }) => adminApi.updateOrderStatus(String(id), status, data),
    dedupKey: (vars) => `status:${vars.id}`,
    optimistic: {
      cancelKeys: (v) => [queryKeys.orders.details(v.id)],
      snapshot: (v) => qc.getQueryData(queryKeys.orders.details(v.id)),
      apply: (v) => {
        qc.setQueryData(queryKeys.orders.details(v.id), (old: any) =>
          old ? { ...old, status: v.status, ...(v.data ?? {}) } : old
        );
      },
      restore: (snap, v) => {
        if (snap !== undefined) qc.setQueryData(queryKeys.orders.details(v.id), snap);
      },
    },
    onSettled: (_data, _err, vars) => {
      invalidateAfterStatusChange(qc, vars.id);
    },
  });
};

/**
 * Payment with optimistic UI and per-order dedup guard.
 * Each call generates a fresh UUID idempotency key so a network retry
 * (or offline queue replay) never creates a duplicate payment record.
 */
export const useAddPayment = () => {
  const qc = useQueryClient();

  return useAppMutation<any, { id: string | number; amount: number; note?: string; modePaiement?: string }>({
    name: 'addPayment',
    mutationFn: ({ id, amount, note, modePaiement }) => {
      const idempotencyKey = randomUUID();
      return adminApi.addOrderPayment(String(id), amount, note, modePaiement, idempotencyKey);
    },
    dedupKey: (vars) => `payment:${vars.id}`,
    optimistic: {
      cancelKeys: (v) => [queryKeys.orders.details(v.id), queryKeys.orders.payments(v.id)],
      snapshot: (v) => ({
        order: qc.getQueryData(queryKeys.orders.details(v.id)),
        payments: qc.getQueryData(queryKeys.orders.payments(v.id)),
      }),
      apply: (v) => {
        qc.setQueryData(queryKeys.orders.details(v.id), (old: any) =>
          old ? { ...old, montantPaye: (Number(old.montantPaye) || 0) + Number(v.amount) } : old
        );
        qc.setQueryData(queryKeys.orders.payments(v.id), (old: any[] = []) => [
          { id: `temp-${Date.now()}`, montant: v.amount, note: v.note, datePaiement: new Date().toISOString() },
          ...old,
        ]);
      },
      restore: (snap, v) => {
        if (snap.order !== undefined) qc.setQueryData(queryKeys.orders.details(v.id), snap.order);
        if (snap.payments !== undefined) qc.setQueryData(queryKeys.orders.payments(v.id), snap.payments);
      },
    },
    onSettled: (_data, _err, vars) => {
      invalidateOrderPayments(qc, vars.id);
    },
  });
};

export const useAddOrderImages = () => {
  const qc = useQueryClient();

  return useAppMutation<any, { id: string | number; imageUrls: string[]; type: string }>({
    name: 'addOrderImages',
    mutationFn: ({ id, imageUrls, type }) => adminApi.addOrderImages(String(id), imageUrls, type),
    optimistic: {
      cancelKeys: (v) => [queryKeys.orders.details(v.id)],
      snapshot: (v) => qc.getQueryData(queryKeys.orders.details(v.id)),
      apply: (v) => {
        qc.setQueryData(queryKeys.orders.details(v.id), (old: any) =>
          old
            ? {
                ...old,
                images: [
                  ...(old.images ?? []),
                  ...v.imageUrls.map((url) => ({ imageUrl: url, photoType: v.type })),
                ],
              }
            : old
        );
      },
      restore: (snap, v) => {
        if (snap !== undefined) qc.setQueryData(queryKeys.orders.details(v.id), snap);
      },
    },
    onSettled: (_data, _err, vars) => {
      invalidateOrderDetail(qc, vars.id);
    },
  });
};
