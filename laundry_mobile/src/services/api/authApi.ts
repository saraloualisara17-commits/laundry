import client from './client';

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
    isActive: boolean;
  };
}

export const authApi = {
  /**
   * Log in with email and password
   */
  login: (credentials: { email: string; password: string }) =>
    client.post<LoginResponse>('/auth/login', credentials),

  /**
   * Refresh access token using refresh token
   */
  refresh: (refreshToken: string) =>
    client.post<LoginResponse>('/auth/refresh', null, {
      headers: { 'X-Refresh-Token': refreshToken },
    }),

  /**
   * Log out the current user
   */
  logout: () => client.post('/auth/logout'),
};

export default authApi;
