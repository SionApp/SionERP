import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ChevronRight,
  ClipboardCheck,
  Download,
  LineChart as LineChartIcon,
  TrendingUp,
  UserX,
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
import { Progress } from '@/components/ui/progress';
import { useMobileMode } from '@/hooks/useMobileMode';
import { cn } from '@/lib/utils';
import { EducationService } from '@/services/education.service';
import {
  useAdminCurricula,
  useReviewQueue,
  useStudentRoster,
} from '../hooks/use-education-queries';
import {
  EducationSelect,
  EducationSelectContent,
  EducationSelectItem,
  EducationSelectTrigger,
  EducationSelectValue,
} from '../ui';
import { KpiCard } from './AdminCourseList';
import { STATUS_LABEL, STATUS_PILL } from './AssignmentList';
import { LessonFunnel } from './LessonFunnel';
import type { EducationAssignmentStatus, RosterStudent } from '@/types/education.types';

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

function quizCell(student: RosterStudent): string {
  if (student.lastQuizVerdict === 'in_review') return 'En revisión';
  if (student.lastQuizScore == null || student.lastQuizMax == null) return '—';
  const label = student.lastQuizVerdict === 'passed' ? 'Aprobado' : 'Desaprobado';
  return `${student.lastQuizScore}/${student.lastQuizMax} · ${label}`;
}

function quizScoreColor(student: RosterStudent): string {
  if (student.lastQuizVerdict === 'passed') return 'text-on-edu-container';
  if (student.lastQuizVerdict === 'failed') return 'text-destructive';
  if (student.lastQuizVerdict === 'in_review') return 'text-on-edu-violet-container';
  return 'text-muted-foreground';
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Mobile handoff, screen 10: "Nombres abreviados (María F. López) para caber
// en una línea" — first and last name kept whole, any middle names reduced
// to initials.
function abbreviateName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 2) return name;
  const [first, ...rest] = parts;
  const last = rest.pop() as string;
  const middleInitials = rest.map(p => `${p[0]}.`).join(' ');
  return [first, middleInitials, last].filter(Boolean).join(' ');
}

/**
 * Mobile handoff, screen 10: "Aviso de revisión" banner. The doc frames it as
 * scoped to the selected curriculum ("Preguntas abiertas · lección 5"), but
 * `QuizReviewQueueItem` (the same real endpoint AdminCourseList's "Por
 * revisar" KPI already uses) carries no `curriculumId` — there is no honest
 * way to filter it per-curriculum without a backend change. Shows the real
 * global count instead of faking a scoped one; links to the actual
 * Revisiones tab rather than a lesson this data can't identify.
 */
function ReviewAlert() {
  const navigate = useNavigate();
  const { data: reviewQueue } = useReviewQueue();
  const count = reviewQueue?.length ?? 0;
  if (count === 0) return null;
  return (
    <button
      type="button"
      onClick={() => navigate('/dashboard/education/admin/revisiones')}
      className="flex items-center gap-3 rounded-[18px] bg-edu-orange-container px-4 py-3.5 text-left"
    >
      <ClipboardCheck className="h-[21px] w-[21px] shrink-0 text-on-edu-orange-container" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-on-edu-orange-container">
          {count} {count === 1 ? 'respuesta' : 'respuestas'} por revisar
        </p>
        <p className="text-[11px] text-on-edu-orange-container/80">
          Preguntas abiertas · todos los cursos
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-on-edu-orange-container" />
    </button>
  );
}

/**
 * Admin analytics — student roster + 4 KPIs + per-lesson funnel (PR-K, K.2).
 * Replaces PR-C's placeholder body, same route (`admin/progreso`). The
 * route is FLAT (no `:curriculumId` param — confirmed against `App.tsx`
 * before assuming otherwise), so this screen owns its own client-side
 * curriculum selector rather than reading a URL param.
 */
