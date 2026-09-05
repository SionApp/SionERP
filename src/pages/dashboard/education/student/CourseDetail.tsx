import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, BookOpen, CheckCircle2 } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { MobileScreen } from '@/components/mobile/MobileScreen';
import { useAuth } from '@/contexts/AuthContext';
import { useMobileMode } from '@/hooks/useMobileMode';
import { useCourseDetail, useEducationHome, useEnrollSelf } from '../hooks/use-education-queries';
import { ModuleTabs } from '../ModuleTabs';
import { CourseHeroMobile } from '../mobile/CourseHeroMobile';
import { EducationMobileHeader } from '../mobile/EducationMobileHeader';
import { CourseHero } from './CourseHero';
import { SyllabusModule } from './SyllabusModule';

export default function CourseDetail() {
  const { curriculumId } = useParams<{ curriculumId: string }>();
  const navigate = useNavigate();
  const isMobileApp = useMobileMode();
  const { currentUser } = useAuth();

  const { curriculum, syllabus, isLoading, isError, refetch } = useCourseDetail(curriculumId);
  const { data: home } = useEducationHome();
  const enrollMutation = useEnrollSelf();

  const assignment = useMemo(
    () => home?.assignments.find(a => a.curriculumId === curriculumId) ?? null,
    [home, curriculumId]
  );

  // PR-G: `locked` is now a real, distinct server state (was never possible
  // before PR-F — the old `l.state !== 'completed'` check would have picked
  // a locked lesson as "next up" once locked lessons started appearing in
  // this same response). Prefer the in-progress lesson; otherwise the first
  // unlocked-and-not-started (`pending`) one — never `locked`.
  const nextLesson = useMemo(() => {
    const flat = syllabus.flatMap(m => m.lessons);
    const upNext =
      flat.find(l => l.state === 'in_progress') ?? flat.find(l => l.state === 'pending');
    return upNext ? { id: upNext.id, orderIndex: upNext.orderIndex } : null;
  }, [syllabus]);

  const totalLessons = syllabus.reduce((sum, m) => sum + m.lessons.length, 0);
  const totalModules = syllabus.length;

  function handleEnroll() {
    if (!curriculumId) return;
    enrollMutation.mutate(curriculumId, {
      onSuccess: () => toast.success('¡Te inscribiste en el curso!'),
      onError: () => toast.error('No se pudo completar la inscripción'),
    });
  }

  function handleLessonClick(lessonId: string) {
    if (!curriculumId) return;
    if (!assignment) {
      toast.info('Inscribite en el curso para empezar esta lección');
      return;
    }
    navigate(`/dashboard/education/curso/${curriculumId}/leccion/${lessonId}`);
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-[220px] w-full rounded-md3-xl" />
        <Skeleton className="h-64 w-full rounded-md3-lg" />
      </div>
    );
  }

  if (isError || !curriculum) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md3-lg border border-destructive/30 bg-destructive/5 py-12 text-center">
        <p className="text-sm font-medium text-destructive">No se pudo cargar este curso.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const initial = (currentUser?.first_name?.[0] ?? '?').toUpperCase();

  if (isMobileApp) {
    return (
      <div className="education-shell">
        <MobileScreen header={<EducationMobileHeader title={curriculum.name} initial={initial} />}>
          <ModuleTabs isAdmin={false} />
          <CourseHeroMobile
            curriculum={curriculum}
            assignment={assignment}
            nextLesson={nextLesson}
            onEnroll={handleEnroll}
            onContinue={lessonId => handleLessonClick(lessonId)}
            enrolling={enrollMutation.isPending}
          />
          <div className="flex flex-col gap-4 px-4 pb-4 pt-5">
            <div className="overflow-hidden rounded-md3-lg border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
                <h3 className="text-base font-medium text-foreground">Temario</h3>
                <span className="text-xs text-muted-foreground">
                  {totalModules} {totalModules === 1 ? 'módulo' : 'módulos'} · {totalLessons}{' '}
                  {totalLessons === 1 ? 'lección' : 'lecciones'}
                </span>
              </div>
              {syllabus.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-14 text-center">
                  <BookOpen className="h-6 w-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Este curso todavía no tiene lecciones publicadas.
                  </p>
                </div>
              ) : (
                syllabus.map((module, i) => (
                  <SyllabusModule
                    key={module.id ?? 'general'}
                    module={module}
                    index={i + 1}
                    onLessonClick={handleLessonClick}
                    compact
                  />
                ))
              )}
            </div>

            {curriculum.teacherName && (
              <div className="rounded-md3-lg border border-border bg-card p-4">
                <h3 className="mb-3 text-sm font-medium text-foreground">Instructor del curso</h3>
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-edu-violet-container text-base font-medium text-on-edu-violet-container">
                    {curriculum.teacherName
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map(p => p[0]?.toUpperCase())
                      .join('')}
                  </span>
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {curriculum.teacherName}
                    </div>
                    <div className="text-xs text-muted-foreground">Educación</div>
                  </div>
                </div>
              </div>
            )}
            {curriculum.objectives.length > 0 && (
              <div className="rounded-md3-lg border border-edu-outline bg-edu-surface p-4">
                <h3 className="mb-2.5 text-sm font-medium text-on-edu-container">
                  Qué vas a lograr
                </h3>
                <div className="flex flex-col gap-1.5">
                  {curriculum.objectives.map((o, i) => (
                    <div key={i} className="flex items-start gap-2.5 py-1">
                      <CheckCircle2 className="mt-0.5 h-[18px] w-[18px] shrink-0 text-edu-primary" />
                      <span className="text-[13px] leading-relaxed text-edu-text-soft">{o}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="rounded-md3-lg border border-border bg-card p-4">
              <h3 className="mb-2.5 text-sm font-medium text-foreground">Requisitos</h3>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                {curriculum.requirements?.trim() ||
                  'Ninguno. Podés empezar este curso sin requisitos previos.'}
              </p>
            </div>
          </div>
        </MobileScreen>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={() => navigate('/dashboard/education/catalogo')}
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-edu-primary"
      >
        <ArrowLeft className="h-[18px] w-[18px]" />
        Volver al catálogo
      </button>

      <CourseHero
        curriculum={curriculum}
        assignment={assignment}
        nextLesson={nextLesson}
        onEnroll={handleEnroll}
        onContinue={lessonId => handleLessonClick(lessonId)}
        enrolling={enrollMutation.isPending}
      />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.75fr_1fr]">
        <div className="overflow-hidden rounded-md3-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-[22px] py-5">
            <h3 className="text-lg font-medium text-foreground">Temario</h3>
            <span className="text-[13px] text-muted-foreground">
              {totalModules} {totalModules === 1 ? 'módulo' : 'módulos'} · {totalLessons}{' '}
              {totalLessons === 1 ? 'lección' : 'lecciones'}
            </span>
          </div>
          {syllabus.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-14 text-center">
              <BookOpen className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Este curso todavía no tiene lecciones publicadas.
              </p>
            </div>
          ) : (
            syllabus.map((module, i) => (
              <SyllabusModule
                key={module.id ?? 'general'}
                module={module}
                index={i + 1}
                onLessonClick={handleLessonClick}
              />
            ))
          )}
        </div>

        <div className="flex flex-col gap-4">
          {curriculum.teacherName && (
            <div className="rounded-md3-lg border border-border bg-card p-5">
              <h3 className="mb-3.5 text-[15px] font-medium text-foreground">
                Instructor del curso
              </h3>
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-edu-violet-container text-[17px] font-medium text-on-edu-violet-container">
                  {curriculum.teacherName
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map(p => p[0]?.toUpperCase())
                    .join('')}
                </span>
                <div>
                  <div className="text-[15px] font-medium text-foreground">
                    {curriculum.teacherName}
                  </div>
                  <div className="text-xs text-muted-foreground">Educación</div>
                </div>
              </div>
            </div>
          )}
          {curriculum.objectives.length > 0 && (
            <div className="rounded-md3-lg border border-edu-outline bg-edu-surface p-5">
              <h3 className="mb-3 text-[15px] font-medium text-on-edu-container">
                Qué vas a lograr
              </h3>
              <div className="flex flex-col gap-1.5">
                {curriculum.objectives.map((o, i) => (
                  <div key={i} className="flex items-start gap-2.5 py-1.5">
                    <CheckCircle2 className="mt-0.5 h-[18px] w-[18px] shrink-0 text-edu-primary" />
                    <span className="text-[13px] leading-relaxed text-edu-text-soft">{o}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="rounded-md3-lg border border-border bg-card p-5">
            <h3 className="mb-3 text-[15px] font-medium text-foreground">Requisitos</h3>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              {curriculum.requirements?.trim() ||
                'Ninguno. Podés empezar este curso sin requisitos previos.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
