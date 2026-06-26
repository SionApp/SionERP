import { ReportDetailSheet } from './ReportDetailSheet';
import { SupervisionReportModal } from '@/components/discipleship/SupervisionReportModal';
import { ComplianceDashboard } from '@/components/discipleship/ComplianceDashboard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MobileSegment } from '@/components/mobile/MobileSegment';
import { MobileStatTile } from '@/components/mobile/MobileStatTile';
import { useMobileMode } from '@/hooks/useMobileMode';
import { parseGoTime } from '@/lib/go-time';
import { useAuth } from '@/hooks/useAuth';
import { useAuxiliarySupervisorData } from '@/hooks/useAuxiliarySupervisorData';
import { DiscipleshipService } from '@/services/discipleship.service';
import type { DiscipleshipReport } from '@/types/discipleship.types';
import { format } from 'date-fns';
import { justEndedWeek } from '@/lib/iso-week';
import { es } from 'date-fns/locale';
import {
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  Plus,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

interface DashboardStats {
  groups_under_supervision: number;
  total_members: number;
  average_attendance: number;
  active_leaders: number;
  pending_alerts: number;
  pending_reports: number;
  zone_name?: string;
}

interface GroupData {
  id: string;
  group_name: string;
  leader_name: string;
  member_count: number;
  avg_attendance: number;
  status: string;
}

const AuxiliarySupervisorDashboard: React.FC = React.memo(() => {
  const { user } = useAuth();
  const isMobileApp = useMobileMode();
  const [selectedTab, setSelectedTab] = useState('overview');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<DiscipleshipReport | null>(null);
  const [reportSheetOpen, setReportSheetOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupData | null>(null);
  const [schedulingGroup, setSchedulingGroup] = useState<GroupData | null>(null);
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');

  // Usar hook específico del supervisor auxiliar
  const { loading, stats, groups, myReports, pendingReports, error, refetch, refetchReports } =
    useAuxiliarySupervisorData();

  const handleApproveReport = async (reportId: string) => {
    try {
      await DiscipleshipService.approveReport(reportId);
      toast.success('Reporte aprobado');
      await refetch();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(msg || 'Error al aprobar el reporte');
    }
  };

  const handleRejectReport = async (reportId: string, feedback: string) => {
    try {
      await DiscipleshipService.rejectReport(reportId, feedback);
      toast.success('Reporte rechazado');
      await refetch();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(msg || 'Error al rechazar el reporte');
    }
  };

  // Período ISO Monday-anchored (semana más reciente completada).
  const _justEnded = justEndedWeek(new Date());
  const periodStart = _justEnded.monday;
  const periodEnd = _justEnded.saturday;

  // Validar si ya existe reporte para este período
  const hasCurrentPeriodReport = myReports.some((report: { period_start: string }) => {
    const reportStart = new Date(report.period_start);
    return reportStart >= periodStart && reportStart <= periodEnd;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Saludable</Badge>;
      case 'multiplying':
        return <Badge variant="secondary">Multiplicando</Badge>;
      case 'inactive':
        return <Badge variant="destructive">Inactivo</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

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
          <Skeleton className="h-9 w-full rounded-full" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Cargando dashboard...</span>
      </div>
    );
  }

  const pendingReportsCount = (stats as { pending_reports?: number }).pending_reports ?? 0;

  // ── Botón de reporte (compartido) ──
  const reportButton = (
    <Button
      onClick={() => setShowReportModal(true)}
      disabled={hasCurrentPeriodReport}
      variant={hasCurrentPeriodReport ? 'outline' : 'default'}
      className="w-full sm:w-auto"
    >
      <Plus className="h-4 w-4 mr-2" />
      {hasCurrentPeriodReport ? 'Reporte enviado' : 'Nuevo Reporte'}
    </Button>
  );

  // ── Contenido de cada tab (compartido web/mobile) ──
  const overviewContent = (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Objetivos del Período</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Meta Asistencia Grupal (Meta: 90%)</span>
              <span>{Math.round(stats.average_attendance || 0)}%</span>
            </div>
            <Progress value={stats.average_attendance || 0} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Líderes Activos (Meta: {stats.groups_under_supervision})</span>
              <span>{stats.active_leaders || 0}</span>
            </div>
            <Progress
              value={
                ((stats.active_leaders || 0) / Math.max(stats.groups_under_supervision || 1, 1)) *
                100
              }
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Salud de los Grupos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {groups.filter(g => g.status === 'active').length}
              </div>
              <div className="text-sm text-green-700 dark:text-green-300">Grupos Saludables</div>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {groups.filter(g => g.status === 'multiplying').length}
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300">En Multiplicación</div>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {groups.filter(g => g.status === 'inactive').length}
              </div>
              <div className="text-sm text-red-700 dark:text-red-300">Necesitan Atención</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );

  const groupsContent = (
    <Card>
      <CardHeader>
        <CardTitle>Grupos Bajo Supervisión</CardTitle>
        <CardDescription>Estado actual de los grupos asignados</CardDescription>
      </CardHeader>
      <CardContent>
        {groups.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No tienes grupos asignados para supervisar
          </p>
        ) : (
          <div className="space-y-4">
            {groups.map(group => (
              <div key={group.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold">{group.group_name}</h3>
                    <p className="text-sm text-muted-foreground">Líder: {group.leader_name}</p>
                  </div>
                  {getStatusBadge(group.status)}
                </div>
                <div className="grid gap-2 grid-cols-1 sm:grid-cols-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Miembros: </span>
                    <span className="font-medium">{group.member_count}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Asistencia: </span>
                    <span className="font-medium">{group.avg_attendance}%</span>
                  </div>
                  <div>
                    <Button size="sm" variant="outline" onClick={() => setSelectedGroup(group)}>
                      Ver Detalles
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const reportContent = (
    <>
      {myReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Mis Reportes Recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myReports.slice(0, 5).map(report => {
                const reportData = report.report_data as {
                  new_disciples_care?: number;
                  visited_groups?: number;
                };
                return (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        Semana del{' '}
                        {format(new Date(report.period_start), 'dd MMM', { locale: es })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Atención Nvos: {reportData?.new_disciples_care || 0} • VD:{' '}
                        {reportData?.visited_groups || 0}
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
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <CardTitle>Reporte Semanal</CardTitle>
              <CardDescription>
                Período: {format(periodStart, 'dd MMM', { locale: es })} -{' '}
                {format(periodEnd, 'dd MMM yyyy', { locale: es })}
              </CardDescription>
            </div>
            {reportButton}
          </div>
        </CardHeader>
        <CardContent>
          {hasCurrentPeriodReport ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
              <p>Ya has enviado el reporte semanal para este período</p>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Haz clic en "Nuevo Reporte" para crear un reporte semanal</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );

  const leadersContent = (
    <Card>
      <CardHeader>
        <CardTitle>Desarrollo de Líderes</CardTitle>
        <CardDescription>Seguimiento y capacitación de líderes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {groups.map(group => (
            <div
              key={group.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="min-w-0">
                <h4 className="font-medium truncate">{group.leader_name}</h4>
                <p className="text-sm text-muted-foreground truncate">{group.group_name}</p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <p className="text-sm font-medium">{group.member_count} miembros</p>
                  <p className="text-xs text-muted-foreground">{group.avg_attendance}% asist.</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSchedulingGroup(group);
                    setMeetingDate('');
                    setMeetingTime('');
                    setMeetingNotes('');
                  }}
                >
                  Agendar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const approvalsContent = (
    <Card>
      <CardHeader>
        <CardTitle>Cola de Aprobaciones</CardTitle>
        <CardDescription>Reportes pendientes de tu aprobación</CardDescription>
      </CardHeader>
      <CardContent>
        {pendingReports.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
            <p className="text-muted-foreground">No hay reportes pendientes</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(pendingReports as unknown as DiscipleshipReport[]).map(report => (
              <div
                key={report.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border rounded-lg"
              >
                <div className="min-w-0">
                  <h4 className="font-medium text-sm truncate">{report.reporter_name}</h4>
                  <p className="text-xs text-muted-foreground truncate">
                    {report.report_type} · Período:{' '}
                    {parseGoTime(report.period_end)?.toLocaleDateString('es-AR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    }) ?? report.period_end}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center mt-1">
                    <Clock className="w-3 h-3 mr-1 shrink-0" />
                    Enviado:{' '}
                    {parseGoTime(report.submitted_at)?.toLocaleDateString('es-AR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    }) ?? 'Sin fecha'}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1 sm:flex-none"
                    onClick={() => {
                      setSelectedReport(report);
                      setReportSheetOpen(true);
                    }}
                  >
                    Ver
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleApproveReport(report.id)}
                    className="flex-1 sm:flex-none"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Aprobar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  // ── Sheets / dialogs / modal (compartidos) ──
  const sharedOverlays = (
    <>
      <SupervisionReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSuccess={refetchReports}
        periodStart={periodStart}
        periodEnd={periodEnd}
        hierarchyLevel={2}
      />

      <ReportDetailSheet
        report={selectedReport}
        open={reportSheetOpen}
        onOpenChange={open => {
          setReportSheetOpen(open);
          if (!open) setSelectedReport(null);
        }}
        onApprove={handleApproveReport}
        onReject={handleRejectReport}
      />

      <Sheet open={!!selectedGroup} onOpenChange={() => setSelectedGroup(null)}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{selectedGroup?.group_name}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Líder</p>
                <p className="font-medium">{selectedGroup?.leader_name || 'Sin asignar'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Estado</p>
                <p className="font-medium capitalize">{selectedGroup?.status}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Miembros</p>
                <p className="font-medium">{selectedGroup?.member_count}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Asistencia</p>
                <p className="font-medium">{selectedGroup?.avg_attendance}%</p>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!schedulingGroup} onOpenChange={() => setSchedulingGroup(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agendar Reunión — {schedulingGroup?.group_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="date">Fecha</Label>
              <Input
                id="date"
                type="date"
                value={meetingDate}
                onChange={e => setMeetingDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Hora</Label>
              <Input
                id="time"
                type="time"
                value={meetingTime}
                onChange={e => setMeetingTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Input
                id="notes"
                value={meetingNotes}
                onChange={e => setMeetingNotes(e.target.value)}
                placeholder="Temas a tratar, ubicación, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSchedulingGroup(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                toast.success(`Reunión agendada para ${meetingDate} a las ${meetingTime}`);
                setSchedulingGroup(null);
              }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  // ── Modo mobile exclusivo ──
  if (isMobileApp) {
    const mobileTabs = [
      { value: 'overview', label: 'Resumen' },
      { value: 'groups', label: 'Grupos' },
      { value: 'biweekly-report', label: 'Reporte' },
      { value: 'leaders', label: 'Líderes' },
      {
        value: 'approvals',
        label: pendingReportsCount > 0 ? `Aprob. · ${pendingReportsCount}` : 'Aprob.',
      },
      { value: 'compliance', label: 'Cumplimiento' },
    ];

    return (
      <div className="pb-6">
        {/* Acción principal */}
        <div className="px-4 pt-4">{reportButton}</div>

        {/* Stats: chips horizontales */}
        <div className="flex gap-2 px-4 pt-4 overflow-x-auto snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <MobileStatTile label="Grupos" value={stats.groups_under_supervision || 0} />
          <MobileStatTile label="Miembros" value={stats.total_members || 0} />
          <MobileStatTile label="Asistencia" value={`${Math.round(stats.average_attendance || 0)}%`} />
          <MobileStatTile
            label="Reporte"
            value={hasCurrentPeriodReport ? 'Enviado' : 'Pendiente'}
            tone={hasCurrentPeriodReport ? 'success' : 'warning'}
          />
        </div>

        {/* Sub-tabs */}
        <MobileSegment
          scrollable
          options={mobileTabs}
          value={selectedTab}
          onChange={setSelectedTab}
          className="px-4 pt-4"
        />

        <div className="px-3 pt-3 space-y-4">
          {selectedTab === 'overview' && overviewContent}
          {selectedTab === 'groups' && groupsContent}
          {selectedTab === 'biweekly-report' && reportContent}
          {selectedTab === 'leaders' && leadersContent}
          {selectedTab === 'approvals' && approvalsContent}
          {selectedTab === 'compliance' && <ComplianceDashboard />}
        </div>

        {sharedOverlays}
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 md:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
            <span className="block sm:inline">Dashboard</span>{' '}
            <span className="block sm:inline">Supervisor Auxiliar</span>
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground truncate">
            {user?.email} - {stats?.zone_name || 'Zona no asignada'}
          </p>
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <Badge
            variant="secondary"
            className="text-xs sm:text-sm md:text-lg px-3 md:px-4 py-1.5 md:py-2 self-start sm:self-auto"
          >
            <span className="hidden sm:inline">Nivel 2 - Supervisor Auxiliar</span>
            <span className="sm:hidden">Nivel 2</span>
          </Badge>
          {reportButton}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Grupos Supervisados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.groups_under_supervision || 0}</div>
            <p className="text-xs text-muted-foreground">Bajo tu supervisión</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Miembros</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_members || 0}</div>
            <p className="text-xs text-muted-foreground">En tus grupos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Asistencia Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats.average_attendance || 0)}%</div>
            <p className="text-xs text-muted-foreground">Últimas 4 semanas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado Reporte</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {hasCurrentPeriodReport ? (
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

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-full sm:grid sm:grid-cols-6 h-auto min-w-max sm:min-w-0 gap-1">
            <TabsTrigger
              value="overview"
              className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0 px-3 sm:px-2"
            >
              Resumen
            </TabsTrigger>
            <TabsTrigger
              value="groups"
              className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0 px-3 sm:px-2"
            >
              Grupos
            </TabsTrigger>
            <TabsTrigger
              value="biweekly-report"
              className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0 px-3 sm:px-2"
            >
              <span className="hidden sm:inline">Reporte Semanal</span>
              <span className="sm:hidden">Reporte</span>
            </TabsTrigger>
            <TabsTrigger
              value="leaders"
              className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0 px-3 sm:px-2"
            >
              Líderes
            </TabsTrigger>
            <TabsTrigger
              value="approvals"
              className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0 px-3 sm:px-2"
            >
              <span className="hidden sm:inline">Aprobaciones</span>
              <span className="sm:hidden">Aprob.</span>
              {pendingReportsCount > 0 && (
                <Badge variant="destructive" className="ml-1 text-[10px] h-4 px-1">
                  {pendingReportsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="compliance"
              className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0 px-3 sm:px-2"
            >
              Cumplimiento
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4">
          {overviewContent}
        </TabsContent>

        <TabsContent value="groups" className="space-y-4">
          {groupsContent}
        </TabsContent>

        <TabsContent value="biweekly-report" className="space-y-4">
          {reportContent}
        </TabsContent>

        <TabsContent value="leaders" className="space-y-4">
          {leadersContent}
        </TabsContent>

        <TabsContent value="approvals" className="space-y-4">
          {approvalsContent}
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <ComplianceDashboard />
        </TabsContent>
      </Tabs>

      {sharedOverlays}
    </div>
  );
});

AuxiliarySupervisorDashboard.displayName = 'AuxiliarySupervisorDashboard';

export default AuxiliarySupervisorDashboard;
