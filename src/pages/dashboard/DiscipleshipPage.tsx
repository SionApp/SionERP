import DiscipleshipMap from '@/components/discipleship/DiscipleshipMap';
import GroupManagement from '@/components/discipleship/GroupManagement';
import HierarchyManagement from '@/components/discipleship/HierarchyManagement';
import ZoneManagement from '@/components/discipleship/ZoneManagement';
import { MobileScreen } from '@/components/mobile/MobileScreen';
import { MobileSegment } from '@/components/mobile/MobileSegment';
import { AnimatedTabContent } from '@/components/mobile/AnimatedTabContent';
import { MobileDiscipleshipOverview } from '@/components/mobile/screens/DiscipleshipScreen';
import { MobileLeaderOverview } from '@/components/mobile/screens/LeaderOverview';
import { useMobileMode } from '@/hooks/useMobileMode';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useRecentDiscipleshipActivity } from '@/hooks/useRecentDiscipleshipActivity';
import { UserService } from '@/services/user.service';
import { User as UserType } from '@/types/user.types';
import {
  getDashboardLevel,
  getDiscipleshipAccess,
  type DiscipleshipAccess,
} from '@/utils/discipleship-access';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle,
  ClipboardList,
  MapPin,
  Plus,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { DiscipleshipService } from '@/services/discipleship.service';
import type { DiscipleshipGroup } from '@/types/discipleship.types';
import { toast } from 'sonner';
import AuxiliarySupervisorDashboard from './discipleship/AuxiliarySupervisorDashboard';
import CoordinatorDashboard from './discipleship/CoordinatorDashboard';
import GeneralSupervisorDashboard from './discipleship/GeneralSupervisorDashboard';
import LeaderDashboard from './discipleship/LeaderDashboard';
import PastoralDashboard from './discipleship/PastoralDashboard';

function formatTimestamp(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return 'Fecha desconocida';
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return 'Hace minutos';
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays < 7) return `Hace ${diffDays}d`;
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

