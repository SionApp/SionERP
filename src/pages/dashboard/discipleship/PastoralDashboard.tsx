import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useDiscipleshipData } from '@/hooks/useDiscipleshipData';
import { DiscipleshipService } from '@/services/discipleship.service';
import {
  AlertTriangle,
  Building2,
  CheckCircle,
  Clock,
  Crown,
  Loader2,
  Target,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import React, { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';

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

interface Alert {
  id: string;
  title: string;
  message: string;
  alert_type: string;
  priority: number;
  action_required: boolean;
  created_at: string;
}

interface PendingReport {
  id: string;
  reporter_name: string;
  report_type: string;
  period_end: string;
  submitted_at: string;
}

const PastoralDashboard: React.FC = React.memo(() => {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState('overview');

  // Usar hook compartido para evitar consultas duplicadas
  const { loading, stats, zoneStats, weeklyTrends, goals, alerts, pendingReports, refetch } =
    useDiscipleshipData({ level: 5 });
  console.log(user, 'user');
  const handleApproveReport = async (reportId: string) => {
    try {
      await DiscipleshipService.approveReport(reportId);
      toast.success('Reporte aprobado');
      refetch();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error((errorMessage as string) || 'Error al aprobar el reporte');
      console.log(errorMessage, 'errorMessageasdasd');
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await DiscipleshipService.resolveAlert(alertId);
      toast.success('Alerta resuelta');
      refetch();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error((errorMessage as string) || 'Error al resolver la alerta');
      console.log(errorMessage, 'errorMessageasdasd');
    }
  };

  const getAlertPriorityColor = (priority: number) => {
    switch (priority) {
      case 1:
        return 'destructive';
      case 2:
        return 'default';
      case 3:
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Cargando dashboard pastoral...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 md:gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard Pastoral</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {user?.first_name} {user?.last_name} - Vista Ejecutiva General
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="default" className="text-sm md:text-lg px-3 md:px-4 py-1.5 md:py-2">
            <Crown className="mr-2 h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Nivel 5 - Pastor</span>
            <span className="sm:hidden">N5</span>
          </Badge>
        </div>
      </div>

      {/* Executive Summary Cards */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Grupos</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_groups || 0}</div>
            <p className="text-xs text-muted-foreground">En todo el ministerio</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Miembros</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_members || 0}</div>
            <p className="text-xs text-muted-foreground">Activos en células</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Multiplicaciones</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.multiplications || 0}</div>
            <p className="text-xs text-muted-foreground">Este año</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Índice de Salud</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats.spiritual_health || 0).toFixed(1)}/10</div>
            <p className="text-xs text-muted-foreground">Promedio general</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        {/* Mobile: Scroll horizontal, Desktop: Grid */}
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-full md:grid md:grid-cols-5 h-auto min-w-max md:min-w-0 gap-1 md:gap-0">
            <TabsTrigger
              value="overview"
              className="text-xs md:text-sm whitespace-nowrap flex-shrink-0 px-2 md:px-3"
            >
              Vista General
            </TabsTrigger>
            <TabsTrigger
              value="strategic"
              className="text-xs md:text-sm whitespace-nowrap flex-shrink-0 px-2 md:px-3"
            >
              Estratégico
            </TabsTrigger>
            <TabsTrigger
              value="approvals"
              className="text-xs md:text-sm whitespace-nowrap flex-shrink-0 px-2 md:px-3"
            >
              <span className="hidden sm:inline">Aprobaciones</span>
              <span className="sm:hidden">Aprob.</span>
              {stats.pending_reports && stats.pending_reports > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-1 md:ml-2 text-[10px] md:text-xs h-4 md:h-5 px-1 md:px-1.5"
                >
                  {stats.pending_reports}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="alerts"
              className="text-xs md:text-sm whitespace-nowrap flex-shrink-0 px-2 md:px-3"
            >
              Alertas
              {stats.pending_alerts && stats.pending_alerts > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-1 md:ml-2 text-[10px] md:text-xs h-4 md:h-5 px-1 md:px-1.5"
                >
                  {stats.pending_alerts}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="health"
              className="text-xs md:text-sm whitespace-nowrap flex-shrink-0 px-2 md:px-3"
            >
              <span className="hidden md:inline">Salud del Sistema</span>
              <span className="md:hidden">Salud</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4">
          {/* Comprehensive Growth Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Análisis Integral de Crecimiento</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Tendencias de las últimas 24 semanas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {weeklyTrends.length > 0 ? (
                <div className="w-full overflow-x-auto">
                  <div style={{ width: '100%', height: 300, minHeight: 250 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={weeklyTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="miembros"
                          stroke="#3b82f6"
                          strokeWidth={3}
                          name="Asistencia"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="grupos"
                          stroke="#22c55e"
                          strokeWidth={2}
                          name="Grupos Activos"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="conversiones"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          name="Conversiones"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8 md:py-12 text-sm">
                  No hay datos de tendencias disponibles
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {/* Zone Health Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base md:text-lg">Distribución por Zonas</CardTitle>
              </CardHeader>
              <CardContent>
                {zoneStats.length > 0 ? (
                  <div className="w-full overflow-x-auto">
                    <div style={{ width: '100%', height: 250, minHeight: 200 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={zoneStats}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="zoneName" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="totalGroups" fill="#3b82f6" name="Grupos" />
                          <Bar dataKey="totalMembers" fill="#22c55e" name="Miembros" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8 text-sm">
                    No hay datos de zonas
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Key Performance Indicators */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base md:text-lg">Indicadores Clave</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:gap-4 grid-cols-2">
                  <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {Math.round(stats.average_attendance || 0)}%
                    </div>
                    <div className="text-sm text-green-700 dark:text-green-300">Asistencia</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.active_leaders || 0}
                    </div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">Líderes Activos</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {stats.multiplications || 0}
                    </div>
                    <div className="text-sm text-purple-700 dark:text-purple-300">
                      Multiplicaciones
                    </div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{zoneStats.length}</div>
                    <div className="text-sm text-orange-700 dark:text-orange-300">
                      Zonas Activas
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="strategic" className="space-y-4">
          {/* Strategic Goals */}
          <Card>
            <CardHeader>
              <CardTitle>Objetivos Estratégicos</CardTitle>
              <CardDescription>Progreso hacia las metas del ministerio</CardDescription>
            </CardHeader>
            <CardContent>
              {goals.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No hay objetivos definidos</p>
                  <Button variant="outline" className="mt-4">
                    Crear Objetivo
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {goals.map(goal => (
                    <div key={goal.id}>
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-medium">{goal.description}</h3>
                        <Badge
                          variant={
                            goal.status === 'completed'
                              ? 'default'
                              : goal.progress_percentage >= 75
                                ? 'secondary'
                                : goal.progress_percentage >= 50
                                  ? 'outline'
                                  : 'destructive'
                          }
                        >
                          {goal.status === 'completed'
                            ? 'Completado'
                            : `${Math.round(goal.progress_percentage)}%`}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground mb-2">
                        <span>
                          Progreso: {goal.current_value}/{goal.target_value}
                        </span>
                        <span>Meta: {goal.deadline}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            goal.status === 'completed'
                              ? 'bg-green-500'
                              : goal.progress_percentage >= 75
                                ? 'bg-blue-500'
                                : goal.progress_percentage >= 50
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(100, goal.progress_percentage)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals" className="space-y-4">
          {/* Approval Queue */}
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
                  {pendingReports.map(report => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <h4 className="font-medium">{report.reporter_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {report.report_type} - Período: {report.period_end}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center mt-1">
                          <Clock className="w-3 h-3 mr-1" />
                          Enviado: {new Date(report.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApproveReport(report.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Aprobar
                        </Button>
                        <Button size="sm" variant="ghost">
                          Ver
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          {/* Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>Alertas del Sistema</CardTitle>
              <CardDescription>Situaciones que requieren atención</CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                  <p className="text-muted-foreground">No hay alertas pendientes</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.map(alert => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle
                          className={`w-5 h-5 mt-0.5 ${
                            alert.priority === 1
                              ? 'text-red-500'
                              : alert.priority === 2
                                ? 'text-orange-500'
                                : 'text-yellow-500'
                          }`}
                        />
                        <div>
                          <h4 className="font-medium">{alert.title}</h4>
                          <p className="text-sm text-muted-foreground">{alert.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(alert.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getAlertPriorityColor(alert.priority)}>
                          {alert.priority === 1 ? 'Alta' : alert.priority === 2 ? 'Media' : 'Baja'}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResolveAlert(alert.id)}
                        >
                          Resolver
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          {/* System Health */}
          <Card>
            <CardHeader>
              <CardTitle>Salud del Sistema de Discipulado</CardTitle>
              <CardDescription>Métricas generales del ministerio</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h4 className="font-medium mb-4">Métricas de Salud</h4>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Asistencia Promedio</span>
                        <span>{Math.round(stats.average_attendance || 0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-blue-500"
                          style={{ width: `${stats.average_attendance || 0}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Salud Espiritual</span>
                        <span>{(stats.spiritual_health || 0).toFixed(1)}/10</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-green-500"
                          style={{ width: `${(stats.spiritual_health / 10) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Cobertura de Liderazgo</span>
                        <span>
                          {(stats.total_groups || 0) > 0
                            ? Math.round(
                                ((stats.active_leaders || 0) / (stats.total_groups || 1)) * 100
                              )
                            : 0}
                          %
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-purple-500"
                          style={{
                            width: `${
                              (stats.total_groups || 0) > 0
                                ? Math.min(
                                    100,
                                    ((stats.active_leaders || 0) / (stats.total_groups || 1)) * 100
                                  )
                                : 0
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-4">Resumen del Sistema</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between p-3 bg-muted rounded-lg">
                      <span>Total de Zonas</span>
                      <span className="font-bold">{zoneStats.length}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-muted rounded-lg">
                      <span>Grupos Activos</span>
                      <span className="font-bold">{stats.total_groups}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-muted rounded-lg">
                      <span>Líderes en el Sistema</span>
                      <span className="font-bold">{stats.active_leaders || 0}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-muted rounded-lg">
                      <span>Multiplicaciones este Año</span>
                      <span className="font-bold">{stats.multiplications || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
});

PastoralDashboard.displayName = 'PastoralDashboard';

export default PastoralDashboard;
