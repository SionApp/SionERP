import { useEffect, useState } from 'react';
import { Download, LineChart as LineChartIcon, TrendingUp, UserX, Users } from 'lucide-react';

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
import { MobileListItem } from '@/components/mobile/MobileListItem';
import { useMobileMode } from '@/hooks/useMobileMode';
import { cn } from '@/lib/utils';
import { EducationService } from '@/services/education.service';
import { useAdminCurricula, useStudentRoster } from '../hooks/use-education-queries';
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <EducationSelect value={curriculumId} onValueChange={setCurriculumId}>
          <EducationSelectTrigger className="w-full sm:w-72">
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
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={!roster || exporting || rosterLoading}
          onClick={handleExport}
        >
          <Download className="h-4 w-4" />
          {exporting ? 'Exportando…' : 'Exportar CSV'}
        </Button>
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
              label="Alumnos activos"
              value={roster.kpis.activeStudents}
              foot="Asignados a este curso"
              icon={Users}
              containerClass="bg-edu-blue-container"
              onClass="text-on-edu-blue-container"
            />
            <KpiCard
              label="Progreso promedio"
              value={Math.round(roster.kpis.avgProgressPct)}
              foot="% de lecciones completadas"
              icon={TrendingUp}
              containerClass="bg-edu-container"
              onClass="text-on-edu-container"
            />
            <KpiCard
              label="Aprobación en quizzes"
              value={Math.round(roster.kpis.quizPassRate)}
              foot="% de intentos calificados"
              icon={LineChartIcon}
              containerClass="bg-edu-violet-container"
              onClass="text-on-edu-violet-container"
            />
            <KpiCard
              label="Inactivos"
              value={roster.kpis.inactiveCount}
              foot="Sin actividad hace 14+ días"
              icon={UserX}
              containerClass="bg-edu-orange-container"
              onClass="text-on-edu-orange-container"
            />
          </div>

          <LessonFunnel curriculumId={roster.curriculumId} />

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
                  <MobileListItem
                    key={s.assignmentId}
                    title={s.name || s.email}
                    subtitle={`${s.completedLessons}/${s.totalLessons} lecciones · ${quizCell(s)}`}
                    trailing={<StatusPill status={s.status} />}
                  />
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
        </>
      )}
    </div>
  );
}
