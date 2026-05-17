import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../services/api';
import { format, subDays } from 'date-fns';

export const analyticsKeys = {
  all: ['analytics'] as const,
  revenue: (start: string, end: string) => [...analyticsKeys.all, 'revenue', { start, end }] as const,
  drivers: () => [...analyticsKeys.all, 'drivers'] as const,
  kpis: () => [...analyticsKeys.all, 'kpis'] as const,
};

/**
 * Hook to fetch revenue analytics for a specific range
 */
export const useRevenueAnalytics = (days: number = 7) => {
  const end = format(new Date(), 'yyyy-MM-dd');
  const start = format(subDays(new Date(), days), 'yyyy-MM-dd');

  return useQuery({
    queryKey: analyticsKeys.revenue(start, end),
    queryFn: () => analyticsApi.getRevenue(start, end).then(res => res.data),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Hook to fetch driver performance metrics
 */
export const useDriverPerformance = () => {
  return useQuery({
    queryKey: analyticsKeys.drivers(),
    queryFn: () => analyticsApi.getDriverPerformance().then(res => res.data),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

/**
 * Hook to fetch core operational KPIs
 */
export const useOperationalKPIs = () => {
  return useQuery({
    queryKey: analyticsKeys.kpis(),
    queryFn: () => analyticsApi.getOperationalKPIs().then(res => res.data),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};
