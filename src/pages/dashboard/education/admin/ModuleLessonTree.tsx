import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowDown,
  ArrowUp,
  Clock,
  FileEdit,
  ListTree,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  EducationConfirmDialog,
  EducationDialog,
  EducationDialogContent,
  EducationDialogHeader,
  EducationDialogTitle,
  EducationDropdownMenu,
  EducationDropdownMenuContent,
  EducationDropdownMenuItem,
  EducationDropdownMenuTrigger,
  EducationSelect,
  EducationSelectContent,
  EducationSelectItem,
  EducationSelectTrigger,
  EducationSelectValue,
} from '../ui';
import { EducationService } from '@/services/education.service';
import { useCourseModules } from '../hooks/use-education-queries';
import type {
  EducationCourseModule,
  EducationLesson,
  LessonOrderEntry,
} from '@/types/education.types';

const GENERAL_KEY = '__general__';

/** One (moduleId|null, lessons[]) group, in display order — modules by
 * `orderIndex` first, the implicit "General" group last (mirrors
 * `GetSyllabus`'s own `(module_id IS NULL) ASC` ordering, education_catalog.go). */
interface LessonGroup {
  key: string;
  moduleId: string | null;
  module: EducationCourseModule | null;
  lessons: EducationLesson[];
}

function buildGroups(modules: EducationCourseModule[], lessons: EducationLesson[]): LessonGroup[] {
  const byModule = new Map<string, EducationLesson[]>();
  const general: EducationLesson[] = [];
  for (const l of [...lessons].sort((a, b) => a.orderIndex - b.orderIndex)) {
    if (l.moduleId) {
      const arr = byModule.get(l.moduleId) ?? [];
      arr.push(l);
      byModule.set(l.moduleId, arr);
    } else {
      general.push(l);
    }
  }
  const groups: LessonGroup[] = [...modules]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map(m => ({ key: m.id, moduleId: m.id, module: m, lessons: byModule.get(m.id) ?? [] }));
  groups.push({ key: GENERAL_KEY, moduleId: null, module: null, lessons: general });
  return groups;
}

/** Recomputes a full, sequential `order_index` for EVERY lesson in the
 * curriculum from the current group layout (spec: "bulk operation taking
 * the full ordered set") — safe regardless of how the mutation touched the
 * groups (reorder within a module, or move across modules). */
function flattenToOrderEntries(groups: LessonGroup[]): LessonOrderEntry[] {
  const entries: LessonOrderEntry[] = [];
  let counter = 1;
  for (const g of groups) {
    for (const lesson of g.lessons) {
      entries.push({ id: lesson.id, moduleId: g.moduleId, orderIndex: counter++ });
    }
  }
  return entries;
}

function ModuleFormDialog({
  open,
  onOpenChange,
  curriculumId,
  module,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  curriculumId: string;
  module: EducationCourseModule | null;
}) {
  const qc = useQueryClient();
  const isEdit = !!module;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(module?.title ?? '');
    setDescription(module?.description ?? '');
  }, [open, module]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isEdit) {
        await EducationService.updateCourseModule(module!.id, {
          title: title.trim(),
          description: description.trim() || undefined,
        });
      } else {
        await EducationService.createCourseModule(curriculumId, {
          title: title.trim(),
          description: description.trim() || undefined,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['education-course-modules', curriculumId] });
      onOpenChange(false);
      toast.success(isEdit ? 'Módulo actualizado' : 'Módulo creado');
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar el módulo'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('El título es requerido');
      return;
    }
    saveMutation.mutate();
  }

  return (
    <EducationDialog open={open} onOpenChange={onOpenChange}>
      <EducationDialogContent>
        <EducationDialogHeader>
          <EducationDialogTitle>{isEdit ? 'Editar módulo' : 'Nuevo módulo'}</EducationDialogTitle>
        </EducationDialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="mod-title">Título</Label>
            <Input
              id="mod-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder='Ej: "Módulo 1: Quién es Dios"'
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mod-description">Descripción</Label>
            <Textarea
              id="mod-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="Opcional"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending || !title.trim()}>
              {saveMutation.isPending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear módulo'}
            </Button>
          </div>
        </form>
      </EducationDialogContent>
    </EducationDialog>
  );
}

