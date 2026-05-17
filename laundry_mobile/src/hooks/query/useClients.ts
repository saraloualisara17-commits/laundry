import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/adminApi';
import { queryKeys } from '../../services/query/queryKeys';

/**
 * Hook for list of clients with optional filtering.
 */
export const useClients = (params?: any) => {
  return useQuery({
    queryKey: queryKeys.clients.list(params),
    queryFn: () => adminApi.getClients(params).then(res => res.data),
  });
};

/**
 * Hook for single client details.
 */
export const useClient = (id: string | number) => {
  return useQuery({
    queryKey: queryKeys.clients.detail(id),
    queryFn: () => adminApi.getClient(String(id)).then(res => res.data),
    enabled: !!id,
  });
};

/**
 * Hook for client debt detail.
 */
export const useClientDebt = (id: string | number) => {
  return useQuery({
    queryKey: queryKeys.clients.debt(id),
    queryFn: () => adminApi.getClientDebtDetail(String(id)).then(res => res.data),
    enabled: !!id,
  });
};

/**
 * Hook for all clients with debt.
 */
export const useClientsWithDebt = () => {
  return useQuery({
    queryKey: queryKeys.clients.debtList(),
    queryFn: () => adminApi.getClientDebtList().then(res => res.data),
  });
};

/**
 * Mutation for creating/updating a client.
 */
export const useSaveClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string | number; data: any }) => 
      id ? adminApi.updateClient(String(id), data) : adminApi.createClient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
    },
  });
};
