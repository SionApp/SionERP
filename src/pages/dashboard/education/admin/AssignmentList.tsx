import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Calendar, Plus, UserMinus, UserPlus, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  EducationConfirmDialog,
  EducationDialog,
  EducationDialogContent,
  EducationDialogHeader,
  EducationDialogTitle,
} from '../ui';
import { cn } from '@/lib/utils';
import { EducationService } from '@/services/education.service';
import { UserSearchPicker } from '../../music/UserSearchPicker';
import type { EducationAssignment, EducationAssignmentStatus } from '@/types/education.types';
import type { User } from '@/types/user.types';

// `in_review`/`inactive` were added by the design-handoff spec (education-
// assignments DELTA) for a future server-side derivation (PR-K's analytics
// slice owns wiring the actual queue-based/inactivity logic) — no endpoint
// this component calls emits them yet, but `EducationAssignmentStatus` is a
// 6-value union so this Record must stay exhaustive.
const STATUS_LABEL: Record<EducationAssignmentStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  completed: 'Completado',
  overdue: 'Atrasado',
  in_review: 'En revisión',
  inactive: 'Inactivo',
};

const STATUS_PILL: Record<EducationAssignmentStatus, string> = {
  pending: 'bg-muted text-muted-foreground',
  in_progress: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  completed: 'bg-edu-container text-on-edu-container',
  overdue: 'bg-destructive/10 text-destructive',
  in_review: 'bg-edu-violet-container text-on-edu-violet-container',
  inactive: 'bg-muted text-muted-foreground/70',
};

