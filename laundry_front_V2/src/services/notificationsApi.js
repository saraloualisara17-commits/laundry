import { api } from '../api/axios'

export const notificationsApi = {
  getAll: () => api.get('/api/notifications').then(r => r.data),
  getUnreadCount: () => api.get('/api/notifications/unread-count').then(r => r.data),
  markAsRead: (id) => api.put(`/api/notifications/${id}/read`).then(r => r.data),
  markAllRead: () => api.put('/api/notifications/mark-all-read').then(r => r.data),
}