export function LessonFormDialog({
  open,
  onOpenChange,
  curriculumId,
  modules,
  defaultModuleId,
  lesson,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  curriculumId: string;
  modules: EducationCourseModule[];
  defaultModuleId: string | null;
  lesson: EducationLesson | null;
  /** Called with the new lesson's id right after a successful create (not edit) —
   * lets a caller outside the course detail page (e.g. the global "Nueva lección"
   * entry point) navigate straight into the editor. */
  onCreated?: (lessonId: string) => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!lesson;
  const [title, setTitle] = useState('');
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [duration, setDuration] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(lesson?.title ?? '');
    setModuleId(lesson ? lesson.moduleId : defaultModuleId);
    setDuration(lesson?.durationMinutes != null ? String(lesson.durationMinutes) : '');
  }, [open, lesson, defaultModuleId]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const durationMinutes = duration.trim() ? Number(duration) : undefined;
      if (isEdit) {
        await EducationService.updateLesson(lesson!.id, {
          title: title.trim(),
          moduleId,
          durationMinutes,
        });
        return null;
      }
      const created = await EducationService.createLesson(curriculumId, {
        title: title.trim(),
        moduleId,
        durationMinutes,
      });
      return created.id;
    },
    onSuccess: createdId => {
      qc.invalidateQueries({ queryKey: ['education-lessons', curriculumId] });
      qc.invalidateQueries({ queryKey: ['education-curriculum', curriculumId] });
      qc.invalidateQueries({ queryKey: ['education-curricula'] });
      onOpenChange(false);
      toast.success(isEdit ? 'Lección actualizada' : 'Lección creada');
      if (createdId) onCreated?.(createdId);
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar la lección'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('El título es requerido');
      return;
    }
    saveMutation.mutate();
  }

  return (
    <EducationDialog open={open} onOpenChange={onOpenChange}>
      <EducationDialogContent>
        <EducationDialogHeader>
          <EducationDialogTitle>{isEdit ? 'Editar lección' : 'Nueva lección'}</EducationDialogTitle>
        </EducationDialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="lesson-title">Título</Label>
            <Input
              id="lesson-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder='Ej: "¿Qué es el discipulado?"'
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Módulo</Label>
              <EducationSelect
                value={moduleId ?? GENERAL_KEY}
                onValueChange={v => setModuleId(v === GENERAL_KEY ? null : v)}
              >
                <EducationSelectTrigger>
                  <EducationSelectValue />
                </EducationSelectTrigger>
                <EducationSelectContent>
                  <EducationSelectItem value={GENERAL_KEY}>General</EducationSelectItem>
                  {modules.map(m => (
                    <EducationSelectItem key={m.id} value={m.id}>
                      {m.title}
                    </EducationSelectItem>
                  ))}
                </EducationSelectContent>
              </EducationSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lesson-duration">Duración (min)</Label>
              <Input
                id="lesson-duration"
                type="number"
                min={0}
                value={duration}
                onChange={e => setDuration(e.target.value)}
                placeholder="15"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            El contenido por pasos y bloques se edita aparte, desde el editor de la lección.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending || !title.trim()}>
              {saveMutation.isPending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear lección'}
            </Button>
          </div>
        </form>
      </EducationDialogContent>
    </EducationDialog>
  );
}

/**
 * Module/lesson tree for `AdminCourseDetail` (PR-H, absorbs legacy
 * `LessonList.tsx`'s arrow-reorder pattern — dnd-kit doesn't land until
 * PR-I). Moving a lesson between modules and reordering within a module both
 * go through the SAME bulk `PUT .../lesson-order` call (PR-B's
 * `SetLessonOrder`) — recomputing the full course-wide sequence on every
 * mutation, per the design's own "bulk operation taking the full ordered
 * set" wording, rather than a partial per-row PATCH.
 */
