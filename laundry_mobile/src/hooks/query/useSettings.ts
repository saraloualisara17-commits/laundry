import { useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi, SystemSettings, UpdateSettingsRequest } from '../../services/api/settingsApi';
import { queryKeys } from '../../services/query/queryKeys';
import { useAppMutation } from '../../lib/query/mutationFactory';

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
  const qc = useQueryClient();

  return useAppMutation<SystemSettings, UpdateSettingsRequest>({
    name: 'updateSettings',
    mutationFn: (req) => settingsApi.updateSettings(req),
    // Settings updates are rare and always user-initiated — no dedup needed.
    optimistic: {
      cancelKeys: () => [queryKeys.settings.all],
      snapshot: () => qc.getQueryData<SystemSettings>(queryKeys.settings.all),
      apply: (req) => {
        qc.setQueryData<SystemSettings>(queryKeys.settings.all, (old = SETTINGS_DEFAULTS) => ({
          ...old,
          appName: req.appName ?? old.appName,
          businessPhone: req.businessPhone ?? old.businessPhone,
        }));
      },
      restore: (snap) => {
        if (snap !== undefined) qc.setQueryData(queryKeys.settings.all, snap);
      },
    },
    onSuccess: (fresh) => {
      qc.setQueryData(queryKeys.settings.all, fresh);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.settings.all });
    },
    // Settings errors are shown in the settings screen — mute the global alert.
    silentError: false,
  });
};
