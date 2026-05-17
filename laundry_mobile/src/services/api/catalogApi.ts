import client from './client';

export const catalogApi = {
  /**
   * Get all categories with their products
   */
  getCategories: () =>
    client.get('/api/admin/catalog/categories'),

  /**
   * Create a new category
   */
  createCategory: (data: any) =>
    client.post('/api/admin/catalog/categories', data),

  /**
   * Update an existing category
   */
  updateCategory: (id: number | string, data: any) =>
    client.put(`/api/admin/catalog/categories/${id}`, data),

  /**
   * Toggle category activation status
   */
  toggleCategory: (id: number | string) =>
    client.patch(`/api/admin/catalog/categories/${id}/toggle`),

  /**
   * Create a new product in a category
   */
  createProduct: (categoryId: number | string, data: any) =>
    client.post(`/api/admin/catalog/categories/${categoryId}/products`, data),

  /**
   * Update an existing product
   */
  updateProduct: (id: number | string, data: any) =>
    client.put(`/api/admin/catalog/products/${id}`, data),

  /**
   * Toggle product activation status
   */
  toggleProduct: (id: number | string) =>
    client.patch(`/api/admin/catalog/products/${id}/toggle`),
};

export default catalogApi;
