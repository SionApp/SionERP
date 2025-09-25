import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, TrendingUp, AlertCircle, Calendar, Target, CheckCircle } from 'lucide-react';

// Mock data structures
const mockGroups = [
  {
    id: 1,
    name: "Grupo Esperanza",
    leader: "María González",
    supervisor: "Carlos Rodríguez",
    members: 12,
    attendance: 10,
    status: "activo",
    lastMeeting: "2024-01-20",
    location: "Casa de María",
    testimonies: 2,
    newVisitors: 1,
    prayerRequests: 3
  },
  {
    id: 2,
    name: "Grupo Bendición",
    leader: "Juan Pérez",
    supervisor: "Carlos Rodríguez",
    members: 8,
    attendance: 6,
    status: "necesita_atencion",
    lastMeeting: "2024-01-19",
    location: "Casa de Juan",
    testimonies: 1,
    newVisitors: 0,
    prayerRequests: 2
  },
  {
    id: 3,
    name: "Grupo Victoria",
    leader: "Ana Martínez",
    supervisor: "Lucía Torres",
    members: 15,
    attendance: 14,
    status: "creciendo",
    lastMeeting: "2024-01-21",
    location: "Centro Comunitario",
    testimonies: 3,
    newVisitors: 2,
    prayerRequests: 4
  }
];

const mockSupervisors = [
  {
    id: 1,
    name: "Carlos Rodríguez",
    role: "Supervisor Auxiliar",
    groups: 2,
    totalMembers: 20,
    avgAttendance: 80,
    zone: "Norte"
  },
  {
    id: 2,
    name: "Lucía Torres",
    role: "Supervisor General",
    groups: 1,
    totalMembers: 15,
    avgAttendance: 93,
    zone: "Sur"
  }
];

const DiscipleshipPage = () => {
  const [selectedTab, setSelectedTab] = useState("overview");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "activo": return "bg-green-500";
      case "creciendo": return "bg-blue-500";
      case "necesita_atencion": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "activo": return "Activo";
      case "creciendo": return "Creciendo";
      case "necesita_atencion": return "Necesita Atención";
      default: return "Estado Desconocido";
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Módulo de Discipulado</h1>
          <p className="text-muted-foreground">Seguimiento de Grupos de Discipulado (GD)</p>
        </div>
        <Button>
          <Calendar className="mr-2 h-4 w-4" />
          Nuevo Reporte
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Grupos Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Total de grupos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Miembros Totales</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">35</div>
            <p className="text-xs text-muted-foreground">Across all groups</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Asistencia Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">86%</div>
            <p className="text-xs text-muted-foreground">Esta semana</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Casos de Atención</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">Requiere seguimiento</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="groups">Grupos</TabsTrigger>
          <TabsTrigger value="supervisors">Supervisores</TabsTrigger>
          <TabsTrigger value="reports">Reportes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Estado de Grupos</CardTitle>
                <CardDescription>Distribución por estado actual</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>Activo</span>
                    </div>
                    <span className="font-semibold">1 grupo</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span>Creciendo</span>
                    </div>
                    <span className="font-semibold">1 grupo</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span>Necesita Atención</span>
                    </div>
                    <span className="font-semibold">1 grupo</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Actividad Reciente</CardTitle>
                <CardDescription>Últimos reportes y actividades</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
                    <div>
                      <p className="text-sm font-medium">Reporte Semanal - Grupo Victoria</p>
                      <p className="text-xs text-muted-foreground">Hace 1 día</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-4 w-4 text-yellow-500 mt-1" />
                    <div>
                      <p className="text-sm font-medium">Atención requerida - Grupo Bendición</p>
                      <p className="text-xs text-muted-foreground">Hace 2 días</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
                    <div>
                      <p className="text-sm font-medium">Reporte Semanal - Grupo Esperanza</p>
                      <p className="text-xs text-muted-foreground">Hace 3 días</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="groups" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {mockGroups.map((group) => (
              <Card key={group.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{group.name}</CardTitle>
                      <CardDescription>Líder: {group.leader}</CardDescription>
                    </div>
                    <Badge className={getStatusColor(group.status)}>
                      {getStatusText(group.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Miembros:</span>
                      <span className="font-medium">{group.members}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Asistencia:</span>
                      <span className="font-medium">{group.attendance}/{group.members}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Visitantes:</span>
                      <span className="font-medium">{group.newVisitors}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Testimonios:</span>
                      <span className="font-medium">{group.testimonies}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Ubicación:</span>
                      <span className="font-medium">{group.location}</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button size="sm" className="w-full">Ver Detalles</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="supervisors" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {mockSupervisors.map((supervisor) => (
              <Card key={supervisor.id}>
                <CardHeader>
                  <CardTitle>{supervisor.name}</CardTitle>
                  <CardDescription>{supervisor.role} - Zona {supervisor.zone}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Grupos a cargo:</span>
                      <span className="font-medium">{supervisor.groups}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total miembros:</span>
                      <span className="font-medium">{supervisor.totalMembers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Asistencia promedio:</span>
                      <span className="font-medium">{supervisor.avgAttendance}%</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button size="sm" className="w-full">Ver Reportes</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reportes del Sistema</CardTitle>
              <CardDescription>Generar y visualizar reportes por nivel jerárquico</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Button variant="outline" className="h-24 flex flex-col">
                  <Users className="h-6 w-6 mb-2" />
                  <span>Reporte Semanal</span>
                  <span className="text-xs text-muted-foreground">Líderes de Grupo</span>
                </Button>
                <Button variant="outline" className="h-24 flex flex-col">
                  <TrendingUp className="h-6 w-6 mb-2" />
                  <span>Reporte Mensual</span>
                  <span className="text-xs text-muted-foreground">Supervisores</span>
                </Button>
                <Button variant="outline" className="h-24 flex flex-col">
                  <Target className="h-6 w-6 mb-2" />
                  <span>Informe Ejecutivo</span>
                  <span className="text-xs text-muted-foreground">Coordinadores</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DiscipleshipPage;