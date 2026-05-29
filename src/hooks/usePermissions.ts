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
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleAllowedModules, setRoleAllowedModules] = useState<string[]>([...MANAGED_MODULES]);

  useEffect(() => {
    if (!user) {
      invalidatePermissionsCache();
      setPermissions(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    fetchPermissions(user.id).then(async data => {
      if (cancelled) return;
      setPermissions(data);

      // Pastor always gets full module access — skip DB check
      if (data.role === 'pastor' || data.has_admin_access) {
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
  }, [user?.id]);

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
    if (user) {
      fetchPermissions(user.id).then(data => {
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
