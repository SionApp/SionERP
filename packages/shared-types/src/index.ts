// Shared types for Sion project
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

export interface LiveStream {
  id: string;
  title: string;
  description?: string;
  youtube_video_id?: string;
  is_live: boolean;
  scheduled_start?: string;
  actual_start?: string;
  created_at: string;
  updated_at: string;
}

export interface UserPermission {
  id: string;
  user_id: string;
  permission_name: string;
  resource: string;
  action: string;
  granted: boolean;
  granted_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_values?: any;
  new_values?: any;
  changed_by?: string;
  changed_at: string;
}

export interface Report {
  id: string;
  title: string;
  type: string;
  parameters?: any;
  generated_by: string;
  generated_at: string;
  file_url?: string;
  status: 'pending' | 'completed' | 'failed';
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}