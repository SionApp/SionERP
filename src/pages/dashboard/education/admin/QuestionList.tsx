import { ChevronDown, ChevronUp, GripVertical, PlusCircle } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { cn } from '@/lib/utils';
import type { QuizQuestionType } from '@/types/education.types';
import type { EditableQuestion } from './QuizBuilder';

const TYPE_LABEL: Record<QuizQuestionType, string> = {
  multiple: 'Opción múltiple',
  true_false: 'Verdadero / falso',
  short: 'Respuesta corta',
};

function QuestionRow({
  question,
  index,
  total,
  selected,
  canEdit,
  compactReorder,
  onSelect,
  onMoveUp,
  onMoveDown,
}: {
  question: EditableQuestion;
  index: number;
  total: number;
  selected: boolean;
  canEdit: boolean;
  compactReorder: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.localKey,
    disabled: !canEdit || compactReorder,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && 'opacity-60')}
    >
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'flex w-full items-center gap-2.5 border-l-[3px] px-4 py-3.5 text-left',
          selected
            ? 'border-l-edu-primary bg-edu-surface-alt'
            : 'border-l-transparent hover:bg-muted/40'
        )}
      >
        {canEdit &&
          (compactReorder ? (
            <div
              className="flex shrink-0 flex-col"
              onClick={e => e.stopPropagation()}
              role="group"
              aria-label="Reordenar pregunta"
            >
              <button
                type="button"
                disabled={index === 0}
                onClick={onMoveUp}
                aria-label="Mover pregunta arriba"
                className="text-muted-foreground disabled:opacity-30"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={index === total - 1}
                onClick={onMoveDown}
                aria-label="Mover pregunta abajo"
                className="text-muted-foreground disabled:opacity-30"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <span
              {...attributes}
              {...listeners}
              aria-label="Arrastrar para reordenar"
              className="shrink-0 cursor-grab text-muted-foreground/60 active:cursor-grabbing"
              onClick={e => e.stopPropagation()}
            >
              <GripVertical className="h-[18px] w-[18px]" />
            </span>
          ))}
        <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-edu-surface text-xs font-medium text-edu-primary">
          {index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-foreground">
            {question.prompt.trim() || 'Pregunta sin enunciado'}
          </span>
          <span className="block text-[11px] text-muted-foreground">
            {TYPE_LABEL[question.type]} · {question.points} pts
          </span>
        </span>
      </button>
    </div>
  );
}

/**
 * "Lista de preguntas" card (README §9, tasks-v2-part2 J.3). Selecting a row
 * loads its editor in the right column. Reorder follows `BlockCard`'s exact
 * `@dnd-kit/sortable` pattern (A12): drag handle >=1024px, up/down arrows
 * below that breakpoint — same `compactReorder` prop shape LessonEditor
 * already computes and passes down.
 */
export function QuestionList({
  questions,
  selectedKey,
  canEdit,
  compactReorder,
  onSelect,
  onAdd,
  onMove,
}: {
  questions: EditableQuestion[];
  selectedKey: string | null;
  canEdit: boolean;
  compactReorder: boolean;
  onSelect: (localKey: string) => void;
  onAdd: () => void;
  onMove: (localKey: string, direction: -1 | 1) => void;
}) {
  return (
    <div className="overflow-hidden rounded-md3-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <p className="text-sm font-medium text-foreground">Preguntas</p>
        <span className="text-xs text-muted-foreground">{questions.length}</span>
      </div>

      {questions.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          Este quiz todavía no tiene preguntas.
        </p>
      ) : (
        <div className="divide-y divide-border/60">
          {questions.map((question, index) => (
            <QuestionRow
              key={question.localKey}
              question={question}
              index={index}
              total={questions.length}
              selected={question.localKey === selectedKey}
              canEdit={canEdit}
              compactReorder={compactReorder}
              onSelect={() => onSelect(question.localKey)}
              onMoveUp={() => onMove(question.localKey, -1)}
              onMoveDown={() => onMove(question.localKey, 1)}
            />
          ))}
        </div>
      )}

      {canEdit && (
        <button
          type="button"
          onClick={onAdd}
          className="flex w-full items-center gap-1.5 border-t border-border px-5 py-3.5 text-[13px] font-medium text-edu-primary hover:bg-muted/40"
        >
          <PlusCircle className="h-[18px] w-[18px]" aria-hidden="true" />
          Añadir pregunta
        </button>
      )}
    </div>
  );
}
