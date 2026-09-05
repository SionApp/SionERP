import { useLayoutEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Bookmark, BookmarkCheck, Type } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { MobileScreen } from '@/components/mobile/MobileScreen';
import { useMobileMode } from '@/hooks/useMobileMode';
import { EducationService } from '@/services/education.service';
import {
  useCourseDetail,
  useEducationHome,
  useMyBookmarks,
  useToggleLessonBookmark,
} from '../hooks/use-education-queries';
import { useLessonFontSize } from '../hooks/use-lesson-font-size';
import { BlockRenderer } from '../blocks/BlockRenderer';
import { LessonImmersiveHeader } from '../mobile/LessonImmersiveHeader';
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
  const isMobileApp = useMobileMode();
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
  const lessonIndexInCourse = flatLessons.findIndex(l => l.id === lessonId);
  // PR-G: `EducationSyllabusLesson.hasQuiz` is now a real field (PR-F wired
  // `has_quiz` into `GetSyllabus`) — the syllabus entry for THIS lesson is
  // already in `flatLessons` (fetched via `useCourseDetail` above), so no
  // extra request is needed to know whether the last step should route to
  // the quiz.
  const hasQuiz = flatLessons[lessonIndexInCourse]?.hasQuiz ?? false;

  // Whether the student already resolved this quiz (resuelto or en
  // revisión) — routes "Ir al mini quiz" straight to that result instead of
  // into StartAttempt, which 409s once the retry ceiling is reached and
  // otherwise gives no way back to a past attempt (the app's own dead end,
  // not a design gap).
  const { data: latestAttempt } = useQuery({
    queryKey: ['quiz-latest-attempt', lessonId],
    queryFn: () => EducationService.getMyLatestQuizAttempt(lessonId as string),
    enabled: !!lessonId && hasQuiz,
  });

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

  // Bookmark pill state (design gap closed per explicit user decision — see
  // the migration's header comment). Derived from the caller's own bookmark
  // list (same `useMyBookmarks` StudentHome's card reads) rather than a new
  // field on `getLessonDetail`, keeping this follow-up self-contained.
  //
  // `isBookmarked` is local state synced FROM the server value using React's
  // sanctioned "adjust state during render" comparison (never a ref write
  // during render) — this lets a click flip the pill instantly (spec:
  // "Optimistic UI update is fine") while still converging back to the real
  // server value once the invalidated query refetches.
  const { data: bookmarks } = useMyBookmarks();
  const serverBookmarked = useMemo(
    () => (bookmarks ?? []).some(b => b.lessonId === lessonId),
    [bookmarks, lessonId]
  );
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [syncedServerBookmarked, setSyncedServerBookmarked] = useState<boolean | null>(null);
  if (serverBookmarked !== syncedServerBookmarked) {
    setSyncedServerBookmarked(serverBookmarked);
    setIsBookmarked(serverBookmarked);
  }
  const toggleBookmark = useToggleLessonBookmark();

  function handleToggleBookmark() {
    if (!lessonId) return;
    const wasBookmarked = isBookmarked;
    setIsBookmarked(!wasBookmarked);
    toggleBookmark.mutate(
      { lessonId, bookmarked: wasBookmarked },
      {
        onError: () => {
          setIsBookmarked(wasBookmarked);
          toast.error('No se pudo actualizar la lección guardada');
        },
      }
    );
  }

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
    // PR-G: a quizzed lesson's CONTENT completion (elp.completed_at) and its
    // quiz PASS are two independent signals — `GetSyllabus`'s unlock query
    // requires BOTH (the previous lesson completed AND, if it has a quiz,
    // passed) before unlocking the next one. Nothing in the quiz backend
    // (StartAttempt/SubmitAttempt/ReviewAnswer) ever writes
    // education_lesson_progress, so skipping `completeMutation` here would
    // leave `completed_at` permanently unset for every quizzed lesson —
    // still mark the lesson's own content complete, THEN navigate to the
    // quiz (never skip it).
    if (hasQuiz) {
      if (latestAttempt?.submitted && latestAttempt.attemptId) {
        navigate(
          `/dashboard/education/curso/${curriculumId}/leccion/${lessonId}/resultado/${latestAttempt.attemptId}`
        );
        return;
      }
      completeMutation.mutate(undefined, {
        onSuccess: () => {
          navigate(`/dashboard/education/curso/${curriculumId}/leccion/${lessonId}/quiz`);
        },
      });
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

  if (isMobileApp) {
    const stepEyebrow =
      steps.length === 0 ? '' : (currentStep.label || `Paso ${currentStepIndex + 1}`).toUpperCase();
    return (
      <div className="education-shell flex min-h-full flex-col bg-background">
        <MobileScreen
          back={`/dashboard/education/curso/${curriculumId}`}
          header={
            <LessonImmersiveHeader
              title={lesson.title}
              stepLabel={
                steps.length === 0
                  ? `Lección ${lesson.orderIndex}`
                  : `Lección ${lesson.orderIndex} · Paso ${currentStepIndex + 1} de ${steps.length}`
              }
              isBookmarked={isBookmarked}
              onClose={() => navigate(`/dashboard/education/curso/${curriculumId}`)}
              onToggleBookmark={handleToggleBookmark}
              onCycleFontSize={cycleFontSize}
            />
          }
        >
          {steps.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-16 text-center">
              <p className="text-sm text-muted-foreground">
                Esta lección todavía no tiene contenido publicado.
              </p>
            </div>
          ) : (
            <>
              <div className="px-5 pb-3 pt-4">
                <span className="text-[10px] font-normal tracking-[0.07em] text-edu-text">
                  {stepEyebrow}
                </span>
                <div className="mt-3">
                  <StepIndicator
                    steps={steps}
                    currentStepId={currentStep.id}
                    visitedStepIds={visitedStepIds}
                    onStepClick={goToStep}
                    compact
                  />
                </div>
              </div>
              <div className="px-5 pb-24" style={{ fontSize: fontSizePercent }}>
                {currentStep.blocks.map(block => (
                  <BlockRenderer key={block.id} block={block} size="full" lessonId={lesson.id} />
                ))}
              </div>
              <div className="fixed bottom-0 left-0 right-0 z-40">
                <LessonNavFooter
                  onPrev={handlePrev}
                  onNext={handleNext}
                  disablePrev={isFirstStep}
                  isLastStep={isLastStep}
                  hasQuiz={hasQuiz}
                  quizSubmitted={!!latestAttempt?.submitted}
                  nextPending={completeMutation.isPending}
                />
              </div>
            </>
          )}
        </MobileScreen>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-3">
        <button
          type="button"
          onClick={() => navigate(`/dashboard/education/curso/${curriculumId}`)}
          className="flex min-h-11 min-w-0 items-center gap-1.5 text-sm font-medium text-edu-primary"
        >
          <ArrowLeft className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
          <span className="truncate">{curriculum?.name ?? 'Volver al curso'}</span>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleToggleBookmark}
            aria-pressed={isBookmarked}
            className="flex min-h-11 items-center gap-1.5 rounded-full border border-border px-3.5 text-xs font-medium text-foreground hover:bg-muted"
          >
            {isBookmarked ? (
              <BookmarkCheck className="h-4 w-4 text-edu-primary" aria-hidden="true" />
            ) : (
              <Bookmark className="h-4 w-4" aria-hidden="true" />
            )}
            {isBookmarked ? 'Guardado' : 'Guardar'}
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
              quizSubmitted={!!latestAttempt?.submitted}
              nextPending={completeMutation.isPending}
            />
          </>
        )}
      </div>
    </div>
  );
}
