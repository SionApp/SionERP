import DiscipleshipMap from '@/components/discipleship/DiscipleshipMap';
import GroupManagement from '@/components/discipleship/GroupManagement';
import HierarchyManagement from '@/components/discipleship/HierarchyManagement';
import ZoneManagement from '@/components/discipleship/ZoneManagement';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useRecentDiscipleshipActivity } from '@/hooks/useRecentDiscipleshipActivity';
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

function formatTimestamp(timestamp: { Time: string }): string {
  const now = new Date();
  const date = new Date(timestamp.Time);
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return 'Hace minutos';
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays < 7) return `Hace ${diffDays}d`;
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

function NoAccessCard({
  module,
  requiredLevel,
}: {
  module: string;
  requiredLevel: number;
}) {
  const levelNames: Record<number, string> = {
    2: 'Supervisor Auxiliar',
    3: 'Supervisor General',
    4: 'Coordinador',
    5: 'Pastoral',
  };

  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <div className="text-center space-y-4">
          <AlertCircle className="w-10 h-10 md:w-12 md:h-12 mx-auto text-muted-foreground" />
          <div>
            <h3 className="text-base md:text-lg font-semibold mb-2">
              Acceso Restringido — {module}
            </h3>
            <p className="text-sm md:text-base text-muted-foreground">
              Este módulo requiere nivel{' '}
              <span className="font-medium text-foreground">
                {levelNames[requiredLevel] || requiredLevel}
              </span>
              <br />
              Contacta a un administrador para que te asigne el nivel adecuado.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const DiscipleshipPage = () => {
  const authUser = useAuth().user;
  const [activeTab, setActiveTab] = useState('overview');
  const [user, setUser] = useState<UserType | null>(null);
  const [discipleshipAccess, setDiscipleshipAccess] = useState<DiscipleshipAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const { activities: recentActivities, loading: activityLoading } =
    useRecentDiscipleshipActivity(8);
  const { discipleshipStats, loading: statsLoading } = useDashboardStats();

  useEffect(() => {
    if (discipleshipAccess) {
      const defaultTab = discipleshipAccess.canAccess
        ? (getDiscipleshipLevel() >= 2 ? 'dashboard' : 'overview')
        : 'overview';
      setActiveTab(defaultTab);
    }
  }, [discipleshipAccess]);

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
  }, [authUser?.id]);

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

  // Memorizar el dashboard para evitar re-renders innecesarios
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
        return CoordinatorDashboard;
      case 3:
        return GeneralSupervisorDashboard;
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

  const canManageHierarchy =
    discipleshipAccess?.isFullAccess ||
    (discipleshipAccess?.level && discipleshipAccess.level >= 4) ||
    false;

  const canViewZones =
    discipleshipAccess?.isFullAccess ||
    (discipleshipAccess?.level && discipleshipAccess.level >= 2) ||
    false;

  const canViewMap =
    discipleshipAccess?.isFullAccess ||
    (discipleshipAccess?.level && discipleshipAccess.level >= 2) ||
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
                {discipleshipAccess.isFullAccess}
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
          <TabsList className="inline-flex w-full md:grid h-auto min-w-max md:min-w-0 gap-1 md:gap-0"
            style={{
              gridTemplateColumns: `repeat(${
                2 + (canManageGroups ? 1 : 0) + (canManageHierarchy ? 1 : 0) + (canViewZones ? 1 : 0) + (canViewMap ? 1 : 0)
              }, minmax(0, 1fr))`
            }}
          >
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
            {canManageGroups && (
              <TabsTrigger
                value="manage"
                className="text-xs md:text-sm whitespace-nowrap flex-shrink-0 px-2 md:px-3"
              >
                Gestión
              </TabsTrigger>
            )}
            {canManageHierarchy && (
              <TabsTrigger
                value="hierarchy"
                className="text-xs md:text-sm whitespace-nowrap flex-shrink-0 px-2 md:px-3"
              >
                Jerarquías
              </TabsTrigger>
            )}
            {canViewZones && (
              <TabsTrigger
                value="zones"
                className="text-xs md:text-sm whitespace-nowrap flex-shrink-0 px-2 md:px-3"
              >
                Zonas
              </TabsTrigger>
            )}
            {canViewMap && (
              <TabsTrigger
                value="map"
                className="text-xs md:text-sm whitespace-nowrap flex-shrink-0 px-2 md:px-3"
              >
                Mapa
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 md:space-y-6">
          {!discipleshipAccess?.canAccess ? (
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
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Users className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{discipleshipStats.totalGroups}</p>
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
                    <p className="text-2xl font-bold">{discipleshipStats.totalMembers}</p>
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
                    <p className="text-2xl font-bold">{discipleshipStats.multiplications}</p>
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
                    <p className="text-2xl font-bold">{discipleshipStats.alertsCount}</p>
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
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Actividad Reciente</CardTitle>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center space-y-2">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-sm text-muted-foreground">Cargando actividad...</p>
                  </div>
                </div>
              ) : recentActivities.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No hay actividad reciente</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentActivities.map(activity => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 rounded-lg p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${activity.color}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-none">{activity.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {activity.description}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatTimestamp(activity.timestamp as unknown as { Time: string })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
            </>
          )}
        </TabsContent>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard">{renderDiscipleshipDashboard()}</TabsContent>

        {/* Group Management Tab */}
        <TabsContent value="manage">
          {canManageGroups ? (
            <GroupManagement />
          ) : (
            <NoAccessCard module="Gestión de Grupos" requiredLevel={3} />
          )}
        </TabsContent>

        {/* Hierarchy Management Tab */}
        <TabsContent value="hierarchy">
          {canManageHierarchy ? (
            <HierarchyManagement />
          ) : (
            <NoAccessCard module="Jerarquías" requiredLevel={4} />
          )}
        </TabsContent>

        {/* Zones Tab */}
        <TabsContent value="zones">
          {canViewZones ? (
            <ZoneManagement />
          ) : (
            <NoAccessCard module="Zonas" requiredLevel={2} />
          )}
        </TabsContent>

        {/* Map Tab */}
        <TabsContent value="map">
          {canViewMap ? (
            <DiscipleshipMap />
          ) : (
            <NoAccessCard module="Mapa" requiredLevel={2} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DiscipleshipPage;
