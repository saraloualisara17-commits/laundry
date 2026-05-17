import client from './client';

export interface DailyRevenue {
  date: string;
  amount: number;
  orderCount: number;
}

export interface RevenueAnalytics {
  totalRevenue: number;
  todayRevenue: number;
  averageOrderValue: number;
  dailyBreakdown: DailyRevenue[];
  revenueByPaymentMode: Record<string, number>;
}

export interface DriverStat {
  driverId: number;
  driverName: string;
  ordersHandled: number;
  completedDeliveries: number;
  pendingMissions: number;
  totalRevenueCollected: number;
  successRate: number;
}

export interface DriverPerformance {
  drivers: DriverStat[];
}

export interface OperationalKPIs {
  averageProcessingTimeHours: number;
  averageDeliveryTimeHours: number;
  volumeByProductCategory: Record<string, number>;
  activeClients: number;
  newClientsLast30Days: number;
  unpaidRatio: number;
}

export const analyticsApi = {
  /**
   * Get revenue analytics for a specific date range
   */
  getRevenue: (start: string, end: string) =>
    client.get<RevenueAnalytics>('/api/admin/analytics/revenue', {
      params: { start, end }
    }),

  /**
   * Get performance metrics for all drivers
   */
  getDriverPerformance: () =>
    client.get<DriverPerformance>('/api/admin/analytics/drivers'),

  /**
   * Get operational KPIs and statistics
   */
  getOperationalKPIs: () =>
    client.get<OperationalKPIs>('/api/admin/analytics/kpis'),
};

export default analyticsApi;
