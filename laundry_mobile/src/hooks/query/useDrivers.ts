import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/adminApi';
import { ordersApi } from '../../services/api/ordersApi';
import { queryKeys } from '../../services/query/queryKeys';

/**
 * Hook for list of drivers (users with role 'livreur' or 'admin').
 */
export const useDriversList = () => {
  return useQuery({
    queryKey: queryKeys.users.drivers(),
    queryFn: () => adminApi.getUsers().then(res => res.data.filter((u: any) => {
      const r = u.role?.toLowerCase();
      return r === 'livreur' || r === 'admin';
    })),
  });
};

/**
 * Hook for pickup drivers (livreur + admin).
 * Uses queryKeys.users.pickup() — a child of queryKeys.users.drivers() so that
 * invalidating all drivers also clears this subset.
 */
export const usePickupDriversList = () => {
  return useQuery({
    queryKey: queryKeys.users.pickup(),
    queryFn: () => adminApi.getUsers().then(res => res.data.filter((u: any) => {
      const r = u.role?.toLowerCase();
      return r === 'livreur' || r === 'admin';
    })),
  });
};

/**
 * Mutation for assigning a delivery driver.
 */
export const useAssignDeliveryDriver = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, driverId, scheduledDeliveryDate }: { id: string | number; driverId: string | number; scheduledDeliveryDate?: string }) =>
      adminApi.assignDeliveryDriver(String(id), String(driverId), scheduledDeliveryDate),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.details(variables.id) });
    },
  });
};

/**
 * Mutation for assigning a pickup driver.
 */
export const useAssignPickupDriver = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, livreurId }: { id: string | number; livreurId: string | number }) =>
      ordersApi.assignPickupDriver(id, livreurId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.details(variables.id) });
    },
  });
};
