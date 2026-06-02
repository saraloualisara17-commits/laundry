import { api } from '../api/axios'

export const ordersApi = {
  getAll: (params = {}) => api.get('/admin/commandes', { params }).then(r => r.data),
  getById: (id) => api.get(`/api/commandes/${id}`).then(r => r.data),
  create: (data) => api.post('/admin/commandes', data).then(r => r.data),
  update: (id, data) => api.put(`/admin/commandes/${id}`, data).then(r => r.data),
  updateStatus: (id, data) => api.patch(`/api/commandes/${id}/status`, data).then(r => r.data),
  delete: (id) => api.delete(`/api/commandes/${id}`).then(r => r.data),
  getPayments: (id) => api.get(`/api/commandes/${id}/payments`).then(r => r.data),
  addPayment: (id, data) => api.post(`/api/commandes/${id}/payments`, data).then(r => r.data),
  getHistory: (id) => api.get(`/api/commandes/${id}/history`).then(r => r.data),
  assignDeliveryDriver: (id, data) => api.patch(`/api/admin/commandes/${id}/delivery-driver`, data).then(r => r.data),
  assignPickupDriver: (id, data) => api.patch(`/api/admin/commandes/${id}/pickup-driver`, data).then(r => r.data),
  getWhatsappMessage: (id) => api.get(`/api/commandes/${id}/receipt/order/whatsapp`).then(r => r.data),
  exportCsv: () => api.get('/admin/commandes/export-csv', { responseType: 'blob' }).then(r => r.data),
  uploadImage: (id, data) => api.post(`/api/commandes/${id}/images`, data).then(r => r.data),
  applyRemise: (id, items) => api.patch(`/api/commandes/${id}/remise`, { items }).then(r => r.data),
  getForMap: (params = {}) => api.get('/api/admin/commandes/map', { params }).then(r => r.data),
}
