import axios from 'axios';
import * as SecureStore from 'expo-secure-store';


export const BASE_URL = 'http://192.168.1.105:8080'; // The backend IP
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
      const { store } = require('../store/store');
      const { logOut } = require('../store/authSlice');
      // Handle forbidden / suspended account
      store.dispatch(logOut());
      await SecureStore.deleteItemAsync('refreshToken');
      await SecureStore.deleteItemAsync('user');
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
