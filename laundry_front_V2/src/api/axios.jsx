import axios from "axios"
import { store } from "../store/store"
import { logOut, setCredentials } from "../store/auth/authSlice"

const BASE_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '')

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

const refreshApi = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 15000,
})

// Dedup guard: if multiple 401s fire at once, only one refresh call goes out
let _refreshPromise = null

api.interceptors.request.use((config) => {
  const token = store.getState()?.auth?.token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (
      error.response?.status === 403 &&
      !originalRequest?.url?.includes("/auth/refresh") &&
      !originalRequest?.url?.includes("/auth/login")
    ) {
      if (error.response?.data?.error === "ACCOUNT_DISABLED") {
        store.dispatch(logOut())
        localStorage.removeItem('user')
        window.location.href = '/compte-suspendu'
        return Promise.reject(error)
      }

      const user = JSON.parse(localStorage.getItem('user') || 'null')
      store.dispatch(logOut())
      if (user?.isActive === false) {
        window.location.href = '/compte-suspendu'
      } else {
        window.location.href = '/interdit'
      }
      return Promise.reject(error)
    }

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url.includes("/auth/login") &&
      !originalRequest.url.includes("/auth/refresh")
    ) {
      originalRequest._retry = true

      try {
        if (!_refreshPromise) {
          const refreshToken = store.getState()?.auth?.refreshToken
          _refreshPromise = refreshApi
            .post("/auth/refresh", null, {
              headers: { 'X-Refresh-Token': refreshToken },
            })
            .then((res) => {
              const newToken = res.data.accessToken || res.data.token
              const newRefreshToken = res.data.refreshToken
              store.dispatch(setCredentials({ token: newToken, refreshToken: newRefreshToken }))
              return newToken
            })
            .finally(() => {
              _refreshPromise = null
            })
        }

        const newToken = await _refreshPromise
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch (err) {
        _refreshPromise = null
        store.dispatch(logOut())
        localStorage.removeItem('user')
        window.location.href = '/'
        return Promise.reject(err)
      }
    }

    return Promise.reject(error)
  }
)

export { refreshApi }
