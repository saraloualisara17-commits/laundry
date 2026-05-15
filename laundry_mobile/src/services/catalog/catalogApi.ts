import api from '../shared/api';
import { CategoryDTO, ProductDTO } from './catalogTypes';

export const catalogApi = {
  /**
   * Get all categories with their products.
   * Path: /api/admin/catalog/categories
   */
  getCategories: () => 
    api.get<CategoryDTO[]>('/api/admin/catalog/categories'),

  /**
   * Create a new category.
   */
  createCategory: (data: Partial<CategoryDTO>) => 
    api.post<CategoryDTO>('/api/admin/catalog/categories', data),

  /**
   * Update an existing category.
   */
  updateCategory: (id: number | string, data: Partial<CategoryDTO>) => 
    api.put<CategoryDTO>(`/api/admin/catalog/categories/${id}`, data),

  /**
   * Toggle category activation status.
   */
  toggleCategory: (id: number | string) => 
    api.patch<CategoryDTO>(`/api/admin/catalog/categories/${id}/toggle`),

  /**
   * Create a new product in a category.
   */
  createProduct: (categoryId: number | string, data: Partial<ProductDTO>) => 
    api.post<ProductDTO>(`/api/admin/catalog/categories/${categoryId}/products`, data),

  /**
   * Update an existing product.
   */
  updateProduct: (id: number | string, data: Partial<ProductDTO>) => 
    api.put<ProductDTO>(`/api/admin/catalog/products/${id}`, data),

  /**
   * Toggle product activation status.
   */
  toggleProduct: (id: number | string) => 
    api.patch<ProductDTO>(`/api/admin/catalog/products/${id}/toggle`),
};

export default catalogApi;
