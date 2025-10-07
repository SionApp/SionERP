import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  Users,
  TrendingUp,
  Heart,
  Plus,
  Send,
  Calendar,
  MapPin,
} from 'lucide-react';
import { DiscipleshipMockService } from '@/mocks/discipleship/services.mock';
import { WeeklyLeaderReport } from '@/types/discipleship.types';
import { toast } from '@/hooks/use-toast';

const LeaderDashboard: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState<Partial<WeeklyLeaderReport>>({
    attendance: { members: 0, newVisitors: 0, returningVisitors: 0 },
    spiritualHealth: {
      testimonies: 0,
      prayerRequests: [],
      spiritualTemperature: 5,
      groupMorale: 'good',
    },
    followUp: { visitorsContacted: 0, membersCared: [], upcomingEvents: [] },
    concerns: [],
    blessings: [],
  });

  const handleSubmitWeeklyReport = async () => {
    setIsSubmittingReport(true);
    try {
      const result = await DiscipleshipMockService.submitWeeklyReport({
        ...weeklyReport,
        groupId: 'group-001',
        weekDate: new Date().toISOString().split('T')[0],
      } as WeeklyLeaderReport);

      if (result.success) {
        toast({
          title: 'Reporte Enviado',
          description: 'Tu reporte semanal ha sido enviado exitosamente.',
        });
        // Reset form
        setWeeklyReport({
          attendance: { members: 0, newVisitors: 0, returningVisitors: 0 },
          spiritualHealth: {
            testimonies: 0,
            prayerRequests: [],
            spiritualTemperature: 5,
            groupMorale: 'good',
          },
          followUp: { visitorsContacted: 0, membersCared: [], upcomingEvents: [] },
          concerns: [],
          blessings: [],
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard del Líder</h1>
          <p className="text-muted-foreground">Célula Esperanza - Zona Norte</p>
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
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">+2 este mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Asistencia Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">85%</div>
            <p className="text-xs text-muted-foreground">+5% vs mes anterior</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temperatura Espiritual</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8.5/10</div>
            <p className="text-xs text-muted-foreground">Excelente ambiente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visitantes del Mes</CardTitle>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">3 regresaron</p>
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
          {/* Goals Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Objetivos del Mes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Asistencia Promedio (Meta: 90%)</span>
                  <span>85%</span>
                </div>
                <Progress value={85} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Nuevos Visitantes (Meta: 6)</span>
                  <span>5</span>
                </div>
                <Progress value={83} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Seguimiento a Visitantes (Meta: 100%)</span>
                  <span>100%</span>
                </div>
                <Progress value={100} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Actividad Reciente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">Reporte semanal enviado</p>
                    <p className="text-xs text-muted-foreground">Hace 2 días</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">Nuevos visitantes: Ana y Pedro</p>
                    <p className="text-xs text-muted-foreground">Hace 3 días</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">Reunión con supervisor programada</p>
                    <p className="text-xs text-muted-foreground">Hace 5 días</p>
                  </div>
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
              {/* Attendance Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Asistencia</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="members">Miembros</Label>
                    <Input
                      id="members"
                      type="number"
                      value={weeklyReport.attendance?.members || 0}
                      onChange={e =>
                        setWeeklyReport(prev => ({
                          ...prev,
                          attendance: {
                            ...prev.attendance!,
                            members: parseInt(e.target.value) || 0,
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="newVisitors">Visitantes Nuevos</Label>
                    <Input
                      id="newVisitors"
                      type="number"
                      value={weeklyReport.attendance?.newVisitors || 0}
                      onChange={e =>
                        setWeeklyReport(prev => ({
                          ...prev,
                          attendance: {
                            ...prev.attendance!,
                            newVisitors: parseInt(e.target.value) || 0,
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="returningVisitors">Visitantes que Regresan</Label>
                    <Input
                      id="returningVisitors"
                      type="number"
                      value={weeklyReport.attendance?.returningVisitors || 0}
                      onChange={e =>
                        setWeeklyReport(prev => ({
                          ...prev,
                          attendance: {
                            ...prev.attendance!,
                            returningVisitors: parseInt(e.target.value) || 0,
                          },
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Spiritual Health */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Salud Espiritual</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="testimonies">Número de Testimonios</Label>
                    <Input
                      id="testimonies"
                      type="number"
                      value={weeklyReport.spiritualHealth?.testimonies || 0}
                      onChange={e =>
                        setWeeklyReport(prev => ({
                          ...prev,
                          spiritualHealth: {
                            ...prev.spiritualHealth!,
                            testimonies: parseInt(e.target.value) || 0,
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="spiritualTemp">Temperatura Espiritual (1-10)</Label>
                    <Input
                      id="spiritualTemp"
                      type="number"
                      min="1"
                      max="10"
                      value={weeklyReport.spiritualHealth?.spiritualTemperature || 5}
                      onChange={e =>
                        setWeeklyReport(prev => ({
                          ...prev,
                          spiritualHealth: {
                            ...prev.spiritualHealth!,
                            spiritualTemperature: parseInt(e.target.value) || 5,
                          },
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Label htmlFor="groupMorale">Estado General del Grupo</Label>
                  <Select
                    value={weeklyReport.spiritualHealth?.groupMorale || 'good'}
                    onValueChange={value =>
                      setWeeklyReport(prev => ({
                        ...prev,
                        spiritualHealth: { ...prev.spiritualHealth!, groupMorale: value as any },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">Excelente</SelectItem>
                      <SelectItem value="good">Bueno</SelectItem>
                      <SelectItem value="fair">Regular</SelectItem>
                      <SelectItem value="needs_attention">Necesita Atención</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Concerns and Blessings */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="concerns">Preocupaciones</Label>
                  <Textarea
                    id="concerns"
                    placeholder="Describe cualquier preocupación o desafío..."
                    className="min-h-[100px]"
                  />
                </div>
                <div>
                  <Label htmlFor="blessings">Bendiciones</Label>
                  <Textarea
                    id="blessings"
                    placeholder="Comparte las bendiciones y motivos de gratitud..."
                    className="min-h-[100px]"
                  />
                </div>
              </div>

              <Button
                onClick={handleSubmitWeeklyReport}
                disabled={isSubmittingReport}
                className="w-full"
                size="lg"
              >
                {isSubmittingReport ? (
                  <>Enviando...</>
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
              <CardDescription>Gestiona la información de los miembros de tu grupo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: 'María González', role: 'Miembro', status: 'Activo', attendance: '95%' },
                  { name: 'Juan Pérez', role: 'Co-líder', status: 'Activo', attendance: '90%' },
                  { name: 'Ana Silva', role: 'Miembro', status: 'Activo', attendance: '85%' },
                  { name: 'Pedro López', role: 'Visitante', status: 'Nuevo', attendance: '100%' },
                ].map((member, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.role}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Badge variant={member.status === 'Activo' ? 'default' : 'secondary'}>
                        {member.status}
                      </Badge>
                      <span className="text-sm">{member.attendance}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Programación de Reuniones</CardTitle>
              <CardDescription>Horarios y ubicación de las reuniones</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3 p-4 bg-muted rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Reunión Semanal</p>
                  <p className="text-sm text-muted-foreground">Miércoles 7:00 PM</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-4 bg-muted rounded-lg">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Ubicación</p>
                  <p className="text-sm text-muted-foreground">Casa de María - Colonia Centro</p>
                </div>
              </div>
              <div className="pt-4">
                <h4 className="font-medium mb-2">Próximos Eventos</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 border rounded">
                    <span>Retiro Juvenil</span>
                    <Badge variant="outline">Oct 15</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 border rounded">
                    <span>Evangelismo Barrial</span>
                    <Badge variant="outline">Oct 22</Badge>
                  </div>
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
