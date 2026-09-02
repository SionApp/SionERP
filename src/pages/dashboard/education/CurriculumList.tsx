import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BookOpen, MoreVertical, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { MobileListItem } from '@/components/mobile/MobileListItem';
import { useMobileMode } from '@/hooks/useMobileMode';
import { cn } from '@/lib/utils';
import { EducationService } from '@/services/education.service';
import type {
  CreateCurriculumRequest,
  EducationCadence,
  EducationCurriculum,
  EducationCurriculumStatus,
} from '@/types/education.types';

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

function StatusPill({ status }: { status: EducationCurriculumStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        STATUS_PILL[status]
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ─────────────────────────────────────────────
// Crear currículo — diálogo corto (solo nombre + cadencia). El resto
// (descripción, lecciones) se completa en la página de detalle, nunca acá.
// ─────────────────────────────────────────────
function CreateCurriculumDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<{ name: string; cadence: EducationCadence }>({
    name: '',
    cadence: 'weekly',
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateCurriculumRequest) => EducationService.createCurriculum(data),
    onSuccess: ({ id }) => {
      qc.invalidateQueries({ queryKey: ['education-curricula'] });
      onOpenChange(false);
      setForm({ name: '', cadence: 'weekly' });
      toast.success('Currículo creado');
      navigate(`/dashboard/education/curricula/${id}`);
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : 'No se pudo crear el currículo'),
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    createMutation.mutate({ name: form.name.trim(), cadence: form.cadence });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo currículo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="curr-name">Nombre</Label>
            <Input
              id="curr-name"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder='Ej: "Fundamentos de la fe"'
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Cadencia</Label>
            <Select
              value={form.cadence}
              onValueChange={v => setForm(p => ({ ...p, cadence: v as EducationCadence }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="quarterly">Trimestral</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Podés agregar descripción y lecciones después, desde el detalle del currículo.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creando…' : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────
function EmptyCurricula({ canCreate, onCreate }: { canCreate: boolean; onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <BookOpen className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold">Todavía no hay currículos</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          {canCreate
            ? 'Creá el primero para empezar a organizar lecciones y asignarlas a tu gente.'
            : 'Pedile a un autor del módulo que cree el primer currículo.'}
        </p>
      </div>
      {canCreate && (
        <Button size="sm" onClick={onCreate} className="mt-1 gap-1.5">
          <Plus className="h-4 w-4" />
          Nuevo currículo
        </Button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Fila de acciones — publicar/archivar/eliminar según nivel
// ─────────────────────────────────────────────
function CurriculumActions({
  curriculum,
  level,
  onChanged,
}: {
  curriculum: EducationCurriculum;
  level: number;
  onChanged: () => void;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const statusMutation = useMutation({
    mutationFn: (status: EducationCurriculumStatus) =>
      EducationService.updateCurriculumStatus(curriculum.id, status),
    onSuccess: (_data, status) => {
      qc.invalidateQueries({ queryKey: ['education-curricula'] });
      onChanged();
      toast.success(status === 'published' ? 'Currículo publicado' : 'Currículo archivado');
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar el estado'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => EducationService.deleteCurriculum(curriculum.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['education-curricula'] });
      onChanged();
      toast.success('Currículo eliminado');
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar el currículo'),
  });

  const canArchive = level >= 5;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Acciones">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => navigate(`/dashboard/education/curricula/${curriculum.id}`)}
        >
          Editar
        </DropdownMenuItem>
        {curriculum.status === 'draft' && (
          <DropdownMenuItem onClick={() => statusMutation.mutate('published')}>
            Publicar
          </DropdownMenuItem>
        )}
        {curriculum.status === 'published' && canArchive && (
          <DropdownMenuItem onClick={() => statusMutation.mutate('archived')}>
            Archivar
          </DropdownMenuItem>
        )}
        {curriculum.status === 'archived' && canArchive && (
          <DropdownMenuItem onClick={() => statusMutation.mutate('draft')}>
            Volver a borrador
          </DropdownMenuItem>
        )}
        {canArchive && (
          <>
            <DropdownMenuSeparator />
            <ConfirmDialog
              trigger={
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={e => e.preventDefault()}
                >
                  Eliminar
                </DropdownMenuItem>
              }
              title="¿Eliminar currículo?"
              description={`Se elimina "${curriculum.name}" junto con todas sus lecciones. No se puede deshacer.`}
              confirmLabel="Eliminar currículo"
              onConfirm={() => deleteMutation.mutate()}
            />
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─────────────────────────────────────────────
// CurriculumList — vista principal de administración (autores, nivel ≥ 3)
// ─────────────────────────────────────────────
export function CurriculumList({ level }: { level: number }) {
  const navigate = useNavigate();
  const isMobileApp = useMobileMode();
  const [createOpen, setCreateOpen] = useState(false);
  const canCreate = level >= 3;

  const {
    data: curricula = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['education-curricula'],
    queryFn: () => EducationService.getCurricula(),
  });

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 py-12 text-center">
        <p className="text-sm font-medium text-destructive">
          No se pudieron cargar los currículos.
        </p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (isMobileApp) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            {curricula.length} currículo{curricula.length !== 1 ? 's' : ''}
          </p>
          {canCreate && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground active:scale-95 transition-transform"
              aria-label="Nuevo currículo"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2 px-1">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : curricula.length === 0 ? (
          <EmptyCurricula canCreate={canCreate} onCreate={() => setCreateOpen(true)} />
        ) : (
          <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden bg-card">
            {curricula.map(c => (
              <MobileListItem
                key={c.id}
                title={c.name}
                subtitle={`${CADENCE_LABEL[c.cadence]} · ${c.lessonCount} ${c.lessonCount === 1 ? 'lección' : 'lecciones'}`}
                trailing={<StatusPill status={c.status} />}
                onClick={() => navigate(`/dashboard/education/curricula/${c.id}`)}
              />
            ))}
          </div>
        )}

        <CreateCurriculumDialog open={createOpen} onOpenChange={setCreateOpen} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {curricula.length} currículo{curricula.length !== 1 ? 's' : ''}
        </p>
        {canCreate && (
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Nuevo currículo
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : curricula.length === 0 ? (
        <EmptyCurricula canCreate={canCreate} onCreate={() => setCreateOpen(true)} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Nombre</TableHead>
                <TableHead>Cadencia</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Lecciones</TableHead>
                <TableHead>Actualizado</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {curricula.map(c => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/dashboard/education/curricula/${c.id}`)}
                >
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {CADENCE_LABEL[c.cadence]}
                  </TableCell>
                  <TableCell>
                    <StatusPill status={c.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {c.lessonCount}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(c.updatedAt)}</TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <CurriculumActions curriculum={c} level={level} onChanged={() => refetch()} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateCurriculumDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
