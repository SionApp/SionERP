import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, ChevronLeft, ListTree, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { MobileScreen } from '@/components/mobile/MobileScreen';
import { useMobileMode } from '@/hooks/useMobileMode';
import { cn } from '@/lib/utils';
import { EducationService } from '@/services/education.service';
import { useEducationAccess } from './use-education-access';
import type { EducationCadence, EducationCurriculumStatus } from '@/types/education.types';

const CADENCE_LABEL: Record<EducationCadence, string> = {
  weekly: 'Semanal',
  quarterly: 'Trimestral',
};

const STATUS_LABEL: Record<EducationCurriculumStatus, string> = {
  draft: 'Borrador',
  published: 'Publicado',
  archived: 'Archivado',
};

const STATUS_PILL: Record<EducationCurriculumStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  published: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  archived: 'bg-outline/10 text-outline',
};

export default function CurriculumEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobileApp = useMobileMode();
  const qc = useQueryClient();
  const { level, isModuleAdmin, loadingAccess } = useEducationAccess();

  const {
    data: curriculum,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['education-curriculum', id],
    queryFn: () => EducationService.getCurriculumById(id as string),
    enabled: !!id,
  });

  const [form, setForm] = useState<{
    name: string;
    description: string;
    cadence: EducationCadence;
  }>({ name: '', description: '', cadence: 'weekly' });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!curriculum) return;
    setForm({
      name: curriculum.name,
      description: curriculum.description ?? '',
      cadence: curriculum.cadence,
    });
    setDirty(false);
  }, [curriculum]);

  const saveMutation = useMutation({
    mutationFn: () =>
      EducationService.updateCurriculum(id as string, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        cadence: form.cadence,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['education-curriculum', id] });
      qc.invalidateQueries({ queryKey: ['education-curricula'] });
      setDirty(false);
      toast.success('Currículo actualizado');
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar'),
  });

  const statusMutation = useMutation({
    mutationFn: (status: EducationCurriculumStatus) =>
      EducationService.updateCurriculumStatus(id as string, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['education-curriculum', id] });
      qc.invalidateQueries({ queryKey: ['education-curricula'] });
      toast.success('Estado actualizado');
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar el estado'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => EducationService.deleteCurriculum(id as string),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['education-curricula'] });
      toast.success('Currículo eliminado');
      navigate('/dashboard/education');
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    saveMutation.mutate();
  }

  const canEdit = level >= 3;
  const canArchive = isModuleAdmin;

  const body =
    loadingAccess || isLoading ? (
      <div className="space-y-4">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-9 w-1/3" />
      </div>
    ) : isError || !curriculum ? (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 py-12 text-center">
        <AlertTriangle className="h-6 w-6 text-destructive" />
        <p className="text-sm font-medium text-destructive">
          No se encontró el currículo, o no tenés acceso.
        </p>
        <Button size="sm" variant="outline" onClick={() => navigate('/dashboard/education')}>
          Volver
        </Button>
      </div>
    ) : (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
              STATUS_PILL[curriculum.status]
            )}
          >
            {STATUS_LABEL[curriculum.status]}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {curriculum.status === 'draft' && canEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => statusMutation.mutate('published')}
                disabled={statusMutation.isPending}
              >
                Publicar
              </Button>
            )}
            {curriculum.status === 'published' && canArchive && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => statusMutation.mutate('archived')}
                disabled={statusMutation.isPending}
              >
                Archivar
              </Button>
            )}
            {curriculum.status === 'archived' && canArchive && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => statusMutation.mutate('draft')}
                disabled={statusMutation.isPending}
              >
                Volver a borrador
              </Button>
            )}
            {canArchive && (
              <ConfirmDialog
                trigger={
                  <Button size="sm" variant="ghost" className="gap-1.5 text-destructive">
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                  </Button>
                }
                title="¿Eliminar currículo?"
                description={`Se elimina "${curriculum.name}" junto con todas sus lecciones. No se puede deshacer.`}
                confirmLabel="Eliminar currículo"
                onConfirm={() => deleteMutation.mutate()}
              />
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ce-name">Nombre</Label>
            <Input
              id="ce-name"
              value={form.name}
              onChange={e => {
                setForm(p => ({ ...p, name: e.target.value }));
                setDirty(true);
              }}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ce-description">Descripción</Label>
            <Textarea
              id="ce-description"
              value={form.description}
              onChange={e => {
                setForm(p => ({ ...p, description: e.target.value }));
                setDirty(true);
              }}
              placeholder="¿De qué trata este currículo? (opcional)"
              rows={4}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Cadencia</Label>
            <Select
              value={form.cadence}
              onValueChange={v => {
                setForm(p => ({ ...p, cadence: v as EducationCadence }));
                setDirty(true);
              }}
              disabled={!canEdit}
            >
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="quarterly">Trimestral</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {canEdit && (
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="submit"
                disabled={!dirty || saveMutation.isPending || !form.name.trim()}
              >
                {saveMutation.isPending ? 'Guardando…' : 'Guardar cambios'}
              </Button>
            </div>
          )}
        </form>

        {/* Lecciones — el editor completo llega en PR2c; acá solo el conteo. */}
        <div className="rounded-2xl border border-dashed border-border p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <ListTree className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">
                {curriculum.lessonCount} {curriculum.lessonCount === 1 ? 'lección' : 'lecciones'}
              </p>
              <p className="text-xs text-muted-foreground">
                El editor de lecciones llega próximamente.
              </p>
            </div>
          </div>
        </div>
      </div>
    );

  if (isMobileApp) {
    return (
      <MobileScreen title={curriculum?.name ?? 'Currículo'} back="/dashboard/education">
        <div className="px-4 py-4">{body}</div>
      </MobileScreen>
    );
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate('/dashboard/education')}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Currículos
      </button>
      <h1 className="text-2xl font-semibold leading-tight">{curriculum?.name ?? 'Currículo'}</h1>
      {body}
    </div>
  );
}
