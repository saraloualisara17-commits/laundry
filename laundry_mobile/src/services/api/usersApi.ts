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
    client.get('/admin/active-users'),

  /**
   * Create a new user
   */
  createUser: (data: UserCreateRequest) =>
    client.post('/admin/create-user', data),

  /**
   * Update an existing user
   */
  updateUser: (id: number | string, data: Partial<UserCreateRequest>) =>
    client.put(`/admin/update-user/${id}`, data),

  /**
   * Activate a user account
   */
  activateUser: (id: number | string) =>
    client.patch(`/admin/active-user/${id}`),

  /**
   * Deactivate a user account
   */
  deactivateUser: (id: number | string) =>
    client.patch(`/admin/inactive-user/${id}`),

  /**
   * Reset user password
   */
  resetPassword: (id: number | string, password: string) =>
    client.put(`/admin/change-user-password/${id}`, { password }),
};

export default usersApi;