const SOURCE_LABEL: Record<string, string> = {
  discipleship: 'Asignado por Discipulado',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function StatusPill({ status }: { status: EducationAssignmentStatus }) {
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

// ─────────────────────────────────────────────
// Diálogo "Asignar" — elegir a quién(es) asignar este curso. Corto y
// enfocado: buscador de usuarios (reutiliza UserSearchPicker de music, no se
// reinventa) + chips de los ya elegidos + fecha límite opcional. La lista con
// progreso por persona vive afuera, inline en la página — nunca todo
// amontonado en un solo modal.
// ─────────────────────────────────────────────
function AssignDialog({
  open,
  onOpenChange,
  curriculumId,
  excludeUserIds,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  curriculumId: string;
  excludeUserIds: Set<string>;
}) {
  const qc = useQueryClient();
  const [picked, setPicked] = useState<User[]>([]);
  const [dueDate, setDueDate] = useState('');

  const pickedIds = useMemo(() => new Set(picked.map(u => u.id)), [picked]);
  const excluded = useMemo(
    () => new Set([...excludeUserIds, ...pickedIds]),
    [excludeUserIds, pickedIds]
  );

  function reset() {
    setPicked([]);
    setDueDate('');
  }

  const assignMutation = useMutation({
    mutationFn: () =>
      EducationService.createAssignments({
        curriculumId,
        userIds: picked.map(u => u.id),
        dueDate: dueDate || undefined,
      }),
    onSuccess: result => {
      qc.invalidateQueries({ queryKey: ['education-curriculum-progress', curriculumId] });
      reset();
      onOpenChange(false);
      toast.success(result.message);
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : 'No se pudo asignar el curso'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (picked.length === 0) {
      toast.error('Elegí al menos una persona');
      return;
    }
    assignMutation.mutate();
  }

  return (
    <EducationDialog
      open={open}
      onOpenChange={o => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <EducationDialogContent className="sm:max-w-lg">
        <EducationDialogHeader>
          <EducationDialogTitle>Asignar curso</EducationDialogTitle>
        </EducationDialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Personas</Label>
            <UserSearchPicker
              excludeUserIds={excluded}
              placeholder="Buscar por nombre, email o documento…"
              onPick={u => {
                if (!u) return;
                setPicked(prev => [...prev, u]);
              }}
            />
            {picked.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1.5">
                {picked.map(u => (
                  <span
                    key={u.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium"
                  >
                    {u.first_name} {u.last_name}
                    <button
                      type="button"
                      onClick={() => setPicked(prev => prev.filter(p => p.id !== u.id))}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={`Quitar a ${u.first_name}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {picked.length === 0
                ? 'Buscá y elegí a quiénes asignar. Podés elegir varias personas antes de confirmar.'
                : `${picked.length} persona${picked.length !== 1 ? 's' : ''} elegida${picked.length !== 1 ? 's' : ''}.`}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="assign-due-date">Fecha límite (opcional)</Label>
            <Input
              id="assign-due-date"
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full sm:w-56"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={assignMutation.isPending || picked.length === 0}>
              {assignMutation.isPending ? 'Asignando…' : 'Asignar'}
            </Button>
          </div>
        </form>
      </EducationDialogContent>
    </EducationDialog>
  );
}

// ─────────────────────────────────────────────
// Empty state — distinto del de lecciones: acá "vacío" significa que nadie
// tiene este curso asignado todavía.
// ─────────────────────────────────────────────
function EmptyAssignments({ canManage, onAssign }: { canManage: boolean; onAssign: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md3-lg border border-dashed border-edu-outline bg-edu-surface py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-edu-container text-on-edu-container">
        <Users className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold">Nadie tiene este curso asignado</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          {canManage
            ? 'Asigná este curso a las personas que van a cursarlo.'
            : 'Todavía no hay personas asignadas a este curso.'}
        </p>
      </div>
      {canManage && (
        <Button size="sm" onClick={onAssign} className="mt-1 gap-1.5">
          <UserPlus className="h-4 w-4" />
          Asignar
        </Button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// AssignmentList — sección de asignaciones dentro de AdminCourseDetail
// (PR-H, moved from `education/AssignmentList.tsx`, migrated to the
// education/ui/* portal wrappers as part of the move since this file is no
// longer transitional). Solo se monta cuando canManage=true (nivel ≥ 3): el
// endpoint que la alimenta (GET /curricula/:id/progress) ya exige ese mismo
// nivel en el backend, así que ocultarla para nivel 1 es coherente con la
// autoridad real, no solo cosmético.
// ─────────────────────────────────────────────
export function AssignmentList({
  curriculumId,
  canManage,
}: {
  curriculumId: string;
  canManage: boolean;
}) {
  const qc = useQueryClient();
  const [assignOpen, setAssignOpen] = useState(false);

  const {
    data: assignments = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['education-curriculum-progress', curriculumId],
    queryFn: () => EducationService.getCurriculumProgress(curriculumId),
    enabled: canManage,
  });

  const unassignMutation = useMutation({
    mutationFn: (assignmentId: string) => EducationService.deleteAssignment(assignmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['education-curriculum-progress', curriculumId] });
      toast.success('Asignación eliminada');
    },
    onError: () => toast.error('No se pudo eliminar la asignación'),
  });

  const assignedUserIds = useMemo(() => new Set(assignments.map(a => a.assignedTo)), [assignments]);

  if (!canManage) return null;

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md3-lg border border-destructive/30 bg-destructive/5 py-10 text-center">
        <p className="text-sm font-medium text-destructive">
          No se pudieron cargar las asignaciones.
        </p>
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
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">
            {assignments.length} {assignments.length === 1 ? 'asignación' : 'asignaciones'}
          </h2>
        </div>
        {assignments.length > 0 && (
          <Button size="sm" onClick={() => setAssignOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Asignar
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : assignments.length === 0 ? (
        <EmptyAssignments canManage={canManage} onAssign={() => setAssignOpen(true)} />
      ) : (
        <div className="overflow-hidden rounded-md3-lg border border-border divide-y divide-border bg-card">
          {assignments.map(a => {
            const percent = a.totalLessons > 0 ? (a.completedLessons / a.totalLessons) * 100 : 0;
            return (
              <div key={a.id} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium">
                      {a.assignedToName?.trim() || a.assignedToEmail || a.assignedTo}
                    </p>
                    <StatusPill status={a.status} />
                    {a.sourceModule && (
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        {SOURCE_LABEL[a.sourceModule] ?? 'Asignado por otro módulo'}
                      </span>
                    )}
                  </div>
                  {a.assignedToEmail && a.assignedToName && (
                    <p className="truncate text-xs text-muted-foreground">{a.assignedToEmail}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <Progress value={percent} className="h-1.5 max-w-[12rem]" />
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {a.completedLessons}/{a.totalLessons} lecciones
                    </span>
                  </div>
                  {a.dueDate && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      Vence {formatDate(a.dueDate)}
                    </p>
                  )}
                </div>
                <EducationConfirmDialog
                  trigger={
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0 text-destructive"
                      aria-label="Quitar asignación"
                      disabled={unassignMutation.isPending}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  }
                  title="¿Quitar asignación?"
                  description={`Se quita a "${a.assignedToName?.trim() || a.assignedToEmail || 'esta persona'}" de este curso, junto con su progreso registrado. No se puede deshacer.`}
                  confirmLabel="Quitar asignación"
                  onConfirm={() => unassignMutation.mutate(a.id)}
                />
              </div>
            );
          })}
        </div>
      )}

      <AssignDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        curriculumId={curriculumId}
        excludeUserIds={assignedUserIds}
      />
    </div>
  );
}
