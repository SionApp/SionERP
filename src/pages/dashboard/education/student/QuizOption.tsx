import { cn } from '@/lib/utils';
import type { QuizRunnerOption } from '@/types/education.types';

/**
 * Design (README §5, "Alumno · Quiz" — Opciones table): 28px letter circle
 * (A/B/C/D) + Roboto 400 16px text, `padding:18px 20px`,
 * `border-radius:18px` (`md3-option`), `border:2px solid`.
 *
 * ONLY the first two rows of the design's 4-row state table apply here —
 * "Sin seleccionar" and "Seleccionada (sin revelar)". The other two rows
 * (the revealed/right-vs-wrong pair) describe an immediate-feedback mode the
 * REAL backend never implements: PR-F's pre-submit endpoints structurally
 * cannot return whether an option is right — `QuizRunnerOption`
 * (models/education_quiz_runner.go, mirrored 1:1 by the TS type of the same
 * name) has no such field. This component's own prop type inherits that
 * same guarantee: there is no correctness-flag prop to accidentally wire
 * up, by construction, not by discipline — mirroring PR-F's leak-boundary
 * tests one layer up the stack (see `__tests__/quiz-option.test.tsx`, which
 * greps this file's own raw source the same way PR-F's
 * `TestQuizRunnerModelDeclaresNoAnswerKey` greps the Go model — deliberately
 * paraphrased above instead of spelling the banned identifiers out, the
 * same fix PR-F's own session had to make twice to its model file's header
 * comment for the identical reason).
 */
const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function QuizOption({
  option,
  index,
  selected,
  disabled,
  onSelect,
}: {
  option: QuizRunnerOption;
  index: number;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const letter = OPTION_LETTERS[index] ?? String(index + 1);

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3.5 rounded-md3-option border-2 px-5 py-[18px] text-left transition-colors',
        selected
          ? 'border-edu-primary bg-edu-surface-alt'
          : 'border-border bg-card hover:bg-edu-surface/60'
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium',
          selected ? 'border-edu-primary bg-edu-primary text-white' : 'border-outline text-outline'
        )}
      >
        {letter}
      </span>
      <span className="text-base text-foreground">{option.text}</span>
    </button>
  );
}
