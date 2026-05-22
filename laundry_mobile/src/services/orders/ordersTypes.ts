export interface OrderDTO {
  id: number;
  numeroCommande: string;
  status: string;
  montantTotal: number;
  montantPaye: number;
  dateCreation: string;
  clientName: string;
  clientPhone: string;
  modePaiement?: string;
  livreurId?: number;
  livreurName?: string;
  deliveryDriverId?: number;
  deliveryDriverName?: string;
  selfSubmitted?: boolean;
}

export interface AdminOrdersResponseDTO {
  commandes: OrderDTO[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  totalValue?: number;
  totalUnpaid?: number;
  totalVolumes?: number;
}

export interface OrderDetails extends OrderDTO {
  items: any[];
  historique: any[];
  images: any[];
}

export interface OrderFilters {
  status?: string;
  mode?: string;
  activeOnly?: boolean;
  paidDebts?: boolean;
  selfSubmitted?: boolean;
  search?: string;
  page?: number;
  size?: number;
  dateDebut?: string;
  dateFin?: string;
  livreurId?: number | string;
  sort?: string;
}

export interface UpdateStatusRequest {
  status: string;
  montantCollecte?: number;
  notesPaiement?: string;
  modePaiement?: string;
}
