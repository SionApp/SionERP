import { BookOpen, Clock, PlayCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { EducationAssignment, EducationCurriculum } from '@/types/education.types';
import { formatHours } from '../student/lib/format';

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

/**
 * Mobile handoff, screen 3 ("Detalle de curso, temario") — full-bleed
 * gradient hero replacing the desktop CourseHero's side-by-side layout with
 * a stacked one: chips → title → metadata → progress panel → CTA, all in
 * one column. Metadata row omits `studentCount` (doc: "Se omite el
 * recuento de miembros por espacio") and, deliberately, any certificate
 * chip — the mockup's own "workspace_premium Certificado" metadata item
 * contradicts the desktop spec's hard rule (education-copy-and-omissions:
 * "Certificates are absent, not stubbed" — no certificate string/icon may
 * render anywhere), so it's dropped here to stay consistent with the
 * already-shipped desktop screens rather than reintroducing dead promise
 * copy on mobile only.
 */
export function CourseHeroMobile({
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
    <div className="px-5 pb-5 pt-2 text-white" style={{ background: 'var(--edu-hero)' }}>
      <div className="flex flex-wrap items-center gap-2">
        {curriculum.track && (
          <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-medium tracking-wide">
            {(TRACK_LABEL[curriculum.track] ?? curriculum.track).toUpperCase()}
          </span>
        )}
        {curriculum.level && (
          <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-medium">
            Nivel {curriculum.level}
          </span>
        )}
      </div>
      <h2 className="mt-3 text-[25px] font-normal">{curriculum.name}</h2>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-white/90">
        <span className="flex items-center gap-1.5">
          <BookOpen className="h-4 w-4" />
          {curriculum.lessonCount} {curriculum.lessonCount === 1 ? 'lección' : 'lecciones'}
        </span>
        {curriculum.hours !== null && (
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {formatHours(curriculum.hours)}
          </span>
        )}
      </div>

      <div className="mt-[18px] rounded-[18px] bg-white/[.14] p-3.5">
        {assignment ? (
          <>
            <div className="flex items-center justify-between text-xs text-white/80">
              <span>Tu progreso</span>
              <span>
                Lección {Math.min(assignment.completedLessons + 1, assignment.totalLessons)} de{' '}
                {assignment.totalLessons}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2.5">
              <div className="h-[7px] flex-1 overflow-hidden rounded-full bg-white/25">
                <div
                  className="h-full rounded-full bg-white transition-[width]"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className="text-[15px] font-medium">{percent}%</span>
            </div>
          </>
        ) : (
          <div className="text-xs text-white/80">Todavía no empezaste este curso</div>
        )}
      </div>

      {assignment ? (
        nextLesson && (
          <Button
            className="mt-3 w-full gap-2 bg-white text-edu-primary-dark hover:bg-white/90"
            onClick={() => onContinue(nextLesson.id)}
          >
            <PlayCircle className="h-5 w-5" />
            Continuar lección {nextLesson.orderIndex}
          </Button>
        )
      ) : (
        <Button
          className="mt-3 w-full bg-white text-edu-primary-dark hover:bg-white/90"
          onClick={onEnroll}
          disabled={enrolling}
        >
          {enrolling ? 'Inscribiendo…' : 'Inscribirme'}
        </Button>
      )}
    </div>
  );
}
