import { BookOpen, Clock, PlayCircle, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { EducationAssignment, EducationCurriculum } from '@/types/education.types';
import { formatHours } from './lib/format';

const TRACK_LABEL: Record<string, string> = {
  discipulado: 'Discipulado',
  servicio: 'Servicio',
  liderazgo: 'Liderazgo',
  familia: 'Familia',
  formacion: 'Formación',
};

interface NextLesson {
  id: string;
  orderIndex: number;
}

export function CourseHero({
  curriculum,
  assignment,
  nextLesson,
  onEnroll,
  onContinue,
  enrolling,
}: {
  curriculum: EducationCurriculum;
  assignment: EducationAssignment | null;
  nextLesson: NextLesson | null;
  onEnroll: () => void;
  onContinue: (lessonId: string) => void;
  enrolling: boolean;
}) {
  const percent =
    assignment && assignment.totalLessons > 0
      ? Math.round((assignment.completedLessons / assignment.totalLessons) * 100)
      : 0;

  return (
    <div
      className="flex flex-col gap-6 rounded-md3-xl p-6 text-white sm:p-[30px_34px] md:flex-row md:items-center md:justify-between"
      style={{ background: 'var(--edu-hero)' }}
    >
      <div className="max-w-[640px]">
        <div className="flex flex-wrap items-center gap-2.5">
          {curriculum.track && (
            <span className="rounded-full bg-white/20 px-3.5 py-1.5 text-[11px] font-medium tracking-wide">
              {(TRACK_LABEL[curriculum.track] ?? curriculum.track).toUpperCase()}
            </span>
          )}
          {curriculum.level && (
            <span className="rounded-full bg-white/20 px-3.5 py-1.5 text-[11px] font-medium">
              Nivel {curriculum.level}
            </span>
          )}
        </div>
        <h2 className="mt-3.5 text-[26px] font-normal sm:text-[30px]">{curriculum.name}</h2>
        {curriculum.description && (
          <p className="mt-2.5 text-[15px] leading-relaxed text-white/85">
            {curriculum.description}
          </p>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-white/90">
          <span className="flex items-center gap-1.5">
            <BookOpen className="h-[18px] w-[18px]" />
            {curriculum.lessonCount} {curriculum.lessonCount === 1 ? 'lección' : 'lecciones'}
          </span>
          {curriculum.hours !== null && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-[18px] w-[18px]" />
              {formatHours(curriculum.hours)} aprox.
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Users className="h-[18px] w-[18px]" />
            {curriculum.studentCount} {curriculum.studentCount === 1 ? 'miembro' : 'miembros'}
          </span>
        </div>
      </div>

      <div className="w-full shrink-0 rounded-md3-lg bg-white/[.14] p-[22px] md:w-[260px]">
        {assignment ? (
          <>
            <div className="text-xs text-white/80">Tu progreso</div>
            <div className="my-1 text-[34px] font-normal leading-none">{percent}%</div>
            <div className="h-2 overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-white transition-[width]"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-white/80">
              Lección {Math.min(assignment.completedLessons + 1, assignment.totalLessons)} de{' '}
              {assignment.totalLessons}
            </div>
            {nextLesson && (
              <Button
                className="mt-4 w-full gap-2 bg-white text-edu-primary-dark hover:bg-white/90"
                onClick={() => onContinue(nextLesson.id)}
              >
                <PlayCircle className="h-5 w-5" />
                Continuar lección {nextLesson.orderIndex}
              </Button>
            )}
          </>
        ) : (
          <>
            <div className="text-xs text-white/80">Todavía no empezaste este curso</div>
            <Button
              className="mt-3 w-full bg-white text-edu-primary-dark hover:bg-white/90"
              onClick={onEnroll}
              disabled={enrolling}
            >
              {enrolling ? 'Inscribiendo…' : 'Inscribirme'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
