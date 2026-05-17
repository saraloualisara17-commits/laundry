import client from './client';

export const statisticsApi = {
  /**
   * Get today's key performance statistics
   */
  getTodayStats: () =>
    client.get('/api/statistics/today'),

  /**
   * Get order counts and totals grouped by status
   */
  getStatusOverview: () =>
    client.get('/api/admin/stats/status-overview'),

  /**
   * Get dashboard statistics for the current livreur
   */
  getLivreurDashboardStats: () =>
    client.get('/api/livreur/dashboard/stats'),
};

export default statisticsApi;
