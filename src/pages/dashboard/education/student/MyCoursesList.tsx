import { ChevronRight, GraduationCap } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { EducationAssignment, EducationAssignmentStatus } from '@/types/education.types';

const STATUS_LABEL: Record<EducationAssignmentStatus, string> = {
  pending: 'Sin iniciar',
  in_progress: 'En curso',
  completed: 'Completado',
  overdue: 'Atrasado',
  in_review: 'En revisión',
  inactive: 'Inactivo',
};

const STATUS_CHIP: Record<EducationAssignmentStatus, string> = {
  pending: 'bg-edu-orange-container text-on-edu-orange-container',
  in_progress: 'bg-edu-container text-on-edu-container',
  completed: 'bg-edu-violet-container text-on-edu-violet-container',
  overdue: 'bg-destructive/10 text-destructive',
  in_review: 'bg-edu-violet-container text-on-edu-violet-container',
  inactive: 'bg-muted text-muted-foreground',
};

const BAR_CLASS: Record<EducationAssignmentStatus, string> = {
  pending: 'bg-on-edu-orange-container',
  in_progress: 'bg-edu-primary',
  completed: 'bg-on-edu-violet-container',
  overdue: 'bg-destructive',
  in_review: 'bg-on-edu-violet-container',
  inactive: 'bg-muted-foreground',
};

export function MyCoursesList({
  assignments,
  onSelect,
}: {
  assignments: EducationAssignment[];
  onSelect: (curriculumId: string) => void;
}) {
  if (assignments.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md3-lg border border-dashed border-edu-outline bg-edu-surface py-12 text-center">
        <GraduationCap className="h-6 w-6 text-on-edu-container" />
        <p className="text-sm text-muted-foreground">
          Todavía no te sumaste a ningún curso. Explorá el catálogo para empezar.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md3-lg border border-border bg-card p-1.5">
      {assignments.map(a => {
        const percent =
          a.totalLessons > 0 ? Math.round((a.completedLessons / a.totalLessons) * 100) : 0;
        return (
          <div
            key={a.id}
            onClick={() => onSelect(a.curriculumId)}
            role="button"
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') onSelect(a.curriculumId);
            }}
            className="flex cursor-pointer items-center gap-3.5 rounded-md3-sm p-3.5 hover:bg-edu-surface"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md3-sm bg-edu-container text-on-edu-container">
              <GraduationCap className="h-[22px] w-[22px]" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-foreground">{a.curriculumName}</div>
              <div className="mt-0.5 truncate text-xs text-muted-foreground">
                {[
                  a.teacherName,
                  `${a.totalLessons} ${a.totalLessons === 1 ? 'lección' : 'lecciones'}`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </div>
            <div className="hidden w-[150px] shrink-0 sm:block">
              <div className="h-1.5 overflow-hidden rounded-full bg-edu-track">
                <div
                  className={cn('h-full rounded-full', BAR_CLASS[a.status])}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className="mt-1.5 text-[11px] text-muted-foreground">{percent}% completado</div>
            </div>
            <span
              className={cn(
                'shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium',
                STATUS_CHIP[a.status]
              )}
            >
              {STATUS_LABEL[a.status]}
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </div>
        );
      })}
    </div>
  );
}
