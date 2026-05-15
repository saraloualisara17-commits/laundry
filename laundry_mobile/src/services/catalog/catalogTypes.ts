export interface CategoryDTO {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  products?: ProductDTO[];
}

export interface ProductDTO {
  id: number;
  name: string;
  description?: string;
  price: number;
  isActive: boolean;
  categoryId: number;
}
