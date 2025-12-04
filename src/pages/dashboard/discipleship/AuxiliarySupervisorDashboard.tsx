import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { DiscipleshipAnalyticsService } from '@/services/discipleship-analytics.service';
import { DiscipleshipService } from '@/services/discipleship.service';
import { AlertTriangle, Loader2, Send, TrendingUp, UserCheck, Users } from 'lucide-react';
import React, { useEffect, useState } from 'react';
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

const AuxiliarySupervisorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState('overview');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    groups_under_supervision: 0,
    total_members: 0,
    average_attendance: 0,
    active_leaders: 0,
    pending_alerts: 0,
    pending_reports: 0,
  });
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [biweeklyReport, setBiweeklyReport] = useState({
    totalGroups: 0,
    healthyGroups: 0,
    groupsNeedingAttention: '',
    trainingSessions: 0,
    totalAttendance: 0,
    leadersNeedingSupport: '',
    potentialNewLeaders: '',
    newConversions: 0,
    highlights: '',
    concerns: '',
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Cargar estadísticas del dashboard
      const dashboardStats = await DiscipleshipAnalyticsService.getDashboardStatsByLevel(2);
      setStats(dashboardStats);

      // Cargar grupos supervisados
      const groupsResponse = await DiscipleshipService.getGroups({
        supervisor_id: user.id,
        status: 'active',
      });

      // Mapear grupos con estadísticas
      const groupsWithStats =
        groupsResponse.data?.map((g: any) => ({
          id: g.id,
          group_name: g.group_name,
          leader_name: g.leader_name || 'Sin asignar',
          member_count: g.member_count || 0,
          avg_attendance: g.active_members || 0,
          status: g.status,
        })) || [];

      setGroups(groupsWithStats);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitBiweeklyReport = async () => {
    if (!user) return;

    setIsSubmittingReport(true);
    try {
      const today = new Date();
      const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);

      await DiscipleshipService.createReport({
        report_type: 'biweekly',
        report_level: 2,
        period_start: twoWeeksAgo.toISOString().split('T')[0],
        period_end: today.toISOString().split('T')[0],
        report_data: {
          groupsOverview: {
            totalGroups: biweeklyReport.totalGroups,
            healthyGroups: biweeklyReport.healthyGroups,
            groupsNeedingAttention: biweeklyReport.groupsNeedingAttention
              .split('\n')
              .filter(Boolean),
          },
          leaderDevelopment: {
            trainingSessions: biweeklyReport.trainingSessions,
            leadersNeedingSupport: biweeklyReport.leadersNeedingSupport.split('\n').filter(Boolean),
            potentialNewLeaders: biweeklyReport.potentialNewLeaders.split('\n').filter(Boolean),
          },
          zoneMetrics: {
            totalAttendance: biweeklyReport.totalAttendance,
            newConversions: biweeklyReport.newConversions,
          },
          highlights: biweeklyReport.highlights,
          concerns: biweeklyReport.concerns,
        },
      });

      toast.success('Reporte quincenal enviado exitosamente');

      // Reset form
      setBiweeklyReport({
        totalGroups: 0,
        healthyGroups: 0,
        groupsNeedingAttention: '',
        trainingSessions: 0,
        totalAttendance: 0,
        leadersNeedingSupport: '',
        potentialNewLeaders: '',
        newConversions: 0,
        highlights: '',
        concerns: '',
      });
    } catch (error: any) {
      console.error('Error submitting report:', error);
      toast.error(error.message || 'Error al enviar el reporte');
    } finally {
      setIsSubmittingReport(false);
    }
  };

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Supervisor Auxiliar</h1>
          <p className="text-muted-foreground">
            {user?.first_name} {user?.last_name} - {user?.zone_name || 'Zona no asignada'}
          </p>
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
            <div className="text-2xl font-bold">{stats.groups_under_supervision}</div>
            <p className="text-xs text-muted-foreground">Bajo tu supervisión</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Miembros</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_members}</div>
            <p className="text-xs text-muted-foreground">En tus grupos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Asistencia Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats.average_attendance)}%</div>
            <p className="text-xs text-muted-foreground">Últimas 4 semanas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Pendientes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending_alerts}</div>
            <p className="text-xs text-muted-foreground">Requieren atención</p>
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
                  <span>{Math.round(stats.average_attendance)}%</span>
                </div>
                <Progress value={stats.average_attendance} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Líderes Activos (Meta: {stats.groups_under_supervision})</span>
                  <span>{stats.active_leaders}</span>
                </div>
                <Progress
                  value={(stats.active_leaders / Math.max(stats.groups_under_supervision, 1)) * 100}
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
                      value={biweeklyReport.totalGroups}
                      onChange={e =>
                        setBiweeklyReport(prev => ({
                          ...prev,
                          totalGroups: parseInt(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="healthyGroups">Grupos Saludables</Label>
                    <Input
                      id="healthyGroups"
                      type="number"
                      value={biweeklyReport.healthyGroups}
                      onChange={e =>
                        setBiweeklyReport(prev => ({
                          ...prev,
                          healthyGroups: parseInt(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Label htmlFor="needsAttention">Grupos que Necesitan Atención</Label>
                  <Textarea
                    id="needsAttention"
                    placeholder="Lista los grupos que requieren atención especial (uno por línea)..."
                    className="min-h-[80px]"
                    value={biweeklyReport.groupsNeedingAttention}
                    onChange={e =>
                      setBiweeklyReport(prev => ({
                        ...prev,
                        groupsNeedingAttention: e.target.value,
                      }))
                    }
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
                      value={biweeklyReport.trainingSessions}
                      onChange={e =>
                        setBiweeklyReport(prev => ({
                          ...prev,
                          trainingSessions: parseInt(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="totalAttendance">Asistencia Total del Período</Label>
                    <Input
                      id="totalAttendance"
                      type="number"
                      value={biweeklyReport.totalAttendance}
                      onChange={e =>
                        setBiweeklyReport(prev => ({
                          ...prev,
                          totalAttendance: parseInt(e.target.value) || 0,
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
                      placeholder="Lista los líderes (uno por línea)..."
                      className="min-h-[80px]"
                      value={biweeklyReport.leadersNeedingSupport}
                      onChange={e =>
                        setBiweeklyReport(prev => ({
                          ...prev,
                          leadersNeedingSupport: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="potentialLeaders">Potenciales Nuevos Líderes</Label>
                    <Textarea
                      id="potentialLeaders"
                      placeholder="Identifica miembros con potencial (uno por línea)..."
                      className="min-h-[80px]"
                      value={biweeklyReport.potentialNewLeaders}
                      onChange={e =>
                        setBiweeklyReport(prev => ({
                          ...prev,
                          potentialNewLeaders: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Highlights and Concerns */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="highlights">Logros y Bendiciones</Label>
                  <Textarea
                    id="highlights"
                    placeholder="Describe los logros destacados del período..."
                    className="min-h-[100px]"
                    value={biweeklyReport.highlights}
                    onChange={e =>
                      setBiweeklyReport(prev => ({
                        ...prev,
                        highlights: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="concerns">Preocupaciones y Desafíos</Label>
                  <Textarea
                    id="concerns"
                    placeholder="Describe las preocupaciones o desafíos..."
                    className="min-h-[100px]"
                    value={biweeklyReport.concerns}
                    onChange={e =>
                      setBiweeklyReport(prev => ({
                        ...prev,
                        concerns: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <Button
                onClick={handleSubmitBiweeklyReport}
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
};

export default AuxiliarySupervisorDashboard;
