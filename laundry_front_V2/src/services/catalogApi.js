import { api } from '../api/axios'

export const catalogApi = {
  getCategories: () => api.get('/api/admin/catalog/categories').then(r => r.data),
  createCategory: (data) => api.post('/api/admin/catalog/categories', data).then(r => r.data),
  updateCategory: (id, data) => api.put(`/api/admin/catalog/categories/${id}`, data).then(r => r.data),
  toggleCategory: (id) => api.patch(`/api/admin/catalog/categories/${id}/toggle`).then(r => r.data),
  deleteCategory: (id) => api.delete(`/api/admin/catalog/categories/${id}`).then(r => r.data),
  createProduct: (categoryId, data) => api.post(`/api/admin/catalog/categories/${categoryId}/products`, data).then(r => r.data),
  updateProduct: (id, data) => api.put(`/api/admin/catalog/products/${id}`, data).then(r => r.data),
  toggleProduct: (id) => api.patch(`/api/admin/catalog/products/${id}/toggle`).then(r => r.data),
  deleteProduct: (id) => api.delete(`/api/admin/catalog/products/${id}`).then(r => r.data),
}
