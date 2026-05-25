import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/adminApi';
import { queryKeys } from '../../services/query/queryKeys';
import { useAppMutation } from '../../lib/query/mutationFactory';
import { invalidateAfterOrderCreate } from '../../lib/query/invalidationHelpers';

export const useOrders = (filters?: any) => {
  return useQuery({
    queryKey: queryKeys.orders.list(filters),
    queryFn: () => adminApi.getOrders(filters).then(res => res.data),
  });
};

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

export const useOrdersForMap = (livreurId?: string | number) => {
  return useQuery({
    queryKey: [...queryKeys.orders.map(), { livreurId }],
    queryFn: () => adminApi.getOrdersForMap(livreurId).then(res => res.data),
  });
};

export const useUnpaidOrders = () => {
  return useQuery({
    queryKey: queryKeys.orders.unpaid(),
    queryFn: () => adminApi.getAllUnpaidOrders().then(res => res.data),
  });
};

export const useCreateOrder = () => {
  const qc = useQueryClient();
  return useAppMutation<any, any>({
    name: 'createOrder',
    // dedupKey derived from the creationIdempotencyKey the caller embeds in
    // the payload — prevents double-submission if the user taps Submit twice.
    // The server uses the same key to return the existing order on retry.
    mutationFn: (data) => adminApi.createOrder(data),
    dedupKey: (data) => `createOrder:${data?.creationIdempotencyKey ?? 'unknown'}`,
    onSettled: () => invalidateAfterOrderCreate(qc),
  });
};

export const useDeleteOrder = () => {
  const qc = useQueryClient();
  return useAppMutation<any, string | number>({
    name: 'deleteOrder',
    mutationFn: (id) => adminApi.deleteOrder(String(id)),
    onSettled: () => invalidateAfterOrderCreate(qc),
  });
};
