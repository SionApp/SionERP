import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowDown,
  ArrowUp,
  Download,
  ListTree,
  Loader2,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EducationService } from '@/services/education.service';
import type { EducationLesson } from '@/types/education.types';

// ─────────────────────────────────────────────
// Crear/editar UNA lección — diálogo corto (título + contenido + adjunto
// opcional). La lista, el reorder y los adjuntos por fila viven afuera, en
// LessonList — nunca cramming de todo el CRUD en un solo modal.
// ─────────────────────────────────────────────
function LessonFormDialog({
  open,
  onOpenChange,
  curriculumId,
  lesson,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  curriculumId: string;
  lesson: EducationLesson | null; // null = crear
}) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEdit = !!lesson;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [attachment, setAttachment] = useState<{ path: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(lesson?.title ?? '');
    setContent(lesson?.content ?? '');
    setAttachment(
      lesson?.attachmentPath && lesson?.attachmentName
        ? { path: lesson.attachmentPath, name: lesson.attachmentName }
        : null
    );
  }, [lesson, open]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await EducationService.uploadLessonAttachment(curriculumId, file);
      setAttachment(uploaded);
    } catch {
      toast.error('No se pudo subir el adjunto');
    } finally {
      setUploading(false);
    }
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isEdit) {
        await EducationService.updateLesson(lesson!.id, {
          title: title.trim(),
          content: content.trim() || undefined,
          attachmentPath: attachment?.path,
          attachmentName: attachment?.name,
        });
      } else {
        await EducationService.createLesson(curriculumId, {
          title: title.trim(),
          content: content.trim() || undefined,
          attachmentPath: attachment?.path,
          attachmentName: attachment?.name,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['education-lessons', curriculumId] });
      qc.invalidateQueries({ queryKey: ['education-curriculum', curriculumId] });
      qc.invalidateQueries({ queryKey: ['education-curricula'] });
      onOpenChange(false);
      toast.success(isEdit ? 'Lección actualizada' : 'Lección creada');
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
    if (!content.trim() && !attachment) {
      toast.error('La lección necesita contenido, un adjunto, o ambos');
      return;
    }
    saveMutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar lección' : 'Nueva lección'}</DialogTitle>
        </DialogHeader>
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
          <div className="space-y-1.5">
            <Label htmlFor="lesson-content">Contenido</Label>
            <Textarea
              id="lesson-content"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Texto de la lección (opcional si adjuntás un archivo)"
              rows={6}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Adjunto</Label>
            {attachment ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-border p-2.5 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{attachment.name}</span>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  onClick={() => setAttachment(null)}
                  aria-label="Quitar adjunto"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Paperclip className="h-3.5 w-3.5" />
                )}
                {uploading ? 'Subiendo…' : 'Adjuntar archivo'}
              </Button>
            )}
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending || uploading}>
              {saveMutation.isPending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear lección'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// Empty state — distinto del empty state de CurriculumList: este vive dentro
// del detalle de un currículo puntual, no en el listado general.
// ─────────────────────────────────────────────
function EmptyLessons({ canCreate, onCreate }: { canCreate: boolean; onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <ListTree className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold">Todavía no hay lecciones</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          {canCreate
            ? 'Agregá la primera lección para que tu gente empiece a aprender.'
            : 'Este currículo todavía no tiene lecciones cargadas.'}
        </p>
      </div>
      {canCreate && (
        <Button size="sm" onClick={onCreate} className="mt-1 gap-1.5">
          <Plus className="h-4 w-4" />
          Nueva lección
        </Button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// LessonList — sección de lecciones dentro de CurriculumEditor (PR2c).
// Reordenar con flechas arriba/abajo: este codebase no tiene ninguna
// librería de drag-and-drop instalada (dnd-kit, react-beautiful-dnd, etc.) —
// se usa el mismo patrón de botones ya presente en reports/RoleManagementPage
// en vez de sumar una dependencia nueva sólo para esta sección.
// ─────────────────────────────────────────────
export function LessonList({ curriculumId, canEdit }: { curriculumId: string; canEdit: boolean }) {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<EducationLesson | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const {
    data: lessons = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['education-lessons', curriculumId],
    queryFn: () => EducationService.getLessons(curriculumId),
  });

  const reorderMutation = useMutation({
    mutationFn: (ordered: EducationLesson[]) =>
      EducationService.reorderLessons(
        curriculumId,
        ordered.map((l, i) => ({ id: l.id, orderIndex: i + 1 }))
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['education-lessons', curriculumId] }),
    onError: () => toast.error('No se pudo reordenar las lecciones'),
  });

  const deleteMutation = useMutation({
    mutationFn: (lesson: EducationLesson) => EducationService.deleteLesson(lesson.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['education-lessons', curriculumId] });
      qc.invalidateQueries({ queryKey: ['education-curriculum', curriculumId] });
      qc.invalidateQueries({ queryKey: ['education-curricula'] });
      toast.success('Lección eliminada');
    },
    onError: () => toast.error('No se pudo eliminar la lección'),
  });

  function openCreate() {
    setEditingLesson(null);
    setFormOpen(true);
  }

  function openEdit(lesson: EducationLesson) {
    setEditingLesson(lesson);
    setFormOpen(true);
  }

  function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= lessons.length || reorderMutation.isPending) return;
    const next = [...lessons];
    [next[index], next[target]] = [next[target], next[index]];
    reorderMutation.mutate(next);
  }

  async function handleOpenAttachment(path: string, lessonId: string) {
    setOpeningId(lessonId);
    try {
      const url = await EducationService.getLessonAttachmentSignedUrl(path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('No se pudo abrir el adjunto');
    } finally {
      setOpeningId(null);
    }
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 py-10 text-center">
        <p className="text-sm font-medium text-destructive">No se pudieron cargar las lecciones.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListTree className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">
            {lessons.length} {lessons.length === 1 ? 'lección' : 'lecciones'}
          </h2>
        </div>
        {canEdit && (
          <Button size="sm" onClick={openCreate} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Nueva lección
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : lessons.length === 0 ? (
        <EmptyLessons canCreate={canEdit} onCreate={openCreate} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border divide-y divide-border bg-card">
          {lessons.map((lesson, index) => (
            <div key={lesson.id} className="flex items-center gap-3 p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{lesson.title}</p>
                <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                  {lesson.attachmentName ? (
                    <>
                      <Paperclip className="h-3 w-3 shrink-0" />
                      <span className="truncate">{lesson.attachmentName}</span>
                    </>
                  ) : lesson.content ? (
                    lesson.content.slice(0, 80)
                  ) : (
                    'Sin contenido'
                  )}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                {canEdit && (
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      disabled={index === 0 || reorderMutation.isPending}
                      onClick={() => handleMove(index, -1)}
                      aria-label="Mover arriba"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      disabled={index === lessons.length - 1 || reorderMutation.isPending}
                      onClick={() => handleMove(index, 1)}
                      aria-label="Mover abajo"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {lesson.attachmentPath && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    disabled={openingId === lesson.id}
                    onClick={() => handleOpenAttachment(lesson.attachmentPath as string, lesson.id)}
                    aria-label="Ver adjunto"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
                {canEdit && (
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => openEdit(lesson)}
                      aria-label="Editar lección"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <ConfirmDialog
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
                      onConfirm={() => deleteMutation.mutate(lesson)}
                    />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <LessonFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        curriculumId={curriculumId}
        lesson={editingLesson}
      />
    </div>
  );
}
