import { api } from './axios';

export const getCategories = () =>
  api.get('/api/admin/catalog/categories');

export const getCategoryById = (id) =>
  api.get(`/api/admin/catalog/categories/${id}`);

export const createCategory = (data) =>
  api.post('/api/admin/catalog/categories', data);

export const updateCategory = (id, data) =>
  api.put(`/api/admin/catalog/categories/${id}`, data);

export const toggleCategory = (id) =>
  api.patch(`/api/admin/catalog/categories/${id}/toggle`);

export const deleteCategory = (id) =>
  api.delete(`/api/admin/catalog/categories/${id}`);

export const getProductsByCategory = (categoryId) =>
  api.get(`/api/admin/catalog/categories/${categoryId}/products`);

export const getAllProducts = () =>
  api.get('/api/admin/catalog/products');

export const createProduct = (categoryId, data) =>
  api.post(`/api/admin/catalog/categories/${categoryId}/products`, data);

export const updateProduct = (id, data) =>
  api.put(`/api/admin/catalog/products/${id}`, data);

export const toggleProduct = (id) =>
  api.patch(`/api/admin/catalog/products/${id}/toggle`);

export const deleteProduct = (id) =>
  api.delete(`/api/admin/catalog/products/${id}`);

export const uploadFiles = (files) => {
  const formData = new FormData();
  Array.from(files).forEach((file) => {
    formData.append('files', file);
  });
  return api.post('/api/upload/multiple', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
