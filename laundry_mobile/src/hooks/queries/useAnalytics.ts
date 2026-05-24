import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../services/api';
import { queryKeys } from '../../services/query/queryKeys';
import { format, subDays } from 'date-fns';

/**
 * Hook to fetch revenue analytics for a date range ending today.
 */
export const useRevenueAnalytics = (days: number = 7) => {
  const end = format(new Date(), 'yyyy-MM-dd');
  const start = format(subDays(new Date(), days), 'yyyy-MM-dd');

  return useQuery({
    queryKey: queryKeys.analytics.revenue(start, end),
    queryFn: () => analyticsApi.getRevenue(start, end).then(res => res.data),
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Hook to fetch driver performance metrics.
 */
export const useDriverPerformance = () => {
  return useQuery({
    queryKey: queryKeys.analytics.drivers(),
    queryFn: () => analyticsApi.getDriverPerformance().then(res => res.data),
    staleTime: 1000 * 60 * 10,
  });
};

/**
 * Hook to fetch core operational KPIs.
 */
export const useOperationalKPIs = () => {
  return useQuery({
    queryKey: queryKeys.analytics.kpis(),
    queryFn: () => analyticsApi.getOperationalKPIs().then(res => res.data),
    staleTime: 1000 * 60 * 2,
  });
};
