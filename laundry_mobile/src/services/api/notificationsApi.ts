import client from './client';

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  referenceId?: number;
  createdAt: string;
}

export const notificationsApi = {
  getNotifications: () =>
    client.get<AppNotification[]>('/api/notifications'),

  getUnreadCount: () =>
    client.get<{ count: number }>('/api/notifications/unread-count'),

  markAsRead: (id: number) =>
    client.put(`/api/notifications/${id}/read`),

  markAllAsRead: () =>
    client.put('/api/notifications/mark-all-read'),
};

export default notificationsApi;
