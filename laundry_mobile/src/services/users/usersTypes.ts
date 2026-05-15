export interface UserDTO {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: 'ADMIN' | 'EMPLOYE' | 'LIVREUR';
  isActive: boolean;
  createdAt?: string;
}

export interface UserCreateRequest {
  name: string;
  email: string;
  phone?: string;
  password?: string;
  role: string;
}

export interface UserUpdateRequest {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
}
