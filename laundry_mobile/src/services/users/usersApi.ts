import api from '../shared/api';
import { UserDTO, UserCreateRequest, UserUpdateRequest } from './usersTypes';

export const usersApi = {
  /**
   * Get all active users.
   * Path: /api/admin/active-users
   */
  getActiveUsers: () => 
    api.get<UserDTO[]>('/api/admin/active-users'),

  /**
   * Get all inactive users.
   * Path: /api/admin/inactive-users
   */
  getInactiveUsers: () => 
    api.get<UserDTO[]>('/api/admin/inactive-users'),

  /**
   * Create a new user.
   * Path: /api/admin/create-user
   */
  createUser: (data: UserCreateRequest) => 
    api.post<UserDTO>('/api/admin/create-user', data),

  /**
   * Update an existing user.
   * Path: /api/admin/update-user/{id}
   */
  updateUser: (id: number | string, data: UserUpdateRequest) => 
    api.put<UserDTO>(`/api/admin/update-user/${id}`, data),

  /**
   * Activate a user account.
   */
  activateUser: (id: number | string) => 
    api.patch<UserDTO>(`/api/admin/active-user/${id}`),

  /**
   * Deactivate a user account.
   */
  deactivateUser: (id: number | string) => 
    api.patch<UserDTO>(`/api/admin/inactive-user/${id}`),

  /**
   * Delete a user account (permanently).
   */
  deleteUser: (id: number | string) => 
    api.delete(`/api/admin/delete-user/${id}`),

  /**
   * Reset user password.
   */
  resetPassword: (id: number | string, password: string) => 
    api.put(`/api/admin/change-user-password/${id}`, { password }),
};

export default usersApi;
