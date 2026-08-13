import { useQuery } from '@tanstack/react-query';

import { usePermissions } from '@/hooks/usePermissions';
import { MusicService } from '@/services/music.service';

/**
 * Resolves whether the current user manages the music module.
 * System pastor/admin always manage. Everyone else depends on their music
 * module role (director vs servidor), independent of the system role.
 * Shared by MusicPage and the culto detail page.
 */
export function useMusicAccess() {
  const { permissions } = usePermissions();
  const systemDirector =
    !!permissions && (permissions.has_admin_access || permissions.role === 'pastor');

  const { data: moduleRole, isLoading: loadingModuleRole } = useQuery({
    queryKey: ['music-my-module-role'],
    queryFn: () => MusicService.getMyModuleRole(),
    enabled: !!permissions && !systemDirector,
    staleTime: 60_000,
  });

  const isDirector = systemDirector || (moduleRole?.isDirector ?? false);
  // hasAccess: manages the module (admin/pastor/director) or was actually added
  // to the music team (music_members + module_user_roles row). A plain member
  // with neither should not see the module at all.
  const hasAccess = systemDirector || (moduleRole?.hasRole ?? false);
  return { isDirector, hasAccess, loadingAccess: !systemDirector && loadingModuleRole };
}
