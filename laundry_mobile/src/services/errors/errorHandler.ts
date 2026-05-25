import { Alert } from 'react-native';
import { AppError, ErrorType } from './AppError';
import { parseError, getFriendlyMessage } from './errorParser';
import i18n from '../../i18n';

/**
 * Global logging hook (could be connected to Sentry, Bugsnag, etc.)
 */
const AUTH_ERROR_MESSAGES = [
  'No refresh token available',
  'Refresh response contained no token',
  'Session expired',
];

export const logError = (error: any, context?: string) => {
  const parsed = parseError(error);

  // 401/403 and token-refresh failures are handled by the auth layer — not application errors
  if (parsed.type === ErrorType.UNAUTHORIZED || parsed.type === ErrorType.FORBIDDEN) return;
  const rawMsg: string = error?.message ?? '';
  if (AUTH_ERROR_MESSAGES.some(m => rawMsg.includes(m))) return;

  if (__DEV__) {
    console.error(`[AppError][${context || 'Global'}]`, {
      message: parsed.message,
      type: parsed.type,
      status: parsed.status,
      code: parsed.code,
    });
  }

  // Potential Sentry.captureException(error) here
};

/**
 * Unified way to show errors to the user
 */
export const showError = (error: any, title?: string) => {
  const parsed = parseError(error);

  // 401/403 and token-refresh failures are handled silently by the auth interceptor.
  // Never show a raw auth alert — the user will be redirected automatically.
  if (parsed.type === ErrorType.UNAUTHORIZED || parsed.type === ErrorType.FORBIDDEN) return;
  const rawMsg: string = error?.message ?? '';
  if (AUTH_ERROR_MESSAGES.some(m => rawMsg.includes(m))) return;

  const message = getFriendlyMessage(parsed);

  logError(error, 'UI_Alert');

  Alert.alert(
    title || i18n.t('common.error'),
    message,
    [{ text: 'OK' }]
  );
};

/**
 * Retry helper for async operations
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; delay?: number } = {}
): Promise<T> => {
  const { maxRetries = 3, delay = 1000 } = options;
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const parsed = parseError(error);
      
      // Don't retry if it's a validation or unauthorized error
      if (parsed.status && [400, 401, 403, 422].includes(parsed.status)) {
        throw parsed;
      }

      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }

  throw parseError(lastError);
};
