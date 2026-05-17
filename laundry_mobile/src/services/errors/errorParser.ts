import axios from 'axios';
import { AppError, ErrorType } from './AppError';
import i18n from '../../i18n';

/**
 * Parses any error into a standardized AppError
 */
export const parseError = (error: any): AppError => {
  if (AppError.isAppError(error)) {
    return error;
  }

  // Handle Axios Errors
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data;
    const code = data?.error || data?.code || error.code;
    const message = data?.message || error.message;

    // Timeout
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return new AppError(
        i18n.t('errors.timeout', { defaultValue: 'Connection timeout' }),
        ErrorType.TIMEOUT,
        { status, code: 'TIMEOUT', originalError: error }
      );
    }

    // Network Error (Offline or DNS)
    if (!error.response && (error.code === 'ERR_NETWORK' || error.message.includes('Network Error'))) {
      return new AppError(
        i18n.t('errors.network', { defaultValue: 'Network error. Please check your connection.' }),
        ErrorType.OFFLINE,
        { code: 'OFFLINE', originalError: error }
      );
    }

    // Map HTTP status codes
    switch (status) {
      case 401:
        return new AppError(
          i18n.t('errors.unauthorized', { defaultValue: 'Session expired' }),
          ErrorType.UNAUTHORIZED,
          { status, code, originalError: error }
        );
      case 403:
        return new AppError(
          i18n.t('errors.forbidden', { defaultValue: 'Access denied' }),
          ErrorType.FORBIDDEN,
          { status, code, originalError: error }
        );
      case 404:
        return new AppError(
          i18n.t('errors.not_found', { defaultValue: 'Resource not found' }),
          ErrorType.NOT_FOUND,
          { status, code, originalError: error }
        );
      case 422:
      case 400:
        return new AppError(
          message || i18n.t('errors.validation', { defaultValue: 'Validation error' }),
          ErrorType.VALIDATION,
          { status, code, details: data?.details || data?.errors, originalError: error }
        );
      default:
        return new AppError(
          message || i18n.t('errors.unknown', { defaultValue: 'An unexpected error occurred' }),
          ErrorType.API,
          { status, code, originalError: error }
        );
    }
  }

  // Generic Error
  return new AppError(
    error.message || i18n.t('errors.unknown'),
    ErrorType.UNKNOWN,
    { originalError: error }
  );
};

/**
 * Maps common error codes to user-friendly messages
 */
export const getFriendlyMessage = (error: AppError): string => {
  if (error.type === ErrorType.OFFLINE) return i18n.t('errors.offline');
  if (error.type === ErrorType.TIMEOUT) return i18n.t('errors.timeout');
  if (error.type === ErrorType.UNAUTHORIZED) return i18n.t('errors.unauthorized');
  
  // Try to use backend-provided message if it exists
  if (error.message) return error.message;

  return i18n.t('errors.unknown');
};
