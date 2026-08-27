import { supabase } from '@/integrations/supabase/client';
import type {
  BackupSettings,
  ChurchInfo,
  IntegrationSettings,
  NotificationConfig,
  SecurityEvent,
  SecuritySettings,
  SettingsAuditLog,
  SystemSettings,
  UpdateBackupSettings,
  UpdateChurchInfo,
  UpdateIntegrationSettings,
  UpdateNotificationConfig,
  UpdateSecuritySettings,
  UpdateSystemSettings,
  UpdateUserPreferences,
  UserPreferences,
} from '@/types/settings.types';
import { ApiService } from './api.service';

export interface PublicSystemSettings {
  /** Nombre de la iglesia (church_info.name) — la marca del TENANT, no la de JETRO. */
  church_name: string;
  default_theme: string;
  default_language: string;
  timezone: string;
  animations_enabled: boolean;
  maintenance_mode: boolean;
  session_timeout_minutes: number;
  logo_url: string | null;
}

export interface PublicBranding {
  church_name: string;
  logo_url: string | null;
}

export class SettingsService {
  // =====================================================
  // SYSTEM SETTINGS
  // =====================================================

  /** Subset seguro de settings para cualquier usuario autenticado. */
  static async getPublicSettings(): Promise<PublicSystemSettings | null> {
    try {
      return await ApiService.get<PublicSystemSettings>('/settings/public');
    } catch (error) {
      console.error('Error fetching public settings:', error);
      return null; // no bloquear la UI si falla
    }
  }

