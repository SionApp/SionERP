import type { Editor } from '@tiptap/react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronUp, Copy, GripVertical, Trash2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { EducationConfirmDialog } from '../ui';
import { narrowEducationBlock } from '../blocks/block.types';
import type { AnyEducationBlock } from '../blocks/block.types';
import type { EducationBlock } from '@/types/education.types';
import { BLOCK_TYPE_META } from './InsertBar';
import { BlockCardBody } from './BlockCardBody';

/**
 * Design (README §8, "4. Lista de bloques"): card `border:1.5px solid`,
 * `border-radius:16px`; header `drag_indicator` + type icon/name +
 * `content_copy`/`delete_outline` (`more_vert` shown in the mockup has no
 * described action anywhere in the doc's own "Editor — bloques" interaction
 * list — "reordenable ... duplicable y eliminable desde su cabecera", only
 * 3 actions total — so it's omitted here rather than rendered as a dead
 * menu button, same posture as EditorToolbar's omitted "Historial").
 * Selected: border hex 1F6B4C (`edu-primary`). Versículo/callout get tonal
 * border+bg (`edu-container`/`edu-surface-alt`, `edu-orange-container`/
 * itself at low opacity — hex FEF6F3 has no exact existing token, filled the
 * same way CalloutBlock's own `info` variant already resolved a missing
 * token: reuse, don't invent raw hex).
 *
 * Reorder: `@dnd-kit/sortable`'s `useSortable` when `canEdit` and NOT
 * `compactReorder` (>=1024px); below that, up/down arrow buttons — tasks-v2-
 * part2 I.3. BOTH paths only ever reorder the LOCAL `blocks` array; there is
 * no dedicated block-reorder endpoint (only `education_lesson_steps.blocks`
 * as a whole, written by `UpdateStep`) — so both paths write through the
 * exact SAME per-step autosave (`LessonEditor`'s `useAutosave`) that every
 * other block edit already goes through. I.3's task text cites PR-B's
 * `PUT .../steps/reorder`, but that endpoint reorders STEPS
 * (`education_lesson_steps.order_index`), not blocks within one step's JSON
 * array — verified against `handlers/education_steps.go`'s `ReorderSteps`
 * before writing this, not guessed. `StepSelector.tsx` already owns that
 * endpoint for step-level reorder; block-level reorder here is correctly a
 * plain field write, "the same reorder mutation" in the sense of being the
 * same UNIFIED write path (autosave → UpdateStep), not the same HTTP route.
 */
export function BlockCard({
  block,
  selected,
  canEdit,
  compactReorder,
  index,
  total,
  curriculumId,
  onSelect,
  onChange,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onFocusEditor,
  onBlurEditor,
}: {
  block: EducationBlock;
  selected: boolean;
  canEdit: boolean;
  compactReorder: boolean;
  index: number;
  total: number;
  curriculumId: string;
  onSelect: () => void;
  onChange: (data: unknown) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onFocusEditor?: (editor: Editor) => void;
  onBlurEditor?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
    disabled: !canEdit || compactReorder,
  });

  const narrowed = narrowEducationBlock(block);
  const meta = narrowed ? BLOCK_TYPE_META[narrowed.type] : null;
  const tone = narrowed ? toneClasses(narrowed.type, selected) : null;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={onSelect}
      className={cn(
        'overflow-hidden rounded-md3 border-[1.5px] bg-card transition-colors',
        selected ? 'border-edu-primary' : 'border-border',
        tone,
        isDragging && 'opacity-60'
      )}
    >
      <div className="flex items-center gap-2 border-b border-border/70 bg-muted/30 px-3 py-[9px]">
        {canEdit &&
          (compactReorder ? (
            <div className="flex flex-col" onClick={e => e.stopPropagation()}>
              <button
                type="button"
                disabled={index === 0}
                onClick={onMoveUp}
                aria-label="Mover bloque arriba"
                className="text-muted-foreground disabled:opacity-30"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={index === total - 1}
                onClick={onMoveDown}
                aria-label="Mover bloque abajo"
                className="text-muted-foreground disabled:opacity-30"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              {...attributes}
              {...listeners}
              aria-label="Arrastrar para reordenar"
              className="cursor-grab text-muted-foreground/60 active:cursor-grabbing"
              onClick={e => e.stopPropagation()}
            >
              <GripVertical className="h-[18px] w-[18px]" />
            </button>
          ))}
        {meta && (
          <meta.icon className="h-[17px] w-[17px] shrink-0 text-edu-primary" aria-hidden="true" />
        )}
        <span className="flex-1 truncate text-xs font-medium text-muted-foreground">
          {meta?.label ?? 'Bloque'}
        </span>
        {canEdit && (
          <div className="flex shrink-0 items-center gap-0.5" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={onDuplicate}
              aria-label="Duplicar bloque"
              className="flex h-7 w-7 items-center justify-center rounded-md3-sm text-muted-foreground hover:bg-muted"
            >
              <Copy className="h-[17px] w-[17px]" />
            </button>
            <EducationConfirmDialog
              trigger={
                <button
                  type="button"
                  aria-label="Eliminar bloque"
                  className="flex h-7 w-7 items-center justify-center rounded-md3-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-[17px] w-[17px]" />
                </button>
              }
              title="¿Eliminar bloque?"
              description="Esta acción no se puede deshacer."
              confirmLabel="Eliminar"
              onConfirm={onDelete}
            />
          </div>
        )}
      </div>

      <div className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
        {narrowed ? (
          <BlockCardBody
            block={narrowed}
            canEdit={canEdit}
            curriculumId={curriculumId}
            onChange={onChange}
            onFocusEditor={onFocusEditor}
            onBlurEditor={onBlurEditor}
          />
        ) : (
          <p className="text-xs text-muted-foreground">
            Este bloque tiene un formato no reconocido. Podés eliminarlo desde la cabecera.
          </p>
        )}
      </div>
    </div>
  );
}

function toneClasses(type: AnyEducationBlock['type'], selected: boolean): string | null {
  if (selected) return null;
  if (type === 'quote') return 'border-edu-container bg-edu-surface-alt/60';
  if (type === 'callout') return 'border-edu-orange-container bg-edu-orange-container/10';
  return null;
}
