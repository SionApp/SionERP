export type UserRole = 'admin' | 'pastor' | 'staff' | 'supervisor' | 'server' | 'member';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  nombres?: string;
  apellidos?: string;
  id_number?: string;
  identification_number?: string;
  phone?: string;
  whatsapp?: boolean;
  role: UserRole;
  birth_date?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  baptized?: boolean;
  baptism_date?: string;
  bautizado?: boolean;
  marital_status?: string;
  occupation?: string;
  education_level?: string;
  how_found_church?: string;
  ministry_interest?: string;
  first_visit_date?: string;
  cell_group?: string;
  membership_date?: string;
  pastoral_notes?: string;
  discipleship_level?: number;
  is_active_member?: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  email?: string;
  correo?: string;
  password?: string;
  first_name?: string;
  last_name?: string;
  nombres?: string;
  apellidos?: string;
  cedula?: string;
  identification_number?: string;
  telefono?: string;
  phone?: string;
  whatsapp?: boolean;
  role?: UserRole;
  birth_date?: string;
  direccion?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  marital_status?: string;
  occupation?: string;
  education_level?: string;
  how_found_church?: string;
  ministry_interest?: string;
  first_visit_date?: string;
  cell_group?: string;
  fecha_bautizo?: string;
  baptism_date?: string;
  membership_date?: string;
  pastoral_notes?: string;
  bautizado?: boolean;
  baptized?: boolean;
  is_active_member?: boolean;
}

export interface UpdateUserData {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  id_number?: string;
  identification_number?: string;
  phone?: string;
  role?: UserRole;
  birth_date?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  is_active?: boolean;
}

export interface UpdateUserRequest {
  first_name?: string;
  last_name?: string;
  id_number?: string;
  identification_number?: string;
  phone?: string;
  address?: string;
  birth_date?: string;
  marital_status?: string;
  occupation?: string;
  education_level?: string;
  how_found_church?: string;
  ministry_interest?: string;
  first_visit_date?: string;
  baptized?: boolean;
  baptism_date?: string;
  is_active_member?: boolean;
  membership_date?: string;
  cell_group?: string;
  whatsapp?: boolean;
  pastoral_notes?: string;
}
