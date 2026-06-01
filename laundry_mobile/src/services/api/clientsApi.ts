import client from './client';
import { PaginationParams, PaginatedResponse } from './types';

export interface ClientFilters extends PaginationParams {
  search?: string;
}

export const clientsApi = {
  /**
   * Get all clients with filtering and pagination
   */
  getClients: (params: ClientFilters) =>
    client.get<PaginatedResponse<any>>('/api/clients', { params }),

  /**
   * Get a single client by ID
   */
  getClient: (id: number | string) =>
    client.get(`/api/clients/${id}`),

  /**
   * Create a new client
   */
  createClient: (data: any) =>
    client.post('/api/clients', data),

  /**
   * Update client information
   */
  updateClient: (id: number | string, data: any) =>
    client.put(`/api/clients/${id}`, data),

  /**
   * Get all orders for a specific client
   */
  getClientCommandes: (id: number | string) =>
    client.get<any[]>(`/api/clients/${id}/commandes`),
};

export default clientsApi;
