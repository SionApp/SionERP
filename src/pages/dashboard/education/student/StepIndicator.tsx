import { cn } from '@/lib/utils';
import type { EducationStep } from '@/types/education.types';

/**
 * Design (README §4, "Indicador de pasos"): `flex; gap:6px`, each step
 * `flex:1` and clickable — 6px bar (`border-radius:9999px`; hex 1F6B4C once
 * reached, hex E9EEEB if not) with a label below (`margin-top:7px`; active
 * Roboto 500 12px hex 1F6B4C, rest 400 12px hex 79747E).
 *
 * Spec (education-lesson-consumption, "Cannot skip forward"): clicking a
 * step NOT in `visitedStepIds` is a no-op — inert, not visually disabled
 * (the bar/label render identically to an unreached-but-clickable step; the
 * ONLY behavioral difference is whether the click does anything). Each step
 * is a real `<button>` sized to the ≥44px mobile touch-target floor even
 * though the visible bar is 6px tall.
 */
export function StepIndicator({
  steps,
  currentStepId,
  visitedStepIds,
  onStepClick,
  compact = false,
}: {
  steps: EducationStep[];
  currentStepId: string;
  visitedStepIds: string[];
  onStepClick: (stepId: string) => void;
  /** Mobile handoff, screen 4: bars only, no per-step label — "no caben
   * cuatro nombres en 350px"; the current step's name moves to an eyebrow
   * above the content instead. */
  compact?: boolean;
}) {
  const visited = new Set(visitedStepIds);

  return (
    <div className="flex gap-1.5" role="tablist" aria-label="Pasos de la lección">
      {steps.map(step => {
        const isReached = visited.has(step.id) || step.id === currentStepId;
        const isCurrent = step.id === currentStepId;
        const canJump = visited.has(step.id);

        return (
          <button
            key={step.id}
            type="button"
            role="tab"
            aria-selected={isCurrent}
            aria-disabled={!canJump}
            onClick={() => {
              if (canJump) onStepClick(step.id);
            }}
            className={cn(
              'flex min-h-11 flex-1 flex-col items-stretch justify-center gap-[7px] py-1.5',
              canJump ? 'cursor-pointer' : 'cursor-default'
            )}
          >
            <span
              className={cn(
                'edu-step-fill rounded-full',
                compact ? 'h-[5px]' : 'h-1.5',
                'w-full',
                isReached ? 'bg-edu-primary' : 'bg-edu-track'
              )}
              aria-hidden="true"
            />
            {!compact && (
              <span
                className={cn(
                  'truncate text-center text-xs',
                  isCurrent ? 'font-medium text-edu-primary' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
