import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { auditApi, AuditLogEntry } from '../../services/api/auditApi';
import { queryKeys } from '../../services/query/queryKeys';

export const useOrderTimeline = (orderId: string | number) =>
  useQuery({
    queryKey: queryKeys.audit.orderTimeline(orderId),
    queryFn: () => auditApi.getOrderTimeline(orderId).then(r => r.data),
    enabled: !!orderId,
    staleTime: 30_000,
  });

export const useRecentAuditLogs = () =>
  useInfiniteQuery({
    queryKey: queryKeys.audit.recent(),
    queryFn: ({ pageParam = 0 }) =>
      auditApi.getRecentLogs(pageParam as number, 50).then(r => {
        // Spring Page shape: { content: [...], last: bool, number: int }
        const data = r.data as any;
        return {
          content: Array.isArray(data) ? data : (data?.content ?? []),
          last: Array.isArray(data) ? true : (data?.last ?? true),
          number: Array.isArray(data) ? 0 : (data?.number ?? 0),
        };
      }),
    getNextPageParam: (lastPage) => {
      if (lastPage.last) return undefined;
      return lastPage.number + 1;
    },
    initialPageParam: 0,
  });
