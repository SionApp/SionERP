import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  TrendingUp, 
  Target, 
  Building2, 
  Send, 
  BarChart3,
  PieChart,
  Zap,
  Award
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart as RechartsPieChart, Cell } from 'recharts';
import { DiscipleshipMockService } from '@/mocks/discipleship/services.mock';
import { QuarterlyCoordinatorReport } from '@/types/discipleship.types';
import { toast } from '@/hooks/use-toast';

const CoordinatorDashboard: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [stats, setStats] = useState<any>({});
  const [zonePerformance, setZonePerformance] = useState<any[]>([]);
  const [quarterlyReport, setQuarterlyReport] = useState<Partial<QuarterlyCoordinatorReport>>({
    ministryOverview: { totalZones: 0, totalGroups: 0, totalMembers: 0, quarterlyGrowth: 0 },
    strategicGoals: { annualTargets: [], quarterProgress: 0, adjustmentNeeded: false },
    systemHealth: { leadershipStrength: 5, systemEfficiency: 5, memberSatisfaction: 5 }
  });

  useEffect(() => {
    const loadData = async () => {
      const dashboardStats = await DiscipleshipMockService.getDashboardStats(4, 'current-user-id');
      const zoneData = await DiscipleshipMockService.getZonePerformance();
      setStats(dashboardStats);
      setZonePerformance(zoneData);
    };
    loadData();
  }, []);

  const handleSubmitQuarterlyReport = async () => {
    setIsSubmittingReport(true);
    try {
      const result = await DiscipleshipMockService.submitQuarterlyReport({
        ...quarterlyReport,
        coordinatorId: 'current-user-id',
        quarter: Math.ceil((new Date().getMonth() + 1) / 3),
        year: new Date().getFullYear()
      } as QuarterlyCoordinatorReport);
      
      if (result.success) {
        toast({
          title: 'Reporte Enviado',
          description: 'Tu reporte trimestral ha sido enviado exitosamente.',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo enviar el reporte. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const quarterlyData = [
    { quarter: 'Q1', grupos: 12, miembros: 144, crecimiento: 8 },
    { quarter: 'Q2', grupos: 15, miembros: 180, crecimiento: 25 },
    { quarter: 'Q3', grupos: 18, miembros: 216, crecimiento: 20 },
    { quarter: 'Q4', grupos: 22, miembros: 264, crecimiento: 22 }
  ];

  const systemHealthData = [
    { name: 'Liderazgo', value: 85, color: '#22c55e' },
    { name: 'Eficiencia', value: 78, color: '#3b82f6' },
    { name: 'Satisfacción', value: 92, color: '#f59e0b' },
    { name: 'Crecimiento', value: 88, color: '#8b5cf6' }
  ];

  const strategicGoals = [
    { goal: 'Alcanzar 25 grupos activos', current: 22, target: 25, progress: 88 },
    { goal: 'Entrenar 15 supervisores', current: 12, target: 15, progress: 80 },
    { goal: 'Multiplicar 8 grupos', current: 5, target: 8, progress: 63 },
    { goal: '300 miembros totales', current: 264, target: 300, progress: 88 }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard del Coordinador</h1>
          <p className="text-muted-foreground">María González - Zona Norte</p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          Nivel 4 - Coordinador
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Grupos</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalGroups || 22}</div>
            <p className="text-xs text-muted-foreground">+4 este trimestre</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Miembros</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers || 264}</div>
            <p className="text-xs text-muted-foreground">+48 últimos 90 días</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Supervisores</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSupervisors || 12}</div>
            <p className="text-xs text-muted-foreground">3 niveles de supervisión</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crecimiento Zonal</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.zoneGrowthRate || 22}%</div>
            <p className="text-xs text-muted-foreground">vs trimestre anterior</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Resumen Ejecutivo</TabsTrigger>
          <TabsTrigger value="strategic-goals">Objetivos Estratégicos</TabsTrigger>
          <TabsTrigger value="quarterly-report">Reporte Trimestral</TabsTrigger>
          <TabsTrigger value="zone-performance">Rendimiento Zonal</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Quarterly Growth Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Crecimiento Trimestral</CardTitle>
              <CardDescription>Evolución de grupos y miembros a lo largo del año</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={quarterlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="quarter" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="miembros" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="grupos" stackId="2" stroke="#22c55e" fill="#22c55e" fillOpacity={0.8} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle>Salud del Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={systemHealthData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Key Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Métricas Clave</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Retención de Miembros</span>
                  <span className="font-bold">92%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Satisfacción de Líderes</span>
                  <span className="font-bold">8.7/10</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Eficiencia Operativa</span>
                  <span className="font-bold">85%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Índice de Multiplicación</span>
                  <span className="font-bold">23%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="strategic-goals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Objetivos Estratégicos Anuales</CardTitle>
              <CardDescription>
                Progreso hacia las metas establecidas para este año
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {strategicGoals.map((goal, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium">{goal.goal}</h3>
                      <Badge variant={goal.progress >= 80 ? 'default' : goal.progress >= 60 ? 'secondary' : 'destructive'}>
                        {goal.progress}%
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground mb-2">
                      <span>Actual: {goal.current}</span>
                      <span>Meta: {goal.target}</span>
                    </div>
                    <Progress value={goal.progress} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Strategic Initiatives */}
          <Card>
            <CardHeader>
              <CardTitle>Iniciativas Estratégicas Activas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { 
                    initiative: 'Programa de Mentoría para Líderes', 
                    status: 'En Progreso', 
                    completion: 65,
                    impact: 'Alto' 
                  },
                  { 
                    initiative: 'Expansión a Zonas Rurales', 
                    status: 'Planificación', 
                    completion: 25,
                    impact: 'Medio' 
                  },
                  { 
                    initiative: 'Sistema Digital de Reportes', 
                    status: 'Implementación', 
                    completion: 80,
                    impact: 'Alto' 
                  },
                  { 
                    initiative: 'Capacitación en Multiplicación', 
                    status: 'Completado', 
                    completion: 100,
                    impact: 'Alto' 
                  }
                ].map((initiative, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{initiative.initiative}</h4>
                      <Badge 
                        variant={
                          initiative.status === 'Completado' ? 'default' : 
                          initiative.status === 'En Progreso' ? 'secondary' : 
                          'outline'
                        }
                      >
                        {initiative.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">Impacto: {initiative.impact}</span>
                      <span className="text-sm">{initiative.completion}%</span>
                    </div>
                    <Progress value={initiative.completion} className="h-1" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quarterly-report" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reporte Trimestral</CardTitle>
              <CardDescription>
                Análisis estratégico y metas para el próximo trimestre
              </CardDescription>
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
                      value={quarterlyReport.ministryOverview?.totalZones || 0}
                      onChange={(e) =>
                        setQuarterlyReport(prev => ({
                          ...prev,
                          ministryOverview: { 
                            ...prev.ministryOverview!, 
                            totalZones: parseInt(e.target.value) || 0 
                          }
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="totalGroups">Total de Grupos</Label>
                    <Input
                      id="totalGroups"
                      type="number"
                      value={quarterlyReport.ministryOverview?.totalGroups || 0}
                      onChange={(e) =>
                        setQuarterlyReport(prev => ({
                          ...prev,
                          ministryOverview: { 
                            ...prev.ministryOverview!, 
                            totalGroups: parseInt(e.target.value) || 0 
                          }
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="totalMembers">Total de Miembros</Label>
                    <Input
                      id="totalMembers"
                      type="number"
                      value={quarterlyReport.ministryOverview?.totalMembers || 0}
                      onChange={(e) =>
                        setQuarterlyReport(prev => ({
                          ...prev,
                          ministryOverview: { 
                            ...prev.ministryOverview!, 
                            totalMembers: parseInt(e.target.value) || 0 
                          }
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="quarterlyGrowth">Crecimiento Trimestral (%)</Label>
                    <Input
                      id="quarterlyGrowth"
                      type="number"
                      value={quarterlyReport.ministryOverview?.quarterlyGrowth || 0}
                      onChange={(e) =>
                        setQuarterlyReport(prev => ({
                          ...prev,
                          ministryOverview: { 
                            ...prev.ministryOverview!, 
                            quarterlyGrowth: parseInt(e.target.value) || 0 
                          }
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* System Health Assessment */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Evaluación de Salud del Sistema</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="leadershipStrength">Fortaleza de Liderazgo (1-10)</Label>
                    <Input
                      id="leadershipStrength"
                      type="number"
                      min="1"
                      max="10"
                      value={quarterlyReport.systemHealth?.leadershipStrength || 5}
                      onChange={(e) =>
                        setQuarterlyReport(prev => ({
                          ...prev,
                          systemHealth: { 
                            ...prev.systemHealth!, 
                            leadershipStrength: parseInt(e.target.value) || 5 
                          }
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="systemEfficiency">Eficiencia del Sistema (1-10)</Label>
                    <Input
                      id="systemEfficiency"
                      type="number"
                      min="1"
                      max="10"
                      value={quarterlyReport.systemHealth?.systemEfficiency || 5}
                      onChange={(e) =>
                        setQuarterlyReport(prev => ({
                          ...prev,
                          systemHealth: { 
                            ...prev.systemHealth!, 
                            systemEfficiency: parseInt(e.target.value) || 5 
                          }
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="memberSatisfaction">Satisfacción de Miembros (1-10)</Label>
                    <Input
                      id="memberSatisfaction"
                      type="number"
                      min="1"
                      max="10"
                      value={quarterlyReport.systemHealth?.memberSatisfaction || 5}
                      onChange={(e) =>
                        setQuarterlyReport(prev => ({
                          ...prev,
                          systemHealth: { 
                            ...prev.systemHealth!, 
                            memberSatisfaction: parseInt(e.target.value) || 5 
                          }
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Strategic Analysis */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Análisis Estratégico</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="quarterProgress">Progreso de Objetivos Trimestrales (%)</Label>
                    <Input
                      id="quarterProgress"
                      type="number"
                      value={quarterlyReport.strategicGoals?.quarterProgress || 0}
                      onChange={(e) =>
                        setQuarterlyReport(prev => ({
                          ...prev,
                          strategicGoals: { 
                            ...prev.strategicGoals!, 
                            quarterProgress: parseInt(e.target.value) || 0 
                          }
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="strategicAnalysis">Análisis de Tendencias y Oportunidades</Label>
                    <Textarea
                      id="strategicAnalysis"
                      placeholder="Describe las principales tendencias observadas y oportunidades identificadas..."
                      className="min-h-[100px]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="recommendations">Recomendaciones para el Próximo Trimestre</Label>
                    <Textarea
                      id="recommendations"
                      placeholder="Propuestas estratégicas y ajustes recomendados..."
                      className="min-h-[100px]"
                    />
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleSubmitQuarterlyReport} 
                disabled={isSubmittingReport}
                className="w-full"
                size="lg"
              >
                {isSubmittingReport ? (
                  <>Enviando...</>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
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
              <CardDescription>
                Comparativo de métricas entre diferentes zonas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {zonePerformance.map((zone, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold">{zone.zoneName}</h3>
                        <p className="text-sm text-muted-foreground">Supervisor: {zone.supervisor}</p>
                      </div>
                      <Badge 
                        variant={zone.healthScore >= 8 ? 'default' : zone.healthScore >= 7 ? 'secondary' : 'outline'}
                      >
                        Salud: {zone.healthScore}/10
                      </Badge>
                    </div>
                    <div className="grid gap-2 md:grid-cols-4 text-sm mb-3">
                      <div>
                        <span className="text-muted-foreground">Grupos: </span>
                        <span className="font-medium">{zone.totalGroups}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Miembros: </span>
                        <span className="font-medium">{zone.totalMembers}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Crecimiento: </span>
                        <span className="font-medium">{zone.growthRate}%</span>
                      </div>
                      <div>
                        <Button size="sm" variant="outline">
                          Ver Detalles
                        </Button>
                      </div>
                    </div>
                    <Progress value={zone.healthScore * 10} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CoordinatorDashboard;