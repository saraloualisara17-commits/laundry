import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/adminApi';
import { queryKeys } from '../../services/query/queryKeys';

/**
 * Hook for list of drivers (users with role 'livreur').
 */
export const useDriversList = () => {
  return useQuery({
    queryKey: queryKeys.users.drivers(),
    queryFn: () => adminApi.getUsers().then(res => res.data.filter((u: any) => u.role?.toLowerCase() === 'livreur')),
  });
};

/**
 * Mutation for assigning a delivery driver.
 */
export const useAssignDeliveryDriver = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, driverId }: { id: string | number; driverId: string | number }) => 
      adminApi.assignDeliveryDriver(String(id), String(driverId)),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.details(variables.id) });
    },
  });
};
