import { ArrowRight, Hourglass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import type { QuizPendingReviewItem } from '@/types/education.types';
import { pluralize } from './lib/format';

/**
 * Design (README §1, "Aviso de quiz pendiente" — hex FBE0D6 container,
 * hex B3492A icon/action). PR-G.4 note: this was deliberately NOT built in
 * PR-D ("no real quiz data exists yet ... don't fake it") — it moved here
 * once PR-F shipped real quiz attempts.
 *
 * Deliberate semantic narrowing from the design mockup's literal copy: the
 * mockup's "Tienes 1 quiz pendiente" / "Resolver ahora" reads as "you
 * haven't TAKEN this quiz yet, deadline approaching" — but this session's
 * launch prompt explicitly scopes G.4 to `review_pending` attempts (already
 * SUBMITTED, awaiting an instructor's manual grade of a `short`-answer
 * question), which is the only real signal PR-F's backend exposes. There is
 * genuinely nothing left for the student to "resolve" in that state, so the
 * copy/icon are adjusted accordingly (`Hourglass`, "en revisión" instead of
 * "pendiente"/`assignment_late`) rather than shipping misleading text for
 * data the backend doesn't have (an "assignment not yet started, due soon"
 * reminder would need a different data source entirely — out of scope
 * here).
 */
export function PendingQuizAlert({ items }: { items: QuizPendingReviewItem[] }) {
  const navigate = useNavigate();

  if (items.length === 0) return null;

  // Earliest-submitted first (already the backend's own ORDER BY) — surface
  // the one that's been waiting longest.
  const [first] = items;
  const dueDateLabel = first.dueDate
    ? new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long' }).format(
        new Date(`${first.dueDate}T00:00:00`)
      )
    : null;

  return (
    <div className="rounded-md3-lg bg-edu-orange-container p-[18px_20px]">
      <div className="flex items-start gap-3">
        <Hourglass
          className="mt-0.5 h-[22px] w-[22px] shrink-0 text-on-edu-orange-container"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-edu-callout-title">
            Tienes {items.length}{' '}
            {pluralize(items.length, 'quiz en revisión', 'quizzes en revisión')}
          </div>
          <div className="mt-1 text-xs text-edu-alert-detail">
            {first.curriculumName} · {first.lessonTitle}
            {dueDateLabel ? ` — la lección vence el ${dueDateLabel}` : ''}
          </div>
          <button
            type="button"
            onClick={() =>
              navigate(
                `/dashboard/education/curso/${first.curriculumId}/leccion/${first.lessonId}/resultado/${first.attemptId}`
              )
            }
            className="mt-2 flex items-center gap-1 text-[13px] font-medium text-on-edu-orange-container"
          >
            Ver estado
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
