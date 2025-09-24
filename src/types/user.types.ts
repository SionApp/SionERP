// User types and interfaces
export type UserRole = 'pastor' | 'staff' | 'supervisor' | 'server';

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  id_number: string;
  email: string;
  phone: string;
  address: string;
  
  // Extended member fields
  birth_date?: string;
  marital_status?: string;
  occupation?: string;
  education_level?: string;
  how_found_church?: string;
  ministry_interest?: string;
  first_visit_date?: string;
  
  // Church membership
  baptized: boolean;
  baptism_date?: string;
  is_active_member: boolean;
  membership_date?: string;
  
  // Cell group
  cell_group?: string;
  cell_leader_id?: string;
  
  // Role and admin
  role: UserRole;
  pastoral_notes?: string;
  is_active: boolean;
  whatsapp: boolean;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface EditUserModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: () => void;
}

export interface CreateUserData {
  first_name: string;
  last_name: string;
  id_number: string;
  email: string;
  phone: string;
  address: string;
  role: UserRole;
  password_hash: string;
  birth_date?: string | null;
  marital_status?: string | null;
  occupation?: string | null;
  education_level?: string | null;
  how_found_church?: string | null;
  ministry_interest?: string | null;
  first_visit_date?: string | null;
  baptized: boolean;
  baptism_date?: string | null;
  is_active_member: boolean;
  membership_date?: string | null;
  cell_group?: string | null;
  whatsapp: boolean;
  pastoral_notes?: string | null;
}