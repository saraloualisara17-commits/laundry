import { Alert } from 'react-native';
import { AppError } from './AppError';
import { parseError, getFriendlyMessage } from './errorParser';
import i18n from '../../i18n';

/**
 * Global logging hook (could be connected to Sentry, Bugsnag, etc.)
 */
export const logError = (error: any, context?: string) => {
  const parsed = parseError(error);
  console.error(`[AppError][${context || 'Global'}]`, {
    message: parsed.message,
    type: parsed.type,
    status: parsed.status,
    code: parsed.code,
    original: parsed.originalError,
  });
  
  // Potential Sentry.captureException(error) here
};

/**
 * Unified way to show errors to the user
 */
export const showError = (error: any, title?: string) => {
  const parsed = parseError(error);
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
