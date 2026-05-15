export interface ClientDTO {
  id: number;
  name: string;
  phone: string;
  address?: string;
  email?: string;
  createdAt?: string;
  totalOrders?: number;
}

export interface ClientsResponseDTO {
  content: ClientDTO[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface ClientFilters {
  search?: string;
  page?: number;
  limit?: number;
}
