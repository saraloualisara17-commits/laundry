import { Client } from '@stomp/stompjs'
import { receiveNotification } from '../store/notifications/notificationSlice'
import { logOut, setCredentials } from '../store/auth/authSlice'
import { store } from '../store/store'
import { refreshApi } from './axios'
import { toast } from 'react-toastify'

// Derive WebSocket URL from the REST base URL (http→ws, https→wss)
const getWsUrl = () => {
  const apiBase = import.meta.env.DEV
    ? window.location.origin
    : (import.meta.env.VITE_API_URL || window.location.origin)
  return apiBase.replace(/^https/, 'wss').replace(/^http/, 'ws') + '/ws'
}

const AUTH_REFRESH_ATTEMPT_THRESHOLD = 2
const MAX_RECONNECT_DELAY = 60000

let stompClient = null
let reconnectAttempt = 0
let _userId = null
let _dispatch = null

const getExponentialDelay = (attempt) =>
  Math.min(2000 * Math.pow(2, attempt - 1), MAX_RECONNECT_DELAY)

const getToken = () => store.getState()?.auth?.token

const attemptTokenRefresh = async () => {
  try {
    // refreshToken HttpOnly cookie sent automatically via withCredentials
    const res = await refreshApi.post('/auth/refresh', null)
    const newToken = res.data.accessToken || res.data.token
    store.dispatch(setCredentials({ token: newToken }))
    return newToken
  } catch {
    store.dispatch(logOut())
    window.location.href = '/'
    return null
  }
}

const buildClient = (userId, dispatch) => {
  const client = new Client({
    brokerURL: getWsUrl(),
    connectHeaders: {
      Authorization: `Bearer ${getToken()}`,
    },
    debug: (str) => {
      if (import.meta.env.DEV) console.log('[WS]', str)
    },
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000,
    reconnectDelay: 0, // managed manually below
  })

  client.onConnect = () => {
    reconnectAttempt = 0

    // 1. Broadcast order updates (admin/employe live feed)
    client.subscribe('/topic/orders', (message) => {
      if (!message.body) return
      try {
        const payload = JSON.parse(message.body)
        dispatch({ type: 'admin/orderUpdated', payload })
      } catch { /* ignore malformed */ }
    })

    // 2. User-specific events (role-based alerts)
    client.subscribe(`/user/${userId}/queue/events`, (message) => {
      if (!message.body) return
      try {
        const payload = JSON.parse(message.body)
        dispatch({ type: 'admin/userEvent', payload })
      } catch { /* ignore malformed */ }
    })

    // 3. User-specific notifications (toast + store)
    client.subscribe(`/user/${userId}/queue/notifications`, (message) => {
      if (!message.body) return
      try {
        const notification = JSON.parse(message.body)
        dispatch(receiveNotification(notification))
        showNotificationToast(notification)
      } catch { /* ignore malformed */ }
    })
  }

  client.onDisconnect = () => {
    if (import.meta.env.DEV) console.log('[WS] Disconnected')
  }

  client.onStompError = (frame) => {
    console.error('[WS] STOMP error', frame.headers['message'], frame.body)
  }

  client.onWebSocketClose = async () => {
    reconnectAttempt += 1
    if (import.meta.env.DEV) console.log(`[WS] Closed — attempt ${reconnectAttempt}`)

    // After threshold failures, try to refresh the token first
    if (reconnectAttempt === AUTH_REFRESH_ATTEMPT_THRESHOLD) {
      const newToken = await attemptTokenRefresh()
      if (!newToken) return // logged out, stop reconnecting
    }

    const delay = getExponentialDelay(reconnectAttempt)
    setTimeout(() => {
      if (stompClient) {
        stompClient.connectHeaders = { Authorization: `Bearer ${getToken()}` }
        stompClient.activate()
      }
    }, delay)
  }

  return client
}

export const connectWebSocket = (userId, dispatch) => {
  if (stompClient?.active) return

  _userId = userId
  _dispatch = dispatch
  reconnectAttempt = 0

  stompClient = buildClient(userId, dispatch)
  stompClient.activate()
}

export const disconnectWebSocket = () => {
  if (stompClient) {
    stompClient.deactivate()
    stompClient = null
    reconnectAttempt = 0
  }
}

// ── Notification toast (unchanged visual style) ──────────────────────────────

const getToastStyles = (type, title = '') => {
  const text = (type || title || '').toUpperCase()
  if (text.includes('ORDER_CREATED') || text.includes('CRÉÉE') || text.includes('NOUVELLE'))
    return { bg: 'rgba(13,115,119,0.1)', emoji: '📦', border: '#0D7377' }
  if (text.includes('ORDER_RECEIVED') || text.includes('RÉCEPTIONNÉE'))
    return { bg: 'rgba(59,130,246,0.1)', emoji: '✅', border: '#3B82F6' }
  if (text.includes('ORDER_READY') || text.includes('PRÊTE'))
    return { bg: 'rgba(16,185,129,0.1)', emoji: '🎉', border: '#10B981' }
  if (text.includes('ORDER_DELIVERED') || text.includes('LIVRÉE'))
    return { bg: 'rgba(201,168,76,0.1)', emoji: '🚚', border: '#C9A84C' }
  if (text.includes('ORDER_PAID') || text.includes('PAYÉE'))
    return { bg: 'rgba(201,168,76,0.15)', emoji: '💰', border: '#C9A84C' }
  if (text.includes('ORDER_CANCELLED') || text.includes('ANNULÉE'))
    return { bg: 'rgba(239,68,68,0.1)', emoji: '❌', border: '#EF4444' }
  if (text.includes('ORDER_RETURNED') || text.includes('RETOURNÉE'))
    return { bg: 'rgba(245,158,11,0.1)', emoji: '↩️', border: '#F59E0B' }
  return { bg: 'rgba(13,115,119,0.08)', emoji: '🔔', border: '#0D7377' }
}

const showNotificationToast = (notification) => {
  const s = getToastStyles(notification.type, notification.title)
  toast.info(
    <div className="flex gap-3 items-start text-start">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[16px]"
        style={{ backgroundColor: s.bg }}
      >
        {s.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-['Inter'] text-[13px] font-semibold text-[#0D1B2A] m-0">
          {notification.title}
        </p>
        <p className="font-['Inter'] text-[12px] text-[#4A5568] truncate m-0 mt-0.5">
          {notification.message}
        </p>
        <p className="font-['Inter'] text-[11px] text-[#94A3B8] m-0 mt-1 uppercase font-bold tracking-wider">
          À l'instant
        </p>
      </div>
    </div>,
    {
      position: 'top-right',
      autoClose: 4000,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      className: 'premium-notification-toast',
      style: {
        borderLeft: `4px solid ${s.border}`,
        background: 'white',
        borderRadius: '14px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        padding: '14px 16px',
        width: '300px',
      },
    }
  )
}
