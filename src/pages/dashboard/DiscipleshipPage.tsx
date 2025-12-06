import DiscipleshipMap from '@/components/discipleship/DiscipleshipMap';
import GroupManagement from '@/components/discipleship/GroupManagement';
import HierarchyManagement from '@/components/discipleship/HierarchyManagement';
import ZoneManagement from '@/components/discipleship/ZoneManagement';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { UserService } from '@/services/user.service';
import { User as UserType } from '@/types/user.types';
import {
  getDashboardLevel,
  getDiscipleshipAccess,
  type DiscipleshipAccess,
} from '@/utils/discipleship-access';
import { AlertCircle, BarChart3, MapPin, Plus, Target, TrendingUp, Users } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import AuxiliarySupervisorDashboard from './discipleship/AuxiliarySupervisorDashboard';
import CoordinatorDashboard from './discipleship/CoordinatorDashboard';
import GeneralSupervisorDashboard from './discipleship/GeneralSupervisorDashboard';
import LeaderDashboard from './discipleship/LeaderDashboard';
import PastoralDashboard from './discipleship/PastoralDashboard';

const DiscipleshipPage = () => {
  const authUser = useAuth().user;
  const [activeTab, setActiveTab] = useState('overview');
  const [user, setUser] = useState<UserType | null>(null);
  const [discipleshipAccess, setDiscipleshipAccess] = useState<DiscipleshipAccess | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserAndAccess = async () => {
      if (!authUser?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Cargar datos del usuario
        const userData = await UserService.getUserById(authUser.id as string);
        const userWithRole = {
          ...userData,
          role: userData.role as UserType['role'],
        };
        setUser(userWithRole);

        // Cargar acceso al módulo de discipulado
        if (userWithRole.role) {
          const access = await getDiscipleshipAccess(
            authUser.id as string,
            userWithRole.role as string
          );
          setDiscipleshipAccess(access);
        }
      } catch (error) {
        toast.error('Error al cargar el usuario probando');
        console.error('Error al cargar el usuario:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserAndAccess();
  }, [authUser]);

  const getDiscipleshipLevel = (): number => {
    if (!discipleshipAccess) return 1;
    return getDashboardLevel(discipleshipAccess);
  };

  const getLevelName = (): string => {
    if (!discipleshipAccess) return 'Sin acceso';

    if (discipleshipAccess.isFullAccess) {
      return user?.role === 'pastor'
        ? 'Pastoral (Acceso Completo)'
        : 'Supervisor General (Acceso Completo)';
    }

    const level = discipleshipAccess.level || 1;
    switch (level) {
      case 5:
        return 'Pastoral';
      case 4:
        return 'Coordinador General';
      case 3:
        return 'Coordinador';
      case 2:
        return 'Supervisor Auxiliar';
      case 1:
      default:
        return 'Líder';
    }
  };

  // Memoizar el dashboard para evitar re-renders innecesarios
  const DashboardComponent = React.useMemo(() => {
    // Si no tiene acceso, retornar null (se maneja en renderDiscipleshipDashboard)
    if (!discipleshipAccess || !discipleshipAccess.canAccess) {
      return null;
    }

    // Si es acceso completo (pastor/staff), mostrar dashboard pastoral
    if (discipleshipAccess.isFullAccess) {
      return PastoralDashboard;
    }

    // Si no, usar el nivel de jerarquía
    const level = discipleshipAccess.level || 1;

    switch (level) {
      case 5:
        return PastoralDashboard;
      case 4:
        return GeneralSupervisorDashboard;
      case 3:
        return CoordinatorDashboard;
      case 2:
        return AuxiliarySupervisorDashboard;
      case 1:
      default:
        return LeaderDashboard;
    }
  }, [discipleshipAccess]);

  const renderDiscipleshipDashboard = () => {
    // Si no tiene acceso, mostrar mensaje
    if (!discipleshipAccess || !discipleshipAccess.canAccess) {
      return (
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="text-center space-y-4">
              <AlertCircle className="w-10 h-10 md:w-12 md:h-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-base md:text-lg font-semibold mb-2">
                  Sin Acceso al Módulo de Discipulado
                </h3>
                <p className="text-sm md:text-base text-muted-foreground">
                  No tienes un nivel jerárquico asignado en el sistema de discipulado.
                  <br />
                  Contacta a un administrador (Pastor o Staff) para que te asigne un nivel.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    const Component = DashboardComponent;
    if (!Component) return null;
    return <Component />;
  };

  const canManageGroups =
    discipleshipAccess?.isFullAccess ||
    (discipleshipAccess?.level && discipleshipAccess.level >= 3) ||
    false;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Cargando módulo de discipulado...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Ministerio de Discipulado
          </h1>
          <p className="text-muted-foreground mt-1">
            {loading ? (
              'Cargando...'
            ) : discipleshipAccess?.canAccess ? (
              <>
                Dashboard nivel {getDiscipleshipLevel()} - {getLevelName()}
                {discipleshipAccess.isFullAccess && (
                  <span className="ml-2 text-xs text-green-600">(Acceso Completo)</span>
                )}
              </>
            ) : (
              'Sin acceso al módulo de discipulado'
            )}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
        {/* Mobile: Scroll horizontal, Desktop: Grid */}
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-full md:grid md:grid-cols-6 h-auto min-w-max md:min-w-0 gap-1 md:gap-0">
            <TabsTrigger
              value="overview"
              className="text-xs md:text-sm whitespace-nowrap flex-shrink-0 px-2 md:px-3"
            >
              Resumen
            </TabsTrigger>
            <TabsTrigger
              value="dashboard"
              className="text-xs md:text-sm whitespace-nowrap flex-shrink-0 px-2 md:px-3"
            >
              Dashboard
            </TabsTrigger>
            <TabsTrigger
              value="manage"
              className="text-xs md:text-sm whitespace-nowrap flex-shrink-0 px-2 md:px-3"
            >
              Gestión
            </TabsTrigger>
            <TabsTrigger
              value="hierarchy"
              className="text-xs md:text-sm whitespace-nowrap flex-shrink-0 px-2 md:px-3"
            >
              Jerarquías
            </TabsTrigger>
            <TabsTrigger
              value="zones"
              className="text-xs md:text-sm whitespace-nowrap flex-shrink-0 px-2 md:px-3"
            >
              Zonas
            </TabsTrigger>
            <TabsTrigger
              value="map"
              className="text-xs md:text-sm whitespace-nowrap flex-shrink-0 px-2 md:px-3"
            >
              Mapa
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
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

        {/* Hierarchy Management Tab */}
        <TabsContent value="hierarchy">
          <HierarchyManagement />
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
