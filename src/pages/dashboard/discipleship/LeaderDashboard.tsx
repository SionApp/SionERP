import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LeaderReportModal } from '@/components/discipleship/LeaderReportModal';
import { WeekPicker } from '@/components/discipleship/WeekPicker';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { MobileSectionHeader } from '@/components/mobile/MobileSectionHeader';
import { MobileStatTile } from '@/components/mobile/MobileStatTile';
import { useMobileMode } from '@/hooks/useMobileMode';
import { useLeaderDiscipleshipData } from '@/hooks/useLeaderDiscipleshipData';
import { DiscipleshipService } from '@/services/discipleship.service';
import type { AttendanceWithDetails, GroupMemberWithDetails } from '@/types/discipleship.types';
import { addDays, format, startOfISOWeek } from 'date-fns';
import { getIsoWeek, justEndedWeek } from '@/lib/iso-week';
import { es } from 'date-fns/locale';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Mail,
  Plus,
  RefreshCw,
  Save,
  Target,
  TrendingUp,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function LeaderDashboard() {
  const isMobileApp = useMobileMode();
  const { stats, myReports, goals, groups, loading, error, refetch, refetchReports } =
    useLeaderDiscipleshipData();

  // Report form state
  const [showReportModal, setShowReportModal] = useState(false);

  // Members state
  const [members, setMembers] = useState<GroupMemberWithDetails[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Attendance state
  const [attendanceDate, setAttendanceDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [attendanceLoaded, setAttendanceLoaded] = useState(false);

  const myGroup = groups[0];

  useEffect(() => {
    if (!myGroup?.id) return;
    setLoadingMembers(true);
    DiscipleshipService.getGroupMembers(myGroup.id)
      .then(data => {
        const list = data || [];
        setMembers(list);
        // Inicializar todos como presentes por defecto
        const init: Record<string, boolean> = {};
        list.forEach(m => {
          init[m.user_id] = true;
        });
        setAttendanceMap(init);
      })
      .catch(() => setMembers([]))
      .finally(() => setLoadingMembers(false));
  }, [myGroup?.id]);

  // Cargar asistencia existente cuando cambia la fecha
  useEffect(() => {
    if (!myGroup?.id || members.length === 0) return;
    setAttendanceLoaded(false);
    DiscipleshipService.getGroupAttendance(myGroup.id, attendanceDate)
      .then(existing => {
        if (existing && existing.length > 0) {
          // Hay registros para esta fecha — usar esos valores
          const map: Record<string, boolean> = {};
          members.forEach(m => {
            map[m.user_id] = false;
          }); // default ausente
          existing.forEach((a: AttendanceWithDetails) => {
            map[a.user_id] = a.present;
          });
          setAttendanceMap(map);
        } else {
          // Sin registros — resetear todos a presentes
          const init: Record<string, boolean> = {};
          members.forEach(m => {
            init[m.user_id] = true;
          });
          setAttendanceMap(init);
        }
      })
      .catch(() => {})
      .finally(() => setAttendanceLoaded(true));
  }, [attendanceDate, myGroup?.id, members.length]);

  const toggleAttendance = (userId: string) => {
    setAttendanceMap(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const saveAttendance = async () => {
    if (!myGroup?.id) return;
    setSavingAttendance(true);
    try {
      await DiscipleshipService.bulkRecordAttendance(myGroup.id, {
        meeting_date: attendanceDate,
        attendance: members.map(m => ({
          user_id: m.user_id,
          present: attendanceMap[m.user_id] ?? false,
        })),
      });
      toast.success('Asistencia guardada correctamente');
    } catch {
      toast.error('Error al guardar la asistencia');
    } finally {
      setSavingAttendance(false);
    }
  };

  // Período ISO (Monday-anchored). selectedWeek permite al líder backfill de semanas pasadas.
  const [selectedWeek, setSelectedWeek] = useState(justEndedWeek(new Date()));

  // Derivados del período seleccionado
  const lastWeekStart = selectedWeek.monday;
  const lastWeekEnd = selectedWeek.saturday;

  // Semana actual (para comparación con reportes existentes)
  const currentWeekStart = startOfISOWeek(new Date());
  const currentWeekEnd = addDays(currentWeekStart, 5);

  // Check if report for this week already exists
  const hasCurrentWeekReport = myReports.some((report: { period_start: string }) => {
    const reportStart = new Date(report.period_start);
    return reportStart >= lastWeekStart && reportStart <= currentWeekEnd;
  });

  // Loading state
  if (loading) {
    if (isMobileApp) {
      return (
        <div className="px-4 pt-4 space-y-3">
          <Skeleton className="h-10 w-full rounded-xl" />
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-20 w-24 rounded-2xl shrink-0" />
            ))}
          </div>
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      );
    }
    return (
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2">Error al cargar datos</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={refetch} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Reintentar
        </Button>
      </div>
    );
  }

  // ── Contenido compartido entre web y mobile ──

  // Semanas que ya tienen reporte (para el aviso de duplicado en el picker)
  const existingWeeks = myReports.map((r: { period_start: string }) =>
    getIsoWeek(new Date(r.period_start))
  );
  const selectedWeekReported = existingWeeks.includes(selectedWeek.isoWeek);

  const reportButton = (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <WeekPicker value={selectedWeek} onChange={setSelectedWeek} existingWeeks={existingWeeks} />
      <Button
        disabled={selectedWeekReported || !myGroup}
        onClick={() => setShowReportModal(true)}
        className="w-full sm:w-auto"
      >
        <Plus className="h-4 w-4 mr-2" />
        <span className="truncate">
          {selectedWeekReported ? 'Reporte enviado' : 'Nuevo Reporte'}
        </span>
      </Button>
    </div>
  );

  const reportModal = myGroup && (
    <LeaderReportModal
      isOpen={showReportModal}
      onClose={() => setShowReportModal(false)}
      onSuccess={refetchReports}
      periodStart={lastWeekStart}
      periodEnd={lastWeekEnd}
      groupId={myGroup.id}
    />
  );

  const goalsList = (
    <div className="space-y-4">
      {(goals ?? []).map(
        (goal: {
          id: string;
          target_metric?: string;
          description?: string;
          current_value?: number;
          target_value?: number;
          progress_percentage?: number;
        }) => (
          <div key={goal.id} className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">{goal.target_metric || goal.description}</span>
              <span className="text-sm text-muted-foreground">
                {goal.current_value || 0} / {goal.target_value || 0}
              </span>
            </div>
            <Progress value={goal.progress_percentage || 0} className="h-2" />
          </div>
        )
      )}
    </div>
  );

  const membersList = loadingMembers ? (
    <div className="space-y-2">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  ) : members.length === 0 ? (
    <div className="text-center py-8 text-muted-foreground">
      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>No hay miembros asignados a tu célula aún</p>
    </div>
  ) : (
    <div className="divide-y">
      {members.map(member => (
        <div key={member.id} className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
              {member.user_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{member.user_name}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                <Mail className="h-3 w-3 flex-shrink-0" />
                {member.user_email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {member.role_in_group && (
              <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                {member.role_in_group}
              </Badge>
            )}
            {member.is_active ? (
              <Badge variant="default" className="gap-1 text-xs bg-green-600 hover:bg-green-700">
                <UserCheck className="h-3 w-3" />
                Activo
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1 text-xs text-muted-foreground">
                <UserX className="h-3 w-3" />
                Inactivo
              </Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const attendanceBlock = (
    <div className="space-y-4">
      {/* Date picker */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="attendance-date"
          className="text-sm font-medium text-muted-foreground whitespace-nowrap"
        >
          Fecha de reunión
        </label>
        <input
          id="attendance-date"
          type="date"
          value={attendanceDate}
          onChange={e => setAttendanceDate(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Member rows */}
      {!attendanceLoaded ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="divide-y">
          {members.map(member => {
            const present = attendanceMap[member.user_id] ?? true;
            return (
              <div key={member.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0 h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                    {member.user_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{member.user_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.user_email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleAttendance(member.user_id)}
                  className={`flex-shrink-0 ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    present
                      ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                      : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50'
                  }`}
                >
                  {present ? (
                    <>
                      <UserCheck className="h-3.5 w-3.5" />
                      Presente
                    </>
                  ) : (
                    <>
                      <UserX className="h-3.5 w-3.5" />
                      Ausente
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary + Save */}
      <div className="flex items-center justify-between pt-2 border-t">
        <p className="text-sm text-muted-foreground">
          {Object.values(attendanceMap).filter(Boolean).length} de {members.length} presentes
        </p>
        <Button size="sm" onClick={saveAttendance} disabled={savingAttendance || !attendanceLoaded}>
          <Save className="h-4 w-4 mr-2" />
          {savingAttendance ? 'Guardando…' : 'Guardar Asistencia'}
        </Button>
      </div>
    </div>
  );

  const reportsList =
    myReports.length === 0 ? (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No has enviado reportes aún</p>
      </div>
    ) : (
      <div className="space-y-3">
        {myReports.slice(0, 5).map(report => {
          const reportData = report.report_data as { attendance?: number; conversions?: number };
          return (
            <div
              key={report.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div>
                <p className="font-medium">
                  Semana {format(new Date(report.period_start), 'dd MMM', { locale: es })} -{' '}
                  {format(new Date(report.period_end), 'dd MMM', { locale: es })}
                </p>
                <p className="text-sm text-muted-foreground">
                  Asistencia: {reportData?.attendance || 0} • Conversiones:{' '}
                  {reportData?.conversions || 0}
                </p>
              </div>
              <Badge
                variant={
                  report.status === 'approved'
                    ? 'default'
                    : report.status === 'submitted'
                      ? 'secondary'
                      : report.status === 'revision_required'
                        ? 'destructive'
                        : 'outline'
                }
              >
                {report.status === 'approved'
                  ? 'Aprobado'
                  : report.status === 'submitted'
                    ? 'Pendiente'
                    : report.status === 'revision_required'
                      ? 'Revisar'
                      : 'Borrador'}
              </Badge>
            </div>
          );
        })}
      </div>
    );

  // ── Modo mobile exclusivo ──
  if (isMobileApp) {
    return (
      <div className="pb-6">
        {/* Acción principal */}
        <div className="px-4 pt-4">{reportButton}</div>

        {/* Stats: chips horizontales */}
        <div className="flex gap-2 px-4 pt-4 overflow-x-auto snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <MobileStatTile
            label="Miembros"
            value={myGroup?.member_count || stats?.total_members || 0}
            sub={`${myGroup?.active_members || 0} activos`}
          />
          <MobileStatTile
            label="Asistencia"
            value={`${Math.round(stats?.average_attendance || 0)}%`}
          />
          <MobileStatTile label="Reunión" value={myGroup?.meeting_day || 'N/D'} />
          <MobileStatTile
            label="Reporte"
            value={hasCurrentWeekReport ? 'Enviado' : 'Pendiente'}
            tone={hasCurrentWeekReport ? 'success' : 'warning'}
          />
        </div>

        {goals && goals.length > 0 && (
          <>
            <MobileSectionHeader title="Mis Objetivos" />
            <div className="px-4">{goalsList}</div>
          </>
        )}

        <MobileSectionHeader
          title="Mi Gente"
          action={
            members.length > 0 ? (
              <span className="text-xs font-semibold text-muted-foreground">{members.length}</span>
            ) : undefined
          }
        />
        <div className="px-4">{membersList}</div>

        {members.length > 0 && (
          <>
            <MobileSectionHeader title="Asistencia" />
            <div className="px-4">{attendanceBlock}</div>
          </>
        )}

        <MobileSectionHeader title="Mis Reportes" />
        <div className="px-4">{reportsList}</div>

        {reportModal}
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">Mi Célula</h1>
          <p className="text-sm sm:text-base text-muted-foreground truncate">
            {myGroup ? myGroup.group_name : 'Dashboard de líder de célula'}
          </p>
        </div>
        <div className="w-full sm:w-auto">
          {reportButton}
          {reportModal}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Miembros</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {myGroup?.member_count || stats?.total_members || 0}
            </div>
            <p className="text-xs text-muted-foreground">{myGroup?.active_members || 0} activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Asistencia Prom.</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats?.average_attendance || 0)}%</div>
            <p className="text-xs text-muted-foreground">Últimas 4 semanas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próxima Reunión</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myGroup?.meeting_day || 'No definido'}</div>
            <p className="text-xs text-muted-foreground">
              {myGroup?.meeting_time || ''} - {myGroup?.meeting_location || ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado Reporte</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {hasCurrentWeekReport ? (
              <>
                <div className="text-2xl font-bold text-green-600">
                  <CheckCircle className="h-6 w-6 inline" />
                </div>
                <p className="text-xs text-muted-foreground">Reporte semanal enviado</p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-amber-600">
                  <Clock className="h-6 w-6 inline" />
                </div>
                <p className="text-xs text-muted-foreground">Pendiente de enviar</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Goals Section */}
      {goals && goals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Mis Objetivos
            </CardTitle>
          </CardHeader>
          <CardContent>{goalsList}</CardContent>
        </Card>
      )}

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Mi Gente
            {members.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {members.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>{membersList}</CardContent>
      </Card>

      {/* Attendance */}
      {members.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Asistencia
            </CardTitle>
          </CardHeader>
          <CardContent>{attendanceBlock}</CardContent>
        </Card>
      )}

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Mis Reportes Recientes
          </CardTitle>
        </CardHeader>
        <CardContent>{reportsList}</CardContent>
      </Card>
    </div>
  );
}
