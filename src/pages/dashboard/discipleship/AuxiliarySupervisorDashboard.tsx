import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useAuxiliarySupervisorData } from '@/hooks/useAuxiliarySupervisorData';
import { DiscipleshipService } from '@/services/discipleship.service';
import type { CreateReportRequest } from '@/types/discipleship.types';
import { SupervisionReportModal } from '@/components/discipleship/SupervisionReportModal';
import { endOfWeek, format, startOfWeek, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Send,
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
  const [selectedTab, setSelectedTab] = useState('overview');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Usar hook específico del supervisor auxiliar
  const { loading, stats, groups, myReports, error, refetch, refetchReports } =
    useAuxiliarySupervisorData();

  // Calcular período semanal (semana anterior)
  const today = new Date();
  const periodStart = startOfWeek(subWeeks(today, 1), { weekStartsOn: 0 });
  const periodEnd = endOfWeek(subWeeks(today, 1), { weekStartsOn: 0 });

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
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Cargando dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 md:gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Dashboard Supervisor Auxiliar
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {user?.email} - {(user as any)?.zone_name || 'Zona no asignada'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowReportModal(true)}
            disabled={hasCurrentPeriodReport}
            variant={hasCurrentPeriodReport ? 'outline' : 'default'}
          >
            <Plus className="h-4 w-4 mr-2" />
            {hasCurrentPeriodReport ? 'Reporte enviado' : 'Nuevo Reporte'}
          </Button>
          <Badge variant="secondary" className="text-sm md:text-lg px-3 md:px-4 py-1.5 md:py-2">
            <span className="hidden sm:inline">Nivel 2 - Supervisor Auxiliar</span>
            <span className="sm:hidden">N2</span>
          </Badge>
        </div>
      </div>

      {/* Dialog para crear reporte */}
      <SupervisionReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSuccess={refetchReports}
        periodStart={periodStart}
        periodEnd={periodEnd}
        hierarchyLevel={2}
      />

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
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-1 md:gap-0">
          <TabsTrigger value="overview" className="text-xs md:text-sm">
            Resumen
          </TabsTrigger>
          <TabsTrigger value="groups" className="text-xs md:text-sm">
            Grupos
          </TabsTrigger>
          <TabsTrigger value="biweekly-report" className="text-xs md:text-sm">
            Reporte Semanal
          </TabsTrigger>
          <TabsTrigger value="leaders" className="text-xs md:text-sm">
            Líderes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Goals Progress */}
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
                    ((stats.active_leaders || 0) /
                      Math.max(stats.groups_under_supervision || 1, 1)) *
                    100
                  }
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>

          {/* Zone Health Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Salud de los Grupos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {groups.filter(g => g.status === 'active').length}
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300">
                    Grupos Saludables
                  </div>
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
        </TabsContent>

        <TabsContent value="groups" className="space-y-4">
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
                          <p className="text-sm text-muted-foreground">
                            Líder: {group.leader_name}
                          </p>
                        </div>
                        {getStatusBadge(group.status)}
                      </div>
                      <div className="grid gap-2 md:grid-cols-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Miembros: </span>
                          <span className="font-medium">{group.member_count}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Asistencia: </span>
                          <span className="font-medium">{group.avg_attendance}%</span>
                        </div>
                        <div>
                          <Button size="sm" variant="outline">
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
        </TabsContent>

        <TabsContent value="biweekly-report" className="space-y-4">
          {/* Recent Reports Section */}
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
                      new_disciples_care?: number; visited_groups?: number;
                    };
                    return (
                      <div
                        key={report.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">
                            Semana del {format(new Date(report.period_start), 'dd MMM', { locale: es })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Atención Nvos: {reportData?.new_disciples_care || 0} • VD: {reportData?.visited_groups || 0}
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Reporte Semanal</CardTitle>
                  <CardDescription>
                    Período: {format(periodStart, 'dd MMM', { locale: es })} -{' '}
                    {format(periodEnd, 'dd MMM yyyy', { locale: es })}
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setShowReportModal(true)}
                  disabled={hasCurrentPeriodReport}
                  variant={hasCurrentPeriodReport ? 'outline' : 'default'}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {hasCurrentPeriodReport ? 'Reporte enviado' : 'Nuevo Reporte'}
                </Button>
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
        </TabsContent>

        <TabsContent value="leaders" className="space-y-4">
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
                    <div>
                      <h4 className="font-medium">{group.leader_name}</h4>
                      <p className="text-sm text-muted-foreground">{group.group_name}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">{group.member_count} miembros</p>
                        <p className="text-xs text-muted-foreground">
                          {group.avg_attendance}% asist.
                        </p>
                      </div>
                      <Button size="sm" variant="outline">
                        Agendar Reunión
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
});

AuxiliarySupervisorDashboard.displayName = 'AuxiliarySupervisorDashboard';

export default AuxiliarySupervisorDashboard;
