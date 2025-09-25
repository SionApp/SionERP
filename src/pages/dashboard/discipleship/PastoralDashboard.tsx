import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  TrendingUp, 
  Building2, 
  Crown, 
  BarChart3,
  PieChart,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart as RechartsPieChart, Cell, LineChart, Line } from 'recharts';
import { DiscipleshipMockService } from '@/mocks/discipleship/services.mock';
import { Alert, Goal } from '@/types/discipleship.types';
import { toast } from '@/hooks/use-toast';

const PastoralDashboard: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [stats, setStats] = useState<any>({});
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    const loadData = async () => {
      const dashboardStats = await DiscipleshipMockService.getDashboardStats(5, 'current-user-id');
      const systemAlerts = await DiscipleshipMockService.getAlerts(5, 'current-user-id');
      const strategicGoals = await DiscipleshipMockService.getGoals(5, 'current-user-id');
      
      setStats(dashboardStats);
      setAlerts(systemAlerts);
      setGoals(strategicGoals);
    };
    loadData();
  }, []);

  const handleApproveAlert = async (alertId: string) => {
    // Mock approval action
    toast({
      title: 'Acción Aprobada',
      description: 'La acción ha sido aprobada y será ejecutada.',
    });
  };

  const comprehensiveData = [
    { month: 'Ene', grupos: 28, miembros: 336, conversion: 12, retention: 92 },
    { month: 'Feb', grupos: 30, miembros: 360, conversion: 15, retention: 89 },
    { month: 'Mar', grupos: 32, miembros: 384, conversion: 18, retention: 94 },
    { month: 'Abr', grupos: 34, miembros: 408, conversion: 22, retention: 91 },
    { month: 'May', grupos: 36, miembros: 432, conversion: 25, retention: 93 },
    { month: 'Jun', grupos: 38, miembros: 456, conversion: 28, retention: 95 }
  ];

  const zoneHealthData = [
    { name: 'Zona Norte', salud: 88, color: '#22c55e' },
    { name: 'Zona Sur', salud: 82, color: '#3b82f6' },
    { name: 'Zona Este', salud: 91, color: '#10b981' },
    { name: 'Zona Oeste', salud: 75, color: '#f59e0b' }
  ];

  const leadershipPipeline = [
    { nivel: 'Líderes', actual: 36, meta: 40, color: '#3b82f6' },
    { nivel: 'Sup. Auxiliares', actual: 12, meta: 15, color: '#22c55e' },
    { nivel: 'Sup. Generales', actual: 4, meta: 6, color: '#f59e0b' },
    { nivel: 'Coordinadores', actual: 2, meta: 3, color: '#8b5cf6' }
  ];

  const approvalQueue = [
    { id: '1', type: 'Multiplicación de Grupo', title: 'Juventud Victoriosa - División', priority: 'high', deadline: '2024-10-15' },
    { id: '2', type: 'Promoción de Líder', title: 'Carmen Torres a Supervisor Auxiliar', priority: 'medium', deadline: '2024-10-20' },
    { id: '3', type: 'Presupuesto', title: 'Capacitación Liderazgo Q4', priority: 'medium', deadline: '2024-10-25' },
    { id: '4', type: 'Nueva Zona', title: 'Expansión Zona Rural Este', priority: 'high', deadline: '2024-11-01' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Pastoral</h1>
          <p className="text-muted-foreground">Pastor David Martínez - Vista Ejecutiva General</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="default" className="text-lg px-4 py-2">
            <Crown className="mr-2 h-4 w-4" />
            Nivel 5 - Pastor
          </Badge>
        </div>
      </div>

      {/* Executive Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Grupos</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalGroups || 36}</div>
            <p className="text-xs text-muted-foreground">+8 este año</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Miembros</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers || 432}</div>
            <p className="text-xs text-muted-foreground">+96 este año</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crecimiento Anual</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.growthRate || 28.6}%</div>
            <p className="text-xs text-muted-foreground">Sobre objetivo (25%)</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Índice de Salud</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.healthIndex || 8.4}/10</div>
            <p className="text-xs text-muted-foreground">Excelente estado</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Vista General</TabsTrigger>
          <TabsTrigger value="strategic">Estratégico</TabsTrigger>
          <TabsTrigger value="approvals">Aprobaciones</TabsTrigger>
          <TabsTrigger value="health">Salud del Sistema</TabsTrigger>
          <TabsTrigger value="decisions">Decisiones</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Comprehensive Growth Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Análisis Integral de Crecimiento</CardTitle>
              <CardDescription>Tendencias de grupos, miembros, conversiones y retención</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={comprehensiveData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Line yAxisId="left" type="monotone" dataKey="miembros" stroke="#3b82f6" strokeWidth={3} />
                  <Line yAxisId="right" type="monotone" dataKey="grupos" stroke="#22c55e" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="conversion" stroke="#f59e0b" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="retention" stroke="#8b5cf6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Zone Health Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Salud por Zonas</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={zoneHealthData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="salud" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Leadership Pipeline */}
            <Card>
              <CardHeader>
                <CardTitle>Pipeline de Liderazgo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {leadershipPipeline.map((level, index) => (
                    <div key={index}>
                      <div className="flex justify-between text-sm mb-2">
                        <span>{level.nivel}</span>
                        <span>{level.actual}/{level.meta}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full" 
                          style={{ 
                            width: `${(level.actual / level.meta) * 100}%`,
                            backgroundColor: level.color
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Key Performance Indicators */}
          <Card>
            <CardHeader>
              <CardTitle>Indicadores Clave de Rendimiento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">92%</div>
                  <div className="text-sm text-green-700">Retención de Miembros</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">15</div>
                  <div className="text-sm text-blue-700">Multiplicaciones/Año</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">8.7</div>
                  <div className="text-sm text-purple-700">Satisfacción Líderes</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">76%</div>
                  <div className="text-sm text-orange-700">Eficiencia Operativa</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strategic" className="space-y-4">
          {/* Strategic Goals Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Objetivos Estratégicos Anuales</CardTitle>
              <CardDescription>Progreso hacia las metas establecidas para 2024</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {goals.map((goal, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium">{goal.description}</h3>
                      <Badge 
                        variant={
                          goal.status === 'completed' ? 'default' : 
                          goal.status === 'on_track' ? 'secondary' : 
                          goal.status === 'behind' ? 'outline' : 'destructive'
                        }
                      >
                        {goal.status === 'completed' ? 'Completado' :
                         goal.status === 'on_track' ? 'En Progreso' :
                         goal.status === 'behind' ? 'Retrasado' : 'Crítico'}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground mb-2">
                      <span>Progreso: {goal.current}/{goal.target}</span>
                      <span>Meta: {goal.deadline}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          goal.status === 'completed' ? 'bg-green-500' :
                          goal.status === 'on_track' ? 'bg-blue-500' :
                          goal.status === 'behind' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${(goal.current / goal.target) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Strategic Initiatives Dashboard */}
          <Card>
            <CardHeader>
              <CardTitle>Iniciativas Estratégicas Activas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  { title: 'Expansión Digital', progress: 75, status: 'En Progreso', impact: 'Alto' },
                  { title: 'Programa de Mentoría', progress: 90, status: 'Avanzado', impact: 'Alto' },
                  { title: 'Certificación de Líderes', progress: 45, status: 'Inicial', impact: 'Medio' },
                  { title: 'Alcance Comunitario', progress: 60, status: 'En Progreso', impact: 'Alto' }
                ].map((initiative, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{initiative.title}</h4>
                      <Badge variant="outline">{initiative.impact}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{initiative.status}</p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-blue-500"
                        style={{ width: `${initiative.progress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{initiative.progress}% completado</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals" className="space-y-4">
          {/* Approval Queue */}
          <Card>
            <CardHeader>
              <CardTitle>Cola de Aprobaciones</CardTitle>
              <CardDescription>Elementos que requieren tu aprobación pastoral</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {approvalQueue.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.type}</p>
                      <p className="text-xs text-muted-foreground">Plazo: {item.deadline}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={item.priority === 'high' ? 'destructive' : 'secondary'}
                      >
                        {item.priority === 'high' ? 'Alta' : 'Media'}
                      </Badge>
                      <Button size="sm" onClick={() => handleApproveAlert(item.id)}>
                        Aprobar
                      </Button>
                      <Button size="sm" variant="outline">
                        Revisar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Critical Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>Alertas Críticas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.map((alert, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                    <div className="flex-shrink-0">
                      {alert.type === 'critical' && <AlertTriangle className="h-5 w-5 text-red-500" />}
                      {alert.type === 'warning' && <Clock className="h-5 w-5 text-yellow-500" />}
                      {alert.type === 'info' && <CheckCircle className="h-5 w-5 text-blue-500" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{alert.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(alert.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {alert.actionRequired && (
                      <Button size="sm" variant="outline">
                        Actuar
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          {/* System Health Overview */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Salud Espiritual</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">8.9/10</div>
                  <p className="text-sm text-muted-foreground">Excelente temperatura</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Salud Operacional</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">7.8/10</div>
                  <p className="text-sm text-muted-foreground">Buen funcionamiento</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Salud de Liderazgo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">8.5/10</div>
                  <p className="text-sm text-muted-foreground">Liderazgo fuerte</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Health Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Métricas Detalladas de Salud</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { metric: 'Asistencia Promedio', value: 87, benchmark: 85, status: 'above' },
                  { metric: 'Retención de Miembros', value: 92, benchmark: 90, status: 'above' },
                  { metric: 'Satisfacción de Líderes', value: 85, benchmark: 80, status: 'above' },
                  { metric: 'Eficiencia de Reportes', value: 78, benchmark: 85, status: 'below' },
                  { metric: 'Multiplicación de Grupos', value: 15, benchmark: 12, status: 'above' },
                  { metric: 'Desarrollo de Liderazgo', value: 82, benchmark: 75, status: 'above' }
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm">{item.metric}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{item.value}%</span>
                      <div className={`w-2 h-2 rounded-full ${
                        item.status === 'above' ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="decisions" className="space-y-4">
          {/* Strategic Decisions Required */}
          <Card>
            <CardHeader>
              <CardTitle>Decisiones Estratégicas Pendientes</CardTitle>
              <CardDescription>Decisiones de alto impacto que requieren tu dirección</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    title: 'Expansión a Zona Rural Este',
                    description: 'Evaluar la viabilidad de abrir 5 nuevos grupos en comunidades rurales',
                    impact: 'Alto',
                    urgency: 'Esta semana',
                    options: ['Proceder con expansión completa', 'Fase piloto con 2 grupos', 'Posponer 6 meses']
                  },
                  {
                    title: 'Implementación de Sistema Digital',
                    description: 'Adoptar plataforma digital para reportes y comunicación',
                    impact: 'Medio',
                    urgency: 'Este mes',
                    options: ['Implementación inmediata', 'Prueba piloto', 'Mantener sistema actual']
                  },
                  {
                    title: 'Restructuración de Supervisión',
                    description: 'Reorganizar estructura de supervisión para optimizar eficiencia',
                    impact: 'Alto',
                    urgency: 'Inmediato',
                    options: ['Restructurar completamente', 'Ajustes menores', 'Mantener estructura actual']
                  }
                ].map((decision, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-medium">{decision.title}</h4>
                      <div className="flex space-x-2">
                        <Badge variant="outline">{decision.impact}</Badge>
                        <Badge variant={decision.urgency === 'Inmediato' ? 'destructive' : 'secondary'}>
                          {decision.urgency}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{decision.description}</p>
                    <div>
                      <p className="text-sm font-medium mb-2">Opciones:</p>
                      <div className="space-y-1">
                        {decision.options.map((option, optIndex) => (
                          <button
                            key={optIndex}
                            className="block w-full text-left text-sm p-2 rounded hover:bg-muted transition-colors"
                          >
                            {option}
                          </button>
                        ))}
                      </div>
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

export default PastoralDashboard;