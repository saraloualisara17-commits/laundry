import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/adminApi';
import { queryKeys } from '../../services/query/queryKeys';
import { useAppMutation } from '../../lib/query/mutationFactory';
import { invalidateAfterClientSave } from '../../lib/query/invalidationHelpers';

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
 * Hook for all orders belonging to a single client.
 */
export const useClientOrders = (id: string | number) => {
  return useQuery({
    queryKey: [...queryKeys.clients.detail(id), 'orders'] as const,
    queryFn: () => adminApi.getClientCommandes(String(id)).then(res => res.data),
    enabled: !!id,
  });
};

export const useSaveClient = () => {
  const qc = useQueryClient();
  return useAppMutation<any, { id?: string | number; data: any }>({
    name: 'saveClient',
    mutationFn: ({ id, data }) =>
      id ? adminApi.updateClient(String(id), data) : adminApi.createClient(data),
    onSettled: (_data, _err, vars) => invalidateAfterClientSave(qc, vars.id),
  });
};