export function ModuleLessonTree({
  curriculumId,
  canEdit,
}: {
  curriculumId: string;
  canEdit: boolean;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: modules = [], isLoading: loadingModules } = useCourseModules(curriculumId);
  const {
    data: lessons = [],
    isLoading: loadingLessons,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['education-lessons', curriculumId],
    queryFn: () => EducationService.getLessons(curriculumId),
  });

  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<EducationCourseModule | null>(null);
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<EducationLesson | null>(null);
  const [lessonDefaultModule, setLessonDefaultModule] = useState<string | null>(null);

  const groups = useMemo(() => buildGroups(modules, lessons), [modules, lessons]);

  const orderMutation = useMutation({
    mutationFn: (entries: LessonOrderEntry[]) =>
      EducationService.setLessonOrder(curriculumId, entries),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['education-lessons', curriculumId] }),
    onError: () => toast.error('No se pudo reordenar las lecciones'),
  });

  const deleteModuleMutation = useMutation({
    mutationFn: (id: string) => EducationService.deleteCourseModule(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['education-course-modules', curriculumId] });
      qc.invalidateQueries({ queryKey: ['education-lessons', curriculumId] });
      toast.success('Módulo eliminado — sus lecciones pasaron a "General"');
    },
    onError: () => toast.error('No se pudo eliminar el módulo'),
  });

  const deleteLessonMutation = useMutation({
    mutationFn: (lesson: EducationLesson) => EducationService.deleteLesson(lesson.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['education-lessons', curriculumId] });
      qc.invalidateQueries({ queryKey: ['education-curriculum', curriculumId] });
      qc.invalidateQueries({ queryKey: ['education-curricula'] });
      toast.success('Lección eliminada');
    },
    onError: () => toast.error('No se pudo eliminar la lección'),
  });

  function moveWithinModule(groupKey: string, index: number, direction: -1 | 1) {
    if (orderMutation.isPending) return;
    const nextGroups = groups.map(g => ({ ...g, lessons: [...g.lessons] }));
    const g = nextGroups.find(x => x.key === groupKey);
    if (!g) return;
    const target = index + direction;
    if (target < 0 || target >= g.lessons.length) return;
    [g.lessons[index], g.lessons[target]] = [g.lessons[target], g.lessons[index]];
    orderMutation.mutate(flattenToOrderEntries(nextGroups));
  }

  function moveToModule(lessonId: string, fromGroupKey: string, toModuleId: string | null) {
    if (orderMutation.isPending) return;
    const toGroupKey = toModuleId ?? GENERAL_KEY;
    if (fromGroupKey === toGroupKey) return;
    const nextGroups = groups.map(g => ({ ...g, lessons: [...g.lessons] }));
    const from = nextGroups.find(x => x.key === fromGroupKey);
    const to = nextGroups.find(x => x.key === toGroupKey);
    if (!from || !to) return;
    const idx = from.lessons.findIndex(l => l.id === lessonId);
    if (idx === -1) return;
    const [lesson] = from.lessons.splice(idx, 1);
    to.lessons.push(lesson);
    orderMutation.mutate(flattenToOrderEntries(nextGroups));
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md3-lg border border-destructive/30 bg-destructive/5 py-10 text-center">
        <p className="text-sm font-medium text-destructive">No se pudieron cargar las lecciones.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (loadingModules || loadingLessons) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-20 w-full rounded-md3" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListTree className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">
            {lessons.length} {lessons.length === 1 ? 'lección' : 'lecciones'} en {modules.length}{' '}
            módulo{modules.length === 1 ? '' : 's'}
          </h2>
        </div>
        {canEdit && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => {
              setEditingModule(null);
              setModuleDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nuevo módulo
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {groups
          .filter(g => g.module || g.lessons.length > 0 || modules.length === 0)
          .map(g => (
            <div key={g.key} className="overflow-hidden rounded-md3 border border-border bg-card">
              <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-2.5">
                <p className="flex-1 truncate text-sm font-semibold text-foreground">
                  {g.module?.title ?? 'General'}
                </p>
                {canEdit && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 text-xs"
                      onClick={() => {
                        setLessonDefaultModule(g.moduleId);
                        setEditingLesson(null);
                        setLessonDialogOpen(true);
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Lección
                    </Button>
                    {g.module && (
                      <EducationDropdownMenu>
                        <EducationDropdownMenuTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            aria-label="Acciones del módulo"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </EducationDropdownMenuTrigger>
                        <EducationDropdownMenuContent align="end">
                          <EducationDropdownMenuItem
                            onClick={() => {
                              setEditingModule(g.module);
                              setModuleDialogOpen(true);
                            }}
                          >
                            Editar módulo
                          </EducationDropdownMenuItem>
                          <EducationConfirmDialog
                            trigger={
                              <EducationDropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onSelect={e => e.preventDefault()}
                              >
                                Eliminar módulo
                              </EducationDropdownMenuItem>
                            }
                            title="¿Eliminar módulo?"
                            description={`Sus lecciones pasan al grupo "General", no se eliminan. No se puede deshacer.`}
                            confirmLabel="Eliminar módulo"
                            onConfirm={() => deleteModuleMutation.mutate(g.module!.id)}
                          />
                        </EducationDropdownMenuContent>
                      </EducationDropdownMenu>
                    )}
                  </>
                )}
              </div>

              {g.lessons.length === 0 ? (
                <p className="px-4 py-4 text-xs text-muted-foreground">Sin lecciones todavía.</p>
              ) : (
                <div className="divide-y divide-border">
                  {g.lessons.map((lesson, index) => (
                    <div key={lesson.id} className="flex items-center gap-3 p-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{lesson.title}</p>
                        {lesson.durationMinutes != null && (
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {lesson.durationMinutes} min
                          </p>
                        )}
                      </div>
                      {canEdit && (
                        <div className="flex shrink-0 items-center gap-0.5">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            disabled={index === 0 || orderMutation.isPending}
                            onClick={() => moveWithinModule(g.key, index, -1)}
                            aria-label="Mover arriba"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            disabled={index === g.lessons.length - 1 || orderMutation.isPending}
                            onClick={() => moveWithinModule(g.key, index, 1)}
                            aria-label="Mover abajo"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          {modules.length > 0 && (
                            <EducationSelect
                              value={g.key}
                              onValueChange={v =>
                                moveToModule(lesson.id, g.key, v === GENERAL_KEY ? null : v)
                              }
                            >
                              <EducationSelectTrigger className="h-8 w-[132px] text-xs">
                                <EducationSelectValue />
                              </EducationSelectTrigger>
                              <EducationSelectContent>
                                <EducationSelectItem value={GENERAL_KEY}>
                                  General
                                </EducationSelectItem>
                                {modules.map(m => (
                                  <EducationSelectItem key={m.id} value={m.id}>
                                    {m.title}
                                  </EducationSelectItem>
                                ))}
                              </EducationSelectContent>
                            </EducationSelect>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() =>
                              navigate(
                                `/dashboard/education/admin/cursos/${curriculumId}/leccion/${lesson.id}`
                              )
                            }
                            aria-label="Editar contenido"
                          >
                            <FileEdit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => {
                              setLessonDefaultModule(g.moduleId);
                              setEditingLesson(lesson);
                              setLessonDialogOpen(true);
                            }}
                            aria-label="Editar título/módulo"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <EducationConfirmDialog
                            trigger={
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive"
                                aria-label="Eliminar lección"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            }
                            title="¿Eliminar lección?"
                            description={`Se elimina "${lesson.title}". No se puede deshacer.`}
                            confirmLabel="Eliminar lección"
                            onConfirm={() => deleteLessonMutation.mutate(lesson)}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
      </div>

      <ModuleFormDialog
        open={moduleDialogOpen}
        onOpenChange={setModuleDialogOpen}
        curriculumId={curriculumId}
        module={editingModule}
      />
      <LessonFormDialog
        open={lessonDialogOpen}
        onOpenChange={setLessonDialogOpen}
        curriculumId={curriculumId}
        modules={modules}
        defaultModuleId={lessonDefaultModule}
        lesson={editingLesson}
      />
    </div>
  );
}
