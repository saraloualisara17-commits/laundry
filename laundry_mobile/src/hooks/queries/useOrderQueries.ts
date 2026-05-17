import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/adminApi';

/**
 * Query Keys for Order state management.
 */
export const orderKeys = {
  all: ['orders'] as const,
  details: (id: string | number) => [...orderKeys.all, 'detail', String(id)] as const,
  payments: (id: string | number) => [...orderKeys.details(id), 'payments'] as const,
  history: (id: string | number) => [...orderKeys.details(id), 'history'] as const,
  drivers: () => [...orderKeys.all, 'drivers'] as const,
};

/**
 * Hook to fetch order details, payments, and history in parallel.
 */
export const useOrderDetails = (id: string | number) => {
  const orderQuery = useQuery({
    queryKey: orderKeys.details(id),
    queryFn: () => adminApi.getOrder(String(id)).then(res => res.data),
    enabled: !!id,
  });

  const paymentsQuery = useQuery({
    queryKey: orderKeys.payments(id),
    queryFn: () => adminApi.getOrderPayments(String(id)).then(res => res.data).catch(() => []),
    enabled: !!id,
  });

  const historyQuery = useQuery({
    queryKey: orderKeys.history(id),
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
 * Hook to fetch available drivers.
 */
export const useDrivers = () => {
  return useQuery({
    queryKey: orderKeys.drivers(),
    queryFn: () => adminApi.getUsers().then(res => res.data.filter((u: any) => u.role?.toLowerCase() === 'livreur')),
  });
};

/**
 * Mutation hook for status updates.
 */
export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, status, data }: { id: string | number; status: string; data?: any }) => 
      adminApi.updateOrderStatus(String(id), status, data),
    onMutate: async (newStatusData) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: orderKeys.details(newStatusData.id) });

      // Snapshot the previous value
      const previousOrder = queryClient.getQueryData(orderKeys.details(newStatusData.id));

      // Optimistically update to the new value
      if (previousOrder) {
        queryClient.setQueryData(orderKeys.details(newStatusData.id), (old: any) => ({
          ...old,
          status: newStatusData.status,
          ...(newStatusData.data || {}), // Merge extra data like dateLivraisonPrevue
        }));
      }

      // Return a context object with the snapshotted value
      return { previousOrder };
    },
    onError: (err, variables, context) => {
      // Rollback to the previous value if the mutation fails
      if (context?.previousOrder) {
        queryClient.setQueryData(orderKeys.details(variables.id), context.previousOrder);
      }
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success to ensure we are in sync with the server
      queryClient.invalidateQueries({ queryKey: orderKeys.details(variables.id) });
      queryClient.invalidateQueries({ queryKey: orderKeys.history(variables.id) });
    },
  });
};

/**
 * Mutation hook for adding payments.
 */
export const useAddOrderPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, amount, note }: { id: string | number; amount: number; note?: string }) =>
      adminApi.addOrderPayment(String(id), amount, note),
    onMutate: async (newPayment) => {
      await queryClient.cancelQueries({ queryKey: orderKeys.details(newPayment.id) });
      await queryClient.cancelQueries({ queryKey: orderKeys.payments(newPayment.id) });

      const previousOrder = queryClient.getQueryData(orderKeys.details(newPayment.id));
      const previousPayments = queryClient.getQueryData(orderKeys.payments(newPayment.id));

      if (previousOrder) {
        queryClient.setQueryData(orderKeys.details(newPayment.id), (old: any) => ({
          ...old,
          montantPaye: (Number(old.montantPaye) || 0) + Number(newPayment.amount),
        }));
      }

      if (previousPayments) {
        queryClient.setQueryData(orderKeys.payments(newPayment.id), (old: any[]) => [
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
        queryClient.setQueryData(orderKeys.details(variables.id), context.previousOrder);
      }
      if (context?.previousPayments) {
        queryClient.setQueryData(orderKeys.payments(variables.id), context.previousPayments);
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.details(variables.id) });
      queryClient.invalidateQueries({ queryKey: orderKeys.payments(variables.id) });
    },
  });
};

/**
 * Mutation hook for assigning drivers.
 */
export const useAssignDriver = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, driverId }: { id: string | number; driverId: string | number }) =>
      adminApi.assignDeliveryDriver(String(id), String(driverId)),
    onMutate: async ({ id, driverId }) => {
      await queryClient.cancelQueries({ queryKey: orderKeys.details(id) });
      const previousOrder = queryClient.getQueryData(orderKeys.details(id));
      
      const drivers = queryClient.getQueryData(orderKeys.drivers()) as any[];
      const selectedDriver = drivers?.find(d => String(d.id) === String(driverId));

      if (previousOrder) {
        queryClient.setQueryData(orderKeys.details(id), (old: any) => ({
          ...old,
          deliveryDriver: selectedDriver || { id: driverId, name: '...' },
        }));
      }

      return { previousOrder };
    },
    onError: (err, variables, context) => {
      if (context?.previousOrder) {
        queryClient.setQueryData(orderKeys.details(variables.id), context.previousOrder);
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.details(variables.id) });
    },
  });
};

/**
 * Mutation hook for adding order images.
 */
export const useAddOrderImages = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, imageUrls, type }: { id: string | number; imageUrls: string[]; type: string }) =>
      adminApi.addOrderImages(String(id), imageUrls, type),
    onMutate: async ({ id, imageUrls, type }) => {
      await queryClient.cancelQueries({ queryKey: orderKeys.details(id) });
      const previousOrder = queryClient.getQueryData(orderKeys.details(id));

      if (previousOrder) {
        queryClient.setQueryData(orderKeys.details(id), (old: any) => ({
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
        queryClient.setQueryData(orderKeys.details(variables.id), context.previousOrder);
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.details(variables.id) });
    },
  });
};

/**
 * Mutation hook for deleting an order.
 */
export const useDeleteOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) => adminApi.deleteOrder(String(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
};
