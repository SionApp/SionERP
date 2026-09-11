import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Editor } from '@tiptap/react';
import { closestCenter, DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Eye,
  FileEdit,
  ListChecks,
  Loader2,
  Plus,
  Upload,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MobileScreen } from '@/components/mobile/MobileScreen';
import { useMobileMode } from '@/hooks/useMobileMode';
import { cn } from '@/lib/utils';
import { EducationService } from '@/services/education.service';
import { useEducationAccess } from '../use-education-access';
import {
  EducationDropdownMenu,
  EducationDropdownMenuContent,
  EducationDropdownMenuItem,
  EducationDropdownMenuTrigger,
} from '../ui';
import { isBlockDataComplete, narrowEducationBlock } from '../blocks/block.types';
import type { EducationBlockType } from '../blocks/block.types';
import type { AutosaveStatus } from '../hooks/use-autosave';
import { useAutosave } from '../hooks/use-autosave';
import { EditorToolbar } from './EditorToolbar';
import { InsertBar } from './InsertBar';
import { StepSelector } from './StepSelector';
import { BlockCard } from './BlockCard';
import { defaultBlockData } from './BlockCardBody';
import { LivePreview } from './LivePreview';
import { DeviceToggle } from './DeviceToggle';
import type { PreviewDevice } from './DeviceToggle';
import type { EducationBlock, StepOrderEntry } from '@/types/education.types';

const REORDER_BREAKPOINT = 1024;

/** Below 1024px, `BlockCard` renders up/down arrows instead of the
 * `@dnd-kit` drag handle (tasks-v2-part2 I.3) — same
 * `matchMedia`-driven-resize pattern `hooks/use-mobile.tsx`'s `useIsMobile`
 * already established, just at the editor's own breakpoint (not the app's
 * 768px shell breakpoint, which is about a different layout decision). */
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

function AutosaveIndicator({
  status,
  lastSavedAt,
  compact = false,
}: {
  status: AutosaveStatus;
  lastSavedAt: Date | null;
  /** Mobile handoff, screen 8 cabecera: `cloud_done` 13px + "Guardado hace 2
   * min" (10px, `#2E6C4C` — an exact match to `--edu-text`) — reuses the
   * same `Check` icon the desktop indicator already renders for "saved"
   * rather than sourcing a cloud-check glyph lucide-react doesn't ship. */
  compact?: boolean;
}) {
  if (compact) {
    if (status === 'saving') {
      return (
        <span className="flex items-center gap-1 text-[10px] font-normal text-muted-foreground">
          <Loader2 className="h-[13px] w-[13px] animate-spin" /> Guardando…
        </span>
      );
    }
    if (status === 'error') {
      return (
        <span className="flex items-center gap-1 text-[10px] font-normal text-destructive">
          <AlertTriangle className="h-[13px] w-[13px]" /> Error al guardar
        </span>
      );
    }
    if (status === 'saved') {
      const minutes = lastSavedAt
        ? Math.max(0, Math.round((Date.now() - lastSavedAt.getTime()) / 60000))
        : null;
      return (
        <span className="flex items-center gap-1 text-[10px] font-normal text-edu-text">
          <Check className="h-[13px] w-[13px]" />
          {minutes === null
            ? 'Guardado'
            : minutes === 0
              ? 'Guardado recién'
              : `Guardado hace ${minutes} min`}
        </span>
      );
    }
    return null;
  }
  if (status === 'saving') {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando…
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-destructive">
        <AlertTriangle className="h-3.5 w-3.5" /> Error al guardar
      </span>
    );
  }
  if (status === 'saved') {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-edu-primary-dark">
        <Check className="h-3.5 w-3.5" /> Autoguardado activo
        {lastSavedAt && (
          <span className="text-muted-foreground">
            · guardado{' '}
            {lastSavedAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </span>
    );
  }
  return null;
}

/** Mobile handoff §8/§9: detects an on-screen keyboard by tracking focus
 * inside the block-list container, not `window.visualViewport` — the
 * formatting toolbar's own doc requirement ("queda inmediatamente encima
 * del teclado") is satisfied for free by normal in-flow layout (the bottom
 * bar is a flex sibling, not `position:fixed` relative to the LAYOUT
 * viewport, in browsers that resize the visual viewport under an open
 * keyboard) — this hook only needs to know WHETHER to hide the insert-bar
 * row, not track pixel offsets. */
function useKeyboardOpen(containerRef: RefObject<HTMLElement | null>) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    function isEditable(el: EventTarget | null) {
      if (!(el instanceof HTMLElement)) return false;
      return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
    }
    function onFocusIn(e: FocusEvent) {
      if (isEditable(e.target)) setOpen(true);
    }
    function onFocusOut() {
      window.setTimeout(() => {
        if (!container.contains(document.activeElement)) setOpen(false);
      }, 0);
    }
    container.addEventListener('focusin', onFocusIn);
    container.addEventListener('focusout', onFocusOut);
    return () => {
      container.removeEventListener('focusin', onFocusIn);
      container.removeEventListener('focusout', onFocusOut);
    };
  }, [containerRef]);
  return open;
}

