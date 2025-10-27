import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  TrendingUp,
  Target,
  AlertCircle,
  MapPin,
  Calendar,
  BarChart3,
  Settings,
  Plus,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import LeaderDashboard from './discipleship/LeaderDashboard';
import AuxiliarySupervisorDashboard from './discipleship/AuxiliarySupervisorDashboard';
import GeneralSupervisorDashboard from './discipleship/GeneralSupervisorDashboard';
import CoordinatorDashboard from './discipleship/CoordinatorDashboard';
import PastoralDashboard from './discipleship/PastoralDashboard';
import GroupManagement from '@/components/discipleship/GroupManagement';
import DiscipleshipMap from '@/components/discipleship/DiscipleshipMap';
import ZoneManagement from '@/components/discipleship/ZoneManagement';

const DiscipleshipPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Determine user's discipleship role and level
  const getDiscipleshipLevel = () => {
    if (!user) return 1;

    switch (user.role) {
      case 'pastor':
        return 5; // Pastoral level
      case 'staff':
        return 4; // General Supervisor level
      default:
        // Could be based on user's discipleship_level field
        return (user as any).discipleship_level || 1;
    }
  };

  const renderDiscipleshipDashboard = () => {
    const level = getDiscipleshipLevel();

    switch (level) {
      case 5: // Pastor
        return <PastoralDashboard />;
      case 4: // General Supervisor
        return <GeneralSupervisorDashboard />;
      case 3: // Coordinator
        return <CoordinatorDashboard />;
      case 2: // Auxiliary Supervisor
        return <AuxiliarySupervisorDashboard />;
      case 1: // Leader
      default:
        return <LeaderDashboard />;
    }
  };

  const canManageGroups =
    user?.role === 'pastor' || user?.role === 'staff' || getDiscipleshipLevel() >= 3;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Ministerio de Discipuladoasda
          </h1>
          <p className="text-muted-foreground mt-1">
            Dashboard nivel {getDiscipleshipLevel()} -{' '}
            {user?.role === 'pastor'
              ? 'Pastoral'
              : user?.role === 'staff'
                ? 'Supervisor General'
                : getDiscipleshipLevel() === 3
                  ? 'Coordinador'
                  : getDiscipleshipLevel() === 2
                    ? 'Supervisor Auxiliar'
                    : 'Líder'}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="manage">Gestión de Grupos</TabsTrigger>
          <TabsTrigger value="zones">Zonas</TabsTrigger>
          <TabsTrigger value="map">Mapa</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Users className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">45</p>
                    <p className="text-sm text-muted-foreground">Grupos Activos</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold">540</p>
                    <p className="text-sm text-muted-foreground">Miembros Activos</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Target className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold">8</p>
                    <p className="text-sm text-muted-foreground">Multiplicando</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-8 h-8 text-orange-600" />
                  <div>
                    <p className="text-2xl font-bold">3</p>
                    <p className="text-sm text-muted-foreground">Necesitan Atención</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Acciones Rápidas</CardTitle>
              <CardDescription>
                Gestiona los aspectos más importantes del discipulado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {canManageGroups && (
                  <Button onClick={() => setActiveTab('manage')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Nuevo Grupo
                  </Button>
                )}
                <Button variant="outline" onClick={() => setActiveTab('dashboard')}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Ver Dashboard
                </Button>
                {canManageGroups && (
                  <Button variant="outline" onClick={() => setActiveTab('map')}>
                    <MapPin className="w-4 h-4 mr-2" />
                    Ver Mapa
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Actividad Reciente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      Grupo "Juventud Victoriosa" reportó multiplicación
                    </p>
                    <p className="text-xs text-muted-foreground">Hace 2 horas</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      Nuevo reporte semanal de "Célula Esperanza"
                    </p>
                    <p className="text-xs text-muted-foreground">Hace 5 horas</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      Grupo "Nueva Vida" necesita atención - baja asistencia
                    </p>
                    <p className="text-xs text-muted-foreground">Hace 1 día</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard">{renderDiscipleshipDashboard()}</TabsContent>

        {/* Group Management Tab */}
        <TabsContent value="manage">
          <GroupManagement />
        </TabsContent>

        {/* Zones Tab */}
        <TabsContent value="zones">
          <ZoneManagement />
        </TabsContent>

        {/* Map Tab */}
        <TabsContent value="map">
          <DiscipleshipMap />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DiscipleshipPage;
