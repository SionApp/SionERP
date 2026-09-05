import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BookOpen,
  FileQuestion,
  Filter,
  GraduationCap,
  ListTree,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MobileListItem } from '@/components/mobile/MobileListItem';
import { useMobileMode } from '@/hooks/useMobileMode';
import { cn } from '@/lib/utils';
import { EducationService } from '@/services/education.service';
import { useEducationAccess } from '../use-education-access';
import { useAdminCurricula, useReviewQueue } from '../hooks/use-education-queries';
import {
  EducationConfirmDialog,
  EducationDropdownMenu,
  EducationDropdownMenuContent,
  EducationDropdownMenuItem,
  EducationDropdownMenuSeparator,
  EducationDropdownMenuTrigger,
  EducationPopover,
  EducationPopoverContent,
  EducationPopoverTrigger,
  EducationSelect,
  EducationSelectContent,
  EducationSelectItem,
  EducationSelectTrigger,
  EducationSelectValue,
} from '../ui';
import { CourseFormDialog } from './CourseFormDialog';
import type {
  EducationCurriculum,
  EducationCurriculumStatus,
  EducationTrack,
} from '@/types/education.types';

const STATUS_LABEL: Record<EducationCurriculumStatus, string> = {
  draft: 'Borrador',
  review: 'Revisión',
  published: 'Publicado',
  archived: 'Archivado',
};

// Exact palettes from the design spec (README §7): Publicado reuses the
// edu-container/on-edu-container pair (verified an exact hex match to the
// design's own literal value), Revisión reuses edu-violet-container (same
// PR-D pair, also an exact match). Borrador/Archivado aren't in the design's
// literal 3-state example but follow the same low-emphasis system-muted
// precedent the now-deleted legacy CurriculumList.tsx used.
const STATUS_PILL: Record<EducationCurriculumStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  review: 'bg-edu-violet-container text-on-edu-violet-container',
  published: 'bg-edu-container text-on-edu-container',
  archived: 'bg-muted/70 text-muted-foreground/70',
};

function StatusPill({ status }: { status: EducationCurriculumStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-medium leading-none',
        STATUS_PILL[status]
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

// Exported so `StudentProgress.tsx` (PR-K) reuses the SAME 4-KPI-card
// pattern instead of rebuilding it — design note: "same pattern exactly as
// the KPIs of the main dashboard", not the green education tint.
export interface KpiCardProps {
  label: string;
  value: number;
  foot: string;
  icon: typeof BookOpen;
  containerClass: string;
  onClass: string;
  /** Mobile handoff, screens 7/10 ("KPIs en grid 2×2"): smaller padding
   * (14px vs 20px), 30px icon container (17px icon) instead of 42px (22px),
   * 26px value instead of 40px, 11px label / 10px foot instead of 13px.
   * Shared by AdminCourseList (screen 7) and StudentProgress (screen 10) —
   * both mobile screens get this for free from one fix. */
  compact?: boolean;
}

export function KpiCard({
  label,
  value,
  foot,
  icon: Icon,
  containerClass,
  onClass,
  compact = false,
}: KpiCardProps) {
  return (
    // Design (README §7): "mismo patrón exacto que los KPIs del dashboard
    // principal" — DashboardHome.tsx's own KPI cards use `bg-surface-container`
    // (not bare `bg-surface`, which resolves to the same value as the page
    // background and renders with no visible frame), deliberately NOT the
    // green education tint (this card family matches the main app's
    // dashboard, not the student-facing green sub-brand).
    <div className={cn('rounded-md3-lg bg-surface-container', compact ? 'p-3.5' : 'p-5')}>
      <div className="flex items-start justify-between">
        <p
          className={cn(
            'font-medium text-muted-foreground',
            compact ? 'text-[11px]' : 'text-[13px]'
          )}
        >
          {label}
        </p>
        <div
          className={cn(
            'flex items-center justify-center rounded-md3-sm',
            compact ? 'h-[30px] w-[30px]' : 'h-[42px] w-[42px]',
            containerClass,
            onClass
          )}
        >
          <Icon className={compact ? 'h-[17px] w-[17px]' : 'h-[22px] w-[22px]'} />
        </div>
      </div>
      <p
        className={cn(
          'font-medium leading-none text-foreground',
          compact ? 'my-2 text-[26px]' : 'my-3 text-[40px]'
        )}
      >
        {value}
      </p>
      <p className={cn('text-muted-foreground', compact ? 'text-[10px]' : 'text-[13px]')}>{foot}</p>
    </div>
  );
}

function EmptyCourses({
  canCreate,
  onCreate,
  hasFilter,
  onClearFilter,
}: {
  canCreate: boolean;
  onCreate: () => void;
  /** True zero-courses vs. "search/filter matched nothing" are different
   * states (same distinction CourseCatalog's own EmptyCatalog already
   * makes) — this list gained a mobile-only search, so hitting it became
   * possible here too, and the CTA needs to change: a search with no hits
   * shouldn't invite creating a course. */
  hasFilter?: boolean;
  onClearFilter?: () => void;
}) {
  if (hasFilter) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md3-lg border border-dashed border-edu-outline bg-edu-surface py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-edu-container text-on-edu-container">
          <BookOpen className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">Ningún curso coincide</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Probá con otro término, o quitá los filtros.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onClearFilter}>
          Quitar filtros
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-md3-lg border border-dashed border-edu-outline bg-edu-surface py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-edu-container text-on-edu-container">
        <BookOpen className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">Todavía no hay cursos</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          {canCreate
            ? 'Creá el primero para empezar a organizar módulos y lecciones.'
            : 'Pedile a un autor del módulo que cree el primer curso.'}
        </p>
      </div>
      {canCreate && (
        <Button size="sm" onClick={onCreate} className="mt-1 gap-1.5">
          <Plus className="h-4 w-4" />
          Nuevo curso
        </Button>
      )}
    </div>
  );
}