/** Mobile handoff §8 cabecera: `arrow_back` + truncated title/save-status +
 * "Publicar", then (margin-top:12px) the Editar/Preview switch that
 * "reemplaza al split de escritorio" per the doc's own State Management
 * section. Kept local to this file (not a `mobile/` sub-component) since
 * every piece of state it needs (autosave status, publish mutation,
 * `editorTab`) already lives in `LessonEditor` and nothing else reuses it. */
function MobileEditorHeader({
  title,
  autosaveStatus,
  lastSavedAt,
  showPublish,
  publishing,
  onPublish,
  editorTab,
  onTabChange,
}: {
  title: string;
  autosaveStatus: AutosaveStatus;
  lastSavedAt: Date | null;
  showPublish: boolean;
  publishing: boolean;
  onPublish: () => void;
  editorTab: 'editar' | 'preview';
  onTabChange: (tab: 'editar' | 'preview') => void;
}) {
  const navigate = useNavigate();
  return (
    <header
      className="sticky top-0 z-40 flex-none border-b border-border bg-background"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center gap-2.5 px-4 pb-2.5 pt-0.5">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Volver"
          className="shrink-0 text-muted-foreground"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-foreground">{title}</p>
          <AutosaveIndicator status={autosaveStatus} lastSavedAt={lastSavedAt} compact />
        </div>
        {showPublish && (
          <button
            type="button"
            disabled={publishing}
            onClick={onPublish}
            className="shrink-0 rounded-[12px] bg-edu-primary px-[15px] py-[9px] text-xs font-medium text-white disabled:opacity-60"
          >
            Publicar
          </button>
        )}
      </div>
      <div className="px-4 pb-2.5 pt-3">
        <div className="flex items-center gap-1 rounded-full bg-muted p-[3px]">
          <button
            type="button"
            onClick={() => onTabChange('editar')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-full py-[9px] text-xs font-medium',
              editorTab === 'editar' ? 'bg-card text-[#0A2E1D] shadow-sm' : 'text-muted-foreground'
            )}
          >
            <FileEdit className="h-4 w-4" /> Editar
          </button>
          <button
            type="button"
            onClick={() => onTabChange('preview')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-full py-[9px] text-xs font-medium',
              editorTab === 'preview' ? 'bg-card text-[#0A2E1D] shadow-sm' : 'text-muted-foreground'
            )}
          >
            <Eye className="h-4 w-4" /> Preview
          </button>
        </div>
      </div>
    </header>
  );
}

