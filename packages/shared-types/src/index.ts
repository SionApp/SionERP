// Tipos compartidos para el proyecto Sion
export interface User {
  id: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  correo: string;
  telefono?: string;
  direccion?: string;
  fecha_nacimiento?: string;
  bautizado: boolean;
  fecha_bautismo?: string;
  rol: 'admin' | 'staff' | 'usuario';
  activo: boolean;
  whatsapp_preference: boolean;
  created_at: string;
  updated_at: string;
}

export interface LiveStream {
  id: string;
  titulo: string;
  descripcion?: string;
  url_youtube: string;
  fecha_inicio: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
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