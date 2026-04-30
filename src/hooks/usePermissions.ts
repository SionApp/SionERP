import { useEffect, useState } from 'react';
import { fetchPermissions, invalidatePermissionsCache, UserPermissions } from '@/lib/permissions';

interface UsePermissionsReturn {
  permissions: UserPermissions | null;
  loading: boolean;
  hasAccess: (requiredLevel: number, requiredModule?: string) => boolean;
  refresh: () => void;
}

/**
 * Hook to access current user permissions.
 * Fetches role level and installed modules from the API.
 */
export function usePermissions(): UsePermissionsReturn {
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchPermissions().then(data => {
      if (!cancelled) {
        setPermissions(data);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

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
    fetchPermissions().then(data => {
      setPermissions(data);
      setLoading(false);
    });
  };

  return { permissions, loading, hasAccess, refresh };
}
