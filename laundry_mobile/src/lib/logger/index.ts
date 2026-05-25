/**
 * Structured logger for the laundry app.
 *
 * Rules:
 *   - In dev:  all levels emit, with coloured prefixes.
 *   - In prod: only 'warn' and 'error' emit (console.* is cheap but not free).
 *   - Namespace-prefixed so log lines are grep-able in Metro / Sentry.
 *
 * Usage:
 *   import { logger } from 'src/lib/logger';
 *   logger.info('mutation', 'Payment started', { orderId });
 */

type Level = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: Level;
  ns: string;
  msg: string;
  data?: Record<string, unknown>;
  ts: number;
}

const NS_COLOR: Record<string, string> = {};
const PALETTE = ['#4FC3F7', '#81C784', '#FFB74D', '#CE93D8', '#80DEEA', '#FFCC02'];
let colorIdx = 0;

function colorFor(ns: string): string {
  if (!NS_COLOR[ns]) {
    NS_COLOR[ns] = PALETTE[colorIdx++ % PALETTE.length];
  }
  return NS_COLOR[ns];
}

function emit(entry: LogEntry) {
  // Production: no console output at all — errors are silent background events.
  // The retry queue handles transient failures; permanent ones are surfaced
  // through UI state (failed order, upload badge), not the console.
  if (!__DEV__) return;

  const prefix = `[${entry.ns}]`;
  const data = entry.data ? entry.data : undefined;

  switch (entry.level) {
    case 'debug':
      data ? console.debug(prefix, entry.msg, data) : console.debug(prefix, entry.msg);
      break;
    case 'info':
      data ? console.log(prefix, entry.msg, data) : console.log(prefix, entry.msg);
      break;
    case 'warn':
      data ? console.warn(prefix, entry.msg, data) : console.warn(prefix, entry.msg);
      break;
    case 'error':
      data ? console.error(prefix, entry.msg, data) : console.error(prefix, entry.msg);
      break;
  }
}

function makeLogger(ns: string) {
  const log = (level: Level, msg: string, data?: Record<string, unknown>) =>
    emit({ level, ns, msg, data, ts: Date.now() });

  return {
    debug: (msg: string, data?: Record<string, unknown>) => log('debug', msg, data),
    info:  (msg: string, data?: Record<string, unknown>) => log('info',  msg, data),
    warn:  (msg: string, data?: Record<string, unknown>) => log('warn',  msg, data),
    error: (msg: string, data?: Record<string, unknown>) => log('error', msg, data),
  };
}

export const logger = {
  mutation:   makeLogger('mutation'),
  query:      makeLogger('query'),
  socket:     makeLogger('socket'),
  sync:       makeLogger('sync'),
  network:    makeLogger('network'),
  auth:       makeLogger('auth'),
  ns: makeLogger,
};
