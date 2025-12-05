import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useDiscipleshipData } from '@/hooks/useDiscipleshipData';
import { DiscipleshipService } from '@/services/discipleship.service';
import { Award, Building2, Loader2, Send, TrendingUp, Users } from 'lucide-react';
import React, { useEffect, useState } from 'react';
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

const CoordinatorDashboard: React.FC = React.memo(() => {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState('overview');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  
  // Usar hook compartido para evitar consultas duplicadas
  const {
    loading,
    stats,
    goals,
    zoneStats,
    weeklyTrends,
  } = useDiscipleshipData({ level: 3 });
  
  const [quarterlyReport, setQuarterlyReport] = useState({
    totalZones: 0,
    totalGroups: 0,
    totalMembers: 0,
    quarterlyGrowth: 0,
    leadershipStrength: 5,
    systemEfficiency: 5,
    memberSatisfaction: 5,
    strategicNotes: '',
    challengesAndRisks: '',
    nextQuarterPriorities: '',
  });

  const handleSubmitQuarterlyReport = async () => {
    setIsSubmittingReport(true);
    try {
      const today = new Date();
      const quarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);

      await DiscipleshipService.createReport({
        report_type: 'quarterly',
        report_level: 4,
        period_start: quarterStart.toISOString().split('T')[0],
        period_end: today.toISOString().split('T')[0],
        report_data: {
          ministryOverview: {
            totalZones: quarterlyReport.totalZones,
            totalGroups: quarterlyReport.totalGroups,
            totalMembers: quarterlyReport.totalMembers,
            quarterlyGrowth: quarterlyReport.quarterlyGrowth,
          },
          systemHealth: {
            leadershipStrength: quarterlyReport.leadershipStrength,
            systemEfficiency: quarterlyReport.systemEfficiency,
            memberSatisfaction: quarterlyReport.memberSatisfaction,
          },
          strategicNotes: quarterlyReport.strategicNotes,
          challengesAndRisks: quarterlyReport.challengesAndRisks,
          nextQuarterPriorities: quarterlyReport.nextQuarterPriorities,
        },
      });

      toast.success('Reporte trimestral enviado exitosamente');
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
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
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard del Coordinador</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {user?.first_name} {user?.last_name} - Vista Ejecutiva
          </p>
        </div>
        <Badge variant="secondary" className="text-sm md:text-lg px-3 md:px-4 py-1.5 md:py-2">
          <span className="hidden sm:inline">Nivel 4 - Coordinador</span>
          <span className="sm:hidden">N4</span>
        </Badge>
      </div>

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
            <CardTitle className="text-sm font-medium">Multiplicaciones</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.multiplications || 0}</div>
            <p className="text-xs text-muted-foreground">Este año</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-1 md:gap-0">
          <TabsTrigger value="overview" className="text-xs md:text-sm">Resumen</TabsTrigger>
          <TabsTrigger value="strategic-goals" className="text-xs md:text-sm">Objetivos</TabsTrigger>
          <TabsTrigger value="quarterly-report" className="text-xs md:text-sm">Reporte</TabsTrigger>
          <TabsTrigger value="zone-performance" className="text-xs md:text-sm">Zonas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Growth Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Crecimiento General</CardTitle>
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
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={zoneStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="zone_name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="total_members" fill="#3b82f6" name="Miembros" />
                    </BarChart>
                  </ResponsiveContainer>
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
          <Card>
            <CardHeader>
              <CardTitle>Reporte Trimestral</CardTitle>
              <CardDescription>Análisis estratégico del trimestre</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Ministry Overview */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Resumen del Ministerio</h3>
                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <Label htmlFor="totalZones">Total de Zonas</Label>
                    <Input
                      id="totalZones"
                      type="number"
                      value={quarterlyReport.totalZones}
                      onChange={e =>
                        setQuarterlyReport(prev => ({
                          ...prev,
                          totalZones: parseInt(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="totalGroups">Total de Grupos</Label>
                    <Input
                      id="totalGroups"
                      type="number"
                      value={quarterlyReport.totalGroups}
                      onChange={e =>
                        setQuarterlyReport(prev => ({
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
                      value={quarterlyReport.totalMembers}
                      onChange={e =>
                        setQuarterlyReport(prev => ({
                          ...prev,
                          totalMembers: parseInt(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="quarterlyGrowth">Crecimiento (%)</Label>
                    <Input
                      id="quarterlyGrowth"
                      type="number"
                      value={quarterlyReport.quarterlyGrowth}
                      onChange={e =>
                        setQuarterlyReport(prev => ({
                          ...prev,
                          quarterlyGrowth: parseInt(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* System Health */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Evaluación del Sistema (1-10)</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="leadershipStrength">Fortaleza de Liderazgo</Label>
                    <Input
                      id="leadershipStrength"
                      type="number"
                      min="1"
                      max="10"
                      value={quarterlyReport.leadershipStrength}
                      onChange={e =>
                        setQuarterlyReport(prev => ({
                          ...prev,
                          leadershipStrength: Math.min(
                            10,
                            Math.max(1, parseInt(e.target.value) || 1)
                          ),
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="systemEfficiency">Eficiencia del Sistema</Label>
                    <Input
                      id="systemEfficiency"
                      type="number"
                      min="1"
                      max="10"
                      value={quarterlyReport.systemEfficiency}
                      onChange={e =>
                        setQuarterlyReport(prev => ({
                          ...prev,
                          systemEfficiency: Math.min(
                            10,
                            Math.max(1, parseInt(e.target.value) || 1)
                          ),
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="memberSatisfaction">Satisfacción de Miembros</Label>
                    <Input
                      id="memberSatisfaction"
                      type="number"
                      min="1"
                      max="10"
                      value={quarterlyReport.memberSatisfaction}
                      onChange={e =>
                        setQuarterlyReport(prev => ({
                          ...prev,
                          memberSatisfaction: Math.min(
                            10,
                            Math.max(1, parseInt(e.target.value) || 1)
                          ),
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Strategic Notes */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="strategicNotes">Notas Estratégicas</Label>
                  <Textarea
                    id="strategicNotes"
                    placeholder="Observaciones estratégicas del trimestre..."
                    className="min-h-[120px]"
                    value={quarterlyReport.strategicNotes}
                    onChange={e =>
                      setQuarterlyReport(prev => ({
                        ...prev,
                        strategicNotes: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="challengesAndRisks">Desafíos y Riesgos</Label>
                  <Textarea
                    id="challengesAndRisks"
                    placeholder="Desafíos identificados y riesgos potenciales..."
                    className="min-h-[120px]"
                    value={quarterlyReport.challengesAndRisks}
                    onChange={e =>
                      setQuarterlyReport(prev => ({
                        ...prev,
                        challengesAndRisks: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="nextQuarterPriorities">Prioridades Próximo Trimestre</Label>
                <Textarea
                  id="nextQuarterPriorities"
                  placeholder="Prioridades y enfoque para el próximo trimestre..."
                  className="min-h-[100px]"
                  value={quarterlyReport.nextQuarterPriorities}
                  onChange={e =>
                    setQuarterlyReport(prev => ({
                      ...prev,
                      nextQuarterPriorities: e.target.value,
                    }))
                  }
                />
              </div>

              <Button
                onClick={handleSubmitQuarterlyReport}
                disabled={isSubmittingReport}
                className="w-full"
                size="lg"
              >
                {isSubmittingReport ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Reporte Trimestral
                  </>
                )}
              </Button>
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
