import { BookOpen, Clock, Image as ImageIcon, Users } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { EducationAssignmentStatus, EducationCatalogCourse } from '@/types/education.types';
import { getCourseGradientVar } from './lib/course-gradient';
import { formatHours } from './lib/format';

const TRACK_LABEL: Record<string, string> = {
  discipulado: 'Discipulado',
  servicio: 'Servicio',
  liderazgo: 'Liderazgo',
  familia: 'Familia',
  formacion: 'Formación',
};

// One CTA pill per enrollment state, derived client-side from the caller's
// own assignment map (GetCatalog has no per-user column — cross-referencing
// `education-home`'s assignment list against curriculumId is the honest
// source, not a backend addition this screen needs). `null` = not enrolled.
function ctaFor(status: EducationAssignmentStatus | null): { label: string; className: string } {
  if (status === null) {
    return { label: 'Inscribirme', className: 'bg-edu-primary text-white' };
  }
  if (status === 'completed') {
    return {
      label: 'Completado',
      className: 'bg-edu-violet-container text-on-edu-violet-container',
    };
  }
  return { label: 'Continuar', className: 'bg-edu-container text-on-edu-container' };
}

export function CourseCard({
  course,
  myStatus,
  onClick,
}: {
  course: EducationCatalogCourse;
  myStatus: EducationAssignmentStatus | null;
  onClick: () => void;
}) {
  const isNew = Date.now() - new Date(course.createdAt).getTime() < 30 * 24 * 60 * 60 * 1000;
  const cta = ctaFor(myStatus);
  const initials = (course.teacherName ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase())
    .join('');

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col overflow-hidden rounded-md3-lg border border-border bg-card text-left transition-shadow hover:shadow-md"
    >
      <div
        className="relative flex h-40 items-center justify-center"
        style={{ background: getCourseGradientVar(course.id, course.track) }}
      >
        <div className="flex flex-col items-center gap-1.5 text-white/85">
          <ImageIcon className="h-7 w-7" />
          <span className="text-[11px]">Portada del curso</span>
        </div>
        {course.level && (
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-medium text-edu-on-light-chip">
            Nivel {course.level}
          </span>
        )}
        {isNew && (
          <span className="absolute right-3 top-3 rounded-full bg-edu-primary px-3 py-1.5 text-[11px] font-medium text-white">
            Nuevo
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-[18px]">
        {course.track && (
          <span className="text-[11px] font-medium uppercase tracking-wide text-edu-text-soft">
            {TRACK_LABEL[course.track] ?? course.track}
          </span>
        )}
        <h3 className="mt-1.5 text-base font-medium text-foreground">{course.name}</h3>
        {course.description && (
          <p className="mt-2 line-clamp-3 flex-1 text-[13px] leading-relaxed text-muted-foreground">
            {course.description}
          </p>
        )}
        <div className="mt-3.5 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4" />
            {course.lessonCount} {course.lessonCount === 1 ? 'lección' : 'lecciones'}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            {course.studentCount}
          </span>
          {course.hours !== null && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {formatHours(course.hours)}
            </span>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3.5">
          <div className="flex min-w-0 items-center gap-2">
            {course.teacherName && (
              <>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-edu-violet-container text-xs font-medium text-on-edu-violet-container">
                  {initials || '?'}
                </span>
                <span className="truncate text-xs text-muted-foreground">{course.teacherName}</span>
              </>
            )}
          </div>
          <span
            className={cn('shrink-0 rounded-full px-4 py-2 text-xs font-medium', cta.className)}
          >
            {cta.label}
          </span>
        </div>
      </div>
    </button>
  );
}
