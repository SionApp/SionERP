import { useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Hourglass,
  RefreshCw,
  X,
  XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { MobileScreen } from '@/components/mobile/MobileScreen';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useMobileMode } from '@/hooks/useMobileMode';
import { EducationService } from '@/services/education.service';
import type { QuizResultVerdict, QuizResultView } from '@/types/education.types';

/**
 * Design (README §6, "Alumno · Resultado del quiz"). Max width 900px.
 * `show_result=false` ⇒ `result.questions` is `null` (the Go handler nils
 * the slice before serializing, per PR-F) — this screen renders ONLY the
 * aggregate verdict card in that case, no "Repaso de respuestas" section at
 * all, matching what the backend actually sent rather than hiding fields
 * that were never there.
 *
 * No pass/fail claim while `reviewPending` is true (spec:
 * education-manual-review, "no premature pass/fail claim while manual
 * grading is pending") — `passed` is `null` on the wire exactly when
 * `reviewPending` is true, so this reads `result.passed` directly rather
 * than re-deriving a verdict from per-question data.
 *
 * No completion-award copy anywhere (education-copy-and-omissions) — the
 * design mockup's own final-actions note about a document earned after N
 * more lessons is deliberately omitted here, same precedent as every other
 * screen in this module (and the same class of mistake this repo's own
 * quiz backend comment header hit once with the forbidden answer-key
 * identifiers: naming the banned word to explain the rule trips the guard
 * that greps raw source, so it's paraphrased instead).
 */

const VERDICT_CONFIG: Record<
  QuizResultVerdict,
  { icon: LucideIcon; circleClass: string; chipClass: string; answerClass: string }
> = {
  correct: {
    icon: CheckCircle2,
    circleClass: 'bg-edu-container text-on-edu-container',
    chipClass: 'bg-edu-container text-on-edu-container',
    answerClass: 'text-edu-primary',
  },
  incorrect: {
    icon: XCircle,
    circleClass: 'bg-edu-orange-container text-on-edu-orange-container',
    chipClass: 'bg-edu-orange-container text-on-edu-orange-container',
    answerClass: 'text-on-edu-orange-container',
  },
  in_review: {
    icon: Hourglass,
    circleClass: 'bg-edu-violet-container text-on-edu-violet-container',
    chipClass: 'bg-edu-violet-container text-on-edu-violet-container',
    answerClass: 'text-on-edu-violet-container',
  },
};

const VERDICT_LABEL: Record<QuizResultVerdict, string> = {
  correct: 'Correcta',
  incorrect: 'Incorrecta',
  in_review: 'En revisión',
};

