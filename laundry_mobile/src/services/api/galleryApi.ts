import client from './client';

export interface GalleryFilters {
  status?: string;
  search?: string;
  dateDebut?: string;
  dateFin?: string;
  page?: number;
  size?: number;
}

export interface GalleryImageItem {
  id: number;
  imageUrl: string;
  photoType: string;
}

export interface GalleryOrderItem {
  orderId: number;
  orderStatus: string;
  clientName: string;
  clientPhone: string | null;
  dateCreation: string;
  images: GalleryImageItem[];
}

export interface GalleryResponse {
  content: GalleryOrderItem[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export const galleryApi = {
  getImages: (params: GalleryFilters) =>
    client.get<GalleryResponse>('/api/admin/images', { params }),
};
