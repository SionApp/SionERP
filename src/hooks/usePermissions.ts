import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import {
  fetchPermissions,
  invalidatePermissionsCache,
  ROLE_LEVELS,
  UserPermissions,
} from '@/lib/permissions';
import { supabase } from '@/integrations/supabase/client';
import { MANAGED_MODULES } from '@/hooks/useRolePermissions';

interface UsePermissionsReturn {
  permissions: UserPermissions | null;
  loading: boolean;
  /** Alias for loading — for backwards compatibility */
  isLoading: boolean;
  hasAccess: (requiredLevel: number, requiredModule?: string) => boolean;
  /** Convenience: can the user manage roles (admin only) */
  canManageRoles: boolean;
  /** Convenience: can the user manage users (staff+) */
  canManageUsers: boolean;
  refresh: () => void;
}

export function usePermissions(): UsePermissionsReturn {
  const { user, isFederatedReadOnly } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleAllowedModules, setRoleAllowedModules] = useState<string[]>([...MANAGED_MODULES]);

  useEffect(() => {
    // Una sesión federada (BonDev, sólo lectura) no tiene `user` de Supabase
    // pero sí está autenticada — fetchPermissions() igual funciona (la
    // identidad la resuelve el backend desde la cookie), ver AuthContext.
    if (!user && !isFederatedReadOnly) {
      invalidatePermissionsCache();
      setPermissions(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    fetchPermissions(user?.id).then(async data => {
      if (cancelled) return;
      setPermissions(data);

      // Pastor y sesiones federadas (BonDev) saltean el chequeo de
      // role_module_access — para federadas además es necesario: esa
      // tabla se lee vía el cliente JS de Supabase con SU PROPIA sesión,
      // que una sesión federada no tiene (no hay JWT de Supabase), así que
      // ese query fallaría/colgaría sin este atajo.
      if (data.role === 'pastor' || data.has_admin_access || data.is_federated) {
        setRoleAllowedModules([...MANAGED_MODULES]);
        setLoading(false);
        return;
      }

      // Load which modules this role is allowed to access
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rows } = await (supabase as any)
        .from('role_module_access')
        .select('module_key, enabled')
        .eq('role', data.role);

      if (!cancelled && rows) {
        const allowed = (rows as { module_key: string; enabled: boolean }[])
          .filter(r => r.enabled)
          .map(r => r.module_key);
        setRoleAllowedModules(allowed);
      }

      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id, isFederatedReadOnly]);

  const hasAccess = (requiredLevel: number, requiredModule?: string): boolean => {
    if (!permissions) return false;
    if (permissions.role_level < requiredLevel) return false;
    if (requiredModule && requiredModule !== 'base') {
      if (!permissions.installed_modules.includes(requiredModule)) return false;
      if (!roleAllowedModules.includes(requiredModule)) return false;
    }
    return true;
  };

  const refresh = () => {
    invalidatePermissionsCache();
    setPermissions(null);
    setRoleAllowedModules([...MANAGED_MODULES]);
    setLoading(true);
    if (user || isFederatedReadOnly) {
      fetchPermissions(user?.id).then(data => {
        setPermissions(data);
        setLoading(false);
      });
    }
  };

  return {
    permissions,
    loading,
    isLoading: loading,
    hasAccess,
    canManageRoles: hasAccess(ROLE_LEVELS.admin),
    canManageUsers: hasAccess(ROLE_LEVELS.staff),
    refresh,
  };
}
