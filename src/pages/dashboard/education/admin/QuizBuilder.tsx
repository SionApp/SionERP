import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { closestCenter, DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { AlertTriangle, ArrowLeft, PlayCircle, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EducationService } from '@/services/education.service';
import { useEducationAccess } from '../use-education-access';
import { QuizSettings } from './QuizSettings';
import type { QuizSettingsValue } from './QuizSettings';
import { QuestionList } from './QuestionList';
import { QuestionEditor } from './QuestionEditor';
import type { QuizAuthorView, QuizQuestionType, UpsertQuizRequest } from '@/types/education.types';

const REORDER_BREAKPOINT = 1024;

/** Same `matchMedia`-driven breakpoint pattern `LessonEditor.tsx` established
 * for `BlockCard`'s drag-vs-arrows fallback (I.3) — reused here verbatim for
 * `QuestionList`'s reorder (J.3), not reinvented. Not exported from
 * `LessonEditor.tsx`, so duplicated locally like every other admin screen
 * that needs its own compact-reorder breakpoint. */
function useBelowReorderBreakpoint() {
  const [below, setBelow] = useState<boolean>(
    () => typeof window !== 'undefined' && window.innerWidth < REORDER_BREAKPOINT
  );
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${REORDER_BREAKPOINT - 1}px)`);
    const onChange = () => setBelow(window.innerWidth < REORDER_BREAKPOINT);
    mql.addEventListener('change', onChange);
    onChange();
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return below;
}

/**
 * Local editable shapes for `QuestionList`/`QuestionEditor`. `localKey` is a
 * STABLE client-side identity separate from `id` — a brand-new question/
 * option has `id: ''` (server convention: empty id means "new", mirrors
 * `UpdateStep`), but React state, `@dnd-kit` sortable ids and `selectedKey`
 * all need a stable key that survives before the row has ever been saved.
 * For rows loaded from the server, `localKey` is initialized to the real
 * `id` (already stable); for freshly-inserted rows it's a fresh
 * `crypto.randomUUID()`. After a successful save, `viewToEditable` re-derives
 * fresh `EditableQuiz` from the server's response, so every row's `localKey`
 * becomes its real id again.
 */
export interface EditableOption {
  localKey: string;
  id: string;
  orderIndex: number;
  text: string;
  isCorrect: boolean;
}

export interface EditableQuestion {
  localKey: string;
  id: string;
  orderIndex: number;
  type: QuizQuestionType;
  prompt: string;
  points: number;
  /** Kept as plain strings locally (never `null`) — same "empty string, not
   * null, while editing" convention `CourseFormDialog`'s text fields use;
   * `buildPayload` below converts blank strings back to `null` on save. */
  feedbackOk: string;
  feedbackBad: string;
  answerCount: number;
  options: EditableOption[];
}

interface EditableQuiz {
  settings: QuizSettingsValue;
  questions: EditableQuestion[];
}

const DEFAULT_QUIZ: EditableQuiz = {
  settings: {
    passScore: 60,
    timeLimitMinutes: null,
    shuffleOptions: true,
    allowRetry: false,
    showResult: true,
  },
  questions: [],
};

function newOption(orderIndex: number): EditableOption {
  return { localKey: crypto.randomUUID(), id: '', orderIndex, text: '', isCorrect: false };
}

function viewToEditable(view: QuizAuthorView): EditableQuiz {
  return {
    settings: {
      passScore: view.passScore,
      timeLimitMinutes: view.timeLimitMinutes,
      shuffleOptions: view.shuffleOptions,
      allowRetry: view.allowRetry,
      showResult: view.showResult,
    },
    questions: [...view.questions]
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map(
        (q): EditableQuestion => ({
          localKey: q.id,
          id: q.id,
          orderIndex: q.orderIndex,
          type: q.type,
          prompt: q.prompt,
          points: q.points,
          feedbackOk: q.feedbackOk ?? '',
          feedbackBad: q.feedbackBad ?? '',
          answerCount: q.answerCount,
          options: [...q.options]
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map(
              (o): EditableOption => ({
                localKey: o.id,
                id: o.id,
                orderIndex: o.orderIndex,
                text: o.text,
                isCorrect: o.isCorrect,
              })
            ),
        })
      ),
  };
}

/** Mirrors `UpsertQuiz`'s own validation (`education_quiz_admin.go`) so the
 * client never sends a request the server is guaranteed to 400. Returns the
 * first error message, or `null` when valid. */
function validateQuiz(quiz: EditableQuiz): string | null {
  if (quiz.questions.length === 0) return 'Añadí al menos una pregunta antes de guardar.';
  for (const q of quiz.questions) {
    if (!q.prompt.trim()) return 'Todas las preguntas necesitan un enunciado.';
    if (q.points <= 0) return 'Los puntos de cada pregunta deben ser mayores a 0.';
    if (q.type === 'short') continue;
    if (q.options.length < 2)
      return `"${q.prompt.trim() || 'Pregunta'}" necesita al menos 2 opciones.`;
    if (q.options.some(o => !o.text.trim())) return 'Todas las opciones necesitan texto.';
    if (q.options.filter(o => o.isCorrect).length !== 1) {
      return `"${q.prompt.trim() || 'Pregunta'}" necesita exactamente una opción correcta.`;
    }
  }
  return null;
}

function buildPayload(quiz: EditableQuiz, force: boolean): UpsertQuizRequest {
  return {
    passScore: quiz.settings.passScore,
    timeLimitMinutes: quiz.settings.timeLimitMinutes,
    shuffleOptions: quiz.settings.shuffleOptions,
    allowRetry: quiz.settings.allowRetry,
    showResult: quiz.settings.showResult,
    force,
    questions: quiz.questions.map((q, i) => ({
      id: q.id,
      orderIndex: i + 1,
      type: q.type,
      prompt: q.prompt,
      points: q.points,
      feedbackOk: q.feedbackOk.trim() ? q.feedbackOk.trim() : null,
      feedbackBad: q.feedbackBad.trim() ? q.feedbackBad.trim() : null,
      options:
        q.type === 'short'
          ? []
          : q.options.map((o, oi) => ({
              id: o.id,
              orderIndex: oi + 1,
              text: o.text,
              isCorrect: o.isCorrect,
            })),
    })),
  };
}

/**
 * Admin quiz builder (tasks-v2-part2 J.4) — assembles `QuizSettings` +
 * `QuestionList` + `QuestionEditor`. Replaces PR-C's placeholder body at the
 * same route (`admin/cursos/:curriculumId/leccion/:lessonId/quiz`).
 *
 * Explicit "Guardar" button, NOT `useAutosave` — README §9's own mockup
 * shows a primary `save` "Guardar" action (unlike the block editor, which is
 * autosaved), and there is no separate per-question/per-option HTTP route to
 * debounce-write against anyway: every save round-trips the FULL quiz tree
 * through `UpsertQuiz` (`PUT .../lessons/:id/quiz`).
 *
 * Guarded delete: `QuestionEditor`'s delete button already shows the real
 * `answerCount` (present in every load, PR-F's author query — no extra
 * round trip) in its confirm dialog. Confirming immediately RESENDS the
 * save — `handleDeleteQuestion` below — with `force: true` whenever that
 * question had answers, rather than deferring to the next manual "Guardar"
 * click: since the backend expresses deletion purely as "this question is
 * absent from the next full PUT", deleting IS saving, and there is no
 * narrower request that could delete just one question without persisting
 * whatever else is currently in local state too (documented in the confirm
 * dialog's own copy when it applies).
 */
export default function QuizBuilder() {
  const { curriculumId, lessonId } = useParams<{ curriculumId: string; lessonId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { level } = useEducationAccess();
  const canEdit = level >= 3;
  const compactReorder = useBelowReorderBreakpoint();

  const { data: lesson } = useQuery({
    queryKey: ['education-lesson-detail', lessonId],
    queryFn: () => EducationService.getLessonDetail(lessonId as string),
    enabled: !!lessonId,
  });

  const {
    data: quizView,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['education-quiz-author', lessonId],
    queryFn: () => EducationService.getQuizAuthor(lessonId as string),
    enabled: !!lessonId,
  });

  const [quiz, setQuiz] = useState<EditableQuiz>(DEFAULT_QUIZ);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrates local editable state from the server exactly ONCE, the same
  // "never clobber an in-progress edit with a background refetch" rule
  // `LessonEditor`'s `loadedStepRef` enforces for step blocks. `quizView` is
  // `undefined` while the query is in flight and `null` when the lesson has
  // no quiz yet (both handled: `null` hydrates from `DEFAULT_QUIZ`).
  // Auto-selects the first question on load — same "pick/keep a valid active
  // selection whenever the data (re)loads" convention `LessonEditor` applies
  // to its own active step.
  useEffect(() => {
    if (hydrated || quizView === undefined) return;
    const next = quizView ? viewToEditable(quizView) : DEFAULT_QUIZ;
    setQuiz(next);
    setSelectedKey(next.questions[0]?.localKey ?? null);
    setHydrated(true);
  }, [quizView, hydrated]);

  const upsertMutation = useMutation({
    mutationFn: (payload: UpsertQuizRequest) =>
      EducationService.upsertQuiz(lessonId as string, payload),
    onSuccess: view => {
      setQuiz(viewToEditable(view));
      qc.invalidateQueries({ queryKey: ['education-quiz-author', lessonId] });
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar el quiz'),
  });

  function handleSave() {
    const error = validateQuiz(quiz);
    if (error) {
      toast.error(error);
      return;
    }
    upsertMutation.mutate(buildPayload(quiz, false), {
      onSuccess: () => toast.success('Quiz guardado'),
    });
  }

  function handleDeleteQuestion(localKey: string) {
    const target = quiz.questions.find(q => q.localKey === localKey);
    if (!target) return;
    const nextQuestions = quiz.questions.filter(q => q.localKey !== localKey);
    upsertMutation.mutate(
      buildPayload({ ...quiz, questions: nextQuestions }, target.answerCount > 0),
      {
        onSuccess: () => {
          setSelectedKey(prev => (prev === localKey ? null : prev));
          toast.success('Pregunta eliminada');
        },
      }
    );
  }

  function handleAddQuestion() {
    const newQuestion: EditableQuestion = {
      localKey: crypto.randomUUID(),
      id: '',
      orderIndex: quiz.questions.length + 1,
      type: 'multiple',
      prompt: '',
      points: 10,
      feedbackOk: '',
      feedbackBad: '',
      answerCount: 0,
      options: [newOption(1), newOption(2)],
    };
    setQuiz(prev => ({ ...prev, questions: [...prev.questions, newQuestion] }));
    setSelectedKey(newQuestion.localKey);
  }

  function updateQuestion(next: EditableQuestion) {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.map(q => (q.localKey === next.localKey ? next : q)),
    }));
  }

  function moveQuestion(localKey: string, direction: -1 | 1) {
    setQuiz(prev => {
      const idx = prev.questions.findIndex(q => q.localKey === localKey);
      const target = idx + direction;
      if (idx === -1 || target < 0 || target >= prev.questions.length) return prev;
      return { ...prev, questions: arrayMove(prev.questions, idx, target) };
    });
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleQuestionDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setQuiz(prev => {
      const oldIndex = prev.questions.findIndex(q => q.localKey === active.id);
      const newIndex = prev.questions.findIndex(q => q.localKey === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return { ...prev, questions: arrayMove(prev.questions, oldIndex, newIndex) };
    });
  }

  if (isLoading || !hydrated) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-16 w-full rounded-[20px]" />
        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          <Skeleton className="h-[500px] w-full rounded-md3-xl" />
          <Skeleton className="h-[500px] w-full rounded-md3-xl" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md3-lg border border-destructive/30 bg-destructive/5 py-12 text-center">
        <AlertTriangle className="h-6 w-6 text-destructive" />
        <p className="text-sm font-medium text-destructive">No se pudo cargar el quiz.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const selectedIndex = quiz.questions.findIndex(q => q.localKey === selectedKey);
  const selectedQuestion = selectedIndex >= 0 ? quiz.questions[selectedIndex] : null;
  const retryLabel = quiz.settings.allowRetry ? '1 intento extra' : 'sin reintentos extra';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-[20px] border border-border bg-card px-5 py-3.5">
        <button
          type="button"
          onClick={() =>
            navigate(`/dashboard/education/admin/cursos/${curriculumId}/leccion/${lessonId}`)
          }
          className="flex items-center gap-1.5 text-sm font-medium text-edu-primary"
        >
          <ArrowLeft className="h-[18px] w-[18px]" aria-hidden="true" />
          Editor de la lección
        </button>
        <span className="h-[26px] w-px shrink-0 bg-border" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium text-foreground">
            Mini quiz{lesson ? ` · Lección ${lesson.orderIndex}` : ''}
          </p>
          <p className="text-xs text-muted-foreground">
            {quiz.questions.length} {quiz.questions.length === 1 ? 'pregunta' : 'preguntas'} ·
            aprobación {quiz.settings.passScore}% · {retryLabel}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={quiz.questions.length === 0}
          onClick={() =>
            window.open(
              `/dashboard/education/curso/${curriculumId}/leccion/${lessonId}/quiz`,
              '_blank',
              'noopener,noreferrer'
            )
          }
        >
          <PlayCircle className="h-4 w-4" /> Probar quiz
        </Button>
        {canEdit && (
          <Button
            size="sm"
            className="gap-1.5 bg-edu-primary text-white hover:bg-edu-primary/90"
            disabled={upsertMutation.isPending}
            onClick={handleSave}
          >
            <Save className="h-4 w-4" /> Guardar
          </Button>
        )}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[340px_1fr]">
        <div className="flex flex-col gap-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleQuestionDragEnd}
          >
            <SortableContext
              items={quiz.questions.map(q => q.localKey)}
              strategy={verticalListSortingStrategy}
            >
              <QuestionList
                questions={quiz.questions}
                selectedKey={selectedKey}
                canEdit={canEdit}
                compactReorder={compactReorder}
                onSelect={setSelectedKey}
                onAdd={handleAddQuestion}
                onMove={moveQuestion}
              />
            </SortableContext>
          </DndContext>

          <QuizSettings
            value={quiz.settings}
            canEdit={canEdit}
            onChange={next => setQuiz(prev => ({ ...prev, settings: next }))}
          />
        </div>

        {selectedQuestion ? (
          <QuestionEditor
            key={selectedQuestion.localKey}
            question={selectedQuestion}
            index={selectedIndex}
            shuffleOptions={quiz.settings.shuffleOptions}
            canEdit={canEdit}
            onChange={updateQuestion}
            onDelete={() => handleDeleteQuestion(selectedQuestion.localKey)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 rounded-md3-xl border border-dashed border-border bg-card py-16 text-center">
            <p className="text-sm text-muted-foreground">
              {quiz.questions.length === 0
                ? 'Este quiz todavía no tiene preguntas.'
                : 'Seleccioná una pregunta de la lista para editarla.'}
            </p>
            {canEdit && quiz.questions.length === 0 && (
              <Button size="sm" variant="outline" onClick={handleAddQuestion}>
                Añadir pregunta
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
