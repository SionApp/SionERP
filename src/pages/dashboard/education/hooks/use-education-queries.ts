import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { EducationService } from '@/services/education.service';
import type { EducationTrack } from '@/types/education.types';

/**
 * TanStack Query hooks for PR-D's student read path (catalog, home
 * aggregate, course detail/syllabus). One shared `education-home` query
 * backs StudentHome, CourseCatalog (per-card CTA state) and CourseDetail
 * (the caller's own progress) — a single source for "my assignments"
 * instead of three separate fetches (design: `GET /education/me/home`
 * already returns the full assignment list plus the derived counts).
 */

export function useEducationCatalog(track?: EducationTrack) {
  return useQuery({
    queryKey: ['education-catalog', track ?? 'all'],
    queryFn: () => EducationService.getCatalog(track),
    staleTime: 60_000,
  });
}

export function useEducationHome(enabled = true) {
  return useQuery({
    queryKey: ['education-home'],
    queryFn: () => EducationService.getHome(),
    staleTime: 30_000,
    enabled,
  });
}

export function useCourseDetail(curriculumId: string | undefined) {
  const curriculumQuery = useQuery({
    queryKey: ['education-curriculum', curriculumId],
    queryFn: () => EducationService.getCurriculumById(curriculumId as string),
    enabled: !!curriculumId,
  });
  const syllabusQuery = useQuery({
    queryKey: ['education-syllabus', curriculumId],
    queryFn: () => EducationService.getSyllabus(curriculumId as string),
    enabled: !!curriculumId,
  });

  return {
    curriculum: curriculumQuery.data,
    syllabus: syllabusQuery.data ?? [],
    isLoading: curriculumQuery.isLoading || syllabusQuery.isLoading,
    isError: curriculumQuery.isError || syllabusQuery.isError,
    refetch: () => {
      curriculumQuery.refetch();
      syllabusQuery.refetch();
    },
  };
}

export function useEnrollSelf() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (curriculumId: string) => EducationService.enrollSelf(curriculumId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['education-home'] });
      qc.invalidateQueries({ queryKey: ['education-syllabus'] });
    },
  });
}

/**
 * The caller's own submitted-but-ungraded `short`-answer attempts (PR-G,
 * `PendingQuizAlert`'s data source). Same 30s staleTime as `useEducationHome`
 * — both back the same StudentHome sidebar.
 */
export function useMyPendingReviews() {
  return useQuery({
    queryKey: ['education-pending-reviews'],
    queryFn: () => EducationService.getMyPendingReviews(),
    staleTime: 30_000,
  });
}

/**
 * The caller's own bookmarked lessons — `BookmarksCard`'s data source on
 * StudentHome, and `LessonViewer`'s source for the pill's initial state.
 */
export function useMyBookmarks() {
  return useQuery({
    queryKey: ['education-bookmarks'],
    queryFn: () => EducationService.getMyBookmarks(),
    staleTime: 30_000,
  });
}

/**
 * Toggles one lesson's bookmark (idempotent backend either way). The pill's
 * OWN instant flip/rollback is local component state in `LessonViewer`
 * (spec: "Optimistic UI update is fine") — this mutation only owns the
 * network call and invalidates the shared `education-bookmarks` list on
 * success so `BookmarksCard` reflects the change on its next mount/refetch.
 */
export function useToggleLessonBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { lessonId: string; bookmarked: boolean }) =>
      args.bookmarked
        ? EducationService.unbookmarkLesson(args.lessonId)
        : EducationService.bookmarkLesson(args.lessonId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['education-bookmarks'] });
    },
  });
}

// ── PR-H: admin course management ──

/** Author-visible curricula list (level >= 3 sees draft/review/archived too). */
export function useAdminCurricula() {
  return useQuery({
    queryKey: ['education-curricula'],
    queryFn: () => EducationService.getCurricula(),
    staleTime: 30_000,
  });
}

/** Church-wide review queue, reused read-only for `AdminCourseList`'s "Por revisar" KPI. */
export function useReviewQueue() {
  return useQuery({
    queryKey: ['education-review-queue'],
    queryFn: () => EducationService.getReviewQueue(),
    staleTime: 30_000,
  });
}

export function useCourseModules(curriculumId: string | undefined) {
  return useQuery({
    queryKey: ['education-course-modules', curriculumId],
    queryFn: () => EducationService.getCourseModules(curriculumId as string),
    enabled: !!curriculumId,
  });
}

// ── PR-K: analytics + review queue ──

/** Roster + 4 KPIs for one curriculum (`StudentProgress.tsx`'s course selector target). */
export function useStudentRoster(curriculumId: string | undefined) {
  return useQuery({
    queryKey: ['education-student-roster', curriculumId],
    queryFn: () => EducationService.getStudentRoster(curriculumId as string),
    enabled: !!curriculumId,
    staleTime: 30_000,
  });
}

/** Per-lesson reached/completed counts for `LessonFunnel.tsx`'s drop-off chart. */
export function useLessonFunnel(curriculumId: string | undefined) {
  return useQuery({
    queryKey: ['education-lesson-funnel', curriculumId],
    queryFn: () => EducationService.getLessonFunnel(curriculumId as string),
    enabled: !!curriculumId,
    staleTime: 30_000,
  });
}
