export type UserRole = 'admin' | 'pastor' | 'staff' | 'supervisor' | 'server' | 'member';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  id_number: string;
  phone: string;
  whatsapp?: boolean;
  role: UserRole;
  birth_date?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  baptized?: boolean;
  baptism_date?: string;
  fecha_bautizo?: string; // Alias para compatibilidad
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
  onboarding_completed?: boolean;
  created_at: string;
  updated_at: string;
  invitation_status?: string;

  // Campos de discipulado
  zone_id?: string;
  zone_name?: string;
  territory?: string;
  active_groups_count?: number;
  cell_leader_id?: string;

  // Campo computado (opcional para compatibilidad)
  full_name?: string;
}

export interface CreateUserData {
  email: string;
  password?: string;
  first_name: string;
  last_name: string;
  id_number: string;
  phone: string;
  whatsapp?: boolean;
  role: UserRole;
  birth_date?: string | null;
  address: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  marital_status?: string;
  occupation?: string;
  education_level?: string;
  how_found_church?: string;
  ministry_interest?: string;
  first_visit_date?: string;
  cell_group?: string;
  baptism_date?: string | null;
  membership_date?: string | null;
  pastoral_notes?: string;
  baptized?: boolean;
  is_active_member?: boolean;
}

export interface UpdateUserData {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  id_number?: string;
  phone?: string;
  whatsapp?: boolean;
  role?: UserRole;
  birth_date?: string | null;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  marital_status?: string;
  occupation?: string;
  education_level?: string;
  how_found_church?: string;
  ministry_interest?: string;
  first_visit_date?: string | null;
  cell_group?: string;
  baptism_date?: string | null;
  membership_date?: string | null;
  pastoral_notes?: string;
  baptized?: boolean;
  is_active_member?: boolean;
  is_active?: boolean;
}

export interface UpdateUserRequest {
  first_name?: string;
  last_name?: string;
  id_number: string;
  phone?: string;
  address?: string;
  birth_date?: string | null;
  marital_status?: string;
  occupation?: string;
  education_level?: string;
  how_found_church?: string;
  ministry_interest?: string;
  first_visit_date?: string;
  baptized?: boolean;
  baptism_date?: string | null;
  is_active_member?: boolean;
  membership_date?: string | null;
  cell_group?: string;
  whatsapp?: boolean;
  pastoral_notes?: string;
}
