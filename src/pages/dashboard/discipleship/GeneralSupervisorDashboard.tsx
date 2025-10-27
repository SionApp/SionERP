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
  Map,
  Target,
  Send,
  BarChart3,
  PieChart,
  Building,
  UserPlus,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { DiscipleshipMockService } from '@/mocks/discipleship/services.mock';
import { MonthlyGeneralReport } from '@/types/discipleship.types';
import { toast } from '@/hooks/use-toast';

const GeneralSupervisorDashboard: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [stats, setStats] = useState<any>({});
  const [zoneData, setZoneData] = useState<any[]>([]);
  const [monthlyReport, setMonthlyReport] = useState<Partial<MonthlyGeneralReport>>({
    zoneStatistics: { totalGroups: 0, totalMembers: 0, monthlyGrowth: 0, multiplicationPlans: [] },
    leadershipPipeline: { auxiliarySupervisors: 0, trainingSupervisors: 0, leadershipGaps: [] },
    strategicInitiatives: { newGroupLocations: [], communityOutreach: [], specialEvents: [] },
  });

  useEffect(() => {
    const loadData = async () => {
      const dashboardStats = await DiscipleshipMockService.getDashboardStats(3, 'current-user-id');
      const growthData = await DiscipleshipMockService.getGrowthData();
      setStats(dashboardStats);
      setZoneData(growthData);
    };
    loadData();
  }, []);

  const handleSubmitMonthlyReport = async () => {
    setIsSubmittingReport(true);
    try {
      const result = await DiscipleshipMockService.submitMonthlyReport({
        ...monthlyReport,
        supervisorId: 'current-user-id',
        zoneName: 'Zona Norte - Sector A',
        month: new Date().toISOString().split('T')[0],
      } as MonthlyGeneralReport);

      if (result.success) {
        toast({
          title: 'Reporte Enviado',
          description: 'Tu reporte mensual ha sido enviado exitosamente.',
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

  const territoryStats = [
    { name: 'Ene', grupos: 6, miembros: 72 },
    { name: 'Feb', grupos: 6, miembros: 78 },
    { name: 'Mar', grupos: 7, miembros: 84 },
    { name: 'Abr', grupos: 7, miembros: 91 },
    { name: 'May', grupos: 8, miembros: 96 },
    { name: 'Jun', grupos: 8, miembros: 104 },
  ];

  const groupDistribution = [
    { name: 'Activos', value: 6, color: '#22c55e' },
    { name: 'Multiplicando', value: 2, color: '#3b82f6' },
    { name: 'Nuevos', value: 1, color: '#f59e0b' },
  ];

  const auxiliarySupervisors = [
    { name: 'Patricia Jiménez', groups: 4, members: 48, performance: 92, zone: 'Sector A1' },
    { name: 'Miguel Herrera', groups: 3, members: 36, performance: 88, zone: 'Sector A2' },
    { name: 'Carmen Ruiz', groups: 2, members: 24, performance: 95, zone: 'Sector A3' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Supervisor General</h1>
          <p className="text-muted-foreground">Ana López - Zona Norte, Sector A</p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          Nivel 3 - Supervisor General
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Grupos</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalGroups || 9}</div>
            <p className="text-xs text-muted-foreground">+2 este mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Miembros</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers || 108}</div>
            <p className="text-xs text-muted-foreground">+12 últimos 30 días</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Supervisores Auxiliares</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.auxiliarySupervisors || 3}</div>
            <p className="text-xs text-muted-foreground">Completamente capacitados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Índice de Salud</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.territoryHealthIndex || 8.7}/10</div>
            <p className="text-xs text-muted-foreground">+0.3 vs mes anterior</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="zone-analysis">Análisis Zonal</TabsTrigger>
          <TabsTrigger value="monthly-report">Reporte Mensual</TabsTrigger>
          <TabsTrigger value="multiplication">Multiplicación</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Territory Growth Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Crecimiento del Territorio</CardTitle>
              <CardDescription>
                Evolución de grupos y miembros en los últimos 6 meses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={territoryStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="miembros"
                    stackId="1"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="grupos"
                    stackId="2"
                    stroke="#22c55e"
                    fill="#22c55e"
                    fillOpacity={0.8}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Group Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Distribución de Grupos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {groupDistribution.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        ></div>
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Goals Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Objetivos Mensuales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Multiplicación de Grupos (Meta: 3)</span>
                    <span>2</span>
                  </div>
                  <Progress value={67} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Nuevos Líderes (Meta: 4)</span>
                    <span>3</span>
                  </div>
                  <Progress value={75} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Crecimiento en Miembros (Meta: 15)</span>
                    <span>12</span>
                  </div>
                  <Progress value={80} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="zone-analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Supervisores Auxiliares</CardTitle>
              <CardDescription>Rendimiento y métricas de supervisores bajo tu zona</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auxiliarySupervisors.map((supervisor, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold">{supervisor.name}</h3>
                        <p className="text-sm text-muted-foreground">{supervisor.zone}</p>
                      </div>
                      <Badge variant="default">Rendimiento: {supervisor.performance}%</Badge>
                    </div>
                    <div className="grid gap-2 md:grid-cols-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Grupos: </span>
                        <span className="font-medium">{supervisor.groups}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Miembros: </span>
                        <span className="font-medium">{supervisor.members}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Rendimiento: </span>
                        <span className="font-medium">{supervisor.performance}%</span>
                      </div>
                      <div>
                        <Button size="sm" variant="outline">
                          Ver Detalle
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2">
                      <Progress value={supervisor.performance} className="h-1" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Zone Map/Locations */}
          <Card>
            <CardHeader>
              <CardTitle>Ubicaciones de Grupos</CardTitle>
              <CardDescription>Distribución geográfica en el sector</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { location: 'Colonia Centro', groups: 3, growth: '+1 mes pasado' },
                  { location: 'Residencial Norte', groups: 2, growth: 'Estable' },
                  { location: 'Sector Industrial', groups: 2, growth: '+1 mes pasado' },
                  { location: 'Barrio San José', groups: 1, growth: 'Nuevo' },
                  { location: 'Zona Comercial', groups: 1, growth: 'Multiplicando' },
                ].map((location, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <h4 className="font-medium">{location.location}</h4>
                    <p className="text-sm text-muted-foreground">{location.groups} grupos</p>
                    <p className="text-xs text-muted-foreground">{location.growth}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly-report" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reporte Mensual</CardTitle>
              <CardDescription>
                Análisis completo del territorio y planes estratégicos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Zone Statistics */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Estadísticas de Zona</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="totalGroups">Total de Grupos</Label>
                    <Input
                      id="totalGroups"
                      type="number"
                      value={monthlyReport.zoneStatistics?.totalGroups || 0}
                      onChange={e =>
                        setMonthlyReport(prev => ({
                          ...prev,
                          zoneStatistics: {
                            ...prev.zoneStatistics!,
                            totalGroups: parseInt(e.target.value) || 0,
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="totalMembers">Total de Miembros</Label>
                    <Input
                      id="totalMembers"
                      type="number"
                      value={monthlyReport.zoneStatistics?.totalMembers || 0}
                      onChange={e =>
                        setMonthlyReport(prev => ({
                          ...prev,
                          zoneStatistics: {
                            ...prev.zoneStatistics!,
                            totalMembers: parseInt(e.target.value) || 0,
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="monthlyGrowth">Crecimiento Mensual (%)</Label>
                    <Input
                      id="monthlyGrowth"
                      type="number"
                      value={monthlyReport.zoneStatistics?.monthlyGrowth || 0}
                      onChange={e =>
                        setMonthlyReport(prev => ({
                          ...prev,
                          zoneStatistics: {
                            ...prev.zoneStatistics!,
                            monthlyGrowth: parseInt(e.target.value) || 0,
                          },
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
                    <Label htmlFor="auxiliarySupervisors">Supervisores Auxiliares Activos</Label>
                    <Input
                      id="auxiliarySupervisors"
                      type="number"
                      value={monthlyReport.leadershipPipeline?.auxiliarySupervisors || 0}
                      onChange={e =>
                        setMonthlyReport(prev => ({
                          ...prev,
                          leadershipPipeline: {
                            ...prev.leadershipPipeline!,
                            auxiliarySupervisors: parseInt(e.target.value) || 0,
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="trainingSupervisors">Supervisores en Entrenamiento</Label>
                    <Input
                      id="trainingSupervisors"
                      type="number"
                      value={monthlyReport.leadershipPipeline?.trainingSupervisors || 0}
                      onChange={e =>
                        setMonthlyReport(prev => ({
                          ...prev,
                          leadershipPipeline: {
                            ...prev.leadershipPipeline!,
                            trainingSupervisors: parseInt(e.target.value) || 0,
                          },
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Label htmlFor="leadershipGaps">Brechas de Liderazgo Identificadas</Label>
                  <Textarea
                    id="leadershipGaps"
                    placeholder="Describe las áreas donde se necesita más liderazgo..."
                    className="min-h-[80px]"
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
                      placeholder="Lista las nuevas ubicaciones planificadas..."
                      className="min-h-[80px]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="communityOutreach">Alcance Comunitario</Label>
                    <Textarea
                      id="communityOutreach"
                      placeholder="Describe las actividades de alcance comunitario..."
                      className="min-h-[80px]"
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSubmitMonthlyReport}
                disabled={isSubmittingReport}
                className="w-full"
                size="lg"
              >
                {isSubmittingReport ? (
                  <>Enviando...</>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar Reporte Mensual
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="multiplication" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Plan de Multiplicación</CardTitle>
              <CardDescription>Estrategia para multiplicar grupos en el territorio</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    group: 'Juventud Victoriosa',
                    leader: 'Carmen Torres',
                    status: 'Listo',
                    targetDate: 'Oct 2024',
                    newLocation: 'Centro Comunitario Norte',
                  },
                  {
                    group: 'Célula Esperanza',
                    leader: 'Roberto Silva',
                    status: 'Preparando',
                    targetDate: 'Nov 2024',
                    newLocation: 'Casa de Familia García',
                  },
                  {
                    group: 'Familia en Cristo',
                    leader: 'Miguel Herrera',
                    status: 'Evaluando',
                    targetDate: 'Dic 2024',
                    newLocation: 'Por definir',
                  },
                ].map((plan, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{plan.group}</p>
                      <p className="text-sm text-muted-foreground">Líder: {plan.leader}</p>
                      <p className="text-sm text-muted-foreground">
                        Nueva ubicación: {plan.newLocation}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Badge
                        variant={
                          plan.status === 'Listo'
                            ? 'default'
                            : plan.status === 'Preparando'
                              ? 'secondary'
                              : 'outline'
                        }
                      >
                        {plan.status}
                      </Badge>
                      <span className="text-sm">{plan.targetDate}</span>
                      <Button size="sm" variant="outline">
                        Gestionar
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
};

export default GeneralSupervisorDashboard;
