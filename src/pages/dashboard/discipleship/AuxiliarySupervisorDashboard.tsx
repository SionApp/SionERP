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
  AlertTriangle,
  UserCheck,
  Send,
  BarChart3,
  Target,
  Clock,
} from 'lucide-react';
import { DiscipleshipMockService } from '@/mocks/discipleship/services.mock';
import { BiweeklyAuxiliaryReport } from '@/types/discipleship.types';
import { toast } from '@/hooks/use-toast';

const AuxiliarySupervisorDashboard: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [stats, setStats] = useState<any>({});
  const [biweeklyReport, setBiweeklyReport] = useState<Partial<BiweeklyAuxiliaryReport>>({
    groupsOverview: {
      totalGroups: 0,
      healthyGroups: 0,
      groupsNeedingAttention: [],
      newGroupsStarted: 0,
    },
    leaderDevelopment: { trainingSessions: 0, leadersNeedingSupport: [], potentialNewLeaders: [] },
    zoneMetrics: { totalAttendance: 0, growthPercentage: 0, newConversions: 0 },
  });

  useEffect(() => {
    const loadData = async () => {
      const dashboardStats = await DiscipleshipMockService.getDashboardStats(2, 'current-user-id');
      setStats(dashboardStats);
    };
    loadData();
  }, []);

  const handleSubmitBiweeklyReport = async () => {
    setIsSubmittingReport(true);
    try {
      const result = await DiscipleshipMockService.submitBiweeklyReport({
        ...biweeklyReport,
        supervisorId: 'current-user-id',
        periodStart: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        periodEnd: new Date().toISOString().split('T')[0],
      } as BiweeklyAuxiliaryReport);

      if (result.success) {
        toast({
          title: 'Reporte Enviado',
          description: 'Tu reporte quincenal ha sido enviado exitosamente.',
        });
        // Reset form
        setBiweeklyReport({
          groupsOverview: {
            totalGroups: 0,
            healthyGroups: 0,
            groupsNeedingAttention: [],
            newGroupsStarted: 0,
          },
          leaderDevelopment: {
            trainingSessions: 0,
            leadersNeedingSupport: [],
            potentialNewLeaders: [],
          },
          zoneMetrics: { totalAttendance: 0, growthPercentage: 0, newConversions: 0 },
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

  const groupsData = [
    {
      name: 'Célula Esperanza',
      leader: 'Roberto Silva',
      members: 12,
      attendance: 85,
      status: 'Saludable',
    },
    {
      name: 'Juventud Victoriosa',
      leader: 'Carmen Torres',
      members: 18,
      attendance: 92,
      status: 'Multiplicando',
    },
    {
      name: 'Familia en Cristo',
      leader: 'Miguel Herrera',
      members: 8,
      attendance: 78,
      status: 'Saludable',
    },
    {
      name: 'Guerreros de Fe',
      leader: 'Ana Ruiz',
      members: 10,
      attendance: 65,
      status: 'Necesita Atención',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Supervisor Auxiliar</h1>
          <p className="text-muted-foreground">Patricia Jiménez - Zona Norte, Sector A</p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          Nivel 2 - Supervisor Auxiliar
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Grupos Supervisados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.groupsUnderSupervision || 4}</div>
            <p className="text-xs text-muted-foreground">+1 este mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Miembros</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers || 48}</div>
            <p className="text-xs text-muted-foreground">+6 últimos 15 días</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Asistencia Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageAttendance || 89}%</div>
            <p className="text-xs text-muted-foreground">+3% vs período anterior</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Líderes con Apoyo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.leadersSupportNeeded || 1}</div>
            <p className="text-xs text-muted-foreground">Requiere seguimiento</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="groups">Grupos</TabsTrigger>
          <TabsTrigger value="biweekly-report">Reporte Quincenal</TabsTrigger>
          <TabsTrigger value="leaders">Desarrollo de Líderes</TabsTrigger>
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
                  <span>89%</span>
                </div>
                <Progress value={89} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Líderes Capacitados (Meta: 4)</span>
                  <span>3</span>
                </div>
                <Progress value={75} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Visitantes Consolidados (Meta: 8)</span>
                  <span>6</span>
                </div>
                <Progress value={75} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Zone Health Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Salud de la Zona</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">3</div>
                  <div className="text-sm text-green-700">Grupos Saludables</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">1</div>
                  <div className="text-sm text-blue-700">Grupo Multiplicando</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">1</div>
                  <div className="text-sm text-red-700">Necesita Atención</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle>Actividades Recientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">Capacitación de liderazgo completada</p>
                    <p className="text-xs text-muted-foreground">Hace 1 día</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">Grupo "Guerreros de Fe" necesita apoyo</p>
                    <p className="text-xs text-muted-foreground">Hace 2 días</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">Reunión con supervisor general</p>
                    <p className="text-xs text-muted-foreground">Hace 3 días</p>
                  </div>
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
              <div className="space-y-4">
                {groupsData.map((group, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold">{group.name}</h3>
                        <p className="text-sm text-muted-foreground">Líder: {group.leader}</p>
                      </div>
                      <Badge
                        variant={
                          group.status === 'Saludable'
                            ? 'default'
                            : group.status === 'Multiplicando'
                              ? 'secondary'
                              : 'destructive'
                        }
                      >
                        {group.status}
                      </Badge>
                    </div>
                    <div className="grid gap-2 md:grid-cols-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Miembros: </span>
                        <span className="font-medium">{group.members}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Asistencia: </span>
                        <span className="font-medium">{group.attendance}%</span>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="biweekly-report" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reporte Quincenal</CardTitle>
              <CardDescription>Consolidación de grupos y desarrollo de líderes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Groups Overview */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Resumen de Grupos</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="totalGroups">Total de Grupos</Label>
                    <Input
                      id="totalGroups"
                      type="number"
                      value={biweeklyReport.groupsOverview?.totalGroups || 0}
                      onChange={e =>
                        setBiweeklyReport(prev => ({
                          ...prev,
                          groupsOverview: {
                            ...prev.groupsOverview!,
                            totalGroups: parseInt(e.target.value) || 0,
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="healthyGroups">Grupos Saludables</Label>
                    <Input
                      id="healthyGroups"
                      type="number"
                      value={biweeklyReport.groupsOverview?.healthyGroups || 0}
                      onChange={e =>
                        setBiweeklyReport(prev => ({
                          ...prev,
                          groupsOverview: {
                            ...prev.groupsOverview!,
                            healthyGroups: parseInt(e.target.value) || 0,
                          },
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Label htmlFor="needsAttention">Grupos que Necesitan Atención</Label>
                  <Textarea
                    id="needsAttention"
                    placeholder="Lista los grupos que requieren atención especial y las razones..."
                    className="min-h-[80px]"
                  />
                </div>
              </div>

              {/* Leader Development */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Desarrollo de Liderazgo</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="trainingSessions">Sesiones de Capacitación</Label>
                    <Input
                      id="trainingSessions"
                      type="number"
                      value={biweeklyReport.leaderDevelopment?.trainingSessions || 0}
                      onChange={e =>
                        setBiweeklyReport(prev => ({
                          ...prev,
                          leaderDevelopment: {
                            ...prev.leaderDevelopment!,
                            trainingSessions: parseInt(e.target.value) || 0,
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="totalAttendance">Asistencia Total</Label>
                    <Input
                      id="totalAttendance"
                      type="number"
                      value={biweeklyReport.zoneMetrics?.totalAttendance || 0}
                      onChange={e =>
                        setBiweeklyReport(prev => ({
                          ...prev,
                          zoneMetrics: {
                            ...prev.zoneMetrics!,
                            totalAttendance: parseInt(e.target.value) || 0,
                          },
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2 mt-4">
                  <div>
                    <Label htmlFor="leadersNeedingSupport">Líderes que Necesitan Apoyo</Label>
                    <Textarea
                      id="leadersNeedingSupport"
                      placeholder="Lista los líderes que requieren apoyo adicional..."
                      className="min-h-[80px]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="potentialLeaders">Potenciales Nuevos Líderes</Label>
                    <Textarea
                      id="potentialLeaders"
                      placeholder="Identifica miembros con potencial de liderazgo..."
                      className="min-h-[80px]"
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSubmitBiweeklyReport}
                disabled={isSubmittingReport}
                className="w-full"
                size="lg"
              >
                {isSubmittingReport ? (
                  <>Enviando...</>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar Reporte Quincenal
                  </>
                )}
              </Button>
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
                {[
                  {
                    name: 'Roberto Silva',
                    group: 'Célula Esperanza',
                    level: 'Avanzado',
                    lastTraining: '15 Sep 2024',
                    status: 'Activo',
                  },
                  {
                    name: 'Carmen Torres',
                    group: 'Juventud Victoriosa',
                    level: 'Experto',
                    lastTraining: '10 Sep 2024',
                    status: 'Listo para Multiplicar',
                  },
                  {
                    name: 'Miguel Herrera',
                    group: 'Familia en Cristo',
                    level: 'Intermedio',
                    lastTraining: '12 Sep 2024',
                    status: 'En Desarrollo',
                  },
                  {
                    name: 'Ana Ruiz',
                    group: 'Guerreros de Fe',
                    level: 'Básico',
                    lastTraining: '05 Sep 2024',
                    status: 'Necesita Apoyo',
                  },
                ].map((leader, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{leader.name}</p>
                      <p className="text-sm text-muted-foreground">{leader.group}</p>
                      <p className="text-xs text-muted-foreground">
                        Último entrenamiento: {leader.lastTraining}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Badge variant="outline">{leader.level}</Badge>
                      <Badge
                        variant={
                          leader.status === 'Activo'
                            ? 'default'
                            : leader.status === 'Listo para Multiplicar'
                              ? 'secondary'
                              : leader.status === 'En Desarrollo'
                                ? 'outline'
                                : 'destructive'
                        }
                      >
                        {leader.status}
                      </Badge>
                      <Button size="sm" variant="outline">
                        Capacitar
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

export default AuxiliarySupervisorDashboard;
