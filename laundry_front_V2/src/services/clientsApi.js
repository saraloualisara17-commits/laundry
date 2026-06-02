import { api } from '../api/axios'

export const clientsApi = {
  getAll: (params = {}) => api.get('/api/clients', { params }).then(r => r.data),
  getById: (id) => api.get(`/api/clients/${id}`).then(r => r.data),
  create: (data) => api.post('/api/clients', data).then(r => r.data),
  update: (id, data) => api.put(`/api/clients/${id}`, data).then(r => r.data),
  searchByPhone: (phone) => api.get('/api/clients/search', { params: { phone } }).then(r => r.data),
  getOrders: (clientId) => api.get(`/admin/client/${clientId}`).then(r => r.data),
  getStatistics: () => api.get('/admin/clients/statistics').then(r => r.data),
}
