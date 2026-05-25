/**
 * mutationFactory — centralized useMutation wrapper.
 *
 * What it adds on top of plain useMutation:
 *
 *  1. In-flight dedup guard — a mutation with the same `dedupKey` can only
 *     have one request in flight at a time.  Critical for payments and status
 *     updates where double-tap or double-submit would corrupt order state.
 *
 *  2. Automatic error display — calls showError() from the central error
 *     handler so every mutation surfaces user-visible alerts without each
 *     hook needing its own onError Alert.alert.  The caller can suppress this
 *     by passing `silentError: true`.
 *
 *  3. Structured logging — logs start / success / failure at the 'mutation'
 *     namespace so all mutation traffic is grep-able in Metro / Sentry.
 *
 *  4. Standard optimistic-update helpers — optional `optimistic` callbacks
 *     that the factory calls in the correct order (cancel → snapshot → apply)
 *     so each hook only describes WHAT to update, not the boilerplate around it.
 *
 *  5. Rollback on error — if an `optimistic.apply` was called the factory
 *     automatically restores the snapshot in onError.
 *
 * The factory is intentionally thin.  It does not own retry logic (lives in
 * queryClient.ts) or invalidation (lives in each hook's onSettled).
 */

import { useMutation, useQueryClient, MutationOptions, QueryKey } from '@tanstack/react-query';
import { showError } from '../../services/errors/errorHandler';
import { parseError } from '../../services/errors/errorParser';
import { ErrorType } from '../../services/errors/AppError';
import { logger } from '../logger';

// ─── In-flight dedup registry ────────────────────────────────────────────────
// Keyed by dedupKey.  Value is a Promise that resolves when the in-flight
// request completes.  If a second call arrives while the first is pending it
// receives the same Promise (no second network request is fired).

const inFlight = new Map<string, Promise<any>>();

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OptimisticConfig<TData, TVariables, TSnapshot> {
  /**
   * List of query keys to cancel before applying the optimistic update.
   * Usually the detail + list keys for the entity being mutated.
   */
  cancelKeys: (vars: TVariables) => QueryKey[];

  /**
   * Capture the current cache state before we overwrite it.
   * Return whatever you need to restore in rollback.
   */
  snapshot: (vars: TVariables) => TSnapshot;

  /**
   * Apply the optimistic state to the cache.
   */
  apply: (vars: TVariables) => void;

  /**
   * Restore the snapshot after a failed mutation.
   * Called automatically by the factory — you don't call it.
   */
  restore: (snapshot: TSnapshot, vars: TVariables) => void;
}

export interface FactoryMutationOptions<TData, TVariables, TSnapshot = any> {
  /**
   * The actual API call.
   */
  mutationFn: (vars: TVariables) => Promise<TData>;

  /**
   * When provided, only one request with this key can be in-flight at a time.
   * Subsequent calls while one is pending are dropped (the same Promise is
   * returned so `.mutateAsync` still resolves, it just doesn't fire again).
   *
   * Use a function so the key can be derived from the variables:
   *   dedupKey: (vars) => `payment:${vars.orderId}`
   *
   * For mutations where parallel calls with DIFFERENT variables are fine but
   * same-variable duplicates must be blocked, derive the key from the entity:
   *   dedupKey: (vars) => `status:${vars.id}`
   */
  dedupKey?: (vars: TVariables) => string;

  /**
   * Optional optimistic update config.  When provided the factory handles
   * cancel-snapshot-apply-rollback automatically.
   */
  optimistic?: OptimisticConfig<TData, TVariables, TSnapshot>;

  /**
   * Called after a successful mutation.  The factory still runs after this.
   */
  onSuccess?: (data: TData, vars: TVariables) => void;

  /**
   * Called after a failed mutation, after rollback has already happened.
   */
  onError?: (err: unknown, vars: TVariables) => void;

  /**
   * Called regardless of outcome, after success/error.
   */
  onSettled?: (data: TData | undefined, err: unknown, vars: TVariables) => void;

  /**
   * When true the factory will NOT show an error alert on failure.
   * Useful when the component handles the error UI itself.
   */
  silentError?: boolean;

  /**
   * Human-readable name used in log messages.
   */
  name?: string;

  /**
   * Extra options passed directly to useMutation (e.g. mutationKey, retry).
   */
  extra?: Omit<MutationOptions<TData, unknown, TVariables, any>,
    'mutationFn' | 'onMutate' | 'onSuccess' | 'onError' | 'onSettled'>;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function useAppMutation<TData, TVariables, TSnapshot = any>(
  opts: FactoryMutationOptions<TData, TVariables, TSnapshot>
) {
  const queryClient = useQueryClient();
  const label = opts.name ?? 'unnamed';

  return useMutation<TData, unknown, TVariables, { snapshot?: TSnapshot }>({
    ...opts.extra,

    mutationFn: async (vars: TVariables) => {
      // ── Dedup guard ─────────────────────────────────────────────────────
      if (opts.dedupKey) {
        const key = opts.dedupKey(vars);
        const existing = inFlight.get(key);
        if (existing) {
          logger.mutation.debug(`dedup hit — reusing in-flight request`, { key });
          return existing as Promise<TData>;
        }

        const promise = opts.mutationFn(vars).finally(() => inFlight.delete(key));
        inFlight.set(key, promise);
        return promise;
      }

      return opts.mutationFn(vars);
    },

    onMutate: async (vars) => {
      logger.mutation.info(`${label} started`, { vars: __DEV__ ? vars : undefined } as any);

      if (!opts.optimistic) return {};

      const { cancelKeys, snapshot, apply } = opts.optimistic;

      // Cancel any in-progress refetches so they don't overwrite our optimistic data
      await Promise.all(cancelKeys(vars).map(key => queryClient.cancelQueries({ queryKey: key })));

      const snap = snapshot(vars);
      apply(vars);

      return { snapshot: snap };
    },

    onSuccess: (data, vars, _ctx) => {
      logger.mutation.info(`${label} succeeded`);
      opts.onSuccess?.(data, vars);
    },

    onError: (err, vars, ctx) => {
      logger.mutation.error(`${label} failed`, { err: (err as any)?.message } as any);

      // Rollback optimistic update
      if (ctx?.snapshot !== undefined && opts.optimistic) {
        opts.optimistic.restore(ctx.snapshot, vars);
      }

      // On optimistic-locking conflict (409): the server rejected our write
      // because another actor modified the record first. Flush every query in
      // the cache so the next render shows the true server state.
      const parsed = parseError(err);
      if (parsed.type === ErrorType.CONFLICT && opts.optimistic) {
        opts.optimistic.cancelKeys(vars).forEach((key) =>
          queryClient.invalidateQueries({ queryKey: key })
        );
      }

      if (!opts.silentError) {
        showError(err);
      }

      opts.onError?.(err, vars);
    },

    onSettled: (data, err, vars, _ctx) => {
      opts.onSettled?.(data, err, vars);
    },
  });
}