// ─────────────────────────────────────────────
// Resumen personalizado para líderes (nivel 1)
// ─────────────────────────────────────────────
function LeaderOverview({ onGoToDashboard }: { onGoToDashboard: () => void }) {
  const { user } = useAuth();
  const [group, setGroup] = useState<DiscipleshipGroup | null>(null);
  const [lastReport, setLastReport] = useState<{ status: string } | null>(null);
  const [memberCount, setMemberCount] = useState<{ total: number; active: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      try {
        setLoading(true);
        const [groupsRes, reportsRes] = await Promise.allSettled([
          DiscipleshipService.getGroups({ leader_id: user.id, limit: 1 }),
          DiscipleshipService.getReports({ reporter_id: user.id, limit: 1 }),
        ]);

        if (groupsRes.status === 'fulfilled') {
          const list = Array.isArray(groupsRes.value)
            ? groupsRes.value
            : (groupsRes.value?.data ?? []);
          const g = list[0] ?? null;
          setGroup(g);
          if (g) {
            setMemberCount({ total: g.member_count || 0, active: g.active_members || 0 });
          }
        }
        if (reportsRes.status === 'fulfilled') {
          const list = Array.isArray(reportsRes.value)
            ? reportsRes.value
            : (reportsRes.value ?? []);
          setLastReport(list[0] ?? null);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  const reportStatusLabel: Record<string, string> = {
    submitted: 'Enviado',
    approved: 'Aprobado',
    draft: 'Borrador',
    revision_required: 'Requiere revisión',
  };
  const reportStatusColor: Record<string, string> = {
    submitted: 'text-blue-500',
    approved: 'text-green-500',
    draft: 'text-muted-foreground',
    revision_required: 'text-orange-500',
  };

  return (
    <div className="space-y-4">
      {/* Stats de la célula */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-6">
        <Card>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold">
                  {loading ? '—' : (memberCount?.total ?? 0)}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">Miembros</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold">
                  {loading ? '—' : (memberCount?.active ?? 0)}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">Activos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold truncate">
                  {loading ? '—' : (group?.meeting_day ?? 'No definido')}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">Día de reunión</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 shrink-0" />
              <div className="min-w-0">
                {loading ? (
                  <p className="text-xl sm:text-2xl font-bold">—</p>
                ) : lastReport ? (
                  <p
                    className={`text-sm font-semibold ${reportStatusColor[lastReport.status] ?? 'text-muted-foreground'}`}
                  >
                    {reportStatusLabel[lastReport.status] ?? lastReport.status}
                  </p>
                ) : (
                  <p className="text-sm font-semibold text-muted-foreground">Sin reporte</p>
                )}
                <p className="text-xs sm:text-sm text-muted-foreground">Último reporte</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Acciones relevantes para el líder */}
      <Card>
        <CardHeader className="px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-6 pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-xl">Acciones Rápidas</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Gestiona tu célula</CardDescription>
        </CardHeader>
        <CardContent className="px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6">
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3">
            <Button onClick={onGoToDashboard} className="w-full sm:w-auto">
              <BarChart3 className="w-4 h-4 mr-2" />
              Ver mi Célula
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NoAccessCard({ module, requiredLevel }: { module: string; requiredLevel: number }) {
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
  const { user: authUser, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [user, setUser] = useState<UserType | null>(null);
  const [discipleshipAccess, setDiscipleshipAccess] = useState<DiscipleshipAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const isMobileApp = useMobileMode();
  const {
    activities: recentActivities,
    loading: activityLoading,
    refetch: refetchActivity,
  } = useRecentDiscipleshipActivity(
    8,
    discipleshipAccess?.canAccess &&
      !discipleshipAccess?.isFullAccess &&
      discipleshipAccess?.level === 1
      ? (authUser?.id ?? undefined)
      : undefined
  );
  const { discipleshipStats, loading: statsLoading, refetch: refetchStats } = useDashboardStats();

  // ── Pull-to-refresh (unconditional — Rules of Hooks) ──
  const handleRefresh = async () => {
    await Promise.allSettled([refetchStats(), refetchActivity()]);
    toast.success('Datos actualizados');
  };
  const pullToRefresh = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 60,
    maxPull: 110,
  });

  useEffect(() => {
    if (discipleshipAccess) {
      const defaultTab = discipleshipAccess.canAccess
        ? getDiscipleshipLevel() >= 2
          ? 'dashboard'
          : 'overview'
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

        const userData = await UserService.getCurrentUser();
        const userWithRole = { ...userData, role: userData.role as UserType['role'] };
        setUser(userWithRole);

        if (userWithRole.role) {
          const access = await getDiscipleshipAccess(userData.id, userWithRole.role as string);
          setDiscipleshipAccess(access);
        }
      } catch (error) {
        toast.error('Error al cargar el usuario');
        console.error('Error al cargar el usuario:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      loadUserAndAccess();
    }
  }, [authUser?.id, authLoading]);

  const getDiscipleshipLevel = (): number => {
    if (!discipleshipAccess) return 1;
    return getDashboardLevel(discipleshipAccess);
  };

  const getLevelName = (): string => {
    if (!discipleshipAccess) return 'Sin acceso';

    if (discipleshipAccess.isFullAccess) {
      return 'Pastoral (Acceso Completo)';
    }

    const level = discipleshipAccess.level || 1;
    switch (level) {
      case 5:
        return 'Pastoral';
      case 4:
        return 'Coordinador';
      case 3:
        return 'Supervisor General';
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

  // ── Modo mobile exclusivo ──
  if (isMobileApp) {
    const firstName =
      authUser?.user_metadata?.first_name || authUser?.email?.split('@')[0] || 'Usuario';

    const mobileTabs = [
      { value: 'overview', label: 'Resumen' },
      { value: 'dashboard', label: 'Dashboard' },
      ...(canManageGroups ? [{ value: 'manage', label: 'Gestión' }] : []),
      ...(canManageHierarchy ? [{ value: 'hierarchy', label: 'Jerarquías' }] : []),
      ...(canViewZones ? [{ value: 'zones', label: 'Zonas' }] : []),
      ...(canViewMap ? [{ value: 'map', label: 'Mapa' }] : []),
    ];

    const { state: pullState, isRefreshing } = pullToRefresh;

    return (
      <MobileScreen
        title={activeTab === 'overview' ? `Hola, ${firstName}` : 'Discipulado'}
        subtitle={
          activeTab === 'overview'
            ? `${getLevelName()} · Nivel ${getDiscipleshipLevel()}`
            : getLevelName()
        }
      >
        {/* ── Indicador de pull-to-refresh ── */}
        <div
          className={cn(
            'flex items-center justify-center h-0 overflow-hidden transition-[height] duration-200',
            pullState !== 'idle' && pullState !== 'refreshing' && 'h-14',
            isRefreshing && 'h-14'
          )}
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <RefreshCw
              className={cn(
                'w-4 h-4 transition-transform duration-200',
                isRefreshing ? 'animate-spin' : '',
                pullState === 'reached' && !isRefreshing ? 'rotate-180' : ''
              )}
            />
            <span>
              {isRefreshing
                ? 'Actualizando...'
                : pullState === 'reached'
                  ? 'Suelta para actualizar'
                  : 'Tira para actualizar'}
            </span>
          </div>
        </div>

        {discipleshipAccess?.canAccess && (
          <MobileSegment
            scrollable
            options={mobileTabs}
            value={activeTab}
            onChange={setActiveTab}
            className="px-4 pt-1"
          />
        )}

        {!discipleshipAccess?.canAccess ? (
          <AnimatedTabContent key={activeTab}>
            <div className="px-4 pt-6 text-center space-y-3">
              <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground" />
              <h3 className="text-base font-semibold">Sin Acceso al Módulo</h3>
              <p className="text-sm text-muted-foreground">
                No tienes un nivel jerárquico asignado. Contacta a un administrador.
              </p>
            </div>
          </AnimatedTabContent>
        ) : (
          <>
            {activeTab === 'overview' && (
              <AnimatedTabContent key="overview">
                {getDiscipleshipLevel() === 1 ? (
                  <MobileLeaderOverview onGoToDashboard={() => setActiveTab('dashboard')} />
                ) : (
                  <MobileDiscipleshipOverview
                    firstName={firstName}
                    stats={discipleshipStats}
                    statsLoading={statsLoading}
                    activities={recentActivities}
                    activityLoading={activityLoading}
                    canManageGroups={canManageGroups}
                    onGoToTab={setActiveTab}
                  />
                )}
              </AnimatedTabContent>
            )}

            {activeTab === 'dashboard' && (
              <AnimatedTabContent key="dashboard">
                {renderDiscipleshipDashboard()}
              </AnimatedTabContent>
            )}

            {activeTab === 'manage' && canManageGroups && (
              <AnimatedTabContent key="manage">
                <div className="px-3 pt-3">
                  <GroupManagement />
                </div>
              </AnimatedTabContent>
            )}

            {activeTab === 'hierarchy' && canManageHierarchy && (
              <AnimatedTabContent key="hierarchy">
                <div className="px-3 pt-3">
                  <HierarchyManagement />
                </div>
              </AnimatedTabContent>
            )}

            {activeTab === 'zones' && canViewZones && (
              <AnimatedTabContent key="zones">
                <div className="px-3 pt-3">
                  <ZoneManagement />
                </div>
              </AnimatedTabContent>
            )}

            {activeTab === 'map' && canViewMap && (
              <AnimatedTabContent key="map">
                <div className="px-3 pt-3">
                  <DiscipleshipMap />
                </div>
              </AnimatedTabContent>
            )}
          </>
        )}
      </MobileScreen>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-6 p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Ministerio de Discipulado
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
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
          <TabsList
            className="inline-flex w-full md:grid h-auto min-w-max md:min-w-0 gap-1 md:gap-0"
            style={{
              gridTemplateColumns: `repeat(${
                2 +
                (canManageGroups ? 1 : 0) +
                (canManageHierarchy ? 1 : 0) +
                (canViewZones ? 1 : 0) +
                (canViewMap ? 1 : 0)
              }, minmax(0, 1fr))`,
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
              {getDiscipleshipLevel() === 1 ? (
                /* ── Resumen para LÍDERES (nivel 1) ── */
                <LeaderOverview onGoToDashboard={() => setActiveTab('dashboard')} />
              ) : (
                /* ── Resumen para SUPERVISORES y superiores (nivel 2+) ── */
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-6">
                    <Card>
                      <CardContent className="p-3 sm:p-4 md:p-6">
                        <div className="flex items-center gap-2">
                          <Users className="w-6 h-6 sm:w-8 sm:h-8 text-primary shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xl sm:text-2xl font-bold">
                              {discipleshipStats.totalGroups}
                            </p>
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">
                              Grupos Activos
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 sm:p-4 md:p-6">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xl sm:text-2xl font-bold">
                              {discipleshipStats.totalMembers}
                            </p>
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">
                              Miembros Activos
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 sm:p-4 md:p-6">
                        <div className="flex items-center gap-2">
                          <Target className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xl sm:text-2xl font-bold">
                              {discipleshipStats.multiplications}
                            </p>
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">
                              Multiplicando
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 sm:p-4 md:p-6">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xl sm:text-2xl font-bold">
                              {discipleshipStats.alertsCount}
                            </p>
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">
                              Necesitan Atención
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Quick Actions — solo para nivel 2+ */}
                  <Card>
                    <CardHeader className="px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-6 pb-2 sm:pb-3">
                      <CardTitle className="text-base sm:text-xl">Acciones Rápidas</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Gestiona los aspectos más importantes del discipulado
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6">
                      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3">
                        {canManageGroups && (
                          <Button
                            onClick={() => setActiveTab('manage')}
                            className="w-full sm:w-auto"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Crear Nuevo Grupo
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => setActiveTab('dashboard')}
                          className="w-full sm:w-auto"
                        >
                          <BarChart3 className="w-4 h-4 mr-2" />
                          Ver Dashboard
                        </Button>
                        {canManageGroups && (
                          <Button
                            variant="outline"
                            onClick={() => setActiveTab('map')}
                            className="w-full sm:w-auto"
                          >
                            <MapPin className="w-4 h-4 mr-2" />
                            Ver Mapa
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Recent Activity */}
              <Card>
                <CardHeader className="px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-6 pb-2 sm:pb-3">
                  <CardTitle className="text-base">Actividad Reciente</CardTitle>
                </CardHeader>
                <CardContent className="px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6">
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
                          <div
                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${activity.color}`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-none">{activity.title}</p>
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                              {activity.description}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatTimestamp(activity.timestamp)}
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
          {canViewZones ? <ZoneManagement /> : <NoAccessCard module="Zonas" requiredLevel={2} />}
        </TabsContent>

        {/* Map Tab */}
        <TabsContent value="map">
          {canViewMap ? <DiscipleshipMap /> : <NoAccessCard module="Mapa" requiredLevel={2} />}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DiscipleshipPage;
