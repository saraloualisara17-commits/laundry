import { api } from '../api/axios';

export const adminApi = {
  // Dashboard
  getStats: () =>
    api.get('/admin/statistics/today'),
  getStatusOverview: () =>
    api.get('/api/admin/stats/status-overview'),
  getRecentOrders: () =>
    api.get('/admin/commandes?limit=5&sort=recent'),

  getOrdersForMap: () =>
    api.get('/api/admin/commandes/map'),

  // Orders
  getOrders: (params: {
    status?: string
    search?: string
    page?: number
    limit?: number
    dateDebut?: string
    dateFin?: string
    livreurId?: number | string
  }) => api.get('/admin/commandes', { params }),

  getOrder: (id: number | string) =>
    api.get(`/admin/commandes/${id}`),

  deleteOrder: (id: number | string) =>
    api.delete(`/api/commandes/${id}`),

  updateOrderStatus: (
    id: number | string,
    status: string,
    paymentData?: {
      montantCollecte?: number,
      notesPaiement?: string
    }
  ) => api.patch(
    `/api/commandes/${id}/status`,
    { status, ...paymentData }
  ),

  assignDeliveryDriver: (id: number | string, driverId: string | number) =>
    api.patch(`/api/admin/commandes/${id}/delivery-driver`, { deliveryDriverId: driverId }),

  getOrderPayments: (id: number | string) =>
    api.get(`/api/commandes/${id}/payments`),

  addOrderPayment: (id: number | string, amount: number, note?: string) =>
    api.post(`/api/commandes/${id}/payments`, { amount, note }),

  getOrderHistory: (id: number | string) =>
    api.get(`/api/commandes/${id}/history`),

  createOrder: (data: any) =>
    api.post('/admin/commandes', data),

  updateOrder: (id: number | string, data: any) =>
    api.put(`/admin/commandes/${id}`, data),

  uploadFiles: (files: any[]) => {
    const formData = new FormData();
    files.forEach((file: any) => {
      formData.append('files', {
        uri: file.uri,
        name: file.name || 'image.jpg',
        type: file.type || 'image/jpeg',
      } as any);
    });
    return api.post('/api/upload/multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  addOrderImages: (id: number | string, imageUrls: string[], photoType: string) =>
    api.post(`/api/commandes/${id}/images`, { imageUrls, photoType }),

  // Clients
  getClients: (params: {
    search?: string
    page?: number
    limit?: number
  }) => api.get('/api/clients', { params }),

  getClient: (id: number | string) =>
    api.get(`/api/clients/${id}`),

  createClient: (data: any) =>
    api.post('/api/clients', data),

  updateClient: (id: number | string, data: any) =>
    api.put(`/api/clients/${id}`, data),

  // Catalog
  getCategories: () =>
    api.get('/api/admin/catalog/categories'),

  createCategory: (data: any) =>
    api.post('/api/admin/catalog/categories', data),

  updateCategory: (id: number | string, data: any) =>
    api.put(
      `/api/admin/catalog/categories/${id}`, data
    ),

  toggleCategory: (id: number | string) =>
    api.patch(
      `/api/admin/catalog/categories/${id}/toggle`
    ),

  createProduct: (categoryId: number | string, data: any) =>
    api.post(
      `/api/admin/catalog/categories/${categoryId}/products`,
      data
    ),

  updateProduct: (id: number | string, data: any) =>
    api.put(`/api/admin/catalog/products/${id}`, data),

  toggleProduct: (id: number | string) =>
    api.patch(
      `/api/admin/catalog/products/${id}/toggle`
    ),

  // Users
  getUsers: () =>
    api.get('/admin/active-users'),

  createUser: (data: any) =>
    api.post('/admin/create-user', data),

  updateUser: (id: number | string, data: any) =>
    api.put(`/admin/update-user/${id}`, data),

  activateUser: (id: number | string) =>
    api.patch(`/admin/active-user/${id}`),

  deactivateUser: (id: number | string) =>
    api.patch(`/admin/inactive-user/${id}`),

  resetPassword: (id: number | string, password: string) =>
    api.put(`/admin/change-user-password/${id}`,
      { password }
    ),

  // Unpaid
  getUnpaidOverview: () =>
    api.get('/api/admin/unpaid/overview'),

  getClientDebtList: () =>
    api.get('/api/admin/unpaid/clients'),

  getClientDebtDetail: (clientId: number | string) =>
    api.get(`/api/admin/unpaid/clients/${clientId}`),

  getAllUnpaidOrders: () =>
    api.get('/api/admin/unpaid/orders'),

  // Receipts & PDFs
  getOrderPdfUrl: (id: number | string) => 
    `${api.defaults.baseURL}/api/commandes/${id}/receipt/order/pdf`,

  getDeliveryPdfUrl: (id: number | string) => 
    `${api.defaults.baseURL}/api/commandes/${id}/receipt/delivery/pdf`,

  getOrderReceipt: (id: number | string) =>
    api.get(`/api/commandes/${id}/receipt/order/whatsapp`),

  getDeliveryReceipt: (id: number | string) =>
    api.get(`/api/commandes/${id}/receipt/delivery/whatsapp`),
}
