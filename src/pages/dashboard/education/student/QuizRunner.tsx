import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  CircleDot,
  Info,
  ListChecks,
  PenLine,
  Send,
  Timer,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { EducationService } from '@/services/education.service';
import type { QuizQuestionType } from '@/types/education.types';
import { useCourseDetail } from '../hooks/use-education-queries';
import { QuizOption } from './QuizOption';

/**
 * Design (README §5, "Alumno · Quiz"). Max width 900px, centered. One
 * question at a time (same product decision as the lesson viewer — no long
 * scroll). Per-question progress bars + a timer pill (ONLY when the quiz has
 * `timeLimitMinutes`, counting down from the REAL server `expiresAt`, never
 * a client-computed `now + limit`).
 *
 * `StartAttempt` is called unconditionally on mount — it is backend-
 * idempotent (design/PR-F: reuses the caller's existing OPEN attempt if one
 * exists), so this doubles as both "begin" and "resume after refresh" with
 * one code path. Answers stay changeable until submit: `SaveAnswer` fires on
 * every option select and on text-answer blur (not per keystroke), and
 * nothing in this screen renders a correct/incorrect state — the runner
 * response structurally cannot carry one (see `QuizOption`'s own header
 * comment).
 */

const TYPE_CONFIG: Record<QuizQuestionType, { icon: LucideIcon; label: string }> = {
  multiple: { icon: CircleDot, label: 'Opción múltiple' },
  true_false: { icon: ListChecks, label: 'Verdadero o falso' },
  short: { icon: PenLine, label: 'Respuesta corta' },
};

function formatCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function QuizRunner() {
  const { curriculumId, lessonId } = useParams<{ curriculumId: string; lessonId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { syllabus } = useCourseDetail(curriculumId);
  const lessonMeta = useMemo(
    () => syllabus.flatMap(m => m.lessons).find(l => l.id === lessonId) ?? null,
    [syllabus, lessonId]
  );

  const {
    data: runner,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['quiz-runner-start', lessonId],
    queryFn: () => EducationService.startQuizAttempt(lessonId as string),
    enabled: !!lessonId,
    staleTime: 0,
    retry: false,
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
  const seededRef = useRef(false);
  const autoSubmittedRef = useRef(false);

  useEffect(() => {
    if (!runner || seededRef.current) return;
    const sel: Record<string, string> = {};
    const txt: Record<string, string> = {};
    for (const q of runner.questions) {
      if (q.selectedOptionId) sel[q.id] = q.selectedOptionId;
      if (q.textAnswer) txt[q.id] = q.textAnswer;
    }
    setSelected(sel);
    setTextAnswers(txt);
    seededRef.current = true;
  }, [runner]);

  const saveMutation = useMutation({
    mutationFn: (payload: { questionId: string; selectedOptionId?: string; textAnswer?: string }) =>
      EducationService.saveQuizAnswer(lessonId as string, runner?.attemptId as string, payload),
    onError: () => toast.error('No se pudo guardar tu respuesta'),
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      EducationService.submitQuizAttempt(lessonId as string, runner?.attemptId as string),
    onSuccess: result => {
      qc.invalidateQueries({ queryKey: ['education-syllabus', curriculumId] });
      qc.invalidateQueries({ queryKey: ['education-home'] });
      qc.invalidateQueries({ queryKey: ['education-pending-reviews'] });
      navigate(
        `/dashboard/education/curso/${curriculumId}/leccion/${lessonId}/resultado/${result.attemptId}`,
        { state: { result } }
      );
    },
    onError: () => toast.error('No se pudo enviar el quiz'),
  });

  // Countdown from the real server `expiresAt` — recomputed every second
  // from wall-clock time, never a client-seeded duration (design A13:
  // "advisory-with-grace", the server is the only source of truth for
  // grading; this pill is purely informational).
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  useEffect(() => {
    if (!runner?.expiresAt) {
      setRemainingSeconds(null);
      return;
    }
    const expiresAtMs = new Date(runner.expiresAt).getTime();
    const tick = () => setRemainingSeconds(Math.round((expiresAtMs - Date.now()) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [runner?.expiresAt]);

  useEffect(() => {
    if (
      remainingSeconds !== null &&
      remainingSeconds <= 0 &&
      !autoSubmittedRef.current &&
      !submitMutation.isPending
    ) {
      autoSubmittedRef.current = true;
      toast.info('Se acabó el tiempo. Enviando tus respuestas…');
      submitMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSeconds]);

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-[900px] flex-col gap-5">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-[420px] w-full rounded-md3-xl" />
      </div>
    );
  }

  if (isError || !runner) {
    return (
      <div className="mx-auto flex max-w-[900px] flex-col items-center gap-3 rounded-md3-lg border border-destructive/30 bg-destructive/5 py-12 text-center">
        <p className="text-sm font-medium text-destructive">No se pudo cargar el quiz.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const questions = runner.questions;
  if (questions.length === 0) {
    return (
      <div className="mx-auto flex max-w-[900px] flex-col items-center gap-2 rounded-md3-lg border border-border bg-card py-16 text-center">
        <p className="text-sm text-muted-foreground">Este quiz todavía no tiene preguntas.</p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === questions.length - 1;
  const hasAnswer = (questionId: string) =>
    !!selected[questionId] || !!textAnswers[questionId]?.trim();
  const { icon: TypeIcon, label: typeLabel } = TYPE_CONFIG[currentQuestion.type];

  function goTo(index: number) {
    setCurrentIndex(Math.max(0, Math.min(questions.length - 1, index)));
  }

  function flushCurrentTextAnswer(): Promise<unknown> {
    if (currentQuestion.type !== 'short') return Promise.resolve();
    const value = textAnswers[currentQuestion.id]?.trim();
    if (!value) return Promise.resolve();
    return saveMutation.mutateAsync({ questionId: currentQuestion.id, textAnswer: value });
  }

  async function handleNext() {
    await flushCurrentTextAnswer();
    if (isLast) {
      submitMutation.mutate();
      return;
    }
    goTo(currentIndex + 1);
  }

  return (
    <div className="mx-auto flex max-w-[900px] flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(`/dashboard/education/curso/${curriculumId}/leccion/${lessonId}`)}
          className="flex min-h-11 items-center gap-1.5 text-sm font-medium text-edu-primary"
        >
          <ArrowLeft className="h-[18px] w-[18px]" aria-hidden="true" />
          Volver a la lección
        </button>
        {runner.timeLimitMinutes !== null && remainingSeconds !== null && (
          <span className="flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-muted px-3.5 text-xs font-medium text-foreground">
            <Timer className="h-4 w-4" aria-hidden="true" />
            {formatCountdown(remainingSeconds)} restantes
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-md3-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-[22px] sm:px-8">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-normal uppercase tracking-[0.07em] text-edu-text">
              Mini quiz{lessonMeta ? ` · Lección ${lessonMeta.orderIndex}` : ''}
            </span>
            <div className="text-right">
              <span className="text-xl font-medium text-foreground">
                {currentIndex + 1}/{questions.length}
              </span>
              <span className="ml-1.5 text-xs text-muted-foreground">preguntas</span>
            </div>
          </div>
          {lessonMeta && (
            <h2 className="mt-1 text-2xl font-normal text-foreground">{lessonMeta.title}</h2>
          )}
          <div className="mt-4 flex gap-1.5" role="presentation">
            {questions.map((q, i) => (
              <span
                key={q.id}
                aria-hidden="true"
                className={cn(
                  'h-1.5 flex-1 rounded-full',
                  hasAnswer(q.id)
                    ? 'bg-edu-primary'
                    : i === currentIndex
                      ? 'bg-edu-progress-mid'
                      : 'bg-edu-track'
                )}
              />
            ))}
          </div>
        </div>

        <div className="px-5 py-[30px] sm:px-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-edu-surface px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.05em] text-edu-text">
            <TypeIcon className="h-[15px] w-[15px]" aria-hidden="true" />
            {typeLabel}
          </span>
          <p className="mt-4 text-[1.375em] font-normal leading-[1.45] text-foreground">
            {currentQuestion.prompt}
          </p>

          {currentQuestion.type === 'short' ? (
            <div className="mt-6">
              <Textarea
                value={textAnswers[currentQuestion.id] ?? ''}
                onChange={e =>
                  setTextAnswers(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))
                }
                onBlur={() => {
                  const value = textAnswers[currentQuestion.id]?.trim();
                  if (value) {
                    saveMutation.mutate({ questionId: currentQuestion.id, textAnswer: value });
                  }
                }}
                placeholder="Escribe tu respuesta con tus propias palabras…"
                className="min-h-[130px] resize-none rounded-md3-lg border-border bg-muted text-base"
              />
              <p className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
                Un instructor revisará esta respuesta manualmente.
              </p>
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-3" role="radiogroup">
              {currentQuestion.options.map((option, i) => (
                <QuizOption
                  key={option.id}
                  option={option}
                  index={i}
                  selected={selected[currentQuestion.id] === option.id}
                  onSelect={() => {
                    setSelected(prev => ({ ...prev, [currentQuestion.id]: option.id }));
                    saveMutation.mutate({
                      questionId: currentQuestion.id,
                      selectedOptionId: option.id,
                    });
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted px-5 py-4 sm:px-8">
          <button
            type="button"
            onClick={() => goTo(currentIndex - 1)}
            disabled={isFirst}
            className={cn(
              'flex min-h-11 items-center gap-2 rounded-md3 border border-outline px-[22px] py-[13px] text-sm font-medium text-foreground',
              isFirst ? 'cursor-not-allowed text-outline opacity-50' : 'hover:bg-background'
            )}
          >
            <ArrowLeft className="h-[18px] w-[18px]" aria-hidden="true" />
            Anterior
          </button>

          <p className="order-3 w-full text-center text-[13px] text-muted-foreground sm:order-none sm:w-auto">
            {currentQuestion.type === 'short'
              ? 'Un instructor revisará esta pregunta'
              : 'Puedes cambiar tu respuesta antes de enviar'}
          </p>

          <Button
            type="button"
            onClick={handleNext}
            disabled={submitMutation.isPending}
            className="min-h-11 gap-2 rounded-md3 px-[22px] py-[13px]"
          >
            {isLast ? 'Enviar respuestas' : 'Siguiente'}
            {isLast ? (
              <Send className="h-[18px] w-[18px]" aria-hidden="true" />
            ) : (
              <ArrowRight className="h-[18px] w-[18px]" aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
