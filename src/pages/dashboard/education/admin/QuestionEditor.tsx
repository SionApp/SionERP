import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { closestCenter, DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Circle, CircleDot, GripVertical, Plus, Trash2, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  EducationConfirmDialog,
  EducationSelect,
  EducationSelectContent,
  EducationSelectItem,
  EducationSelectTrigger,
  EducationSelectValue,
} from '../ui';
import type { QuizQuestionType } from '@/types/education.types';
import type { EditableOption, EditableQuestion } from './QuizBuilder';

const TYPE_OPTIONS: { value: QuizQuestionType; label: string }[] = [
  { value: 'multiple', label: 'Opción múltiple' },
  { value: 'true_false', label: 'Verdadero / falso' },
  { value: 'short', label: 'Respuesta corta' },
];

function OptionRow({
  option,
  canEdit,
  canRemove,
  onSelectCorrect,
  onTextChange,
  onRemove,
}: {
  option: EditableOption;
  canEdit: boolean;
  canRemove: boolean;
  onSelectCorrect: () => void;
  onTextChange: (text: string) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: option.localKey,
    disabled: !canEdit,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-2.5 rounded-md3-option border-[1.5px] px-4 py-[13px]',
        option.isCorrect ? 'border-edu-primary bg-edu-surface-alt' : 'border-border bg-card',
        isDragging && 'opacity-60'
      )}
    >
      {canEdit && (
        <span
          {...attributes}
          {...listeners}
          aria-label="Arrastrar para reordenar opción"
          className="shrink-0 cursor-grab text-muted-foreground/50 active:cursor-grabbing"
        >
          <GripVertical className="h-[18px] w-[18px]" />
        </span>
      )}
      <button
        type="button"
        onClick={onSelectCorrect}
        disabled={!canEdit}
        aria-label={option.isCorrect ? 'Opción correcta' : 'Marcar como correcta'}
        className="shrink-0"
      >
        {option.isCorrect ? (
          <CircleDot className="h-[21px] w-[21px] text-edu-primary" />
        ) : (
          <Circle className="h-[21px] w-[21px] text-muted-foreground/60" />
        )}
      </button>
      <Input
        value={option.text}
        disabled={!canEdit}
        onChange={e => onTextChange(e.target.value)}
        placeholder="Texto de la opción"
        className="h-auto flex-1 border-0 bg-transparent p-0 text-[15px] shadow-none focus-visible:ring-0"
      />
      {option.isCorrect && (
        <span className="shrink-0 rounded-full bg-edu-container px-2 py-0.5 text-[10px] font-medium text-on-edu-container">
          CORRECTA
        </span>
      )}
      {canEdit && canRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Quitar opción"
          className="shrink-0 text-muted-foreground hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/**
 * Right-column question editor (README §9, tasks-v2-part2 J.2). The
 * ENUNCIADO field is a plain `Textarea`, not TipTap with a mini-toolbar —
 * the mockup shows bold/italic/underline/link/image buttons, but
 * `education_quiz_questions.prompt` is a plain `text` column server-side
 * (not PMDoc jsonb like a lesson block), so a rich mini-toolbar would write
 * markup the backend can't store. Flagged deviation, same posture as I.6's
 * omitted "Historial" button.
 *
 * `short` hides the OPTIONS section entirely (not just visually) — the
 * caller (`QuizBuilder`) is responsible for never sending a non-empty
 * `options` array for a `short` question, matching `UpsertQuiz`'s rejection
 * rule verbatim.
 */
export function QuestionEditor({
  question,
  index,
  shuffleOptions,
  canEdit,
  onChange,
  onDelete,
}: {
  question: EditableQuestion;
  index: number;
  shuffleOptions: boolean;
  canEdit: boolean;
  onChange: (next: EditableQuestion) => void;
  onDelete: () => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function patch(partial: Partial<EditableQuestion>) {
    onChange({ ...question, ...partial });
  }

  function setType(type: QuizQuestionType) {
    // Switching TO `short` clears options entirely (server rejects a
    // non-empty array on a short question) — switching AWAY from `short`
    // starts with two empty options, mirroring `UpsertQuiz`'s own
    // "at least 2 options" minimum for multiple/true_false.
    if (type === 'short') {
      patch({ type, options: [] });
      return;
    }
    if (question.type === 'short') {
      patch({
        type,
        options: [
          { localKey: crypto.randomUUID(), id: '', orderIndex: 1, text: '', isCorrect: false },
          { localKey: crypto.randomUUID(), id: '', orderIndex: 2, text: '', isCorrect: false },
        ],
      });
      return;
    }
    patch({ type });
  }

  function markCorrect(localKey: string) {
    // Marking one option correct unmarks every sibling in the SAME write —
    // mirrors `uq_education_quiz_options_correct` (PR-F.1's partial unique
    // index) and `UpsertOptions`'s own two-step clear-then-set order.
    patch({
      options: question.options.map(o => ({ ...o, isCorrect: o.localKey === localKey })),
    });
  }

  function updateOptionText(localKey: string, text: string) {
    patch({ options: question.options.map(o => (o.localKey === localKey ? { ...o, text } : o)) });
  }

  function addOption() {
    patch({
      options: [
        ...question.options,
        {
          localKey: crypto.randomUUID(),
          id: '',
          orderIndex: question.options.length + 1,
          text: '',
          isCorrect: false,
        },
      ],
    });
  }

  function removeOption(localKey: string) {
    patch({ options: question.options.filter(o => o.localKey !== localKey) });
  }

  function handleOptionDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = question.options.findIndex(o => o.localKey === active.id);
    const newIndex = question.options.findIndex(o => o.localKey === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    patch({ options: arrayMove(question.options, oldIndex, newIndex) });
  }

  const deleteDescription =
    question.answerCount > 0
      ? `Esta pregunta ya tiene ${question.answerCount} respuesta${question.answerCount === 1 ? '' : 's'} de alumnos. Si la eliminás, esas respuestas se pierden junto con cualquier otro cambio pendiente en este quiz. Esta acción no se puede deshacer.`
      : 'Esta acción no se puede deshacer.';

  return (
    <div className="flex flex-col gap-4 rounded-md3-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-base font-medium text-foreground">Pregunta {index + 1}</p>

        <EducationSelect
          value={question.type}
          disabled={!canEdit}
          onValueChange={v => setType(v as QuizQuestionType)}
        >
          <EducationSelectTrigger className="h-8 w-auto gap-1.5 rounded-full border-border px-3 text-xs">
            <EducationSelectValue />
          </EducationSelectTrigger>
          <EducationSelectContent>
            {TYPE_OPTIONS.map(opt => (
              <EducationSelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </EducationSelectItem>
            ))}
          </EducationSelectContent>
        </EducationSelect>

        <div className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-foreground">
          Puntos:
          <Input
            type="number"
            min={1}
            value={question.points}
            disabled={!canEdit}
            onChange={e => {
              const n = Number(e.target.value);
              if (Number.isNaN(n) || n <= 0) return;
              patch({ points: n });
            }}
            className="h-5 w-9 border-0 p-0 text-right text-xs shadow-none focus-visible:ring-0"
            aria-label="Puntos de la pregunta"
          />
        </div>

        {canEdit && (
          <EducationConfirmDialog
            trigger={
              <button
                type="button"
                aria-label="Eliminar pregunta"
                className="ml-auto flex h-8 w-8 items-center justify-center rounded-md3-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-[18px] w-[18px]" />
              </button>
            }
            title="¿Eliminar esta pregunta?"
            description={deleteDescription}
            confirmLabel={question.answerCount > 0 ? 'Eliminar de todos modos' : 'Eliminar'}
            onConfirm={onDelete}
          />
        )}
      </div>

      <div>
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          Enunciado
        </p>
        <Textarea
          value={question.prompt}
          disabled={!canEdit}
          onChange={e => patch({ prompt: e.target.value })}
          rows={3}
          placeholder="Escribí el enunciado de la pregunta"
          className="rounded-md3-sm border-[1.5px] border-border text-[16px] leading-[1.6] text-foreground"
        />
      </div>

      {question.type !== 'short' && (
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
              Opciones · marcá la correcta
            </p>
            {shuffleOptions && (
              <p className="text-[11px] text-muted-foreground">Se mostrarán en orden aleatorio</p>
            )}
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleOptionDragEnd}
          >
            <SortableContext
              items={question.options.map(o => o.localKey)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-2">
                {question.options.map(option => (
                  <OptionRow
                    key={option.localKey}
                    option={option}
                    canEdit={canEdit}
                    canRemove={question.options.length > 2}
                    onSelectCorrect={() => markCorrect(option.localKey)}
                    onTextChange={text => updateOptionText(option.localKey, text)}
                    onRemove={() => removeOption(option.localKey)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {canEdit && (
            <button
              type="button"
              onClick={addOption}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md3-option border-[1.5px] border-dashed border-muted-foreground/40 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/40"
            >
              <Plus className="h-4 w-4" /> Añadir opción
            </button>
          )}
        </div>
      )}

      <div className="grid gap-3.5 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
            Retroalimentación si acierta
          </p>
          <Textarea
            value={question.feedbackOk}
            disabled={!canEdit}
            onChange={e => patch({ feedbackOk: e.target.value })}
            rows={2}
            className="min-h-[74px] rounded-md3-sm border-[1.5px] border-border bg-edu-surface-alt text-sm"
          />
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
            Retroalimentación si falla
          </p>
          <Textarea
            value={question.feedbackBad}
            disabled={!canEdit}
            onChange={e => patch({ feedbackBad: e.target.value })}
            rows={2}
            className="min-h-[74px] rounded-md3-sm border-[1.5px] border-border bg-edu-orange-container/15 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
