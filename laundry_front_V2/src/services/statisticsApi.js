import { api } from '../api/axios'

export const statisticsApi = {
  getToday: () => api.get('/api/statistics/today').then(r => r.data),
  getStatusOverview: () => api.get('/api/admin/stats/status-overview').then(r => r.data),
  getOverdue: () => api.get('/api/admin/stats/overdue').then(r => r.data),
  getOverdueOrders: (type) => api.get(`/api/admin/stats/overdue-orders`, { params: { type } }).then(r => r.data),
  getLivreurStats: () => api.get('/api/livreur/dashboard/stats').then(r => r.data),
  getDateRange: (params) => api.get('/api/statistics/date-range', { params }).then(r => r.data),
}
