export type UserRole = 'admin' | 'pastor' | 'staff' | 'supervisor' | 'server' | 'member';

export interface User {
  id: string;
  email: string;
  full_name: string;
  nombres?: string;
  apellidos?: string;
  first_name?: string;
  last_name?: string;
  telefono?: string;
  phone?: string;
  whatsapp?: string;
  role: UserRole;
  birth_date?: string;
  direccion?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  id_number?: string;
  baptized?: boolean;
  bautizado?: boolean;
  marital_status?: string;
  occupation?: string;
  education_level?: string;
  how_found_church?: string;
  ministry_interest?: string;
  first_visit_date?: string;
  cell_group?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  birth_date?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

export interface UpdateUserData {
  id: string;
  email?: string;
  full_name?: string;
  phone?: string;
  role?: UserRole;
  birth_date?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  is_active?: boolean;
}