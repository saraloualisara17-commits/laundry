import api from '../shared/api';
import { StatisticsDTO, StatusOverviewResponse } from './statisticsTypes';

export const statisticsApi = {
  /**
   * Get today's key performance statistics.
   * Migrated from /admin/statistics/today to /api/statistics/today
   */
  getTodayStats: () => 
    api.get<StatisticsDTO>('/api/statistics/today'),

  /**
   * Get overall statistics.
   */
  getOverallStats: () => 
    api.get<StatisticsDTO>('/api/statistics/overall'),

  /**
   * Get order counts and totals grouped by status for dashboard cards.
   * Path: /api/admin/stats/status-overview
   */
  getStatusOverview: () => 
    api.get<StatusOverviewResponse>('/api/admin/stats/status-overview'),

  /**
   * Get statistics for a specific date range.
   */
  getStatsByDateRange: (startDate: string, endDate: string) => 
    api.get<StatisticsDTO>('/api/statistics/date-range', {
      params: { startDate, endDate }
    }),

  /**
   * Get statistics for the last N days.
   */
  getLastNDaysStats: (days: number = 7) => 
    api.get('/api/statistics/last-days', {
      params: { days }
    }),

  /**
   * Get dashboard statistics for the current livreur.
   */
  getLivreurDashboardStats: () => 
    api.get('/api/livreur/dashboard/stats'),
};

export default statisticsApi;
