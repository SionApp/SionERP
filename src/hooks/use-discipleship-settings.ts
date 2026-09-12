import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { DiscipleshipService } from '@/services/discipleship.service';
import type { UpdateDiscipleshipSettingsRequest } from '@/types/discipleship.types';

/**
 * The church-level conversion-path curriculum pointer (spec: "Church-Level
 * Path Curriculum Pointer"). Read is group-default level server-side; write
 * is Pastoral-only server-side — this hook does not gate anything itself,
 * it only wraps the two settings endpoints and their cache invalidation.
 *
 * PR-4's curriculum picker is expected to wrap its OWN call site in
 * `isModuleInstalled('education')` before reading/writing this pointer —
 * see design: "Curriculum picker" and "Module-Gated Read Surface" in spec.
 */

const SETTINGS_QUERY_KEY = 'discipleship-settings';

export function useDiscipleshipSettings() {
  return useQuery({
    queryKey: [SETTINGS_QUERY_KEY],
    queryFn: () => DiscipleshipService.getDiscipleshipSettings(),
    staleTime: 60_000,
  });
}

export function useUpdateDiscipleshipSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateDiscipleshipSettingsRequest) =>
      DiscipleshipService.updateDiscipleshipSettings(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SETTINGS_QUERY_KEY] });
      // A pointer swap only changes ENROLLMENT for conversions after the
      // swap (spec: "Pointer swap does not retroact") but the settings read
      // itself feeds the curriculum picker's current-value display, so the
      // journey cache does not need invalidation here — left out
      // deliberately, not an oversight.
    },
  });
}
