import { useQuery } from '@tanstack/react-query';

import { usePermissions } from '@/hooks/usePermissions';
import { EducationService } from '@/services/education.service';

/**
 * Resolves the current user's education module access level.
 * System pastor/admin always get module-admin level (5). Everyone else
 * depends on their `module_user_roles` grant for `education`, independent
 * of the system role — mirrors `use-music-access.ts`.
 *
 * Level ladder (spec: education-module-roles): 1=student, 3=author, 5=module admin.
 * Education is intentionally NOT in `MANAGED_MODULES` — never gate via
 * `usePermissions().hasAccess('education')`, only via this hook.
 */
export function useEducationAccess() {
  const { permissions } = usePermissions();
  const systemAdmin =
    !!permissions && (permissions.has_admin_access || permissions.role === 'pastor');

  const { data: moduleRole, isLoading: loadingModuleRole } = useQuery({
    queryKey: ['education-my-module-role'],
    queryFn: () => EducationService.getMyModuleRole(),
    enabled: !!permissions && !systemAdmin,
    staleTime: 60_000,
  });

  const level = systemAdmin ? 5 : (moduleRole?.roleLevel ?? 0);
  const hasAccess = systemAdmin || (moduleRole?.hasRole ?? false);
  const isAuthor = systemAdmin || (moduleRole?.isAuthor ?? false);
  const isModuleAdmin = systemAdmin || (moduleRole?.isModuleAdmin ?? false);

  return {
    level,
    hasAccess,
    isAuthor,
    isModuleAdmin,
    loadingAccess: !systemAdmin && loadingModuleRole,
  };
}
