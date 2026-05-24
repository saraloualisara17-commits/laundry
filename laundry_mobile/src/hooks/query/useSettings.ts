import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi, SystemSettings, UpdateSettingsRequest } from '../../services/api/settingsApi';
import { queryKeys } from '../../services/query/queryKeys';

// Settings are app-wide config that almost never change at runtime.
// staleTime: Infinity means React Query never marks them stale on its own —
// they are only refreshed when explicitly invalidated (e.g. after a successful
// updateSettings mutation) or when the user force-pulls to refresh.
// gcTime: 30 minutes keeps them in memory long after any screen unmounts.
const SETTINGS_STALE_TIME = Infinity;
const SETTINGS_GC_TIME = 1000 * 60 * 30;

const SETTINGS_DEFAULTS: SystemSettings = {
  appName: 'PureClean',
  logoUrl: null,
  businessPhone: null,
};

export const useSettings = () => {
  return useQuery({
    queryKey: queryKeys.settings.all,
    queryFn: settingsApi.getSettings,
    staleTime: SETTINGS_STALE_TIME,
    gcTime: SETTINGS_GC_TIME,
    // Serve the safe default immediately so the app never flickers on first
    // paint. The real data overwrites it as soon as the fetch completes.
    placeholderData: SETTINGS_DEFAULTS,
    // Settings fetch is low-priority — a single failure should not be retried
    // more than once (avoids 3 retries × staleTime = Infinity means it would
    // only retry on the next explicit invalidation anyway).
    retry: 1,
  });
};

export const useUpdateSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (req: UpdateSettingsRequest) => settingsApi.updateSettings(req),

    onMutate: async (req) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.settings.all });
      const previous = queryClient.getQueryData<SystemSettings>(queryKeys.settings.all);

      // Optimistic update — apply the text fields immediately so the header
      // logo/name update feels instant. Logo URL stays unchanged until the
      // server confirms; the URI preview is handled locally in the screen.
      queryClient.setQueryData<SystemSettings>(queryKeys.settings.all, (old = SETTINGS_DEFAULTS) => ({
        ...old,
        appName: req.appName ?? old.appName,
        businessPhone: req.businessPhone ?? old.businessPhone,
      }));

      return { previous };
    },

    onError: (_err, _req, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.settings.all, context.previous);
      }
    },

    onSuccess: (fresh) => {
      // Replace the optimistic data with the authoritative server response.
      queryClient.setQueryData(queryKeys.settings.all, fresh);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
    },
  });
};
