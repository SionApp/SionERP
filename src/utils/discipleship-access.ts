import { ApiService } from '@/services/api.service';

export interface DiscipleshipAccess {
  canAccess: boolean;
  level: number | null;
  isFullAccess: boolean; // true solo para pastor/admin sin rol de módulo asignado
}

// Respuesta del endpoint GET /api/v1/permissions/module-role?module=discipleship
interface ModuleRoleResponse {
  module: string;
  role_level: number;
  role_name: string;
  is_admin: boolean;
}

/**
 * Determina el acceso de un usuario al módulo de discipulado.
 *
 * Los dos sistemas de roles son INDEPENDIENTES:
 *   - Rol de sistema ERP (pastor, staff, server…): controla acceso al sidebar y funciones base.
 *   - Nivel de módulo en module_user_roles (1–5): controla qué dashboard ve el usuario
 *     DENTRO del módulo, sin importar el rol de sistema.
 *
 * Reglas (en orden de precedencia):
 * 1. El usuario tiene is_admin = true en el JWT → acceso completo (nivel 5, isFullAccess).
 *    El backend retorna esto para cualquier módulo si el usuario es pastor/admin.
 * 2. El usuario tiene un registro en module_user_roles para 'discipleship' → usar ese nivel.
 * 3. Sin registro (404) + pastor/admin → acceso completo como fallback (isFullAccess = true).
 * 4. Sin registro + cualquier otro rol → sin acceso.
 */
export async function getDiscipleshipAccess(
  _userId: string,
  userRole: string
): Promise<DiscipleshipAccess> {
  try {
    const moduleRole = await ApiService.get<ModuleRoleResponse>(
      '/permissions/module-role?module=discipleship'
    );

    return {
      canAccess: true,
      level: moduleRole.role_level,
      // is_admin = true cuando el backend hizo el bypass para pastor/admin
      isFullAccess: moduleRole.is_admin,
    };
  } catch (error: any) {
    // 404 → el usuario no tiene rol asignado en module_user_roles para este módulo.
    // Solo pastor y admin tienen acceso completo como fallback.
    if (error?.status === 404) {
      if (userRole === 'pastor' || userRole === 'admin') {
        return {
          canAccess: true,
          level: null, // null = sin filtros (dashboard pastoral completo)
          isFullAccess: true,
        };
      }
      // Cualquier otro rol sin jerarquía asignada → sin acceso
      return { canAccess: false, level: null, isFullAccess: false };
    }

    // Error de red u otro error inesperado → denegar acceso por seguridad
    console.error('Error loading module role for discipleship:', error);
    return { canAccess: false, level: null, isFullAccess: false };
  }
}

/**
 * Obtiene el nivel numérico de discipulado para mostrar el dashboard correcto.
 * Si es acceso completo (pastor/admin sin jerarquía), retorna nivel 5 (Pastoral).
 */
export function getDashboardLevel(access: DiscipleshipAccess): number {
  if (access.isFullAccess) {
    return 5; // Dashboard pastoral para acceso completo
  }
  return access.level || 1; // Default a nivel 1 si no hay nivel asignado
}
