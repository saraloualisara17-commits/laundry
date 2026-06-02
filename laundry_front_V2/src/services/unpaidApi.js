import { api } from '../api/axios'

export const unpaidApi = {
  getOverview: () => api.get('/api/admin/unpaid/overview').then(r => r.data),
  getClients: () => api.get('/api/admin/unpaid/clients').then(r => r.data),
  getClientDetail: (clientId) => api.get(`/api/admin/unpaid/clients/${clientId}`).then(r => r.data),
  getAllUnpaidOrders: () => api.get('/api/admin/unpaid/orders').then(r => r.data),
}
