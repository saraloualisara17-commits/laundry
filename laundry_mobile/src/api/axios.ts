import axios from 'axios';
import * as SecureStore from 'expo-secure-store';


export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://resourceful-gratitude-production-6f76.up.railway.app';
export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const refreshApi = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor to add Authorization header
api.interceptors.request.use(async (config) => {
  const { store } = require('../store/store');
  const token = store.getState().auth.token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor for handling 401s
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 403) {
      // Only force-logout on account suspension signals, NOT on regular access-denied (role restriction)
      const errorData = error.response?.data;
      const isAccountDisabled =
        errorData?.error === 'ACCOUNT_DISABLED' ||
        errorData?.message?.includes('désactivé');

      if (isAccountDisabled) {
        const { store } = require('../store/store');
        const { logOut } = require('../store/authSlice');
        store.dispatch(logOut());
        await SecureStore.deleteItemAsync('refreshToken');
        await SecureStore.deleteItemAsync('user');
      }
      // For regular 403 (role restriction), just reject without logging out
      return Promise.reject(error);
    }

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');

        if (!refreshToken) {
          // If no refresh token, just log out and reject
          const { store } = require('../store/store');
          const { logOut } = require('../store/authSlice');
          store.dispatch(logOut());
          return Promise.reject(new Error('Session expired'));
        }

        // Call the refresh endpoint
        const res = await refreshApi.post('/auth/refresh', null, {
          headers: {
            'X-Refresh-Token': refreshToken,
          },
        });

        const newAccessToken = res.data.token;
        const newRefreshToken = res.data.refreshToken || refreshToken;

        const { store } = require('../store/store');
        const { setCredentials } = require('../store/authSlice');

        await SecureStore.setItemAsync('refreshToken', newRefreshToken);
        store.dispatch(setCredentials({ token: newAccessToken }));

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (err) {
        const { store } = require('../store/store');
        const { logOut } = require('../store/authSlice');
        store.dispatch(logOut());
        await SecureStore.deleteItemAsync('refreshToken');
        await SecureStore.deleteItemAsync('user');
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);