export default function StudentProgress() {
  const isMobileApp = useMobileMode();
  const { data: curricula = [], isLoading: curriculaLoading } = useAdminCurricula();
  const [curriculumId, setCurriculumId] = useState<string>('');

  useEffect(() => {
    if (!curriculumId && curricula.length > 0) {
      setCurriculumId(curricula[0].id);
    }
  }, [curricula, curriculumId]);

  const {
    data: roster,
    isLoading: rosterLoading,
    isError,
    refetch,
  } = useStudentRoster(curriculumId || undefined);
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    if (!roster) return;
    setExporting(true);
    try {
      await EducationService.exportRosterCSV(roster.curriculumId, roster.curriculumName);
    } finally {
      setExporting(false);
    }
  }

  if (curriculaLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-28 w-full rounded-md3-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (curricula.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md3-lg border border-dashed border-edu-outline bg-edu-surface py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-edu-container text-on-edu-container">
          <LineChartIcon className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">Todavía no hay cursos</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Creá un curso primero para ver el progreso de tus alumnos acá.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-center gap-3">
        <EducationSelect value={curriculumId} onValueChange={setCurriculumId}>
          <EducationSelectTrigger
            className={cn(
              'flex-1',
              isMobileApp
                ? 'h-auto gap-2 rounded-[14px] border-edu-outline px-[15px] py-[11px] text-[13px] font-medium'
                : 'w-full sm:w-72 flex-none'
            )}
          >
            {isMobileApp && <BookOpen className="h-[18px] w-[18px] shrink-0 text-edu-primary" />}
            <EducationSelectValue placeholder="Elegí un curso" />
          </EducationSelectTrigger>
          <EducationSelectContent>
            {curricula.map(c => (
              <EducationSelectItem key={c.id} value={c.id}>
                {c.name}
              </EducationSelectItem>
            ))}
          </EducationSelectContent>
        </EducationSelect>
        {isMobileApp ? (
          <Button
            size="icon"
            variant="outline"
            className="h-[38px] w-[38px] shrink-0 rounded-full border-transparent bg-muted"
            disabled={!roster || exporting || rosterLoading}
            onClick={handleExport}
            aria-label="Exportar CSV"
          >
            <Download className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 gap-1.5"
            disabled={!roster || exporting || rosterLoading}
            onClick={handleExport}
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Exportando…' : 'Exportar CSV'}
          </Button>
        )}
      </div>

      {isError ? (
        <div className="flex flex-col items-center gap-3 rounded-md3-lg border border-destructive/30 bg-destructive/5 py-12 text-center">
          <p className="text-sm font-medium text-destructive">
            No se pudo cargar el progreso de alumnos.
          </p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : rosterLoading || !roster ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-28 w-full rounded-md3-lg" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-md3-lg" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              label={isMobileApp ? 'Activos' : 'Alumnos activos'}
              value={roster.kpis.activeStudents}
              foot="Asignados a este curso"
              icon={Users}
              containerClass="bg-edu-blue-container"
              onClass="text-on-edu-blue-container"
              compact={isMobileApp}
            />
            <KpiCard
              label={isMobileApp ? 'Progreso medio' : 'Progreso promedio'}
              value={Math.round(roster.kpis.avgProgressPct)}
              foot="% de lecciones completadas"
              icon={TrendingUp}
              containerClass="bg-edu-container"
              onClass="text-on-edu-container"
              compact={isMobileApp}
            />
            <KpiCard
              label={isMobileApp ? 'Aprobación' : 'Aprobación en quizzes'}
              value={Math.round(roster.kpis.quizPassRate)}
              foot="% de intentos calificados"
              icon={LineChartIcon}
              containerClass="bg-edu-violet-container"
              onClass="text-on-edu-violet-container"
              compact={isMobileApp}
            />
            <KpiCard
              label="Inactivos"
              value={roster.kpis.inactiveCount}
              foot="Sin actividad hace 14+ días"
              icon={UserX}
              containerClass="bg-edu-orange-container"
              onClass="text-on-edu-orange-container"
              compact={isMobileApp}
            />
          </div>

          {isMobileApp && <ReviewAlert />}

          {/* Doc (screen 10): "Las dos cards laterales del escritorio ...
              se colocan debajo de la lista, en el flujo de scroll" en móvil,
              en vez de arriba como en escritorio. */}
          {!isMobileApp && <LessonFunnel curriculumId={roster.curriculumId} />}

          <div className="overflow-hidden rounded-md3-lg border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border p-[18px]">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-[15px] font-medium text-foreground">
                {roster.students.length} {roster.students.length === 1 ? 'alumno' : 'alumnos'}
              </h3>
            </div>

            {roster.students.length === 0 ? (
              <div className="p-[22px] text-center text-sm text-muted-foreground">
                Nadie tiene este curso asignado todavía.
              </div>
            ) : isMobileApp ? (
              <div className="divide-y divide-border">
                {roster.students.map(s => (
                  <div key={s.assignmentId} className="flex items-start gap-3 p-[14px]">
                    {/* Doc's avatar pair (#EADDFF/#6750A4) is a raw MD3
                        default that isn't one of this module's own tokens —
                        the doc's own rule is "sin tokens nuevos", so this
                        reuses the existing edu-violet-container pair
                        (#E7DEF3/#6E4CA6, already used for "Revisión")
                        instead of introducing an unused one-off hex. */}
                    <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-edu-violet-container text-[13px] font-medium text-on-edu-violet-container">
                      {getInitials(s.name || s.email)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[13px] font-medium text-foreground">
                          {abbreviateName(s.name || s.email)}
                        </p>
                        <StatusPill status={s.status} />
                      </div>
                      <Progress value={s.progressPct} className="my-2 h-[5px]" />
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">
                          {s.completedLessons}/{s.totalLessons} lecciones
                        </span>
                        <span className={cn('font-medium', quizScoreColor(s))}>{quizCell(s)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>ALUMNO</TableHead>
                    <TableHead>ESTADO</TableHead>
                    <TableHead>PROGRESO</TableHead>
                    <TableHead>QUIZ</TableHead>
                    <TableHead>VENCE</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roster.students.map(s => (
                    <TableRow key={s.assignmentId}>
                      <TableCell>
                        <p className="truncate text-sm font-medium text-foreground">
                          {s.name || s.email}
                        </p>
                        {s.name && (
                          <p className="truncate text-xs text-muted-foreground">{s.email}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusPill status={s.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={s.progressPct} className="h-1.5 max-w-[8rem]" />
                          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                            {s.completedLessons}/{s.totalLessons}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{quizCell(s)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {s.dueDate ? formatDate(s.dueDate) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {isMobileApp && <LessonFunnel curriculumId={roster.curriculumId} />}
        </>
      )}
    </div>
  );
}
