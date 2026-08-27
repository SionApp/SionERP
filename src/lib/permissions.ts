import { ApiService } from '@/services/api.service';

/**
 * Role hierarchy levels.
 * Higher numbers = more permissions.
 * Must match backend constants in apps/backend-go/utils/CONST.go
 */
export const ROLE_LEVELS: Record<string, number> = {
  admin: 500,
  pastor: 400,
  staff: 300,
  supervisor: 200,
  server: 100,
  member: 0,
} as const;

/** Display names for roles */
export const ROLE_DISPLAY_NAMES: Record<string, string> = {
  admin: 'Administrador',
  pastor: 'Pastor',
  staff: 'Staff',
  supervisor: 'Supervisor',
  server: 'Servidor',
  member: 'Miembro',
};

export interface UserPermissions {
  role: string;
  role_level: number;
  has_admin_access: boolean;
  installed_modules: string[];
  /** Acceso federado (BonDev) — ver Can.tsx y FederatedBanner.tsx.
   *  "read" (I2 fase 1): sólo lectura. "edit" (I2 fase 2): el operador actúa
   *  con `role`/`role_level`/`has_admin_access` reales de arriba. */
  is_federated?: boolean;
  federated_mode?: 'read' | 'edit';
  federated_operator_name?: string;
  federated_expires_at?: string;
}

let cachedPermissions: UserPermissions | null = null;
let cachedUserId: string | null = null;

/**
 * Fetch current user permissions from the API.
 * Uses in-memory cache to avoid repeated calls.
 * Automatically invalidates if the user ID changes.
 */
export async function fetchPermissions(userId?: string): Promise<UserPermissions> {
  // Invalidate cache if user changed
  if (userId && cachedUserId && userId !== cachedUserId) {
    cachedPermissions = null;
  }

  if (cachedPermissions) return cachedPermissions;

  try {
    const data = await ApiService.get('/permissions/me');
    cachedPermissions = data as UserPermissions;
    cachedUserId = userId || null;
    return cachedPermissions;
  } catch (error) {
    // Fallback for when API is not available
    return { role: 'member', role_level: 0, has_admin_access: false, installed_modules: [] };
  }
}

/**
 * Invalidate the permissions cache (e.g., after role change or logout).
 */
export function invalidatePermissionsCache() {
  cachedPermissions = null;
  cachedUserId = null;
}
