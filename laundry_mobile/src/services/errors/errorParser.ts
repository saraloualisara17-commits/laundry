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

  // Handle already-normalized ApiError objects produced by client.ts normalizeError().
  // These are plain objects with { message, status, code, details } — axios.isAxiosError()
  // returns false for them, so without this branch they fall through to ErrorType.UNKNOWN.
  if (error && typeof error === 'object' && !axios.isAxiosError(error) && 'status' in error && typeof error.status === 'number') {
    const { status, message, code, details } = error;
    switch (status) {
      case 401:
        return new AppError(
          i18n.t('errors.unauthorized', { defaultValue: 'Email ou mot de passe incorrect' }),
          ErrorType.UNAUTHORIZED,
          { status, code, originalError: error }
        );
      case 403:
        return new AppError(
          i18n.t('errors.forbidden', { defaultValue: 'Accès refusé' }),
          ErrorType.FORBIDDEN,
          { status, code, originalError: error }
        );
      case 404:
        return new AppError(
          i18n.t('errors.not_found', { defaultValue: 'Ressource introuvable' }),
          ErrorType.NOT_FOUND,
          { status, code, originalError: error }
        );
      case 409:
        return new AppError(
          i18n.t('errors.conflict', { defaultValue: 'Enregistrement modifié par un autre utilisateur. Veuillez recharger.' }),
          ErrorType.CONFLICT,
          { status, code, originalError: error }
        );
      case 400:
      case 422:
        return new AppError(
          message || i18n.t('errors.validation', { defaultValue: 'Données invalides' }),
          ErrorType.VALIDATION,
          { status, code, details, originalError: error }
        );
      default:
        return new AppError(
          message || i18n.t('errors.unknown', { defaultValue: 'Une erreur inattendue est survenue' }),
          ErrorType.API,
          { status, code, originalError: error }
        );
    }
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

    // SSL / certificate errors — distinct from plain offline because retrying
    // won't help; the server cert or the device's trust store has a problem.
    const sslCodes = ['ERR_SSL_PROTOCOL_ERROR', 'ERR_CERT_AUTHORITY_INVALID', 'ERR_CERT_DATE_INVALID', 'ERR_CERT_COMMON_NAME_INVALID'];
    if (!error.response && (sslCodes.includes(error.code ?? '') || error.message?.includes('SSL') || error.message?.includes('certificate'))) {
      return new AppError(
        i18n.t('errors.ssl', { defaultValue: 'Secure connection failed. Please contact support.' }),
        ErrorType.NETWORK,
        { code: 'SSL_ERROR', originalError: error }
      );
    }

    // Network Error (Offline or DNS)
    if (!error.response && (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error') || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED')) {
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
      case 409:
        return new AppError(
          i18n.t('errors.conflict', { defaultValue: 'This record was modified by someone else. Please reload and try again.' }),
          ErrorType.CONFLICT,
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
  if (error.type === ErrorType.NETWORK && error.code === 'SSL_ERROR') {
    return i18n.t('errors.ssl', { defaultValue: 'Secure connection failed. Please contact support.' });
  }

  // Try to use backend-provided message if it exists
  if (error.message) return error.message;

  return i18n.t('errors.unknown');
};
