export interface StatisticsDTO {
  totalCommandes: number;
  totalRevenue: number;
  dateDebut: string;
  dateFin: string;
}

export interface StatusOverviewData {
  count: number;
  total: number;
}

export interface StatusOverviewResponse {
  success: boolean;
  data: Record<string, StatusOverviewData>;
}

export interface DailyStatisticsDTO {
  date: string;
  count: number;
  revenue: number;
}
