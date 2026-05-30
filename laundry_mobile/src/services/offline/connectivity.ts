/**
 * ConnectivityService — wraps React Native's AppState + a lightweight fetch
 * probe to determine real internet reachability.
 *
 * We do NOT depend on @react-native-community/netinfo (not installed).
 * Instead we listen to AppState changes and run a HEAD probe against the
 * backend's /actuator/health endpoint.  The probe fires:
 *   - Once on startup
 *   - On every foreground transition (app returns from background)
 *   - On an interval while the app is in the foreground (30 s default)
 *
 * This covers the common case: driver loses signal, kills background, comes
 * back online and opens the app → probe fires, queue drains.
 */

import { AppState, AppStateStatus } from 'react-native';
import { ConnectivityState } from './types';
import { logger } from '../../lib/logger';

// Probe a neutral, always-available endpoint instead of your own backend.
// Probing /actuator/health counted against Railway free-tier request quotas
// and caused false "offline" when the backend was cold-starting.
// 1.1.1.1/cdn-cgi/trace is Cloudflare's trace endpoint: tiny response, no auth,
// 99.99% uptime, global anycast — ideal for connectivity checks.
const PROBE_URL = 'https://1.1.1.1/cdn-cgi/trace';
const PROBE_INTERVAL_MS = 60_000; // background probe — foreground transitions already trigger a probe
const PROBE_TIMEOUT_MS = 5_000;

type Listener = (state: ConnectivityState) => void;

class ConnectivityService {
  private listeners: Set<Listener> = new Set();
  private currentState: ConnectivityState = {
    isConnected: true,
    isInternetReachable: true,
  };
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private appStateSubscription: any = null;

  public start() {
    // Initial probe
    this.probe();

    // Probe on foreground
    this.appStateSubscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') this.probe();
    });

    // Interval probe while foregrounded
    this.intervalHandle = setInterval(() => {
      if (AppState.currentState === 'active') this.probe();
    }, PROBE_INTERVAL_MS);
  }

  public stop() {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    if (this.intervalHandle !== null) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  private async probe() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

      const res = await fetch(PROBE_URL, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timeoutId);

      this.updateState({ isConnected: true, isInternetReachable: res.ok || res.status < 500 });
    } catch {
      this.updateState({ isConnected: false, isInternetReachable: false });
    }
  }

  public subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public updateState(state: Partial<ConnectivityState>) {
    const wasConnected = this.currentState.isConnected;
    this.currentState = { ...this.currentState, ...state };
    this.listeners.forEach((l) => l(this.currentState));

    if (!wasConnected && this.currentState.isConnected) {
      logger.network.info('Connection restored');
    } else if (wasConnected && !this.currentState.isConnected) {
      logger.network.warn('Connection lost');
    }
  }

  public get isConnected() {
    return this.currentState.isConnected;
  }

  public get state() {
    return this.currentState;
  }
}

export const connectivity = new ConnectivityService();
