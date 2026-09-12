import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { getDashboardLevel, getDiscipleshipAccess } from '@/utils/discipleship-access';

/**
 * Backend's `DiscipleshipLevelAuxiliary` (utils/CONST.go:56) — the minimum
 * discipleship module level required to convert a visitor or manually enter
 * a member into the journey (design r2 user decision: "supervisor or
 * above", not the design draft's original Leader=1). Mirrored here so the
 * frontend gate matches the server's `RequireModuleLevel` exactly.
 */
const DISCIPLESHIP_LEVEL_AUXILIARY = 2;

/**
 * Resolves the current user's discipleship module level, reusing the same
 * `getDiscipleshipAccess` util that `DiscipleshipPage.tsx` already calls on
 * mount — wrapped in a query so other call sites (the convert dialog and
 * manual-entry gating in `GroupVisitors.tsx` / `GroupMembers.tsx`) don't
 * duplicate the fetch-on-mount dance. Mirrors `use-education-access.ts`'s
 * shape (systemAdmin bypass + a query for the module-specific grant).
 */
export function useDiscipleshipAccess() {
  const { currentUser } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['discipleship-access', currentUser?.id],
    queryFn: () => getDiscipleshipAccess(currentUser!.id, currentUser!.role),
    enabled: !!currentUser?.id,
    staleTime: 60_000,
  });

  const level = data ? getDashboardLevel(data) : 0;
  const isFullAccess = data?.isFullAccess ?? false;

  return {
    level,
    isFullAccess,
    canConvert: isFullAccess || level >= DISCIPLESHIP_LEVEL_AUXILIARY,
    loadingAccess: isLoading,
  };
}
