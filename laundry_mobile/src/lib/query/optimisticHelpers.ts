/**
 * optimisticHelpers — reusable cache-patch builders for common entity shapes.
 *
 * Each helper returns an OptimisticConfig<TData, TVariables, TSnapshot> object
 * that can be dropped directly into useAppMutation({ optimistic: ... }).
 *
 * The helpers do NOT call useQueryClient directly — they receive it as a
 * parameter so they are plain functions (no React rules, easily testable).
 */

import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../services/query/queryKeys';
import { OptimisticConfig } from './mutationFactory';

// ─── Order status update ──────────────────────────────────────────────────────

export function orderStatusOptimistic(
  qc: QueryClient,
  vars: { id: string | number; status: string; data?: any }
): OptimisticConfig<any, typeof vars, any> {
  return {
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
  };
}

// ─── Payment addition ─────────────────────────────────────────────────────────

export function paymentOptimistic(
  qc: QueryClient,
  vars: { id: string | number; amount: number; note?: string }
): OptimisticConfig<any, typeof vars, { order: any; payments: any }> {
  return {
    cancelKeys: (v) => [
      queryKeys.orders.details(v.id),
      queryKeys.orders.payments(v.id),
    ],
    snapshot: (v) => ({
      order: qc.getQueryData(queryKeys.orders.details(v.id)),
      payments: qc.getQueryData(queryKeys.orders.payments(v.id)),
    }),
    apply: (v) => {
      qc.setQueryData(queryKeys.orders.details(v.id), (old: any) =>
        old
          ? { ...old, montantPaye: (Number(old.montantPaye) || 0) + Number(v.amount) }
          : old
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
  };
}

// ─── Order images ──────────────────────────────────────────────────────────────

export function orderImagesOptimistic(
  qc: QueryClient,
  vars: { id: string | number; imageUrls: string[]; type: string }
): OptimisticConfig<any, typeof vars, any> {
  return {
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
  };
}

// ─── Livreur mission removal (cancel / return) ────────────────────────────────

export function livreurDeliveryRemoveOptimistic(qc: QueryClient): OptimisticConfig<any, string | number, any[]> {
  return {
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
  };
}