function CourseRowActions({
  curriculum,
  canArchive,
  onEdit,
}: {
  curriculum: EducationCurriculum;
  canArchive: boolean;
  onEdit: () => void;
}) {
  const qc = useQueryClient();

  const statusMutation = useMutation({
    mutationFn: (status: EducationCurriculumStatus) =>
      EducationService.updateCurriculumStatus(curriculum.id, status),
    onSuccess: (_d, status) => {
      qc.invalidateQueries({ queryKey: ['education-curricula'] });
      toast.success(status === 'published' ? 'Curso publicado' : 'Curso archivado');
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar el estado'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => EducationService.deleteCurriculum(curriculum.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['education-curricula'] });
      toast.success('Curso eliminado');
    },
    onError: () => toast.error('No se pudo eliminar el curso'),
  });

  return (
    <div className="flex items-center justify-end gap-0.5" onClick={e => e.stopPropagation()}>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        onClick={onEdit}
        aria-label="Editar curso"
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <EducationDropdownMenu>
        <EducationDropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Más acciones">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </EducationDropdownMenuTrigger>
        <EducationDropdownMenuContent align="end">
          {curriculum.status === 'draft' && (
            <EducationDropdownMenuItem onClick={() => statusMutation.mutate('published')}>
              Publicar
            </EducationDropdownMenuItem>
          )}
          {curriculum.status === 'published' && canArchive && (
            <EducationDropdownMenuItem onClick={() => statusMutation.mutate('archived')}>
              Archivar
            </EducationDropdownMenuItem>
          )}
          {curriculum.status === 'archived' && canArchive && (
            <EducationDropdownMenuItem onClick={() => statusMutation.mutate('draft')}>
              Volver a borrador
            </EducationDropdownMenuItem>
          )}
          {canArchive && (
            <>
              <EducationDropdownMenuSeparator />
              <EducationConfirmDialog
                trigger={
                  <EducationDropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={e => e.preventDefault()}
                  >
                    Eliminar
                  </EducationDropdownMenuItem>
                }
                title="¿Eliminar curso?"
                description={`Se elimina "${curriculum.name}" junto con sus módulos y lecciones. No se puede deshacer.`}
                confirmLabel="Eliminar curso"
                onConfirm={() => deleteMutation.mutate()}
              />
            </>
          )}
        </EducationDropdownMenuContent>
      </EducationDropdownMenu>
    </div>
  );
}

const TRACK_FILTER_OPTIONS: { value: EducationTrack; label: string }[] = [
  { value: 'discipulado', label: 'Discipulado' },
  { value: 'servicio', label: 'Servicio' },
  { value: 'liderazgo', label: 'Liderazgo' },
  { value: 'familia', label: 'Familia' },
  { value: 'formacion', label: 'Formación' },
];

