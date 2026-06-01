import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/adminApi';
import { ordersApi } from '../../services/api/ordersApi';
import { queryKeys } from '../../services/query/queryKeys';
import { useAppMutation } from '../../lib/query/mutationFactory';
import { invalidateAfterDriverAssign } from '../../lib/query/invalidationHelpers';

export const useDriversList = (enabled = true) => {
  return useQuery({
    queryKey: queryKeys.users.drivers(),
    queryFn: () => adminApi.getUsers().then(res => res.data.filter((u: any) => {
      const r = u.role?.toLowerCase();
      return r === 'livreur' || r === 'admin';
    })),
    enabled,
  });
};

export const usePickupDriversList = (enabled = true) => {
  return useQuery({
    queryKey: queryKeys.users.pickup(),
    queryFn: () => adminApi.getUsers().then(res => res.data.filter((u: any) => {
      const r = u.role?.toLowerCase();
      return r === 'livreur' || r === 'admin';
    })),
    enabled,
  });
};

/**
 * Driver assignment mutations are idempotent (assigning the same driver twice
 * is safe), so a simple dedup by orderId is sufficient.
 */
export const useAssignDeliveryDriver = () => {
  const qc = useQueryClient();
  return useAppMutation<any, { id: string | number; driverId: string | number; scheduledDeliveryDate?: string }>({
    name: 'assignDeliveryDriver',
    mutationFn: ({ id, driverId, scheduledDeliveryDate }) =>
      adminApi.assignDeliveryDriver(String(id), String(driverId), scheduledDeliveryDate),
    dedupKey: (vars) => `assignDelivery:${vars.id}`,
    onSettled: (_data, _err, vars) => invalidateAfterDriverAssign(qc, vars.id),
  });
};

export const useAssignPickupDriver = () => {
  const qc = useQueryClient();
  return useAppMutation<any, { id: string | number; livreurId: string | number }>({
    name: 'assignPickupDriver',
    mutationFn: ({ id, livreurId }) => ordersApi.assignPickupDriver(id, livreurId),
    dedupKey: (vars) => `assignPickup:${vars.id}`,
    onSettled: (_data, _err, vars) => invalidateAfterDriverAssign(qc, vars.id),
  });
};
