import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/adminApi';
import { queryKeys } from '../../services/query/queryKeys';

/**
 * Hook for dashboard statistics.
 */
export const useDashboardStats = () => {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: () => adminApi.getStats().then(res => res.data),
  });
};

/**
 * Hook for status overview (counts).
 */
export const useStatusOverview = () => {
  return useQuery({
    queryKey: queryKeys.dashboard.overview(),
    queryFn: () => adminApi.getStatusOverview().then(res => res.data),
  });
};

/**
 * Hook for unpaid overview stats.
 */
export const useUnpaidOverview = () => {
  return useQuery({
    queryKey: queryKeys.dashboard.unpaidOverview(),
    queryFn: () => adminApi.getUnpaidOverview().then(res => res.data),
  });
};