/**
 * Admin block editor (tasks-v2-part2 I.6) — assembles `EditorToolbar` +
 * `InsertBar` + `StepSelector` + `BlockCard`(s) + `LivePreview` +
 * `DeviceToggle` (inside `LivePreview`), all previously built in isolation.
 * Split 50/50 grid on desktop (README §8), stacked on mobile. Deliberately
 * NO "Historial" button anywhere (I.6, matches `EditorToolbar`'s own
 * omission).
 *
 * Block content is edited LOCALLY per active step, autosaved 2s after the
 * last change (`useAutosave`, `resetKey=activeStepId` so switching steps
 * re-baselines instead of racing a write against the wrong step — same
 * hazard `useAutosave`'s own header comment describes). Freshly inserted
 * blocks that aren't yet server-valid (e.g. an image block before a file is
 * chosen) are held in local state but filtered out of the actual
 * `UpdateStep` payload via `isBlockDataComplete` — `ValidateLessonBlocks`
 * rejects the WHOLE array atomically on the server, so sending one
 * incomplete block would silently block every other already-valid edit in
 * the same step from persisting.
 */
export default function LessonEditor() {
  const { curriculumId, lessonId } = useParams<{ curriculumId: string; lessonId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { level } = useEducationAccess();
  const canEdit = level >= 3;
  const compactReorder = useBelowReorderBreakpoint();
  const isMobileApp = useMobileMode();
  // Mobile handoff §8 State Management: "editorTab: 'editar' | 'preview' —
  // reemplaza al split de escritorio" (the 50/50 grid becomes two tabs).
  const [editorTab, setEditorTab] = useState<'editar' | 'preview'>('editar');
  const blockListRef = useRef<HTMLDivElement>(null);
  const keyboardOpen = useKeyboardOpen(blockListRef);
  const [insertBarForced, setInsertBarForced] = useState(false);
  useEffect(() => {
    if (!keyboardOpen) setInsertBarForced(false);
  }, [keyboardOpen]);

  const {
    data: lesson,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['education-lesson-detail', lessonId],
    queryFn: () => EducationService.getLessonDetail(lessonId as string),
    enabled: !!lessonId,
  });

  const { data: curriculum } = useQuery({
    queryKey: ['education-curriculum', curriculumId],
    queryFn: () => EducationService.getCurriculumById(curriculumId as string),
    enabled: !!curriculumId,
  });

  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<EducationBlock[]>([]);
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  // Mobile handoff §9 ("VER COMO"): "Por defecto en móvil está seleccionado
  // Móvil" — desktop keeps its own pre-existing default unchanged.
  const [device, setDevice] = useState<PreviewDevice>(isMobileApp ? 'mobile' : 'desktop');
  const loadedStepRef = useRef<string | null>(null);

  // Pick/keep a valid active step whenever the lesson (re)loads — never
  // clobbers an in-progress edit on the SAME step (guarded by loadedStepRef
  // below), only reacts when the current pointer no longer exists (deleted)
  // or nothing is selected yet.
  useEffect(() => {
    if (!lesson) return;
    if (activeStepId && lesson.steps.some(s => s.id === activeStepId)) return;
    setActiveStepId(lesson.steps[0]?.id ?? null);
  }, [lesson, activeStepId]);

  // Loads the active step's blocks into LOCAL editable state exactly once
  // per step switch — background refetches (e.g. after autosave's own
  // invalidate) must never overwrite blocks the author is mid-edit on.
  useEffect(() => {
    if (!activeStepId) {
      setBlocks([]);
      loadedStepRef.current = null;
      return;
    }
    if (loadedStepRef.current === activeStepId) return;
    const serverStep = lesson?.steps.find(s => s.id === activeStepId);
    if (!serverStep) return;
    setBlocks(serverStep.blocks);
    setSelectedBlockId(null);
    loadedStepRef.current = activeStepId;
  }, [activeStepId, lesson]);

  const { status: autosaveStatus, lastSavedAt } = useAutosave<EducationBlock[]>(
    blocks,
    async value => {
      if (!lessonId || !activeStepId) return;
      const toSend = value.filter(b => {
        const narrowed = narrowEducationBlock(b);
        return narrowed ? isBlockDataComplete(narrowed) : false;
      });
      await EducationService.updateStep(lessonId, activeStepId, { blocks: toSend });
      qc.invalidateQueries({ queryKey: ['education-lesson-detail', lessonId] });
    },
    { resetKey: activeStepId, enabled: canEdit && !!activeStepId }
  );

  const createStepMutation = useMutation({
    mutationFn: () =>
      EducationService.createStep(lessonId as string, {
        label: `Paso ${(lesson?.steps.length ?? 0) + 1}`,
      }),
    onSuccess: res => {
      qc.invalidateQueries({ queryKey: ['education-lesson-detail', lessonId] });
      setActiveStepId(res.id);
    },
    onError: () => toast.error('No se pudo crear el paso'),
  });

  const renameStepMutation = useMutation({
    mutationFn: ({ stepId, label }: { stepId: string; label: string }) =>
      EducationService.updateStep(lessonId as string, stepId, { label }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['education-lesson-detail', lessonId] }),
    onError: () => toast.error('No se pudo renombrar el paso'),
  });

  const deleteStepMutation = useMutation({
    mutationFn: (stepId: string) => EducationService.deleteStep(lessonId as string, stepId),
    onSuccess: (_data, stepId) => {
      qc.invalidateQueries({ queryKey: ['education-lesson-detail', lessonId] });
      if (activeStepId === stepId) {
        setActiveStepId(null);
        loadedStepRef.current = null;
      }
      toast.success('Paso eliminado');
    },
    onError: () => toast.error('No se pudo eliminar el paso'),
  });

  const reorderStepsMutation = useMutation({
    mutationFn: (entries: StepOrderEntry[]) =>
      EducationService.reorderSteps(lessonId as string, entries),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['education-lesson-detail', lessonId] }),
    onError: () => toast.error('No se pudo reordenar los pasos'),
  });

  const publishMutation = useMutation({
    mutationFn: () => EducationService.updateCurriculumStatus(curriculumId as string, 'published'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['education-curriculum', curriculumId] });
      qc.invalidateQueries({ queryKey: ['education-curricula'] });
      toast.success('Curso publicado');
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : 'No se pudo publicar el curso'),
  });

  function moveStep(stepId: string, direction: -1 | 1) {
    if (!lesson || reorderStepsMutation.isPending) return;
    const steps = [...lesson.steps].sort((a, b) => a.orderIndex - b.orderIndex);
    const idx = steps.findIndex(s => s.id === stepId);
    const target = idx + direction;
    if (idx === -1 || target < 0 || target >= steps.length) return;
    [steps[idx], steps[target]] = [steps[target], steps[idx]];
    reorderStepsMutation.mutate(steps.map((s, i) => ({ id: s.id, orderIndex: i + 1 })));
  }

  function updateBlockData(blockId: string, data: unknown) {
    setBlocks(prev => prev.map(b => (b.id === blockId ? { ...b, data } : b)));
  }

  function insertBlock(type: EducationBlockType) {
    const newBlock: EducationBlock = {
      id: crypto.randomUUID(),
      type,
      data: defaultBlockData(type),
    };
    setBlocks(prev => {
      const at = selectedBlockId ? prev.findIndex(b => b.id === selectedBlockId) + 1 : prev.length;
      const insertAt = at > 0 ? at : prev.length;
      const next = [...prev];
      next.splice(insertAt, 0, newBlock);
      return next;
    });
    setSelectedBlockId(newBlock.id);
  }

  function duplicateBlock(blockId: string) {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === blockId);
      if (idx === -1) return prev;
      const clone: EducationBlock = {
        ...JSON.parse(JSON.stringify(prev[idx])),
        id: crypto.randomUUID(),
      };
      const next = [...prev];
      next.splice(idx + 1, 0, clone);
      return next;
    });
  }

  function deleteBlock(blockId: string) {
    setBlocks(prev => prev.filter(b => b.id !== blockId));
    if (selectedBlockId === blockId) setSelectedBlockId(null);
  }

  function moveBlock(blockId: string, direction: -1 | 1) {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === blockId);
      const target = idx + direction;
      if (idx === -1 || target < 0 || target >= prev.length) return prev;
      return arrayMove(prev, idx, target);
    });
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBlocks(prev => {
      const oldIndex = prev.findIndex(b => b.id === active.id);
      const newIndex = prev.findIndex(b => b.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-16 w-full rounded-[20px]" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-[600px] w-full rounded-md3-xl" />
          <Skeleton className="h-[600px] w-full rounded-md3-xl" />
        </div>
      </div>
    );
  }

  if (isError || !lesson) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md3-lg border border-destructive/30 bg-destructive/5 py-12 text-center">
        <AlertTriangle className="h-6 w-6 text-destructive" />
        <p className="text-sm font-medium text-destructive">No se pudo cargar la lección.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const activeStep = lesson.steps.find(s => s.id === activeStepId) ?? null;
  const activeStepIndex = lesson.steps.findIndex(s => s.id === activeStepId);
  const previewStep = activeStep ? { ...activeStep, blocks } : null;

  if (isMobileApp) {
    const showPublish = canEdit && curriculum?.status === 'draft';
    const showInsertBar = !keyboardOpen || insertBarForced;

    return (
      <div className="education-shell flex min-h-full flex-col bg-background">
        <MobileScreen
          back={`/dashboard/education/admin/cursos/${curriculumId}`}
          header={
            <MobileEditorHeader
              title={`Lección ${lesson.orderIndex} · ${lesson.title}`}
              autosaveStatus={autosaveStatus}
              lastSavedAt={lastSavedAt}
              showPublish={showPublish}
              publishing={publishMutation.isPending}
              onPublish={() => publishMutation.mutate()}
              editorTab={editorTab}
              onTabChange={setEditorTab}
            />
          }
        >
          {editorTab === 'editar' ? (
            <div className="flex flex-col">
              <StepSelector
                steps={lesson.steps}
                activeStepId={activeStepId}
                onSelect={id => setActiveStepId(id)}
                onAdd={() => createStepMutation.mutate()}
                onRename={(stepId, label) => renameStepMutation.mutate({ stepId, label })}
                onDelete={stepId => deleteStepMutation.mutate(stepId)}
                onMoveLeft={stepId => moveStep(stepId, -1)}
                onMoveRight={stepId => moveStep(stepId, 1)}
                canEdit={canEdit}
                compact
              />

              <div ref={blockListRef} className="flex-1 space-y-2.5 px-4 pb-[180px] pt-1">
                {!activeStep ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {canEdit
                      ? 'Esta lección todavía no tiene pasos. Usá el botón "+" para crear el primero.'
                      : 'Esta lección todavía no tiene pasos.'}
                  </p>
                ) : (
                  blocks.map((block, index) => (
                    <BlockCard
                      key={block.id}
                      block={block}
                      index={index}
                      total={blocks.length}
                      selected={selectedBlockId === block.id}
                      canEdit={canEdit}
                      compactReorder
                      compact
                      curriculumId={curriculumId as string}
                      onSelect={() => setSelectedBlockId(block.id)}
                      onChange={data => updateBlockData(block.id, data)}
                      onDuplicate={() => duplicateBlock(block.id)}
                      onDelete={() => deleteBlock(block.id)}
                      onMoveUp={() => moveBlock(block.id, -1)}
                      onMoveDown={() => moveBlock(block.id, 1)}
                      onFocusEditor={setActiveEditor}
                      onBlurEditor={() => setActiveEditor(null)}
                    />
                  ))
                )}

                {canEdit && activeStep && (
                  <button
                    type="button"
                    onClick={() => insertBlock('paragraph')}
                    className="flex w-full flex-col items-center gap-1 rounded-md3 border-[1.5px] border-dashed border-muted-foreground/40 py-4 text-center text-muted-foreground"
                  >
                    <Plus className="h-5 w-5" />
                    <span className="text-sm font-medium">Añadir bloque</span>
                  </button>
                )}
              </div>

              {/* Mobile handoff §8, "Barra inferior de dos filas" —
                  `position:fixed`, same technique `LessonNavFooter`'s own
                  mobile footer already uses elsewhere in this module; the
                  browser's own keyboard-driven visual-viewport resize keeps
                  it sitting right above an open keyboard without extra JS. */}
              <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-[#FAFAFB]">
                {showInsertBar ? (
                  <InsertBar compact onInsert={insertBlock} />
                ) : (
                  <div className="flex items-center px-3 py-[9px]">
                    <button
                      type="button"
                      onClick={() => setInsertBarForced(true)}
                      aria-label="Mostrar barra de insertar bloque"
                      className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-muted text-edu-primary"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                )}
                <EditorToolbar
                  compact
                  activeEditor={activeEditor}
                  onDismissKeyboard={() => setInsertBarForced(false)}
                />
              </div>
            </div>
          ) : (
            <div className="flex min-h-full flex-col" style={{ background: '#EFEAF3' }}>
              <div className="flex items-center gap-2.5 px-4 pt-3">
                <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-outline">
                  Ver como
                </span>
                <DeviceToggle compact device={device} onChange={setDevice} />
              </div>
              <div className="flex flex-1 items-start justify-center p-4 pb-[100px]">
                <LivePreview
                  variant="stage"
                  lessonTitle={lesson.title}
                  moduleLabel={curriculum?.name ?? null}
                  step={previewStep}
                  stepIndex={Math.max(activeStepIndex, 0)}
                  stepCount={lesson.steps.length}
                  lessonId={lesson.id}
                  device={device}
                  onDeviceChange={setDevice}
                />
              </div>

              {/* Mobile handoff §9, "Barra inferior": 50px height on BOTH
                  buttons, per the doc's own literal callout that this one
                  screen deliberately does NOT follow the 54px pattern every
                  other mobile bottom bar in this module uses. */}
              <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center gap-2.5 border-t border-border bg-background px-4 pb-6 pt-3">
                <button
                  type="button"
                  onClick={() => setEditorTab('editar')}
                  className="flex h-[50px] flex-1 items-center justify-center gap-1.5 rounded-[16px] border border-outline text-sm font-medium text-foreground"
                >
                  <FileEdit className="h-[18px] w-[18px]" /> Seguir editando
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/dashboard/education/admin/cursos/${curriculumId}/leccion/${lessonId}/quiz`
                    )
                  }
                  aria-label="Constructor de quiz"
                  className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-[16px] bg-muted text-foreground"
                >
                  <ListChecks className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </MobileScreen>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-[20px] border border-border bg-card px-5 py-3.5">
        <button
          type="button"
          onClick={() => navigate(`/dashboard/education/admin/cursos/${curriculumId}`)}
          className="flex items-center gap-1.5 text-sm font-medium text-edu-primary"
        >
          <ArrowLeft className="h-[18px] w-[18px]" aria-hidden="true" />
          {curriculum?.name ?? 'Cursos'}
        </button>
        <span className="h-[26px] w-px shrink-0 bg-border" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium text-foreground">{lesson.title}</p>
          <p className="text-xs text-muted-foreground">
            {curriculum ? (curriculum.status === 'published' ? 'Publicado' : 'Borrador') : ''}
          </p>
        </div>
        <AutosaveIndicator status={autosaveStatus} lastSavedAt={lastSavedAt} />
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() =>
            navigate(`/dashboard/education/admin/cursos/${curriculumId}/leccion/${lessonId}/quiz`)
          }
        >
          <ListChecks className="h-4 w-4" /> Constructor de quiz
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() =>
            window.open(
              `/dashboard/education/curso/${curriculumId}/leccion/${lessonId}`,
              '_blank',
              'noopener,noreferrer'
            )
          }
        >
          <Eye className="h-4 w-4" /> Vista del alumno
        </Button>
        {canEdit && curriculum?.status === 'draft' && (
          <Button
            size="sm"
            className="gap-1.5 bg-edu-primary text-white hover:bg-edu-primary/90"
            disabled={publishMutation.isPending}
            onClick={() => publishMutation.mutate()}
          >
            <Upload className="h-4 w-4" /> Publicar
          </Button>
        )}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-md3-xl border border-border bg-card">
          <EditorToolbar activeEditor={activeEditor} />
          <InsertBar onInsert={insertBlock} />
          <StepSelector
            steps={lesson.steps}
            activeStepId={activeStepId}
            onSelect={id => setActiveStepId(id)}
            onAdd={() => createStepMutation.mutate()}
            onRename={(stepId, label) => renameStepMutation.mutate({ stepId, label })}
            onDelete={stepId => deleteStepMutation.mutate(stepId)}
            onMoveLeft={stepId => moveStep(stepId, -1)}
            onMoveRight={stepId => moveStep(stepId, 1)}
            canEdit={canEdit}
          />

          <div className="max-h-[760px] space-y-3 overflow-y-auto p-5">
            {!activeStep ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {canEdit
                  ? 'Esta lección todavía no tiene pasos. Usá el botón "+" para crear el primero.'
                  : 'Esta lección todavía no tiene pasos.'}
              </p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={blocks.map(b => b.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {blocks.map((block, index) => (
                    <BlockCard
                      key={block.id}
                      block={block}
                      index={index}
                      total={blocks.length}
                      selected={selectedBlockId === block.id}
                      canEdit={canEdit}
                      compactReorder={compactReorder}
                      curriculumId={curriculumId as string}
                      onSelect={() => setSelectedBlockId(block.id)}
                      onChange={data => updateBlockData(block.id, data)}
                      onDuplicate={() => duplicateBlock(block.id)}
                      onDelete={() => deleteBlock(block.id)}
                      onMoveUp={() => moveBlock(block.id, -1)}
                      onMoveDown={() => moveBlock(block.id, 1)}
                      onFocusEditor={setActiveEditor}
                      onBlurEditor={() => setActiveEditor(null)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}

            {canEdit && activeStep && (
              <EducationDropdownMenu>
                <EducationDropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full flex-col items-center gap-1 rounded-md3 border-[1.5px] border-dashed border-muted-foreground/40 py-5 text-center text-muted-foreground hover:bg-muted/40"
                  >
                    <Plus className="h-5 w-5" />
                    <span className="text-sm font-medium">Añadir bloque</span>
                  </button>
                </EducationDropdownMenuTrigger>
                <EducationDropdownMenuContent align="center">
                  <EducationDropdownMenuItem onClick={() => insertBlock('paragraph')}>
                    Párrafo
                  </EducationDropdownMenuItem>
                  <EducationDropdownMenuItem onClick={() => insertBlock('list')}>
                    Lista
                  </EducationDropdownMenuItem>
                </EducationDropdownMenuContent>
              </EducationDropdownMenu>
            )}
          </div>
        </div>

        <LivePreview
          lessonTitle={lesson.title}
          moduleLabel={curriculum?.name ?? null}
          step={previewStep}
          stepIndex={Math.max(activeStepIndex, 0)}
          stepCount={lesson.steps.length}
          lessonId={lesson.id}
          device={device}
          onDeviceChange={setDevice}
        />
      </div>
    </div>
  );
}
