import { api } from '../api/axios';

export const adminApi = {
  // Dashboard
  getStats: () =>
    api.get('/admin/statistics/today'),
  getStatusOverview: () =>
    api.get('/api/admin/stats/status-overview'),
  getRecentOrders: () =>
    api.get('/admin/commandes?limit=5&sort=recent'),

  // Orders
  getOrders: (params: {
    status?: string
    search?: string
    page?: number
    limit?: number
  }) => api.get('/admin/commandes', { params }),

  getOrder: (id: number | string) =>
    api.get(`/admin/commandes/${id}`),

  deleteOrder: (id: number | string) =>
    api.delete(`/api/commandes/${id}`),

  updateOrderStatus: (
    id: number | string,
    status: string,
    commentaire?: string
  ) => api.patch(
    `/api/commandes/${id}/status`,
    { status, commentaire }
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
  }) => api.get('/admin/clients', { params }),

  getClient: (id: number | string) =>
    api.get(`/admin/client/${id}`),

  createClient: (data: any) =>
    api.post('/admin/clients', data),

  updateClient: (id: number | string, data: any) =>
    api.put(`/admin/clients/${id}`, data),

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

  toggleUserActive: (id: number | string) =>
    api.patch(`/admin/inactive-user/${id}`), // The backend uses /inactive-user/{id} to toggle? No, activate/inactivate are separate

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
}
