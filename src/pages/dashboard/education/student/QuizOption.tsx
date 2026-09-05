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
  compact = false,
}: {
  option: QuizRunnerOption;
  index: number;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  /** Mobile handoff, screen 5: `min-height:60px` (explicit touch target,
   * not left to padding+content alone), 26px letter circle, 15px/1.4 text —
   * "padding:15px 16px". */
  compact?: boolean;
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
        'flex w-full items-center rounded-md3-option border-2 text-left transition-colors',
        compact ? 'min-h-[60px] gap-3 px-4 py-[15px]' : 'gap-3.5 px-5 py-[18px]',
        selected
          ? 'border-edu-primary bg-edu-surface-alt'
          : 'border-border bg-card hover:bg-edu-surface/60'
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full border-2 font-medium',
          compact ? 'h-[26px] w-[26px] text-xs' : 'h-7 w-7 text-sm',
          selected ? 'border-edu-primary bg-edu-primary text-white' : 'border-outline text-outline'
        )}
      >
        {letter}
      </span>
      <span
        className={
          compact ? 'text-[15px] leading-[1.4] text-foreground' : 'text-base text-foreground'
        }
      >
        {option.text}
      </span>
    </button>
  );
}
