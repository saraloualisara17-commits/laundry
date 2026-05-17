import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/adminApi';
import { queryKeys } from '../../services/query/queryKeys';

/**
 * Hook for list of orders with optional filtering.
 */
export const useOrders = (filters?: any) => {
  return useQuery({
    queryKey: queryKeys.orders.list(filters),
    queryFn: () => adminApi.getOrders(filters).then(res => res.data),
  });
};

/**
 * Hook for orders with GPS coordinates (for Map).
 */
export const useOrdersForMap = () => {
  return useQuery({
    queryKey: queryKeys.orders.map(),
    queryFn: () => adminApi.getOrdersForMap().then(res => res.data),
  });
};

/**
 * Hook for unpaid orders list.
 */
export const useUnpaidOrders = () => {
  return useQuery({
    queryKey: queryKeys.orders.unpaid(),
    queryFn: () => adminApi.getAllUnpaidOrders().then(res => res.data),
  });
};

/**
 * Mutation for creating a new order.
 */
export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => adminApi.createOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

/**
 * Mutation for deleting an order.
 */
export const useDeleteOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => adminApi.deleteOrder(String(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};