  /** Público (sin auth): nombre + logo de la iglesia, para la pantalla de login. */
  static async getPublicBranding(): Promise<PublicBranding | null> {
    try {
      const base = `${import.meta.env.VITE_API_URL ?? 'http://localhost:8181'}/api/v1`;
      const res = await fetch(`${base}/public/branding`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  /** Público (sin auth): ¿está habilitado el auto-registro? */
  static async getRegistrationStatus(): Promise<boolean> {
    try {
      const base = `${import.meta.env.VITE_API_URL ?? 'http://localhost:8181'}/api/v1`;
      const res = await fetch(`${base}/public/registration-status`);
      if (!res.ok) return true;
      const data = await res.json();
      return data.allow_registrations !== false;
    } catch {
      return true; // ante la duda, no bloquear el formulario (el trigger es el gate real)
    }
  }

  static async getSystemSettings(): Promise<SystemSettings> {
    try {
      const data = await ApiService.get<SystemSettings>('/settings/system');
      return data;
    } catch (error) {
      console.error('Error fetching system settings:', error);
      throw new Error('Error al cargar configuración del sistema');
    }
  }

  static async updateSystemSettings(updates: UpdateSystemSettings): Promise<SystemSettings> {
    try {
      const data = await ApiService.put<SystemSettings, UpdateSystemSettings>(
        '/settings/system',
        updates
      );
      return data;
    } catch (error) {
      console.error('Error updating system settings:', error);
      throw new Error('Error al actualizar configuración del sistema');
    }
  }

  // =====================================================
  // CHURCH INFO
  // =====================================================

  static async getChurchInfo(): Promise<ChurchInfo> {
    try {
      const data = await ApiService.get<ChurchInfo>('/settings/church');
      return data;
    } catch (error) {
      console.error('Error fetching church info:', error);
      throw new Error('Error al cargar información de la iglesia');
    }
  }

  static async updateChurchInfo(updates: UpdateChurchInfo): Promise<ChurchInfo> {
    try {
      const data = await ApiService.put<ChurchInfo, UpdateChurchInfo>('/settings/church', updates);
      return data;
    } catch (error) {
      console.error('Error updating church info:', error);
      throw new Error('Error al actualizar información de la iglesia');
    }
  }

  // =====================================================
  // NOTIFICATION CONFIG
  // =====================================================

  static async getNotificationConfig(): Promise<NotificationConfig> {
    try {
      const data = await ApiService.get<NotificationConfig>('/settings/notifications');
      return data;
    } catch (error) {
      console.error('Error fetching notification config:', error);
      throw new Error('Error al cargar configuración de notificaciones');
    }
  }

  static async updateNotificationConfig(
    updates: UpdateNotificationConfig
  ): Promise<NotificationConfig> {
    try {
      const data = await ApiService.put<NotificationConfig, UpdateNotificationConfig>(
        '/settings/notifications',
        updates
      );
      return data;
    } catch (error) {
      console.error('Error updating notification config:', error);
      throw new Error('Error al actualizar configuración de notificaciones');
    }
  }

  // =====================================================
  // SECURITY SETTINGS
  // =====================================================

  static async getSecuritySettings(): Promise<SecuritySettings> {
    try {
      return await ApiService.get<SecuritySettings>('/settings/security');
    } catch (error) {
      console.error('Error fetching security settings:', error);
      throw new Error('Error al cargar configuración de seguridad');
    }
  }

  static async updateSecuritySettings(updates: UpdateSecuritySettings): Promise<SecuritySettings> {
    try {
      return await ApiService.put<SecuritySettings, UpdateSecuritySettings>(
        '/settings/security',
        updates
      );
    } catch (error) {
      console.error('Error updating security settings:', error);
      throw new Error('Error al actualizar configuración de seguridad');
    }
  }

  static async getSecurityEvents(): Promise<SecurityEvent[]> {
    try {
      return await ApiService.get<SecurityEvent[]>('/settings/security/events');
    } catch (error) {
      console.error('Error fetching security events:', error);
      throw new Error('Error al cargar eventos de seguridad');
    }
  }

  // =====================================================
  // INTEGRATION SETTINGS
  // =====================================================

  static async getIntegrationSettings(): Promise<IntegrationSettings> {
    try {
      return await ApiService.get<IntegrationSettings>('/settings/integrations');
    } catch (error) {
      console.error('Error fetching integration settings:', error);
      throw new Error('Error al cargar configuración de integraciones');
    }
  }

  static async updateIntegrationSettings(
    updates: UpdateIntegrationSettings
  ): Promise<IntegrationSettings> {
    try {
      return await ApiService.put<IntegrationSettings, UpdateIntegrationSettings>(
        '/settings/integrations',
        updates
      );
    } catch (error) {
      console.error('Error updating integration settings:', error);
      throw new Error('Error al actualizar configuración de integraciones');
    }
  }

  // =====================================================
  // BACKUP SETTINGS
  // =====================================================

  static async getBackupSettings(): Promise<BackupSettings> {
    try {
      return await ApiService.get<BackupSettings>('/settings/backups');
    } catch (error) {
      console.error('Error fetching backup settings:', error);
      throw new Error('Error al cargar configuración de respaldos');
    }
  }

  static async updateBackupSettings(updates: UpdateBackupSettings): Promise<BackupSettings> {
    try {
      return await ApiService.put<BackupSettings, UpdateBackupSettings>(
        '/settings/backups',
        updates
      );
    } catch (error) {
      console.error('Error updating backup settings:', error);
      throw new Error('Error al actualizar configuración de respaldos');
    }
  }

  // =====================================================
  // USER PREFERENCES
  // =====================================================

  static async getUserPreferences(): Promise<UserPreferences | null> {
    try {
      const data = await ApiService.get<UserPreferences>('/preferences');

      // Limpiar y validar el tema antes de devolver
      if (data && data.theme) {
        const cleanTheme = String(data.theme).trim().toLowerCase();
        const validThemes = ['light', 'dark', 'auto'];
        if (validThemes.includes(cleanTheme)) {
          data.theme = cleanTheme as 'light' | 'dark' | 'auto';
        } else {
          // Si el tema es inválido, usar el por defecto
          data.theme = 'light';
        }
      }

      return data;
    } catch (error) {
      // Si no existe (404), retornar null en lugar de lanzar error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        return null;
      }
      console.error('Error fetching user preferences:', error);
      throw new Error('Error al cargar preferencias de usuario');
    }
  }

  static async updateUserPreferences(updates: UpdateUserPreferences): Promise<UserPreferences> {
    try {
      const data = await ApiService.put<UserPreferences, UpdateUserPreferences>(
        '/preferences',
        updates
      );
      return data;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw new Error('Error al actualizar preferencias de usuario');
    }
  }

  // =====================================================
  // STORAGE - LOGO UPLOAD
  // =====================================================
  // Nota: Storage sigue usando Supabase directamente ya que
  // el backend Go no maneja uploads de archivos aún

  static async uploadLogo(file: File, type: 'logo' | 'banner' = 'logo'): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${type}-${Date.now()}.${fileExt}`;
    const filePath = `${type}s/${fileName}`;

    // Subir archivo
    const { error: uploadError } = await supabase.storage
      .from('church-assets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      throw new Error('Error al subir el archivo');
    }

    // Obtener URL pública
    const {
      data: { publicUrl },
    } = supabase.storage.from('church-assets').getPublicUrl(filePath);

    // Actualizar church_info con la nueva URL
    const updateField = type === 'logo' ? 'logo_url' : 'banner_url';
    await this.updateChurchInfo({ [updateField]: publicUrl });

    return publicUrl;
  }

  static async deleteLogo(type: 'logo' | 'banner' = 'logo'): Promise<void> {
    // Obtener la URL actual
    const churchInfo = await this.getChurchInfo();
    const currentUrl = type === 'logo' ? churchInfo.logo_url : churchInfo.banner_url;

    if (currentUrl) {
      // Extraer el path del archivo de la URL
      const urlParts = currentUrl.split('/');
      const filePath = `${type}s/${urlParts[urlParts.length - 1]}`;

      // Eliminar archivo de storage
      const { error: deleteError } = await supabase.storage
        .from('church-assets')
        .remove([filePath]);

      if (deleteError) {
        console.error('Error deleting file:', deleteError);
        // No lanzar error, continuar para limpiar la referencia
      }
    }

    // Limpiar la referencia en church_info
    const updateField = type === 'logo' ? 'logo_url' : 'banner_url';
    await this.updateChurchInfo({ [updateField]: null });
  }

  // =====================================================
  // AUDIT LOG
  // =====================================================
  // Nota: Audit logs aún usa Supabase directamente
  // TODO: Crear endpoint en Go para audit logs

  static async getAuditLogs(limit: number = 50): Promise<SettingsAuditLog[]> {
    const { data, error } = await supabase
      .from('settings_audit_log')
      .select('*')
      .order('changed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching audit logs:', error);
      throw new Error('Error al cargar logs de auditoría');
    }

    return data as unknown as SettingsAuditLog[];
  }
}
