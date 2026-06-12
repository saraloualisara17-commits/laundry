import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { callLogsApi, LogCallRequest } from '../../services/api/callLogsApi';
import { queryKeys } from '../../services/query/queryKeys';

export const useCallLogs = () =>
  useInfiniteQuery({
    queryKey: queryKeys.callLogs.list(),
    queryFn: ({ pageParam = 0 }) =>
      callLogsApi.getAll(pageParam as number).then(r => r.data),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.last ? undefined : lastPage.number + 1,
    staleTime: 0,
    refetchOnMount: 'always',
  });

export const useClientCallLogs = (clientId: number) =>
  useInfiniteQuery({
    queryKey: queryKeys.callLogs.byClient(clientId),
    queryFn: ({ pageParam = 0 }) =>
      callLogsApi.getByClient(clientId, pageParam as number).then(r => r.data),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.last ? undefined : lastPage.number + 1,
    enabled: !!clientId,
    staleTime: 0,
    refetchOnMount: 'always',
  });

export const useLogCall = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: LogCallRequest) => callLogsApi.logCall(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.callLogs.all });
    },
  });
};
