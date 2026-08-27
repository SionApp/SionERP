// =====================================================
// TIPOS PARA CONFIGURACIÓN DEL SISTEMA
// =====================================================

export interface SystemSettings {
  id: string;
  site_name: string;
  site_version: string;
  maintenance_mode: boolean;
  allow_registrations: boolean;
  max_users_per_group: number;
  session_timeout_minutes: number;
  default_theme: 'light' | 'dark' | 'auto';
  default_language: string;
  timezone: string;
  animations_enabled: boolean;
  sidebar_collapsed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChurchInfo {
  id: string;
  name: string;
  pastor_name: string | null;
  description: string | null;
  mission: string | null;
  vision: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string;
  secondary_color: string;
  social_facebook: string | null;
  social_instagram: string | null;
  social_youtube: string | null;
  social_twitter: string | null;
  service_times: ServiceTime[];
  created_at: string;
  updated_at: string;
}

export interface ServiceTime {
  day: string;
  time: string;
  name: string;
}

export interface NotificationConfig {
  id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  new_user_notifications: boolean;
  role_change_notifications: boolean;
  weekly_reports: boolean;
  event_reminders: boolean;
  important_messages: boolean;
  smtp_host: string | null;
  smtp_port: number;
  smtp_user: string | null;
  smtp_password: string | null;
  smtp_from_email: string | null;
  smtp_from_name: string;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
  whatsapp_notifications: boolean;
  event_reminders: boolean;
  weekly_newsletter: boolean;
  profile_visibility: 'public' | 'members' | 'private';
  show_email: boolean;
  show_phone: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Los campos de política de contraseña y bloqueo se guardan para referencia.
 * El login pasa por Supabase Auth directo desde el navegador — el backend Go
 * todavía no aplica estos valores en el flujo real de autenticación.
 */
export interface SecuritySettings {
  id: string;
  min_password_length: number;
  require_uppercase: boolean;
  require_number: boolean;
  require_special_char: boolean;
  password_expiry_days: number | null;
  max_login_attempts: number;
  lockout_duration_minutes: number;
  created_at: string;
  updated_at: string;
}

/** Los campos *_api_key son write-only: nunca vuelven del backend con su valor real. */
export interface IntegrationSettings {
  id: string;
  whatsapp_enabled: boolean;
  whatsapp_phone_number_id: string | null;
  whatsapp_api_key: string | null;
  payment_provider: 'none' | 'stripe' | 'mercadopago';
  payment_api_key: string | null;
  email_provider: 'none' | 'resend' | 'sendgrid';
  email_api_key: string | null;
  crm_webhook_url: string | null;
  created_at: string;
  updated_at: string;
}

/** El respaldo automático diario corre por GitHub Actions, independiente de esta tabla. */
export interface BackupSettings {
  id: string;
  retention_days: number;
  notify_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface SettingsAuditLog {
  id: string;
  table_name: string;
  action: string;
  changed_by: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  changed_at: string;
}

// Tipos para actualizaciones parciales
export type UpdateSystemSettings = Partial<
  Omit<SystemSettings, 'id' | 'created_at' | 'updated_at'>
>;
export type UpdateChurchInfo = Partial<Omit<ChurchInfo, 'id' | 'created_at' | 'updated_at'>>;
export type UpdateNotificationConfig = Partial<
  Omit<NotificationConfig, 'id' | 'created_at' | 'updated_at'>
>;
export type UpdateUserPreferences = Partial<
  Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>
>;
export type UpdateSecuritySettings = Omit<SecuritySettings, 'id' | 'created_at' | 'updated_at'>;
export type UpdateIntegrationSettings = Omit<
  IntegrationSettings,
  'id' | 'created_at' | 'updated_at'
>;
export type UpdateBackupSettings = Omit<BackupSettings, 'id' | 'created_at' | 'updated_at'>;

/** Issue #53: eventos críticos de seguridad (cambio de rol, suspensión, exportación). */
export type SecurityEventType =
  | 'role_changed'
  | 'user_suspended'
  | 'user_reactivated'
  | 'user_data_exported';

export interface SecurityEvent {
  id: string;
  event_type: SecurityEventType;
  user_name: string;
  actor_name: string;
  ip_address: string;
  created_at: string;
}
