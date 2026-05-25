import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { logger } from '../../lib/logger';

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

/**
 * 2 minutes. Data fetched less than 2 minutes ago is served instantly from
 * cache without a background refetch. Setting this to 0 would fire a network
 * request on every screen mount and every list render — the primary cause of
 * the "duplicate requests on navigation" problem. 2 minutes is a safe floor
 * for a laundry operations app where the WebSocket layer pushes mutations in
 * real-time anyway; the cache is never silently stale for long.
 */
const STALE_TIME = 1000 * 60 * 2; // 2 minutes

/**
 * 10 minutes. After a query's last subscriber unmounts (the screen is left),
 * React Query keeps the data in memory for this window. If the user navigates
 * back within 10 minutes they see cached data instantly while a background
 * refetch confirms freshness. Without a gcTime the cache would be wiped the
 * moment you leave a screen, making every back-navigation feel like a cold
 * load. On low-memory devices React Query will garbage-collect early if
 * necessary — this is a ceiling, not a guarantee.
 */
const GC_TIME = 1000 * 60 * 10; // 10 minutes

// ─── CACHE-LEVEL ERROR HANDLERS ──────────────────────────────────────────────
// In React Query v5, global error callbacks MUST live on QueryCache /
// MutationCache — not on defaultOptions. The defaultOptions.queries.meta.onError
// pattern from v4 is silently ignored in v5.

// Auth-layer errors that should never surface as application errors.
// These strings come from client.ts / axios.ts when the token refresh path
// determines the session is gone — the auth guard handles the redirect.
const AUTH_ERROR_MESSAGES = [
  'No refresh token available',
  'Refresh response contained no token',
  'Session expired',
];

function isAuthError(error: any): boolean {
  const status = error?.status ?? error?.response?.status;
  if (status === 401 || status === 403) return true;
  const msg: string = error?.message ?? '';
  return AUTH_ERROR_MESSAGES.some(m => msg.includes(m));
}

const queryCache = new QueryCache({
  onError: (error: any, query) => {
    if (isAuthError(error)) return;
    logger.query.error('Query failed', {
      key: JSON.stringify(query.queryKey),
      msg: error?.message ?? String(error),
    });
  },
});

const mutationCache = new MutationCache({
  onError: (error: any, _variables, _context, mutation) => {
    if (isAuthError(error)) return;
    logger.mutation.error('Mutation failed (global)', {
      key: JSON.stringify(mutation.options.mutationKey ?? '(no key)'),
      msg: error?.message ?? String(error),
    });
  },
});

// ─── QUERY CLIENT ─────────────────────────────────────────────────────────────

export const queryClient = new QueryClient({
  queryCache,
  mutationCache,

  defaultOptions: {
    queries: {
      // ── Freshness & garbage collection ──────────────────────────────────
      staleTime: STALE_TIME,
      gcTime: GC_TIME,

      // ── Refetch triggers ────────────────────────────────────────────────
      /**
       * false — React Native has no browser "window focus" event. The Expo
       * app goes through AppState (active/background) cycles, not focus/blur.
       * Leaving this true would cause spurious refetches on every app-switch
       * (e.g. user checks WhatsApp and comes back) and is the #1 cause of
       * jitter/flicker on mobile.
       */
      refetchOnWindowFocus: false,

      /**
       * true — when a screen mounts and data is stale, kick off a background
       * refetch so the user always sees reasonably fresh data after navigation.
       * Stale data is shown immediately (no loading spinner), the refetch
       * happens silently. Combined with the 2-minute staleTime this means
       * re-visiting a screen within 2 minutes costs zero network requests.
       */
      refetchOnMount: true,

      /**
       * 'offlineFirst' — serve cached data regardless of network state instead
       * of throwing a NetworkError when offline. Failed fetches are queued and
       * retried when connectivity is restored via ConnectivityService. Without
       * this, going offline causes every mounted query to immediately error-out
       * and flash error UI even though perfectly good cached data is available.
       */
      networkMode: 'offlineFirst',

      // ── Retry policy ────────────────────────────────────────────────────
      /**
       * Never retry 401 / 403 — the Axios interceptor in client.ts already
       * handles token refresh on 401 transparently; if it reaches React Query
       * as an error the refresh itself has failed and retrying will not help.
       * 403 means the account is disabled or access is forbidden — retrying
       * is pointless and will just generate noise.
       * All other failures (5xx, network timeout, etc.) retry twice with the
       * default exponential back-off.
       */
      retry: (failureCount, error: any) => {
        const status = error?.status ?? error?.response?.status;
        if (status === 401 || status === 403) return false;
        return failureCount < 2;
      },
    },

    mutations: {
      /**
       * 0 — mutations have side effects. Auto-retrying a POST /payments or
       * PATCH /status could double-charge a client or corrupt order state if
       * the first request actually succeeded but the response was lost in
       * transit. Retry logic for mutations must be explicit and deliberate,
       * not automatic. Individual hooks can opt in if the operation is
       * genuinely idempotent (e.g. assigning a driver).
       */
      retry: 0,

      /**
       * 'offlineFirst' — allow mutations to be called while offline. Combined
       * with the offline queue in syncManager.ts, mutations queued offline are
       * replayed when connectivity is restored rather than immediately failing
       * with a NetworkError.
       */
      networkMode: 'offlineFirst',
    },
  },
});

export default queryClient;
