import client from './client';

export interface UserCreateRequest {
  name: string;
  email: string;
  password?: string;
  role: string;
  phone?: string;
}

export const usersApi = {
  /**
   * Get all active users
   */
  getActiveUsers: () =>
    client.get('/api/admin/active-users'),

  /**
   * Create a new user
   */
  createUser: (data: UserCreateRequest) =>
    client.post('/api/admin/create-user', data),

  /**
   * Update an existing user
   */
  updateUser: (id: number | string, data: Partial<UserCreateRequest>) =>
    client.put(`/api/admin/update-user/${id}`, data),

  /**
   * Activate a user account
   */
  activateUser: (id: number | string) =>
    client.patch(`/api/admin/active-user/${id}`),

  /**
   * Deactivate a user account
   */
  deactivateUser: (id: number | string) =>
    client.patch(`/api/admin/inactive-user/${id}`),

  /**
   * Reset user password
   */
  resetPassword: (id: number | string, password: string) =>
    client.put(`/api/admin/change-user-password/${id}`, { password }),
};

export default usersApi;
