import { api } from '../api/axios'

export const livreurApi = {
  getReadyForDelivery: () => api.get('/api/livreur/commandes/ready-for-delivery').then(r => r.data),
  getPendingPickup: () => api.get('/api/livreur/commandes/pending-pickup').then(r => r.data),
  getCanceled: () => api.get('/api/livreur/commandes/past-deliveries').then(r => r.data),
  getDashboardStats: () => api.get('/api/livreur/dashboard/stats').then(r => r.data),
  cancelDelivery: (id) => api.put(`/api/livreur/commandes/${id}/cancel`).then(r => r.data),
  returnToWorkplace: (id) => api.patch(`/api/livreur/commandes/${id}/return`).then(r => r.data),
  recordPayment: (orderId, data) => api.post(`/api/commandes/${orderId}/payments`, data).then(r => r.data),
  getPaymentTypes: () => api.get('/api/livreur/payment-types').then(r => r.data),
}
