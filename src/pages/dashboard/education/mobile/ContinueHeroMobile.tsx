import { Play, PlayCircle } from 'lucide-react';

import type { EducationAssignment } from '@/types/education.types';
import { pluralize } from '../student/lib/format';

/**
 * Mobile handoff, screen 1.a ("Hero 'Continuar donde quedé'") — full-width
 * gradient hero, one tap to resume. The mockup's subtitle ("Lección 5 · La
 * oración como diálogo") and footer time estimate ("1 h 20 min restantes")
 * aren't backed by real data (no current-lesson title or per-assignment
 * time-remaining field exists on `EducationAssignment`) — shown instead:
 * the real lessons-remaining count, same figure `ContinueCard` (desktop)
 * already derives truthfully, never a fabricated lesson name or duration.
 */
export function ContinueHeroMobile({
  assignment,
  onClick,
}: {
  assignment: EducationAssignment;
  onClick: () => void;
}) {
  const percent =
    assignment.totalLessons > 0
      ? Math.round((assignment.completedLessons / assignment.totalLessons) * 100)
      : 0;
  const remaining = Math.max(assignment.totalLessons - assignment.completedLessons, 0);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[24px] p-[18px] text-left text-white"
      style={{ background: 'var(--edu-cover-1)' }}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-normal tracking-[0.06em] text-white/80">
        <PlayCircle className="h-[15px] w-[15px]" aria-hidden="true" />
        CONTINUAR DONDE QUEDÉ
      </div>
      <div className="mt-2.5 text-[19px] font-normal">{assignment.curriculumName}</div>
      <div className="mt-1 text-[13px] text-white/85">
        {assignment.completedLessons}/{assignment.totalLessons}{' '}
        {pluralize(assignment.totalLessons, 'lección', 'lecciones')}
      </div>
      <div className="my-3.5 h-[7px] rounded-full bg-white/25">
        <div
          className="h-full rounded-full bg-white"
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/90">
          {percent}% · {remaining} {pluralize(remaining, 'restante', 'restantes')}
        </span>
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-edu-primary-dark">
          <Play className="h-6 w-6 translate-x-[1px]" fill="currentColor" />
        </span>
      </div>
    </button>
  );
}
