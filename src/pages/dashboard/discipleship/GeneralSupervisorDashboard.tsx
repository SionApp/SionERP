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
import { useGeneralSupervisorData } from '@/hooks/useGeneralSupervisorData';
import { DiscipleshipService } from '@/services/discipleship.service';
import type { CreateReportRequest } from '@/types/discipleship.types';
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Building,
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  Map,
  Plus,
  RefreshCw,
  Send,
  Target,
  UserPlus,
  Users,
} from 'lucide-react';
import React, { useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';

interface DashboardStats {
  total_groups: number;
  total_members: number;
  subordinates_count: number;
  average_attendance: number;
  spiritual_health: number;
  pending_alerts: number;
}

interface Subordinate {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  hierarchy_level: number;
  groups_assigned: number;
  total_members: number;
  avg_attendance: number;
  performance_score: number;
}

const GeneralSupervisorDashboard: React.FC = React.memo(() => {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState('overview');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Usar hook específico del supervisor general
  const {
    loading,
    stats,
    weeklyTrends,
    subordinates,
    zoneStats,
    myReports,
    error,
    refetch,
    refetchReports,
  } = useGeneralSupervisorData();

  // Calcular período mensual (mes anterior)
  const today = new Date();
  const lastMonth = subMonths(today, 1);
  const periodStart = startOfMonth(lastMonth);
  const periodEnd = endOfMonth(lastMonth);

  // Validar si ya existe reporte para este período
  const hasCurrentPeriodReport = myReports.some(report => {
    const reportStart = new Date(report.period_start);
    return reportStart >= periodStart && reportStart <= periodEnd;
  });

  const [monthlyReport, setMonthlyReport] = useState({
    totalGroups: 0,
    totalMembers: 0,
    monthlyGrowth: 0,
    auxiliarySupervisors: 0,
    trainingSupervisors: 0,
    leadershipGaps: '',
    newGroupLocations: '',
    communityOutreach: '',
    specialEvents: '',
    multiplicationPlans: '',
  });

  const handleSubmitMonthlyReport = async () => {
    if (!user) return;

    setIsSubmittingReport(true);
    try {
      const createData: CreateReportRequest = {
        report_type: 'monthly',
        report_level: 3,
        period_start: format(periodStart, 'yyyy-MM-dd'),
        period_end: format(periodEnd, 'yyyy-MM-dd'),
        report_data: {
          zoneStatistics: {
            totalGroups: monthlyReport.totalGroups,
            totalMembers: monthlyReport.totalMembers,
            monthlyGrowth: monthlyReport.monthlyGrowth,
            multiplicationPlans: monthlyReport.multiplicationPlans.split('\n').filter(Boolean),
          },
          leadershipPipeline: {
            auxiliarySupervisors: monthlyReport.auxiliarySupervisors,
            trainingSupervisors: monthlyReport.trainingSupervisors,
            leadershipGaps: monthlyReport.leadershipGaps.split('\n').filter(Boolean),
          },
          strategicInitiatives: {
            newGroupLocations: monthlyReport.newGroupLocations.split('\n').filter(Boolean),
            communityOutreach: monthlyReport.communityOutreach.split('\n').filter(Boolean),
            specialEvents: monthlyReport.specialEvents.split('\n').filter(Boolean),
          },
        },
      };

      await DiscipleshipService.createReport(createData);

      toast.success('Reporte mensual enviado exitosamente');
      setShowReportModal(false);

      // Reset form
      setMonthlyReport({
        totalGroups: 0,
        totalMembers: 0,
        monthlyGrowth: 0,
        auxiliarySupervisors: 0,
        trainingSupervisors: 0,
        leadershipGaps: '',
        newGroupLocations: '',
        communityOutreach: '',
        specialEvents: '',
        multiplicationPlans: '',
      });

      await refetchReports();
    } catch (error: unknown) {
      console.error('Error submitting report:', error);
      if (error instanceof Error) {
        toast.error(error.message || 'Error al enviar el reporte');
      } else {
        toast.error('Error al enviar el reporte');
      }
    } finally {
      setIsSubmittingReport(false);
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
            Dashboard Supervisor General
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {user?.first_name} {user?.last_name} - {user?.zone_name || 'Zona no asignada'}
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
            <span className="hidden sm:inline">Nivel 3 - Supervisor General</span>
            <span className="sm:hidden">N3</span>
          </Badge>
        </div>
      </div>

      {/* Dialog para crear reporte - Fuera de los tabs para que funcione desde el header */}
      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reporte Mensual</DialogTitle>
            <DialogDescription>
              Período: {format(periodStart, 'MMMM yyyy', { locale: es })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Zone Statistics */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Estadísticas de Zona</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="totalGroups">Total de Grupos</Label>
                  <Input
                    id="totalGroups"
                    type="number"
                    value={monthlyReport.totalGroups}
                    onChange={e =>
                      setMonthlyReport(prev => ({
                        ...prev,
                        totalGroups: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="totalMembers">Total de Miembros</Label>
                  <Input
                    id="totalMembers"
                    type="number"
                    value={monthlyReport.totalMembers}
                    onChange={e =>
                      setMonthlyReport(prev => ({
                        ...prev,
                        totalMembers: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="monthlyGrowth">Crecimiento Mensual (%)</Label>
                  <Input
                    id="monthlyGrowth"
                    type="number"
                    value={monthlyReport.monthlyGrowth}
                    onChange={e =>
                      setMonthlyReport(prev => ({
                        ...prev,
                        monthlyGrowth: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Leadership Pipeline */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Pipeline de Liderazgo</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="auxiliarySupervisors">
                    Supervisores Auxiliares Activos
                  </Label>
                  <Input
                    id="auxiliarySupervisors"
                    type="number"
                    value={monthlyReport.auxiliarySupervisors}
                    onChange={e =>
                      setMonthlyReport(prev => ({
                        ...prev,
                        auxiliarySupervisors: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="trainingSupervisors">
                    Supervisores en Entrenamiento
                  </Label>
                  <Input
                    id="trainingSupervisors"
                    type="number"
                    value={monthlyReport.trainingSupervisors}
                    onChange={e =>
                      setMonthlyReport(prev => ({
                        ...prev,
                        trainingSupervisors: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="mt-4">
                <Label htmlFor="leadershipGaps">Brechas de Liderazgo</Label>
                <Textarea
                  id="leadershipGaps"
                  placeholder="Describe las brechas o necesidades de liderazgo..."
                  className="min-h-[80px]"
                  value={monthlyReport.leadershipGaps}
                  onChange={e =>
                    setMonthlyReport(prev => ({
                      ...prev,
                      leadershipGaps: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="mt-4">
                <Label htmlFor="multiplicationPlans">Planes de Multiplicación</Label>
                <Textarea
                  id="multiplicationPlans"
                  placeholder="Lista los planes de multiplicación (uno por línea)..."
                  className="min-h-[80px]"
                  value={monthlyReport.multiplicationPlans}
                  onChange={e =>
                    setMonthlyReport(prev => ({
                      ...prev,
                      multiplicationPlans: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            {/* Strategic Initiatives */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Iniciativas Estratégicas</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="newGroupLocations">Nuevas Ubicaciones de Grupos</Label>
                  <Textarea
                    id="newGroupLocations"
                    placeholder="Lista las nuevas ubicaciones..."
                    className="min-h-[80px]"
                    value={monthlyReport.newGroupLocations}
                    onChange={e =>
                      setMonthlyReport(prev => ({
                        ...prev,
                        newGroupLocations: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="communityOutreach">Alcance Comunitario</Label>
                  <Textarea
                    id="communityOutreach"
                    placeholder="Actividades de alcance realizadas..."
                    className="min-h-[80px]"
                    value={monthlyReport.communityOutreach}
                    onChange={e =>
                      setMonthlyReport(prev => ({
                        ...prev,
                        communityOutreach: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="mt-4">
                <Label htmlFor="specialEvents">Eventos Especiales</Label>
                <Textarea
                  id="specialEvents"
                  placeholder="Lista los eventos especiales realizados..."
                  className="min-h-[80px]"
                  value={monthlyReport.specialEvents}
                  onChange={e =>
                    setMonthlyReport(prev => ({
                      ...prev,
                      specialEvents: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitMonthlyReport} disabled={isSubmittingReport}>
              {isSubmittingReport ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Reporte
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Stats */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Grupos</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_groups || 0}</div>
            <p className="text-xs text-muted-foreground">En tu zona</p>
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
            <CardTitle className="text-sm font-medium">Supervisores Auxiliares</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.subordinates_count || 0}</div>
            <p className="text-xs text-muted-foreground">Bajo tu liderazgo</p>
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
                <p className="text-xs text-muted-foreground">Reporte mensual enviado</p>
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
          <TabsTrigger value="zone-analysis" className="text-xs md:text-sm">
            Análisis Zonal
          </TabsTrigger>
          <TabsTrigger value="monthly-report" className="text-xs md:text-sm">
            Reporte Mensual
          </TabsTrigger>
          <TabsTrigger value="multiplication" className="text-xs md:text-sm">
            Multiplicación
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Territory Growth Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Crecimiento del Territorio</CardTitle>
              <CardDescription>Tendencias de las últimas 12 semanas</CardDescription>
            </CardHeader>
            <CardContent>
              {weeklyTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={weeklyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="asistencia"
                      stackId="1"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.6}
                      name="Asistencia"
                    />
                    <Area
                      type="monotone"
                      dataKey="visitantes"
                      stackId="2"
                      stroke="#22c55e"
                      fill="#22c55e"
                      fillOpacity={0.8}
                      name="Visitantes"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-12">
                  No hay datos de tendencias disponibles
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Goals Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Objetivos Mensuales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Asistencia Promedio (Meta: 85%)</span>
                    <span>{Math.round(stats.average_attendance || 0)}%</span>
                  </div>
                  <Progress value={stats.average_attendance || 0} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Salud Espiritual (Meta: 8/10)</span>
                    <span>{(stats.spiritual_health || 0).toFixed(1)}</span>
                  </div>
                  <Progress value={(stats.spiritual_health / 10) * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Acciones Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Map className="w-4 h-4 mr-2" />
                  Ver Mapa de Zonas
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Target className="w-4 h-4 mr-2" />
                  Definir Objetivos
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Agregar Supervisor
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="zone-analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Supervisores Auxiliares</CardTitle>
              <CardDescription>Rendimiento de supervisores bajo tu zona</CardDescription>
            </CardHeader>
            <CardContent>
              {subordinates.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay supervisores auxiliares asignados
                </p>
              ) : (
                <div className="space-y-4">
                  {subordinates.map(supervisor => (
                    <div key={supervisor.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold">{supervisor.user_name}</h3>
                          <p className="text-sm text-muted-foreground">{supervisor.user_email}</p>
                        </div>
                        <Badge variant="default">
                          Rendimiento: {Math.round(supervisor.performance_score)}%
                        </Badge>
                      </div>
                      <div className="grid gap-2 md:grid-cols-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Grupos: </span>
                          <span className="font-medium">{supervisor.groups_assigned}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Miembros: </span>
                          <span className="font-medium">{supervisor.total_members}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Asistencia: </span>
                          <span className="font-medium">
                            {Math.round(supervisor.avg_attendance)}%
                          </span>
                        </div>
                        <div>
                          <Button size="sm" variant="outline">
                            Ver Detalle
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2">
                        <Progress value={supervisor.performance_score} className="h-1" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly-report" className="space-y-4">
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
                      zoneStatistics?: { totalGroups?: number; monthlyGrowth?: number };
                    };
                    return (
                      <div
                        key={report.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">
                            {format(new Date(report.period_start), 'MMMM yyyy', { locale: es })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Grupos: {reportData?.zoneStatistics?.totalGroups || 0} • Crecimiento:{' '}
                            {reportData?.zoneStatistics?.monthlyGrowth || 0}%
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
                  <CardTitle>Reporte Mensual</CardTitle>
                  <CardDescription>
                    Período: {format(periodStart, 'MMMM yyyy', { locale: es })}
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
                  <p>Ya has enviado el reporte mensual para este período</p>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Haz clic en "Nuevo Reporte" para crear un reporte mensual</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="multiplication" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Plan de Multiplicación</CardTitle>
              <CardDescription>Grupos en proceso de multiplicación</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Funcionalidad de multiplicación próximamente
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
});

GeneralSupervisorDashboard.displayName = 'GeneralSupervisorDashboard';

export default GeneralSupervisorDashboard;
