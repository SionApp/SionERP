import { ArrowUpRight, BookOpen } from 'lucide-react';

import { Progress } from '@/components/ui/progress';
import type { EducationAssignment } from '@/types/education.types';
import { pluralize } from './lib/format';

const TRACK_LABEL: Record<string, string> = {
  discipulado: 'DISCIPULADO',
  servicio: 'SERVICIO',
  liderazgo: 'LIDERAZGO',
  familia: 'FAMILIA',
  formacion: 'FORMACIÓN',
};

export function ContinueCard({
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
      className="flex flex-col rounded-md3-lg border border-border bg-card p-[18px] text-left transition-shadow hover:shadow-sm"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-md3-sm bg-edu-container text-on-edu-container">
          <BookOpen className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <div className="text-base font-medium text-foreground">{assignment.curriculumName}</div>
          {assignment.track && (
            <div className="mt-0.5 text-[11px] tracking-wide text-muted-foreground">
              {TRACK_LABEL[assignment.track] ?? assignment.track.toUpperCase()}
            </div>
          )}
        </div>
      </div>
      <Progress value={percent} className="my-4 h-2" />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <BookOpen className="h-[15px] w-[15px]" />
          {assignment.completedLessons}/{assignment.totalLessons} lecciones
        </span>
        <span>
          {remaining} {pluralize(remaining, 'restante', 'restantes')}
        </span>
      </div>
      <div className="mt-3.5 flex items-center gap-1.5 text-[13px] font-medium text-edu-primary">
        Reanudar curso
        <ArrowUpRight className="h-[17px] w-[17px]" />
      </div>
    </button>
  );
}
