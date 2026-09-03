import { useLayoutEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Type } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { EducationService } from '@/services/education.service';
import { useCourseDetail, useEducationHome } from '../hooks/use-education-queries';
import { useLessonFontSize } from '../hooks/use-lesson-font-size';
import { BlockRenderer } from '../blocks/BlockRenderer';
import { StepIndicator } from './StepIndicator';
import { LessonNavFooter } from './LessonNavFooter';

/**
 * Design (README §4, "Alumno · Visor de lección") + spec
 * (education-lesson-consumption, "Step-by-step viewer with server-persisted
 * pointer"). Consumes one step at a time — no long scroll. The server's
 * `current_step_id`/`visited_step_ids` (design A2/A3) is the source of
 * truth for resume-after-refresh; `?paso=N` is only a fallback for a
 * student who has never opened this lesson before (no server pointer yet).
 */
export default function LessonViewer() {
  const { curriculumId, lessonId } = useParams<{ curriculumId: string; lessonId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { fontSizePercent, cycle: cycleFontSize } = useLessonFontSize();

  const {
    data: lesson,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['education-lesson-detail', lessonId],
    queryFn: () => EducationService.getLessonDetail(lessonId as string),
    enabled: !!lessonId,
  });

  const { curriculum, syllabus } = useCourseDetail(curriculumId);
  const { data: home } = useEducationHome();
  const assignment = useMemo(
    () => home?.assignments.find(a => a.curriculumId === curriculumId) ?? null,
    [home, curriculumId]
  );

  const flatLessons = useMemo(() => syllabus.flatMap(m => m.lessons), [syllabus]);
  // No per-lesson quiz signal exists yet — `education_quizzes` doesn't ship
  // until PR-F, and `EducationSyllabusLesson` carries no `hasQuiz` field
  // (only the catalog-level `EducationCatalogCourse.hasQuiz`, itself stubbed
  // `false` server-side). Per the established PR-D convention ("no real
  // quiz data exists yet ... don't fake it"), the last-step primary action
  // always advances to the next lesson in THIS PR; `LessonNavFooter`
  // already accepts `hasQuiz` so PR-F/G only needs to wire a real value in.
  const hasQuiz = false;
  const lessonIndexInCourse = flatLessons.findIndex(l => l.id === lessonId);
  const nextLessonId =
    lessonIndexInCourse >= 0 ? (flatLessons[lessonIndexInCourse + 1]?.id ?? null) : null;
  const moduleNumber = useMemo(() => {
    const idx = syllabus.findIndex(m => m.lessons.some(l => l.id === lessonId));
    return idx >= 0 ? idx + 1 : null;
  }, [syllabus, lessonId]);

  // The caller's own step pointer. Server progress wins on every mount; a
  // `?paso=N` deep link only seeds the FIRST-EVER open (no server pointer).
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [visitedStepIds, setVisitedStepIds] = useState<string[]>([]);

  // `useLayoutEffect`, not `useEffect`: seeding the server pointer AFTER
  // paint would flash step 1's content for one frame before jumping to the
  // real step (spec: "Resume after refresh" opens directly at step 3, no
  // visible reset to step 1 first).
  useLayoutEffect(() => {
    if (!lesson || lesson.steps.length === 0) return;
    const serverPointer = lesson.progress?.currentStepId ?? null;
    let initial = serverPointer;
    if (!initial) {
      const pasoParam = Number(searchParams.get('paso'));
      const byQuery =
        Number.isInteger(pasoParam) && pasoParam > 0
          ? lesson.steps.find(s => s.orderIndex === pasoParam)
          : undefined;
      initial = byQuery?.id ?? lesson.steps[0].id;
    }
    setActiveStepId(initial);
    setVisitedStepIds(Array.from(new Set([...(lesson.progress?.visitedStepIds ?? []), initial])));
    // Only seed from the freshly loaded lesson — not on every searchParams change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson]);

  const positionMutation = useMutation({
    mutationFn: (stepId: string) => {
      if (!assignment || !lessonId) return Promise.resolve();
      return EducationService.updateLessonPosition(assignment.id, lessonId, stepId);
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => {
      if (!assignment || !lessonId) return Promise.resolve();
      return EducationService.markLessonComplete(assignment.id, lessonId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['education-home'] });
      qc.invalidateQueries({ queryKey: ['education-syllabus', curriculumId] });
    },
    onError: () => toast.error('No se pudo guardar tu avance'),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-[420px] w-full rounded-md3-xl" />
      </div>
    );
  }

  if (isError || !lesson) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md3-lg border border-destructive/30 bg-destructive/5 py-12 text-center">
        <p className="text-sm font-medium text-destructive">No se pudo cargar esta lección.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const steps = lesson.steps;
  const currentStepIndex = Math.max(
    0,
    steps.findIndex(s => s.id === activeStepId)
  );
  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  function goToStep(stepId: string) {
    setActiveStepId(stepId);
    setVisitedStepIds(prev => (prev.includes(stepId) ? prev : [...prev, stepId]));
    positionMutation.mutate(stepId);
  }

  function handlePrev() {
    if (isFirstStep) return;
    goToStep(steps[currentStepIndex - 1].id);
  }

  function handleNext() {
    if (!isLastStep) {
      goToStep(steps[currentStepIndex + 1].id);
      return;
    }
    if (hasQuiz) {
      navigate(`/dashboard/education/curso/${curriculumId}/leccion/${lessonId}/quiz`);
      return;
    }
    completeMutation.mutate(undefined, {
      onSuccess: () => {
        if (nextLessonId) {
          navigate(`/dashboard/education/curso/${curriculumId}/leccion/${nextLessonId}`);
        } else {
          toast.success('¡Terminaste el curso!');
          navigate(`/dashboard/education/curso/${curriculumId}`);
        }
      },
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(`/dashboard/education/curso/${curriculumId}`)}
          className="flex min-h-11 items-center gap-1.5 text-sm font-medium text-edu-primary"
        >
          <ArrowLeft className="h-[18px] w-[18px]" aria-hidden="true" />
          {curriculum?.name ?? 'Volver al curso'}
        </button>
        <button
          type="button"
          onClick={cycleFontSize}
          className="flex min-h-11 items-center gap-1.5 rounded-full border border-border px-3.5 text-xs font-medium text-foreground hover:bg-muted"
        >
          <Type className="h-4 w-4" aria-hidden="true" />
          Texto
        </button>
      </div>

      <div className="overflow-hidden rounded-md3-xl border border-border bg-card">
        {steps.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              Esta lección todavía no tiene contenido publicado.
            </p>
          </div>
        ) : (
          <>
            <div className="px-5 pt-5 sm:px-8 sm:pt-[22px]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-normal uppercase tracking-[0.07em] text-edu-text">
                  Lección {lesson.orderIndex}
                  {moduleNumber ? ` · Módulo ${moduleNumber}` : ''}
                </span>
                <span className="text-[13px] text-muted-foreground">
                  Paso {currentStepIndex + 1} de {steps.length}
                </span>
              </div>
              <h2 className="mt-1.5 text-2xl font-normal text-foreground sm:text-[26px]">
                {lesson.title}
              </h2>

              <div className="mt-4">
                <StepIndicator
                  steps={steps}
                  currentStepId={currentStep.id}
                  visitedStepIds={visitedStepIds}
                  onStepClick={goToStep}
                />
              </div>
            </div>

            <div
              className="px-5 pb-[30px] pt-[26px] sm:px-8"
              style={{ fontSize: fontSizePercent, maxWidth: 840, marginInline: 'auto' }}
            >
              {currentStep.blocks.map(block => (
                <BlockRenderer key={block.id} block={block} size="full" lessonId={lesson.id} />
              ))}
            </div>

            <LessonNavFooter
              onPrev={handlePrev}
              onNext={handleNext}
              disablePrev={isFirstStep}
              isLastStep={isLastStep}
              hasQuiz={hasQuiz}
              nextPending={completeMutation.isPending}
            />
          </>
        )}
      </div>
    </div>
  );
}
