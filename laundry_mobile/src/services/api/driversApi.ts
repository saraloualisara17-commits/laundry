import client from './client';

export const driversApi = {
  /**
   * Get all active users (filtered as drivers in some contexts)
   */
  getActiveDrivers: () =>
    client.get('/admin/active-users'),

  /**
   * Get dashboard statistics for the current livreur
   */
  getLivreurDashboardStats: () =>
    client.get('/api/livreur/dashboard/stats'),

  /**
   * Get available payment types for livreurs
   */
  getPaymentTypes: () =>
    client.get('/api/livreur/payment-types'),
};

export default driversApi;
