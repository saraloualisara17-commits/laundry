import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/adminApi';
import { queryKeys } from '../../services/query/queryKeys';

/**
 * Hook for list of orders with optional filtering (non-paginated, for small result sets).
 */
export const useOrders = (filters?: any) => {
  return useQuery({
    queryKey: queryKeys.orders.list(filters),
    queryFn: () => adminApi.getOrders(filters).then(res => res.data),
  });
};

/**
 * Hook for paginated order lists with infinite scroll.
 * Replaces the manual page/setState pattern in list screens.
 */
export const useInfiniteOrders = (filters?: any) => {
  const baseFilters = filters || {};
  return useInfiniteQuery({
    queryKey: queryKeys.orders.list(baseFilters),
    queryFn: ({ pageParam = 0 }) =>
      adminApi.getOrders({ ...baseFilters, page: pageParam, limit: 20 }).then(res => res.data),
    initialPageParam: 0,
    getNextPageParam: (lastPage: any, allPages: any[]) => {
      const content = lastPage.content || lastPage || [];
      const isLast = lastPage.last ?? (content.length < 20);
      return isLast ? undefined : allPages.length;
    },
  });
};

/**
 * Hook for orders with GPS coordinates (for Map).
 */
export const useOrdersForMap = (livreurId?: string | number) => {
  return useQuery({
    queryKey: [...queryKeys.orders.map(), { livreurId }],
    queryFn: () => adminApi.getOrdersForMap(livreurId).then(res => res.data),
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
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
};
