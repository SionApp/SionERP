import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { DiscipleshipService } from '@/services/discipleship.service';
import type { CreateMentorshipRequest } from '@/types/discipleship.types';

/**
 * TanStack Query hooks for the disciple-maker mentorship surface (Slice 2).
 * One group-scoped query for the active pairs + live count (spec R6 — the
 * leader's "weekly report"), plus create/end mutations. Both mutations
 * invalidate the mentorship key AND the member-journey key so
 * `JourneyStageBadge` flips to `disciple_maker` live for the mentor as soon
 * as the link is created or ended (stage is derived server-side from active
 * mentorship rows, see discipleship_journey.go's journeyStageSQL).
 */

const MENTORSHIPS_QUERY_KEY = 'discipleship-mentorships';
const JOURNEY_QUERY_KEY = 'discipleship-journey';

export function useGroupMentorships(groupId: string) {
  return useQuery({
    queryKey: [MENTORSHIPS_QUERY_KEY, groupId],
    queryFn: () => DiscipleshipService.getGroupMentorships(groupId),
    enabled: !!groupId,
    staleTime: 30_000,
  });
}

export function useCreateMentorship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { groupId: string; data: CreateMentorshipRequest }) =>
      DiscipleshipService.createMentorship(args.groupId, args.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [MENTORSHIPS_QUERY_KEY] });
      qc.invalidateQueries({ queryKey: [JOURNEY_QUERY_KEY] });
    },
  });
}

export function useEndMentorship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mentorshipId: string) => DiscipleshipService.endMentorship(mentorshipId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [MENTORSHIPS_QUERY_KEY] });
      qc.invalidateQueries({ queryKey: [JOURNEY_QUERY_KEY] });
    },
  });
}
