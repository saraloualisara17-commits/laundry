import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/adminApi';
import { queryKeys } from '../../services/query/queryKeys';

/**
 * Hook for single order details with its sub-data (payments, history).
 */
export const useOrder = (id: string | number) => {
  const queryClient = useQueryClient();

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
 * Mutation for status updates with optimistic UI support.
 */
export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, status, data }: { id: string | number; status: string; data?: any }) => 
      adminApi.updateOrderStatus(String(id), status, data),
    onMutate: async (newStatusData) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.orders.details(newStatusData.id) });
      const previousOrder = queryClient.getQueryData(queryKeys.orders.details(newStatusData.id));
      if (previousOrder) {
        queryClient.setQueryData(queryKeys.orders.details(newStatusData.id), (old: any) => ({
          ...old,
          status: newStatusData.status,
          ...(newStatusData.data || {}),
        }));
      }
      return { previousOrder };
    },
    onError: (err, variables, context) => {
      if (context?.previousOrder) {
        queryClient.setQueryData(queryKeys.orders.details(variables.id), context.previousOrder);
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.details(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.history(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all }); // Refresh lists
    },
  });
};

/**
 * Mutation for recording payments with optimistic UI.
 */
export const useAddPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, amount, note }: { id: string | number; amount: number; note?: string }) =>
      adminApi.addOrderPayment(String(id), amount, note),
    onMutate: async (newPayment) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.orders.details(newPayment.id) });
      await queryClient.cancelQueries({ queryKey: queryKeys.orders.payments(newPayment.id) });

      const previousOrder = queryClient.getQueryData(queryKeys.orders.details(newPayment.id));
      const previousPayments = queryClient.getQueryData(queryKeys.orders.payments(newPayment.id));

      if (previousOrder) {
        queryClient.setQueryData(queryKeys.orders.details(newPayment.id), (old: any) => ({
          ...old,
          montantPaye: (Number(old.montantPaye) || 0) + Number(newPayment.amount),
        }));
      }

      if (previousPayments) {
        queryClient.setQueryData(queryKeys.orders.payments(newPayment.id), (old: any[]) => [
          {
            id: 'temp-' + Date.now(),
            montant: newPayment.amount,
            note: newPayment.note,
            datePaiement: new Date().toISOString(),
          },
          ...old,
        ]);
      }

      return { previousOrder, previousPayments };
    },
    onError: (err, variables, context) => {
      if (context?.previousOrder) {
        queryClient.setQueryData(queryKeys.orders.details(variables.id), context.previousOrder);
      }
      if (context?.previousPayments) {
        queryClient.setQueryData(queryKeys.orders.payments(variables.id), context.previousPayments);
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.details(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.payments(variables.id) });
    },
  });
};

/**
 * Mutation for adding order images.
 */
export const useAddOrderImages = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, imageUrls, type }: { id: string | number; imageUrls: string[]; type: string }) =>
      adminApi.addOrderImages(String(id), imageUrls, type),
    onMutate: async ({ id, imageUrls, type }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.orders.details(id) });
      const previousOrder = queryClient.getQueryData(queryKeys.orders.details(id));

      if (previousOrder) {
        queryClient.setQueryData(queryKeys.orders.details(id), (old: any) => ({
          ...old,
          images: [
            ...(old.images || []),
            ...imageUrls.map(url => ({ imageUrl: url, photoType: type })),
          ],
        }));
      }

      return { previousOrder };
    },
    onError: (err, variables, context) => {
      if (context?.previousOrder) {
        queryClient.setQueryData(queryKeys.orders.details(variables.id), context.previousOrder);
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.details(variables.id) });
    },
  });
};
