import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { ApiError } from './types';
import { connectivity } from '../offline/connectivity';
import { logger } from '../../lib/logger';
import { store } from '../../store/store';
import { setCredentials, logOut } from '../../store/authSlice';

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://astrapropre.ma';

const client: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});


/**
 * Single in-flight refresh promise shared across all concurrent 401 failures.
 * Without this, three parallel requests that all get 401 would each independently
 * call /auth/refresh — the first would succeed, the second and third would hit a
 * now-invalid token and log the user out unnecessarily.
 */
let _refreshPromise: Promise<string> | null = null;

const refreshAccessToken = async (): Promise<string> => {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    const refreshToken = await SecureStore.getItemAsync('refreshToken');
    if (!refreshToken) throw new Error('No refresh token available');

    const refreshClient = axios.create({ baseURL: BASE_URL });
    const res = await refreshClient.post('/auth/refresh', null, {
      headers: { 'X-Refresh-Token': refreshToken },
    });

    const newAccessToken: string = res.data.token;
    if (!newAccessToken) {
      throw new Error('Refresh response contained no token — forcing logout');
    }
    const newRefreshToken: string = res.data.refreshToken || refreshToken;

    await SecureStore.setItemAsync('refreshToken', newRefreshToken);
    store.dispatch(setCredentials({ token: newAccessToken }));
    return newAccessToken;
  })().finally(() => {
    _refreshPromise = null;
  });

  return _refreshPromise;
};

/**
 * Normalizes error responses from the API
 */
export const normalizeError = (error: any): ApiError => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<any>;
    return {
      message: axiosError.response?.data?.message || axiosError.message || 'An unexpected error occurred',
      status: axiosError.response?.status,
      code: axiosError.response?.data?.error || axiosError.code,
      details: axiosError.response?.data,
    };
  }
  return {
    message: error.message || 'An unexpected error occurred',
  };
};

client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  try {
    const token = store.getState().auth.token;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    logger.network.error('Request interceptor failed to attach token', { err: String(e) });
  }

  logger.network.debug(`${config.method?.toUpperCase()} ${config.url}`);
  return config;
});

/**
 * Interceptor for response handling, including 401 token refresh
 */
client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Handle 403 - Forbidden (Account Disabled)
    if (error.response?.status === 403) {
      const errorData = error.response?.data as any;
      const isAccountDisabled =
        errorData?.error === 'ACCOUNT_DISABLED' ||
        errorData?.message?.includes('désactivé');

      if (isAccountDisabled) {
        logger.auth.warn('Account disabled — logging out');
        store.dispatch(logOut());
        await SecureStore.deleteItemAsync('refreshToken');
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('user');
      }
      return Promise.reject(normalizeError(error));
    }

    // Handle 401 - Unauthorized (Token Expired)
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;

      try {
        logger.auth.info('Refreshing access token');
        const newAccessToken = await refreshAccessToken();
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        logger.auth.info('Token refreshed — retrying original request');
        return client(originalRequest);
      } catch (err) {
        logger.auth.warn('Token refresh failed — logging out');
        store.dispatch(logOut());
        await SecureStore.deleteItemAsync('refreshToken');
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('user');
        return Promise.reject(normalizeError(err));
      }
    }

    return Promise.reject(normalizeError(error));
  }
);

export default client;
