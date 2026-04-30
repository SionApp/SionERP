import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { fetchPermissions, invalidatePermissionsCache, ROLE_LEVELS, UserPermissions } from '@/lib/permissions';

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

  useEffect(() => {
    if (!user) {
      invalidatePermissionsCache();
      setPermissions(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    fetchPermissions(user.id).then(data => {
      if (!cancelled) {
        setPermissions(data);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const hasAccess = (requiredLevel: number, requiredModule?: string): boolean => {
    if (!permissions) return false;
    if (permissions.role_level < requiredLevel) return false;
    if (requiredModule && !permissions.installed_modules.includes(requiredModule)) return false;
    return true;
  };

  const refresh = () => {
    invalidatePermissionsCache();
    setPermissions(null);
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
