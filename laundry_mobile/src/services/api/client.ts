import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { ApiError } from './types';
import { connectivity } from '../offline/connectivity';

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.105:8080';

const client: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000, // 15 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

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

/**
 * Interceptor to add Authorization header
 */
client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  // We need to avoid circular dependencies with the store
  // so we'll try to get the token directly if possible, or use a dynamic import/injection
  try {
    // Attempt to get token from SecureStore if it's not passed in some other way
    // In this app's architecture, we might still want to peek at the Redux state
    // but for now let's use a placeholder for the strategy.
    
    // NOTE: The original app imports the store inside the interceptor.
    // This is generally safe in JS but can be tricky in TS with circular deps.
    const { store } = require('../../store/store');
    const token = store.getState().auth.token;
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    console.error('Request interceptor error:', e);
  }
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
        const { store } = require('../../store/store');
        const { logOut } = require('../../store/authSlice');
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
        const refreshToken = await SecureStore.getItemAsync('refreshToken');

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Dedicated refresh client to avoid interceptors loops
        const refreshClient = axios.create({ baseURL: BASE_URL });
        const res = await refreshClient.post('/auth/refresh', null, {
          headers: { 'X-Refresh-Token': refreshToken },
        });

        const newAccessToken = res.data.token;
        const newRefreshToken = res.data.refreshToken || refreshToken;

        const { store } = require('../../store/store');
        const { setCredentials } = require('../../store/authSlice');

        await SecureStore.setItemAsync('refreshToken', newRefreshToken);
        store.dispatch(setCredentials({ token: newAccessToken }));

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return client(originalRequest);
      } catch (err) {
        // Refresh failed, logout user
        const { store } = require('../../store/store');
        const { logOut } = require('../../store/authSlice');
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
