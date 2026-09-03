import { ArrowLeft, ArrowRight, FileQuestion } from 'lucide-react';

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
  nextPending,
}: {
  onPrev: () => void;
  onNext: () => void;
  disablePrev: boolean;
  isLastStep: boolean;
  hasQuiz: boolean;
  nextPending?: boolean;
}) {
  const primaryLabel = !isLastStep
    ? 'Siguiente'
    : hasQuiz
      ? 'Ir al mini quiz'
      : 'Siguiente lección';
  const PrimaryIcon = !isLastStep || !hasQuiz ? ArrowRight : FileQuestion;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted px-5 py-4 sm:px-8">
      <button
        type="button"
        onClick={onPrev}
        disabled={disablePrev}
        className={cn(
          'flex min-h-11 items-center gap-2 rounded-md3 border border-muted-foreground px-[22px] py-[13px] text-sm font-medium text-foreground',
          disablePrev
            ? 'cursor-not-allowed text-muted-foreground opacity-50'
            : 'hover:bg-background'
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
