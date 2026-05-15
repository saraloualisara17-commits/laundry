import api from '../shared/api';
import { buildQueryParams } from '../shared/queryHelpers';
import { ClientDTO, ClientsResponseDTO, ClientFilters } from './clientsTypes';

export const clientsApi = {
  /**
   * Get all clients with filtering and pagination.
   * Path: /api/admin/clients
   */
  getClients: (filters: ClientFilters) => {
    const params = buildQueryParams(filters);
    return api.get<ClientsResponseDTO>('/api/clients', { params });
  },

  /**
   * Get a single client by ID.
   * Path: /api/clients/{id}
   */
  getClient: (id: number | string) => 
    api.get<ClientDTO>(`/api/clients/${id}`),

  /**
   * Create a new client.
   * Path: /api/clients
   */
  createClient: (data: Partial<ClientDTO>) => 
    api.post<ClientDTO>('/api/clients', data),

  /**
   * Update client information.
   * Path: /api/clients/{id}
   */
  updateClient: (id: number | string, data: Partial<ClientDTO>) => 
    api.put<ClientDTO>(`/api/clients/${id}`, data),

  /**
   * Search clients by name or phone.
   */
  searchClients: (query: string) => 
    api.get<ClientDTO[]>('/api/clients/search', { params: { query } }),
};

export default clientsApi;