export default function AdminCourseList() {
  const navigate = useNavigate();
  const isMobileApp = useMobileMode();
  const { level } = useEducationAccess();
  const canCreate = level >= 3;
  const canArchive = level >= 5;

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<EducationCurriculum | null>(null);
  const [statusFilter, setStatusFilter] = useState<EducationCurriculumStatus | 'all'>('all');
  const [trackFilter, setTrackFilter] = useState<EducationTrack | 'all'>('all');
  // Mobile-only search bar (design mobile handoff, screen 7) — the desktop
  // course list has no search, so this filters client-side over the
  // already-fetched list rather than adding a new backend query param.
  const [query, setQuery] = useState('');

  const { data: curricula = [], isLoading, isError, refetch } = useAdminCurricula();
  const { data: reviewQueue = [] } = useReviewQueue();

  const filtered = useMemo(
    () =>
      curricula.filter(
        c =>
          (statusFilter === 'all' || c.status === statusFilter) &&
          (trackFilter === 'all' || c.track === trackFilter) &&
          c.name.toLowerCase().includes(query.trim().toLowerCase())
      ),
    [curricula, statusFilter, trackFilter, query]
  );

  const kpis = useMemo(() => {
    const published = curricula.filter(c => c.status === 'published').length;
    const draft = curricula.filter(c => c.status === 'draft').length;
    const totalStudents = curricula.reduce((sum, c) => sum + c.studentCount, 0);
    const totalLessons = curricula.reduce((sum, c) => sum + c.lessonCount, 0);
    return { published, draft, totalStudents, totalLessons };
  }, [curricula]);

  const activeFilterCount = (statusFilter !== 'all' ? 1 : 0) + (trackFilter !== 'all' ? 1 : 0);

  function openEdit(c: EducationCurriculum) {
    setEditing(c);
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md3-lg border border-destructive/30 bg-destructive/5 py-12 text-center">
        <p className="text-sm font-medium text-destructive">No se pudieron cargar los cursos.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label={isMobileApp ? 'Publicados' : 'Cursos publicados'}
          value={kpis.published}
          foot={`${kpis.draft} en borrador`}
          icon={BookOpen}
          containerClass="bg-edu-blue-container"
          onClass="text-on-edu-blue-container"
          compact={isMobileApp}
        />
        <KpiCard
          label={isMobileApp ? 'Alumnos' : 'Alumnos inscritos'}
          value={kpis.totalStudents}
          foot={`En ${kpis.published} curso${kpis.published === 1 ? '' : 's'} publicados`}
          icon={Users}
          containerClass="bg-edu-container"
          onClass="text-on-edu-container"
          compact={isMobileApp}
        />
        <KpiCard
          label="Lecciones"
          value={kpis.totalLessons}
          foot={`En ${curricula.length} curso${curricula.length === 1 ? '' : 's'}`}
          icon={ListTree}
          containerClass="bg-edu-violet-container"
          onClass="text-on-edu-violet-container"
          compact={isMobileApp}
        />
        <KpiCard
          label="Por revisar"
          value={reviewQueue.length}
          foot="Respuestas abiertas"
          icon={FileQuestion}
          containerClass="bg-edu-orange-container"
          onClass="text-on-edu-orange-container"
          compact={isMobileApp}
        />
      </div>

      {/* Mobile-only search + filter row (design mobile handoff, screen 7:
          "Buscador + filtro") — replaces the desktop card header's inline
          "Filtros" button, which stays for desktop below. */}
      {isMobileApp && (
        <div className="flex items-center gap-2.5">
          <div className="flex flex-1 items-center gap-2 rounded-full bg-surface-variant px-4 py-2.5">
            <Search className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar un curso…"
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <EducationPopover>
            <EducationPopoverTrigger asChild>
              <button
                type="button"
                aria-label="Filtros"
                className="relative flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] border border-border"
              >
                <Filter className="h-[18px] w-[18px]" />
                {activeFilterCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-edu-primary px-1 text-[10px] font-semibold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </EducationPopoverTrigger>
            <EducationPopoverContent align="end" className="w-64 space-y-3">
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Estado</p>
                <EducationSelect
                  value={statusFilter}
                  onValueChange={v => setStatusFilter(v as EducationCurriculumStatus | 'all')}
                >
                  <EducationSelectTrigger>
                    <EducationSelectValue />
                  </EducationSelectTrigger>
                  <EducationSelectContent>
                    <EducationSelectItem value="all">Todos</EducationSelectItem>
                    <EducationSelectItem value="draft">Borrador</EducationSelectItem>
                    <EducationSelectItem value="review">Revisión</EducationSelectItem>
                    <EducationSelectItem value="published">Publicado</EducationSelectItem>
                    <EducationSelectItem value="archived">Archivado</EducationSelectItem>
                  </EducationSelectContent>
                </EducationSelect>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Track</p>
                <EducationSelect
                  value={trackFilter}
                  onValueChange={v => setTrackFilter(v as EducationTrack | 'all')}
                >
                  <EducationSelectTrigger>
                    <EducationSelectValue />
                  </EducationSelectTrigger>
                  <EducationSelectContent>
                    <EducationSelectItem value="all">Todos</EducationSelectItem>
                    {TRACK_FILTER_OPTIONS.map(opt => (
                      <EducationSelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </EducationSelectItem>
                    ))}
                  </EducationSelectContent>
                </EducationSelect>
              </div>
            </EducationPopoverContent>
          </EducationPopover>
        </div>
      )}

      <div className="overflow-hidden rounded-md3-lg border border-border bg-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-[18px]">
          <h3 className="text-[17px] font-medium text-foreground">Cursos</h3>
          <span className="rounded-full bg-edu-container px-2.5 py-1 text-[11px] font-semibold text-on-edu-container">
            {curricula.length} activo{curricula.length === 1 ? '' : 's'}
          </span>
          <div className="flex-1" />
          {!isMobileApp && (
            <EducationPopover>
              <EducationPopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Filter className="h-4 w-4" />
                  Filtros
                  {activeFilterCount > 0 && (
                    <span className="rounded-full bg-edu-primary px-1.5 text-[10px] font-semibold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </EducationPopoverTrigger>
              <EducationPopoverContent align="end" className="w-64 space-y-3">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Estado</p>
                  <EducationSelect
                    value={statusFilter}
                    onValueChange={v => setStatusFilter(v as EducationCurriculumStatus | 'all')}
                  >
                    <EducationSelectTrigger>
                      <EducationSelectValue />
                    </EducationSelectTrigger>
                    <EducationSelectContent>
                      <EducationSelectItem value="all">Todos</EducationSelectItem>
                      <EducationSelectItem value="draft">Borrador</EducationSelectItem>
                      <EducationSelectItem value="review">Revisión</EducationSelectItem>
                      <EducationSelectItem value="published">Publicado</EducationSelectItem>
                      <EducationSelectItem value="archived">Archivado</EducationSelectItem>
                    </EducationSelectContent>
                  </EducationSelect>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Track</p>
                  <EducationSelect
                    value={trackFilter}
                    onValueChange={v => setTrackFilter(v as EducationTrack | 'all')}
                  >
                    <EducationSelectTrigger>
                      <EducationSelectValue />
                    </EducationSelectTrigger>
                    <EducationSelectContent>
                      <EducationSelectItem value="all">Todos</EducationSelectItem>
                      {TRACK_FILTER_OPTIONS.map(opt => (
                        <EducationSelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </EducationSelectItem>
                      ))}
                    </EducationSelectContent>
                  </EducationSelect>
                </div>
              </EducationPopoverContent>
            </EducationPopover>
          )}
          {!isMobileApp && canCreate && (
            <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Nuevo curso
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2 p-[22px]">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-[22px]">
            <EmptyCourses
              canCreate={canCreate}
              onCreate={() => setCreateOpen(true)}
              hasFilter={activeFilterCount > 0 || query.trim() !== ''}
              onClearFilter={() => {
                setStatusFilter('all');
                setTrackFilter('all');
                setQuery('');
              }}
            />
          </div>
        ) : isMobileApp ? (
          <div className="divide-y divide-border">
            {filtered.map(c => (
              <MobileListItem
                key={c.id}
                title={c.name}
                subtitle={`${c.teacherName ?? 'Sin maestro'} · ${c.lessonCount} lecciones · ${c.studentCount} alumnos`}
                trailing={<StatusPill status={c.status} />}
                onClick={() => navigate(`/dashboard/education/admin/cursos/${c.id}`)}
              />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[2.4fr]">CURSO</TableHead>
                <TableHead>NIVEL</TableHead>
                <TableHead>LECCIONES</TableHead>
                <TableHead>ALUMNOS</TableHead>
                <TableHead>ESTADO</TableHead>
                <TableHead className="w-[90px] text-right">ACCIONES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/dashboard/education/admin/cursos/${c.id}`)}
                >
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md3-sm bg-edu-container text-on-edu-container">
                        <GraduationCap className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {c.teacherName ?? 'Sin maestro'} · act. {formatDate(c.updatedAt)}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.level ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.lessonCount}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.studentCount}</TableCell>
                  <TableCell>
                    <StatusPill status={c.status} />
                  </TableCell>
                  <TableCell>
                    <CourseRowActions
                      curriculum={c}
                      canArchive={canArchive}
                      onEdit={() => openEdit(c)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* FAB (design mobile handoff, screen 7) replaces the header's inline
          "Nuevo curso" button — anchored above the global bottom nav
          (bottom-24 ≈ 96px clears its ~64-70px height + safe-area). */}
      {isMobileApp && canCreate && (
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="fixed bottom-24 right-[22px] z-40 flex h-14 items-center gap-2 rounded-[18px] bg-edu-primary px-[22px] text-[15px] font-medium text-white shadow-[0_6px_16px_-4px_rgba(31,107,76,.6)]"
        >
          <Plus className="h-[22px] w-[22px]" />
          Nuevo
        </button>
      )}

      <CourseFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <CourseFormDialog
        open={!!editing}
        onOpenChange={o => !o && setEditing(null)}
        curriculum={editing}
      />
    </div>
  );
}
