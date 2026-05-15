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
}

export interface AdminOrdersResponseDTO {
  commandes: OrderDTO[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
}

export interface OrderDetails extends OrderDTO {
  items: any[];
  historique: any[];
  images: any[];
}

export interface OrderFilters {
  status?: string;
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