export default function QuizResult() {
  const { curriculumId, lessonId, attemptId } = useParams<{
    curriculumId: string;
    lessonId: string;
    attemptId: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobileApp = useMobileMode();
  const { currentUser } = useAuth();

  const stateResult = (location.state as { result?: QuizResultView } | null)?.result;
  const seedResult = stateResult && stateResult.attemptId === attemptId ? stateResult : undefined;

  const {
    data: result,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['education-quiz-result', attemptId],
    queryFn: () => EducationService.getQuizAttemptResult(attemptId as string),
    enabled: !!attemptId,
    initialData: seedResult,
  });

  const percent = useMemo(() => {
    if (!result || result.maxScore <= 0) return 0;
    return Math.round((result.autoScore / result.maxScore) * 100);
  }, [result]);

  if (isLoading && !result) {
    return (
      <div className="mx-auto flex max-w-[900px] flex-col gap-5">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-[320px] w-full rounded-md3-xl" />
      </div>
    );
  }

  if (isError || !result) {
    return (
      <div className="mx-auto flex max-w-[900px] flex-col items-center gap-3 rounded-md3-lg border border-destructive/30 bg-destructive/5 py-12 text-center">
        <p className="text-sm font-medium text-destructive">No se pudo cargar el resultado.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const firstName = currentUser?.first_name ?? 'alumno';
  const verdictIcon = result.reviewPending ? Hourglass : result.passed ? CheckCircle2 : XCircle;
  const VerdictIcon = verdictIcon;
  const verdictLabel = result.reviewPending
    ? 'En revisión'
    : result.passed
      ? 'Aprobado'
      : 'No aprobado';
  const heading = result.reviewPending
    ? `Estamos revisando tu quiz, ${firstName}`
    : result.passed
      ? `¡Buen trabajo, ${firstName}!`
      : `Sigue practicando, ${firstName}`;
  const subheading = result.reviewPending
    ? 'Una o más de tus respuestas de texto libre están pendientes de revisión por un instructor. Te avisaremos cuando tengamos tu resultado final.'
    : result.passed
      ? 'Superaste el puntaje mínimo de este quiz. Podés seguir con la próxima lección cuando quieras.'
      : 'No llegaste al puntaje mínimo esta vez. Repasá el contenido de la lección e intentá de nuevo.';

  function goToNextLesson() {
    if (result?.nextLessonId) {
      navigate(`/dashboard/education/curso/${curriculumId}/leccion/${result.nextLessonId}`);
    } else {
      navigate(`/dashboard/education/curso/${curriculumId}`);
    }
  }

  function retryQuiz() {
    navigate(`/dashboard/education/curso/${curriculumId}/leccion/${lessonId}/quiz`);
  }

  if (isMobileApp) {
    return (
      <div className="education-shell">
        {/* Immersive (doc: "lección, quiz y resultado ocultan la tab bar")
            — same hero-is-the-header bleed as CourseDetail's fix. The
            mockup draws no close icon here (only "Repetir quiz"/"Siguiente
            lección" — closing via the system back gesture instead), but a
            failed attempt with no retry left, or one still in review, has
            NEITHER action — that's a real dead end with no way out at all,
            not just a missing nicety, so an explicit close is added
            regardless of what the mockup drew. */}
        <MobileScreen back header={<></>}>
          <div
            className="flex flex-col items-center px-5 pb-6 text-center text-white"
            style={{ background: 'var(--edu-hero)', paddingTop: 'env(safe-area-inset-top)' }}
          >
            {/* Same action-row rhythm as CourseHeroMobile's back/share row
                (full-width, py-3, icon flush left) — a bare icon with no
                row padding read as misaligned against every other
                immersive header in this module. */}
            <div className="flex w-full items-center py-3">
              <button
                type="button"
                onClick={() => navigate(`/dashboard/education/curso/${curriculumId}`)}
                aria-label="Cerrar"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div
              className="relative h-[132px] w-[132px] shrink-0 rounded-full"
              style={{
                background: `conic-gradient(white 0% ${percent}%, rgba(255,255,255,.25) ${percent}% 100%)`,
              }}
            >
              <div
                className="absolute inset-3.5 flex flex-col items-center justify-center rounded-full"
                style={{ background: 'hsl(var(--edu-donut-core))' }}
              >
                <span className="text-[32px] font-normal leading-none">{percent}%</span>
                <span className="mt-1 text-[11px] text-white/75">
                  {result.autoScore} de {result.maxScore} pts
                </span>
              </div>
            </div>
            <span className="mt-[18px] inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1.5 text-[13px] font-medium">
              <VerdictIcon className="h-4 w-4" aria-hidden="true" />
              {verdictLabel}
            </span>
            <h2 className="mt-3 text-[22px] font-normal">{heading}</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-white/85">{subheading}</p>
          </div>

          {result.questions && (
            <div className="px-5 pb-4 pt-[18px]">
              <h3 className="mb-3 text-[15px] font-medium text-foreground">Repaso de respuestas</h3>
              <div className="flex flex-col gap-2.5">
                {result.questions.map(q => {
                  const { icon: Icon, circleClass, answerClass } = VERDICT_CONFIG[q.verdict];
                  const yourAnswer = q.yourOptionText ?? q.yourTextAnswer ?? '—';
                  return (
                    <div
                      key={q.id}
                      className="flex items-start gap-2.5 rounded-[18px] border border-border p-3.5"
                    >
                      <span
                        className={cn(
                          'flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full',
                          circleClass
                        )}
                      >
                        <Icon className="h-[15px] w-[15px]" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium leading-[1.45] text-foreground">
                          {q.prompt}
                        </p>
                        <p className={cn('mt-1 text-xs font-medium', answerClass)}>
                          Tu respuesta: {yourAnswer}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Same 54px primary/secondary pair as every other bottom nav in
              this module (LessonNavFooter/QuizRunner's compact variant,
              CourseHeroMobile's CTA) — one consistent button treatment. */}
          <div className="flex items-center gap-3 px-5 pb-4">
            {result.canRetry && (
              <button
                type="button"
                onClick={retryQuiz}
                aria-label="Repetir quiz"
                className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[18px] border border-outline"
              >
                <RefreshCw className="h-[18px] w-[18px]" aria-hidden="true" />
              </button>
            )}
            {result.passed && (
              <Button
                type="button"
                className="h-[54px] flex-1 gap-2 rounded-[18px] text-[15px]"
                onClick={goToNextLesson}
              >
                Siguiente lección
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Button>
            )}
          </div>
        </MobileScreen>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[900px] flex-col gap-4">
      <button
        type="button"
        onClick={() => navigate(`/dashboard/education/curso/${curriculumId}`)}
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-edu-primary"
      >
        <ArrowLeft className="h-[18px] w-[18px]" aria-hidden="true" />
        Volver al curso
      </button>

      <div className="overflow-hidden rounded-md3-xl">
        <div
          className="flex flex-col gap-6 p-6 text-white sm:flex-row sm:items-center sm:p-[34px]"
          style={{ background: 'var(--edu-hero)' }}
        >
          <div
            className="relative h-[132px] w-[132px] shrink-0 rounded-full"
            style={{
              background: `conic-gradient(white 0% ${percent}%, rgba(255,255,255,.25) ${percent}% 100%)`,
            }}
          >
            <div
              className="absolute inset-3.5 flex flex-col items-center justify-center rounded-full"
              style={{ background: 'hsl(var(--edu-donut-core))' }}
            >
              <span className="text-[34px] font-normal leading-none">{percent}%</span>
              <span className="mt-1 text-[11px] text-white/75">
                {result.autoScore} de {result.maxScore} pts
              </span>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1.5 text-[13px] font-medium">
              <VerdictIcon className="h-4 w-4" aria-hidden="true" />
              {verdictLabel}
            </span>
            <h2 className="mt-3 text-[28px] font-normal">{heading}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-white/85">{subheading}</p>
          </div>
        </div>

        {result.questions && (
          <div className="border-t border-border bg-card px-5 py-[26px] sm:px-8">
            <h3 className="mb-4 text-[17px] font-medium text-foreground">Repaso de respuestas</h3>
            <div className="flex flex-col gap-3">
              {result.questions.map(q => {
                const {
                  icon: Icon,
                  circleClass,
                  chipClass,
                  answerClass,
                } = VERDICT_CONFIG[q.verdict];
                const yourAnswer = q.yourOptionText ?? q.yourTextAnswer ?? '—';
                return (
                  <div
                    key={q.id}
                    className="flex flex-col gap-2.5 rounded-md3-option border border-border p-[18px]"
                  >
                    <div className="flex items-start gap-3.5">
                      <span
                        className={cn(
                          'flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full',
                          circleClass
                        )}
                      >
                        <Icon className="h-[17px] w-[17px]" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-medium text-foreground">{q.prompt}</p>
                        <p className={cn('mt-1 text-sm font-medium', answerClass)}>
                          Tu respuesta: {yourAnswer}
                        </p>
                        {q.verdict === 'incorrect' && q.correctText && (
                          <p className="mt-0.5 text-sm font-medium text-edu-primary">
                            Correcta: {q.correctText}
                          </p>
                        )}
                        {q.feedback && (
                          <div className="mt-2.5 rounded-md3-sm bg-muted px-3.5 py-3 text-[13px] leading-relaxed text-muted-foreground">
                            {q.feedback}
                          </div>
                        )}
                      </div>
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium',
                          chipClass
                        )}
                      >
                        {VERDICT_LABEL[q.verdict]}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div
          className={cn(
            'flex flex-wrap items-center gap-3 border-t border-border bg-card px-5 py-[22px] sm:px-8',
            !result.questions && 'border-t-0'
          )}
        >
          {result.canRetry && (
            <Button type="button" variant="outline" className="gap-2" onClick={retryQuiz}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Repetir quiz
            </Button>
          )}
          {result.passed && (
            <Button type="button" className="gap-2" onClick={goToNextLesson}>
              Siguiente lección
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
