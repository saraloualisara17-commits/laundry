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

  /**
   * Get statistics for a specific date range
   */
  getStatsByDateRange: (startDate: string, endDate: string) =>
    client.get('/api/statistics/date-range', { params: { startDate, endDate } }),

  /**
   * Get count of overdue pickups and deliveries (admin use)
   */
  getOverdueStats: () =>
    client.get<{ overduePickups: number; overdueDeliveries: number }>('/api/admin/stats/overdue'),

  /**
   * Get full list of overdue orders (admin use)
   * @param type 'pickup' | 'delivery'
   */
  getOverdueOrders: (type: 'pickup' | 'delivery') =>
    client.get<any[]>(`/api/admin/stats/overdue-orders?type=${type}`),
};

export default statisticsApi;
