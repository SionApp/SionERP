import { ApiService } from '@/services/api.service';

/**
 * Role hierarchy levels.
 * Higher numbers = more permissions.
 */
export const ROLE_LEVELS: Record<string, number> = {
  admin: 5,
  pastor: 4,
  staff: 3,
  supervisor: 2,
  server: 1,
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
  installed_modules: string[];
}

let cachedPermissions: UserPermissions | null = null;

/**
 * Fetch current user permissions from the API.
 * Uses in-memory cache to avoid repeated calls.
 */
export async function fetchPermissions(): Promise<UserPermissions> {
  if (cachedPermissions) return cachedPermissions;

  try {
    const data = await ApiService.get('/permissions/me');
    cachedPermissions = data as UserPermissions;
    return cachedPermissions;
  } catch {
    // Fallback for when API is not available
    return { role: 'member', role_level: 0, installed_modules: [] };
  }
}

/**
 * Invalidate the permissions cache (e.g., after role change).
 */
export function invalidatePermissionsCache() {
  cachedPermissions = null;
}
