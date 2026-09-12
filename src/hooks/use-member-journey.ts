import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { DiscipleshipService } from '@/services/discipleship.service';
import {
  NOT_TRACKED_STAGE,
  type ConvertVisitorRequest,
  type CreateJourneyEntryRequest,
  type DerivedJourneyStage,
  type JourneyActivityStatus,
  type JourneyEntry,
} from '@/types/discipleship.types';

/**
 * TanStack Query hooks for the member journey read/write surface (Slice 1 —
 * backbone). One batch query for anchors + derived stage, plus the three
 * write doors: conversion, manual entry, and the leader-marked activity
 * toggle. UI (badge, dialogs, curriculum picker) is PR-4 — this file only
 * owns data fetching, mutation, and cache invalidation.
 *
 * Module gating: `/discipleship/journey` never carries
 * `RequireModule(education)` server-side, so this hook works fully with
 * Education uninstalled. Callers gate Education-dependent UI themselves via
 * `isModuleInstalled('education')` (design: "Curriculum picker") — this file
 * makes no such check.
 */

const JOURNEY_QUERY_KEY = 'discipleship-journey';

export function useMemberJourney(userIds: string[]) {
  const sortedIds = [...userIds].sort();
  return useQuery({
    queryKey: [JOURNEY_QUERY_KEY, ...sortedIds],
    queryFn: () => DiscipleshipService.getJourney(userIds),
    enabled: userIds.length > 0,
    staleTime: 30_000,
  });
}

/**
 * Resolves the derived stage for one user_id out of a batch journey
 * response (spec: Not-Tracked Rendering — a member with no anchor row must
 * never be mislabeled as a stage; it resolves to `NOT_TRACKED_STAGE`
 * instead). Pure function — no anchor lookup here means the caller passed a
 * user_id that either has no anchor, or was never requested.
 */
export function resolveJourneyStage(entries: JourneyEntry[], userId: string): DerivedJourneyStage {
  const entry = entries.find(e => e.user_id === userId);
  return entry?.stage ?? NOT_TRACKED_STAGE;
}

export function useConvertVisitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { visitorId: string; data: ConvertVisitorRequest }) =>
      DiscipleshipService.convertVisitor(args.visitorId, args.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [JOURNEY_QUERY_KEY] });
    },
  });
}

export function useCreateJourneyEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateJourneyEntryRequest) => DiscipleshipService.createJourneyEntry(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [JOURNEY_QUERY_KEY] });
    },
  });
}

export function useUpdateJourneyActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { userId: string; activityStatus: JourneyActivityStatus }) =>
      DiscipleshipService.updateJourneyActivity(args.userId, {
        activity_status: args.activityStatus,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [JOURNEY_QUERY_KEY] });
    },
  });
}
