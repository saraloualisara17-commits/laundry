export interface StatisticsDTO {
  // totals
  totalCommandes: number;
  totalCommandesToday: number;
  totalRevenue: number;
  totalRevenues: number;
  revenuesToday: number;
  totalClients: number;

  // current-status counts (legacy, may decrease as orders progress)
  commandesEnAttente: number;
  commandesValidees: number;
  commandesEnTraitement: number;
  commandesPretes: number;
  commandesLivrees: number;
  commandesPayees: number;

  // date range
  dateDebut: string;
  dateFin: string;

  // unpaid overview
  unpaid: {
    count: number;
    clientsCount: number;
    amount: number;
  };

  // Commandes Reçues — event-based (immutable, orders that passed PICKED_UP)
  recuesCount: number;
  recuesItems: number;
  recuesM2: number;
  recuesTotal: number;

  // Commandes Livrées — event-based (immutable, orders that passed DELIVERED)
  livreesCount: number;
  livreesItems: number;
  livreesM2: number;
  livreesTotal: number;
  livreesPaid: number;
  livreesUnpaid: number;
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
