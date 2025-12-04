import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { DiscipleshipAnalyticsService } from '@/services/discipleship-analytics.service';
import { DiscipleshipService } from '@/services/discipleship.service';
import { Calendar, Heart, Loader2, MapPin, Send, TrendingUp, Users } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

const LeaderDashboard: React.FC = () => {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Estado del grupo
  const [groupStats, setGroupStats] = useState({
    groupId: '',
    groupName: 'Mi Célula',
    memberCount: 0,
    activeMembers: 0,
    avgAttendance: 0,
    spiritualTemperature: 5,
    meetingDay: '',
    meetingTime: '',
    meetingLocation: '',
  });

  // Estado del reporte semanal
  const [weeklyReport, setWeeklyReport] = useState({
    attendance: 0,
    newVisitors: 0,
    returningVisitors: 0,
    conversions: 0,
    baptisms: 0,
    spiritualTemperature: 5,
    testimoniesCount: 0,
    prayerRequests: 0,
    offeringAmount: 0,
    leaderNotes: '',
  });

  // Cargar datos iniciales
  useEffect(() => {
    loadLeaderData();
  }, [user]);

  const loadLeaderData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const stats = await DiscipleshipAnalyticsService.getLeaderGroupStats(user.id);

      if (stats) {
        setGroupStats({
          groupId: stats.groupId,
          groupName: stats.groupName,
          memberCount: stats.memberCount,
          activeMembers: stats.activeMembers,
          avgAttendance: stats.avgAttendance,
          spiritualTemperature: stats.spiritualTemperature,
          meetingDay: stats.meetingDay,
          meetingTime: stats.meetingTime,
          meetingLocation: stats.meetingLocation,
        });
      }
    } catch (error) {
      console.error('Error loading leader data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitWeeklyReport = async () => {
    if (!groupStats.groupId) {
      toast.error('No tienes un grupo asignado');
      return;
    }

    setIsSubmittingReport(true);
    try {
      await DiscipleshipService.createMetrics({
        group_id: groupStats.groupId,
        week_date: new Date().toISOString().split('T')[0],
        spiritual_temperature: weeklyReport.spiritualTemperature,
        ...weeklyReport,
      });

      toast.success('Reporte semanal enviado exitosamente');

      // Resetear formulario
      setWeeklyReport({
        attendance: 0,
        newVisitors: 0,
        returningVisitors: 0,
        conversions: 0,
        baptisms: 0,
        spiritualTemperature: 5,
        testimoniesCount: 0,
        prayerRequests: 0,
        offeringAmount: 0,
        leaderNotes: '',
      });

      // Recargar datos
      loadLeaderData();
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
        console.error('Error submitting report:', error);
      } else {
        toast.error('Error al enviar el reporte');
        console.error('Error submitting report:', error);
      }
    } finally {
      setIsSubmittingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard del Líder</h1>
          <p className="text-muted-foreground">{groupStats.groupName}</p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          Nivel 1 - Líder de Grupo
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Miembros Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{groupStats.activeMembers}</div>
            <p className="text-xs text-muted-foreground">de {groupStats.memberCount} registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Asistencia Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{groupStats.avgAttendance}%</div>
            <p className="text-xs text-muted-foreground">últimas 4 semanas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temperatura Espiritual</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{groupStats.spiritualTemperature}/10</div>
            <p className="text-xs text-muted-foreground">
              {groupStats.spiritualTemperature >= 8
                ? 'Excelente'
                : groupStats.spiritualTemperature >= 6
                  ? 'Bueno'
                  : 'Necesita atención'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próxima Reunión</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{groupStats.meetingDay}</div>
            <p className="text-xs text-muted-foreground">{groupStats.meetingTime}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="weekly-report">Reporte Semanal</TabsTrigger>
          <TabsTrigger value="members">Miembros</TabsTrigger>
          <TabsTrigger value="schedule">Programación</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Objetivos del Mes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Asistencia Promedio (Meta: 90%)</span>
                  <span>{groupStats.avgAttendance}%</span>
                </div>
                <Progress value={groupStats.avgAttendance} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Miembros Activos (Meta: {groupStats.memberCount})</span>
                  <span>{groupStats.activeMembers}</span>
                </div>
                <Progress
                  value={(groupStats.activeMembers / Math.max(groupStats.memberCount, 1)) * 100}
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Información del Grupo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3 p-4 bg-muted rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Reunión Semanal</p>
                  <p className="text-sm text-muted-foreground">
                    {groupStats.meetingDay} {groupStats.meetingTime}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-4 bg-muted rounded-lg">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Ubicación</p>
                  <p className="text-sm text-muted-foreground">
                    {groupStats.meetingLocation || 'No definida'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly-report" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reporte Semanal</CardTitle>
              <CardDescription>Completa el reporte de la reunión de esta semana</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Asistencia */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Asistencia</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="attendance">Miembros Presentes</Label>
                    <Input
                      id="attendance"
                      type="number"
                      value={weeklyReport.attendance}
                      onChange={e =>
                        setWeeklyReport({
                          ...weeklyReport,
                          attendance: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="newVisitors">Visitantes Nuevos</Label>
                    <Input
                      id="newVisitors"
                      type="number"
                      value={weeklyReport.newVisitors}
                      onChange={e =>
                        setWeeklyReport({
                          ...weeklyReport,
                          newVisitors: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="returningVisitors">Visitantes que Regresan</Label>
                    <Input
                      id="returningVisitors"
                      type="number"
                      value={weeklyReport.returningVisitors}
                      onChange={e =>
                        setWeeklyReport({
                          ...weeklyReport,
                          returningVisitors: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Salud Espiritual */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Salud Espiritual</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="spiritualTemp">Temperatura Espiritual (1-10)</Label>
                    <Input
                      id="spiritualTemp"
                      type="number"
                      min="1"
                      max="10"
                      value={weeklyReport.spiritualTemperature}
                      onChange={e =>
                        setWeeklyReport({
                          ...weeklyReport,
                          spiritualTemperature: Math.min(
                            10,
                            Math.max(1, parseInt(e.target.value) || 5)
                          ),
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="testimonies">Testimonios</Label>
                    <Input
                      id="testimonies"
                      type="number"
                      value={weeklyReport.testimoniesCount}
                      onChange={e =>
                        setWeeklyReport({
                          ...weeklyReport,
                          testimoniesCount: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="conversions">Conversiones</Label>
                    <Input
                      id="conversions"
                      type="number"
                      value={weeklyReport.conversions}
                      onChange={e =>
                        setWeeklyReport({
                          ...weeklyReport,
                          conversions: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Notas */}
              <div>
                <Label htmlFor="notes">Notas del Líder</Label>
                <Textarea
                  id="notes"
                  placeholder="Comparte observaciones, preocupaciones o bendiciones..."
                  className="min-h-[100px]"
                  value={weeklyReport.leaderNotes}
                  onChange={e =>
                    setWeeklyReport({
                      ...weeklyReport,
                      leaderNotes: e.target.value,
                    })
                  }
                />
              </div>

              <Button
                onClick={handleSubmitWeeklyReport}
                disabled={isSubmittingReport}
                className="w-full"
                size="lg"
              >
                {isSubmittingReport ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar Reporte Semanal
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Miembros de la Célula</CardTitle>
              <CardDescription>
                Total: {groupStats.memberCount} | Activos: {groupStats.activeMembers}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                La lista de miembros estará disponible próximamente
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Programación de Reuniones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3 p-4 bg-muted rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Reunión Semanal</p>
                  <p className="text-sm text-muted-foreground">
                    {groupStats.meetingDay} {groupStats.meetingTime}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-4 bg-muted rounded-lg">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Ubicación</p>
                  <p className="text-sm text-muted-foreground">
                    {groupStats.meetingLocation || 'No definida'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LeaderDashboard;
