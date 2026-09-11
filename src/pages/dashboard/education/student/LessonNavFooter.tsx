import { ArrowLeft, ArrowRight, Eye, FileQuestion } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Design (README §4, "Pie de navegación"): `padding:18px 32px`,
 * `border-top:1px solid` hex E7E0EC (`border-border`), fondo hex FAFAFB
 * (`bg-muted`). Left "Anterior" — disabled on step 1 (`opacity:.5`, text
 * hex A09BA8). Right primary — "Siguiente"; on the last step it becomes "Ir
 * al mini quiz" when the lesson has a quiz, else "Siguiente lección"
 * (reusing the exact copy the design's own result screen uses for
 * "advance in temario" — the design doc never spells out a no-quiz
 * last-step label directly, so this borrows its sibling screen's
 * established term rather than inventing a new one). Center helper text
 * per spec: "Tu progreso se guarda en cada paso" / on the last step "Al
 * terminar se guarda tu progreso automáticamente".
 */
export function LessonNavFooter({
  onPrev,
  onNext,
  disablePrev,
  isLastStep,
  hasQuiz,
  quizSubmitted,
  nextPending,
  compact = false,
}: {
  onPrev: () => void;
  onNext: () => void;
  disablePrev: boolean;
  isLastStep: boolean;
  hasQuiz: boolean;
  /** The caller already has a submitted attempt on this quiz (resuelto or en
   * revisión) — relabels the primary action so it reads as "go see it",
   * never as "take the quiz again" (retrying is blocked server-side anyway). */
  quizSubmitted?: boolean;
  nextPending?: boolean;
  /** Mobile handoff, "Barra de navegación inferior (lección, quiz,
   * resultado)": secondary becomes a 54×54px icon-only square, primary
   * becomes flex:1 at the same 54px height with an 18px radius and a
   * colored shadow — this is the SAME primary/secondary pair QuizRunner's
   * own mobile bottom bar already uses, so both screens read as one
   * consistent pattern rather than two different button treatments. The
   * desktop helper text ("Tu progreso se guarda...") is dropped: "no hay
   * espacio y el autoguardado es silencioso". */
  compact?: boolean;
}) {
  const primaryLabel = !isLastStep
    ? 'Siguiente'
    : !hasQuiz
      ? 'Siguiente lección'
      : quizSubmitted
        ? 'Ver mi resultado'
        : 'Ir al mini quiz';
  const PrimaryIcon = !isLastStep || !hasQuiz ? ArrowRight : quizSubmitted ? Eye : FileQuestion;

  if (compact) {
    return (
      <div className="flex items-center gap-3 border-t border-border bg-muted px-5 py-3">
        <button
          type="button"
          onClick={onPrev}
          disabled={disablePrev}
          aria-label="Anterior"
          className={cn(
            'flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[18px] border',
            disablePrev ? 'border-outline text-outline opacity-50' : 'border-outline'
          )}
        >
          <ArrowLeft className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
        <Button
          type="button"
          onClick={onNext}
          disabled={nextPending}
          className="h-[54px] flex-1 gap-2 rounded-[18px] shadow-[0_2px_8px_rgba(31,107,76,.35)]"
        >
          {primaryLabel}
          <PrimaryIcon className="h-5 w-5" aria-hidden="true" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted px-5 py-4 sm:px-8">
      <button
        type="button"
        onClick={onPrev}
        disabled={disablePrev}
        className={cn(
          'flex min-h-11 items-center gap-2 rounded-md3 border border-outline px-[22px] py-[13px] text-sm font-medium text-foreground',
          disablePrev ? 'cursor-not-allowed text-outline opacity-50' : 'hover:bg-background'
        )}
      >
        <ArrowLeft className="h-[18px] w-[18px]" aria-hidden="true" />
        Anterior
      </button>

      <p className="order-3 w-full text-center text-[13px] text-muted-foreground sm:order-none sm:w-auto">
        {isLastStep
          ? 'Al terminar se guarda tu progreso automáticamente'
          : 'Tu progreso se guarda en cada paso'}
      </p>

      <Button
        type="button"
        onClick={onNext}
        disabled={nextPending}
        className="min-h-11 gap-2 rounded-md3 px-[22px] py-[13px]"
      >
        {primaryLabel}
        <PrimaryIcon className="h-[18px] w-[18px]" aria-hidden="true" />
      </Button>
    </div>
  );
}
