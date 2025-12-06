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
