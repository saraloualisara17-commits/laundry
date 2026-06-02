import { api } from '../api/axios'

export const employeApi = {
  getOrders: (params = {}) => api.get('/admin/commandes', { params }).then(r => r.data),
  getReturnedOrders: () => api.get('/admin/commandes', { params: { status: 'DELIVERY_FAILED' } }).then(r => r.data),
  uploadImages: (orderId, data) => api.post(`/api/commandes/${orderId}/images`, data).then(r => r.data),
}
