import { SupervisionReportModal } from '@/components/discipleship/SupervisionReportModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useCoordinatorData } from '@/hooks/useCoordinatorData';
import { endOfWeek, format, startOfWeek, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { Award, Building2, CheckCircle, Clock, FileText, Loader2, Plus, Users } from 'lucide-react';
import React, { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface DashboardStats {
  total_groups: number;
  total_members: number;
  active_leaders: number;
  multiplications: number;
  average_attendance: number;
  spiritual_health: number;
  pending_alerts: number;
  pending_reports: number;
}

interface Goal {
  id: string;
  description: string;
  target_value: number;
  current_value: number;
  progress_percentage: number;
  status: string;
  deadline: string;
}

const CoordinatorDashboard: React.FC = React.memo(() => {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState('overview');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Usar hook específico del coordinador
  const {
    loading,
    stats,
    goals,
    zoneStats,
    weeklyTrends,
    myReports,
    error,
    refetch,
    refetchReports,
  } = useCoordinatorData();

  // Calcular período semanal (semana anterior)
  const today = new Date();
  const periodStart = startOfWeek(subWeeks(today, 1), { weekStartsOn: 0 });
  const periodEnd = endOfWeek(subWeeks(today, 1), { weekStartsOn: 0 });

  // Validar si ya existe reporte para este período
  const hasCurrentPeriodReport = myReports.some((report: { period_start: string }) => {
    const reportStart = new Date(report.period_start);
    return reportStart >= periodStart && reportStart <= periodEnd;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Cargando dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 md:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
            Dashboard del Coordinador
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground truncate">
            {(user as unknown as { first_name: string; last_name: string })?.first_name}{' '}
            {(user as unknown as { first_name: string; last_name: string })?.last_name} - Vista
            Ejecutiva
          </p>
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <Badge
            variant="secondary"
            className="text-xs sm:text-sm md:text-lg px-3 md:px-4 py-1.5 md:py-2 self-start sm:self-auto"
          >
            <span className="hidden sm:inline">Nivel 4 - Coordinador</span>
            <span className="sm:hidden">Nivel 4</span>
          </Badge>
          <Button
            onClick={() => setShowReportModal(true)}
            disabled={hasCurrentPeriodReport}
            variant={hasCurrentPeriodReport ? 'outline' : 'default'}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            {hasCurrentPeriodReport ? 'Reporte enviado' : 'Nuevo Reporte'}
          </Button>
        </div>
      </div>

      {/* Dialog para crear reporte */}
      <SupervisionReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSuccess={refetchReports}
        periodStart={periodStart}
        periodEnd={periodEnd}
        hierarchyLevel={4}
      />

      {/* Quick Stats */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Grupos</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_groups || 0}</div>
            <p className="text-xs text-muted-foreground">En todo el sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Miembros</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_members || 0}</div>
            <p className="text-xs text-muted-foreground">Activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Líderes Activos</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active_leaders || 0}</div>
            <p className="text-xs text-muted-foreground">En todos los niveles</p>
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
          <TabsList className="inline-flex w-full sm:grid sm:grid-cols-4 h-auto min-w-max sm:min-w-0 gap-1">
            <TabsTrigger
              value="overview"
              className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0 px-3 sm:px-2"
            >
              Resumen
            </TabsTrigger>
            <TabsTrigger
              value="strategic-goals"
              className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0 px-3 sm:px-2"
            >
              Objetivos
            </TabsTrigger>
            <TabsTrigger
              value="quarterly-report"
              className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0 px-3 sm:px-2"
            >
              Reporte
            </TabsTrigger>
            <TabsTrigger
              value="zone-performance"
              className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0 px-3 sm:px-2"
            >
              Zonas
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4">
          {/* Growth Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Crecimiento General</CardTitle>
              <CardDescription>Tendencias de las últimas 12 semanas</CardDescription>
            </CardHeader>
            <CardContent>
              {weeklyTrends.length > 0 ? (
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="asistencia"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.6}
                        name="Asistencia"
                      />
                      <Area
                        type="monotone"
                        dataKey="conversiones"
                        stroke="#22c55e"
                        fill="#22c55e"
                        fillOpacity={0.8}
                        name="Conversiones"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-12">
                  No hay datos de tendencias
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Zone Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Rendimiento por Zona</CardTitle>
              </CardHeader>
              <CardContent>
                {zoneStats.length > 0 ? (
                  <div style={{ width: '100%', height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={zoneStats}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="zone_name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="total_members" fill="#3b82f6" name="Miembros" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No hay datos de zonas</p>
                )}
              </CardContent>
            </Card>

            {/* Key Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Métricas Clave</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Asistencia Promedio</span>
                  <span className="font-bold">{Math.round(stats.average_attendance || 0)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Salud Espiritual</span>
                  <span className="font-bold">{(stats.spiritual_health || 0).toFixed(1)}/10</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Alertas Pendientes</span>
                  <span className="font-bold">{stats.pending_alerts}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Reportes por Aprobar</span>
                  <span className="font-bold">{stats.pending_reports}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="strategic-goals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Objetivos Estratégicos</CardTitle>
              <CardDescription>Progreso hacia las metas establecidas</CardDescription>
            </CardHeader>
            <CardContent>
              {goals.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No hay objetivos definidos</p>
              ) : (
                <div className="space-y-6">
                  {goals.map(goal => (
                    <div key={goal.id}>
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-medium">{goal.description}</h3>
                        <Badge
                          variant={
                            goal.progress_percentage >= 80
                              ? 'default'
                              : goal.progress_percentage >= 50
                                ? 'secondary'
                                : 'destructive'
                          }
                        >
                          {Math.round(goal.progress_percentage)}%
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground mb-2">
                        <span>Actual: {goal.current_value}</span>
                        <span>Meta: {goal.target_value}</span>
                      </div>
                      <Progress value={goal.progress_percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quarterly-report" className="space-y-4">
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
                    Período: {format(periodStart, 'dd MMM', { locale: es })} al{' '}
                    {format(periodEnd, 'dd MMM yyyy', { locale: es })}
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setShowReportModal(true)}
                  disabled={hasCurrentPeriodReport}
                  variant={hasCurrentPeriodReport ? 'outline' : 'default'}
                  className="w-full sm:w-auto"
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

        <TabsContent value="zone-performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rendimiento por Zona</CardTitle>
              <CardDescription>Comparativa de todas las zonas</CardDescription>
            </CardHeader>
            <CardContent>
              {zoneStats.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay datos de zonas disponibles
                </p>
              ) : (
                <div className="space-y-4">
                  {zoneStats.map((zone, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold">{zone.zone_name}</h3>
                        </div>
                        <Badge variant="default">{zone.total_groups} grupos</Badge>
                      </div>
                      <div className="grid gap-2 md:grid-cols-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Miembros: </span>
                          <span className="font-medium">{zone.total_members}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Asistencia: </span>
                          <span className="font-medium">{Math.round(zone.avg_attendance)}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Crecimiento: </span>
                          <span className="font-medium">{zone.growth_rate || 0}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
});

CoordinatorDashboard.displayName = 'CoordinatorDashboard';

export default CoordinatorDashboard;
