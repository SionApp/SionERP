import type { EducationSyllabusModule } from '@/types/education.types';

export type DisplayLessonState = 'completed' | 'current' | 'available' | 'locked';

/**
 * Interim lesson-lock rule for PR-D.
 *
 * The design's real rule ("se desbloquea al aprobar la lección anterior")
 * needs a quiz PASS, which doesn't exist until PR-F — the backend's
 * `education-catalog` syllabus endpoint still stubs `locked` out entirely
 * (every lesson comes back `completed | in_progress | pending`, see
 * `handlers/education_catalog.go`'s own comment on `GetSyllabus`).
 *
 * Rather than ship every lesson as clickable (silently wrong — it would let
 * a student skip straight to lesson 8) or leave the whole syllabus
 * unlocked-looking, PR-D applies a CLIENT-side sequential-unlock fallback:
 * a `pending` lesson is reachable only if it is the very next one after the
 * last `completed`/`in_progress` lesson in course order. This is explicitly
 * a PR-F follow-up — once the quiz-pass unlock lands server-side, this
 * client fallback should be deleted and `locked` read directly off the
 * syllabus response.
 *
 * An unenrolled, browsing visitor (no assignment yet) sees no lock at all:
 * the lock concept is about THEIR OWN progression, and applying it to a
 * syllabus preview would be presumptuous — every lesson renders as a
 * neutral, non-interactive preview row instead.
 */
export function computeDisplayLessonStates(
  modules: EducationSyllabusModule[],
  isEnrolled: boolean
): Map<string, DisplayLessonState> {
  const result = new Map<string, DisplayLessonState>();
  const flatLessons = modules.flatMap(m => m.lessons);

  if (!isEnrolled) {
    for (const lesson of flatLessons) result.set(lesson.id, 'available');
    return result;
  }

  let previousReached = true;
  for (const lesson of flatLessons) {
    if (lesson.state === 'completed') {
      result.set(lesson.id, 'completed');
      previousReached = true;
      continue;
    }
    if (lesson.state === 'in_progress') {
      result.set(lesson.id, 'current');
      previousReached = false;
      continue;
    }
    result.set(lesson.id, previousReached ? 'available' : 'locked');
    previousReached = false;
  }
  return result;
}
