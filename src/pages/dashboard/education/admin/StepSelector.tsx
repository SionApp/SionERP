import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { EducationConfirmDialog } from '../ui';
import type { EducationStep } from '@/types/education.types';

/**
 * Design (README §8, "3. Selector de paso"): "PASO" label + numbered pills +
 * a dashed circular "add" button. tasks-v2-part2 I.6: "the author-side
 * step-list/reorder/add/delete UI" — reorder here is a move-left/move-right
 * pair on the ACTIVE pill only (the pill row is a single horizontal strip,
 * not a droppable list — `@dnd-kit` reorder is reserved for blocks within a
 * step, per I.3/A12), wired to the same `ReorderSteps` bulk endpoint.
 */
export function StepSelector({
  steps,
  activeStepId,
  onSelect,
  onAdd,
  onRename,
  onDelete,
  onMoveLeft,
  onMoveRight,
  canEdit,
}: {
  steps: EducationStep[];
  activeStepId: string | null;
  onSelect: (stepId: string) => void;
  onAdd: () => void;
  onRename: (stepId: string, label: string) => void;
  onDelete: (stepId: string) => void;
  onMoveLeft: (stepId: string) => void;
  onMoveRight: (stepId: string) => void;
  canEdit: boolean;
}) {
  const activeIndex = steps.findIndex(s => s.id === activeStepId);

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-3.5 py-3">
      <span className="shrink-0 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        Paso
      </span>
      {steps.map((step, index) => {
        const isActive = step.id === activeStepId;
        return (
          <div key={step.id} className="flex items-center gap-0.5">
            {isActive && canEdit && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                disabled={index === 0}
                onClick={() => onMoveLeft(step.id)}
                aria-label="Mover paso a la izquierda"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
            )}
            <button
              type="button"
              onClick={() => onSelect(step.id)}
              onDoubleClick={() => {
                if (!canEdit) return;

                const next = window.prompt('Nombre del paso', step.label);
                if (next && next.trim()) onRename(step.id, next.trim());
              }}
              title={canEdit ? 'Doble click para renombrar' : step.label}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium',
                isActive
                  ? 'bg-edu-primary text-white'
                  : 'border border-border text-foreground hover:bg-muted'
              )}
            >
              {index + 1}. {step.label}
            </button>
            {isActive && canEdit && steps.length > 1 && (
              <EducationConfirmDialog
                trigger={
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    aria-label="Eliminar paso"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                }
                title="¿Eliminar paso?"
                description={`Se elimina "${step.label}" y todos sus bloques. No se puede deshacer.`}
                confirmLabel="Eliminar paso"
                onConfirm={() => onDelete(step.id)}
              />
            )}
            {isActive && canEdit && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                disabled={index === steps.length - 1}
                onClick={() => onMoveRight(step.id)}
                aria-label="Mover paso a la derecha"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        );
      })}
      {canEdit && (
        <button
          type="button"
          onClick={onAdd}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-muted-foreground/50 text-muted-foreground hover:bg-muted"
          aria-label="Añadir paso"
        >
          <Plus className="h-4 w-4" />
        </button>
      )}
      {activeIndex === -1 && steps.length === 0 && (
        <span className="text-xs text-muted-foreground">Esta lección todavía no tiene pasos.</span>
      )}
    </div>
  );
}
