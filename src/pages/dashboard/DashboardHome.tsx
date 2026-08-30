import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MobileDashboardScreen } from '@/components/mobile/screens/DashboardScreen';

// Panel de zonas del Inicio: vista "de un vistazo" (handoff MD3 #159), sin
// Leaflet. El mapa geográfico real sigue en /discipulado — ver ZonesOverviewMap.
import { ZonesOverviewMap } from '@/components/dashboard/ZonesOverviewMap';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useMobileMode } from '@/hooks/useMobileMode';
import { supabase } from '@/integrations/supabase/client';
import { DashboardService, type TraceabilityEntry } from '@/services/dashboard.service';
import { DiscipleshipService } from '@/services/discipleship.service';
import type { DiscipleshipReport } from '@/types/discipleship.types';
import { cn, formatTimeAgo } from '@/lib/utils';
import { ROLE_LEVELS } from '@/lib/permissions';
import { MD3_ICON_TONE, MD3_TONE_FALLBACK, type MD3Tone } from '@/lib/md3-tones';
import {
  AlertTriangle,
  BookOpen,
  ChevronRight,
  Edit3,
  Map,
  Network,
  Send,
  Settings,
  Shield,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react';

// ── Quick action config ──────────────────────────────────────────────────────

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  to: string;
  tone: MD3Tone; // categoría MD3, compartida entre desktop y mobile
  roles: string[];
  module?: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Registrar usuario',
    icon: <UserPlus className="h-[21px] w-[21px]" />,
    to: '/dashboard/register',
    tone: 'blue',
    roles: ['pastor', 'staff', 'admin'],
  },
  {
    label: 'Discipulado',
    icon: <BookOpen className="h-[21px] w-[21px]" />,
    to: '/dashboard/discipleship',
    tone: 'green',
    roles: ['pastor', 'staff', 'supervisor', 'server', 'admin'],
    module: 'discipleship',
  },
  {
    label: 'Zonas',
    icon: <Map className="h-[21px] w-[21px]" />,
    to: '/dashboard/zones',
    tone: 'violet',
    roles: ['pastor', 'staff', 'admin'],
    module: 'zones',
  },
  {
    label: 'Configuración',
    icon: <Settings className="h-[21px] w-[21px]" />,
    to: '/dashboard/settings',
    tone: 'terracotta',
    roles: ['pastor', 'staff', 'admin'],
  },
];

// Pares de color por categoría del handoff MD3 — compartidos con la pantalla
// mobile (ver lib/md3-tones.ts).
const ICON_TONE = MD3_ICON_TONE;

// ── KPI card (MD3 tonal — handoff variante 2a) ────────────────────────────────

interface StatCardProps {
  title: string;
  value: number | string;
  sub: string;
  icon: React.ReactNode;
  tone: keyof typeof ICON_TONE;
  loading?: boolean;
}

const StatCard = ({ title, value, sub, icon, tone, loading }: StatCardProps) => (
  <div className="rounded-md3-lg bg-surface-container p-5">
    <div className="flex items-start justify-between gap-3">
      <span className="text-[13px] font-medium text-muted-foreground">{title}</span>
      <div
        className={cn(
          'flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-md3',
          ICON_TONE[tone]
        )}
      >
        {icon}
      </div>
    </div>
    {loading ? (
      <Skeleton className="mb-0.5 mt-3.5 h-10 w-24" />
    ) : (
      <div className="mb-0.5 mt-3.5 text-[42px] font-medium leading-none tracking-tight text-foreground">
        {value}
      </div>
    )}
    <p className="text-[13px] text-outline">{sub}</p>
  </div>
);

// ── Role badge label ─────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  pastor: 'Pastor',
  staff: 'Personal',
  supervisor: 'Supervisor',
  server: 'Servidor',
};

// ── Actividad reciente: traduce una entrada de auditoría (trazabilidad) a una
// fila legible (icono + título), según la tabla y la acción. ──────────────────
function describeActivity(e: TraceabilityEntry): { icon: React.ReactNode; title: string } {
  const t = e.table_name.toLowerCase();
  const a = e.action.toUpperCase();
  if (t.includes('report'))
    return { icon: <Send className="h-[18px] w-[18px]" />, title: 'Reporte enviado' };
  if (t.includes('group'))
    return { icon: <Network className="h-[18px] w-[18px]" />, title: 'Nuevo grupo celular' };
  if (t.includes('role') || t.includes('permission'))
    return { icon: <Shield className="h-[18px] w-[18px]" />, title: 'Actualizó un rol' };
  if (t.includes('user')) {
    if (a === 'INSERT')
      return { icon: <UserPlus className="h-[18px] w-[18px]" />, title: 'Registró usuario' };
    if (a === 'DELETE')
      return { icon: <Edit3 className="h-[18px] w-[18px]" />, title: 'Eliminó usuario' };
    return { icon: <Edit3 className="h-[18px] w-[18px]" />, title: 'Actualizó usuario' };
  }
  const verb = a === 'INSERT' ? 'Creó' : a === 'DELETE' ? 'Eliminó' : 'Actualizó';
  return { icon: <Zap className="h-[18px] w-[18px]" />, title: `${verb} un registro` };
}

// ── Main component ───────────────────────────────────────────────────────────

const DashboardHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [zonesCount, setZonesCount] = useState<number | null>(null);
  const [activity, setActivity] = useState<TraceabilityEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  // Solo para la pantalla mobile (no rediseñada en esta tanda MD3).
  const [pendingReports, setPendingReports] = useState<DiscipleshipReport[]>([]);
  const [pendingReportsLoading, setPendingReportsLoading] = useState(true);

  const { stats, discipleshipStats, currentUserRole, installedModules, loading } =
    useDashboardStats();
  const isMobileApp = useMobileMode();

  // Fetch zones count independently (not in Go dashboard endpoint yet)
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('zones')
      .select('id', { count: 'exact', head: true })
      .then(({ count }: { count: number | null }) => setZonesCount(count ?? 0));
  }, []);

  // Actividad reciente (auditoría/trazabilidad). Solo staff+ ve este endpoint
  // (backend RequireRole staff); para el resto queda vacío sin romper nada.
  useEffect(() => {
    const staffPlus = ROLE_LEVELS[currentUserRole ?? ''] >= ROLE_LEVELS.staff;
    if (!staffPlus) {
      setActivityLoading(false);
      return;
    }
    let cancelled = false;
    DashboardService.getTraceability({ limit: 6 })
      .then(res => {
        if (!cancelled) setActivity(res.items || []);
      })
      .catch(err => console.error('Error loading activity:', err))
      .finally(() => {
        if (!cancelled) setActivityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUserRole]);

  // Reportes pendientes — solo se consumen en la pantalla mobile.
  useEffect(() => {
    if (!isMobileApp || !installedModules.includes('discipleship')) {
      setPendingReportsLoading(false);
      return;
    }
    let cancelled = false;
    DiscipleshipService.getReports({ status: 'submitted', limit: 3 })
      .then(reports => {
        if (!cancelled) setPendingReports(reports || []);
      })
      .catch(err => console.error('Error loading pending reports:', err))
      .finally(() => {
        if (!cancelled) setPendingReportsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isMobileApp, installedModules]);

  const firstName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Admin';
  const lastLogin = user?.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

  // Gate de nivel de sistema para contenido "de toda la iglesia" (hoy: el
  // mapa de zonas). "Actividad reciente" vivía acá también — se mudó a su
  // propio módulo (/dashboard/trazabilidad, ver GetTraceability).
  const isStaffPlus = ROLE_LEVELS[currentUserRole ?? ''] >= ROLE_LEVELS.staff;

  const visibleActions = QUICK_ACTIONS.filter(a => {
    if (!currentUserRole || !a.roles.includes(currentUserRole)) return false;
    if (a.module && !installedModules.includes(a.module)) return false;
    return true;
  });

  // ── Modo mobile exclusivo: pantalla presentacional ──
  if (isMobileApp) {
    const moduleLinks = [
      ...(installedModules.includes('discipleship')
        ? [
            {
              key: 'discipleship',
              title: 'Discipulado',
              subtitle: loading
                ? '—'
                : `${discipleshipStats.totalGroups} grupos · ${discipleshipStats.totalMembers} miembros`,
              to: '/dashboard/discipleship',
              badge:
                discipleshipStats.alertsCount > 0
                  ? `${discipleshipStats.alertsCount} alerta${discipleshipStats.alertsCount !== 1 ? 's' : ''}`
                  : undefined,
            },
          ]
        : []),
      ...(installedModules.includes('zones')
        ? [
            {
              key: 'zones',
              title: 'Zonas',
              subtitle:
                zonesCount === null
                  ? '—'
                  : `${zonesCount} zona${zonesCount !== 1 ? 's' : ''} configurada${zonesCount !== 1 ? 's' : ''}`,
              to: '/dashboard/zones',
            },
          ]
        : []),
      {
        key: 'roles',
        title: 'Roles y permisos',
        subtitle: loading ? '—' : `${stats.activeRoles} roles · ${stats.totalUsers} usuarios`,
        to: '/dashboard/roles',
      },
    ];

    return (
      <MobileDashboardScreen
        firstName={firstName}
        roleLabel={currentUserRole ? (ROLE_LABELS[currentUserRole] ?? currentUserRole) : undefined}
        stats={{
          totalUsers: stats.totalUsers,
          newRegistrations: stats.newRegistrations,
          totalGroups: discipleshipStats.totalGroups,
          alertsCount: discipleshipStats.alertsCount,
        }}
        actions={visibleActions}
        modules={moduleLinks}
        pendingReports={pendingReports}
        loading={loading || pendingReportsLoading}
        onNavigate={navigate}
      />
    );
  }

  const canRegister =
    currentUserRole !== undefined && ['admin', 'pastor', 'staff'].includes(currentUserRole);

  return (
    <div className="min-h-screen bg-surface">
      <div className="flex flex-col gap-5 p-4 sm:p-6">
        {/* ── Welcome banner (MD3 — handoff 2a) ─────────────────────────────── */}
        <div
          className="flex flex-col gap-4 rounded-md3-xl p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-7"
          style={{ backgroundImage: 'var(--gradient-banner)' }}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-normal sm:text-[30px]">Hola, {firstName}</h1>
              {currentUserRole && (
                <span className="rounded-full bg-white/20 px-3.5 py-1.5 text-xs font-medium text-white">
                  {ROLE_LABELS[currentUserRole] ?? currentUserRole}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-white/85">Último acceso: {lastLogin}</p>
          </div>
          {canRegister && (
            <button
              onClick={() => navigate('/dashboard/register')}
              className="flex shrink-0 items-center justify-center gap-2.5 rounded-md3 bg-primary-container px-6 py-3.5 text-[15px] font-medium text-on-primary-container transition-opacity hover:opacity-90"
            >
              <UserPlus className="h-5 w-5" />
              Registrar usuario
            </button>
          )}
        </div>

        {/* ── KPI cards ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4 lg:gap-4">
          <StatCard
            title="Usuarios activos"
            value={stats.totalUsers}
            sub="Registrados en el sistema"
            icon={<Users className="h-[22px] w-[22px]" />}
            tone="blue"
            loading={loading}
          />
          <StatCard
            title="Grupos celulares"
            value={discipleshipStats.totalGroups}
            sub={`${discipleshipStats.totalMembers} miembros`}
            icon={<BookOpen className="h-[22px] w-[22px]" />}
            tone="green"
            loading={loading}
          />
          <StatCard
            title="Nuevos este mes"
            value={stats.newRegistrations}
            sub="Últimos 30 días"
            icon={<UserPlus className="h-[22px] w-[22px]" />}
            tone="violet"
            loading={loading}
          />
          <StatCard
            title="Alertas activas"
            value={discipleshipStats.alertsCount}
            sub="Requieren atención"
            icon={<AlertTriangle className="h-[22px] w-[22px]" />}
            tone="terracotta"
            loading={loading}
          />
        </div>

        {/* ── Quick actions (MD3 — handoff) ─────────────────────────────────── */}
        {visibleActions.length > 0 && (
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
            {visibleActions.map(action => (
              <button
                key={action.to}
                onClick={() => navigate(action.to)}
                className="flex items-center gap-3 rounded-md3 bg-surface-container px-4 py-3.5 text-left transition-colors hover:bg-surface-container-high"
              >
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                    ICON_TONE[action.tone] ?? ICON_TONE.blue
                  )}
                >
                  {action.icon}
                </div>
                <span className="truncate text-sm font-medium text-foreground">{action.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── Mapa de zonas y células (staff+/pastor, con módulo de zonas) ── */}
        {isStaffPlus && installedModules.includes('zones') && <ZonesOverviewMap />}

        {/* ── Two column grid ───────────────────────────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Actividad reciente (MD3 — handoff). Feed de auditoría; solo staff+. */}
          {isStaffPlus && (
            <Card className="rounded-md3-xl border-outline-variant bg-surface-white shadow-none lg:col-span-2">
              <CardHeader className="p-5 pb-2">
                <CardTitle className="flex items-center gap-2.5 text-[17px] font-medium">
                  <Zap className="h-[22px] w-[22px] text-primary" />
                  Actividad reciente
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4 pt-1">
                {activityLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map(i => (
                      <Skeleton key={i} className="h-12 w-full rounded-md3" />
                    ))}
                  </div>
                ) : activity.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
                    <Zap className="h-8 w-8 opacity-20" />
                    <p className="text-sm">Sin actividad reciente</p>
                  </div>
                ) : (
                  <div>
                    {activity.map((e, idx) => {
                      const { icon, title } = describeActivity(e);
                      return (
                        <div
                          key={e.id}
                          className={cn(
                            'flex items-center gap-3.5 py-3',
                            idx < activity.length - 1 && 'border-b border-divider-soft'
                          )}
                        >
                          <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-primary-container text-primary">
                            {icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{title}</p>
                            <p className="truncate text-xs text-outline">
                              por {e.user || 'Sistema'}
                            </p>
                          </div>
                          <span className="shrink-0 whitespace-nowrap text-xs text-outline">
                            {e.changed_at ? formatTimeAgo(e.changed_at) : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Accesos laterales — 1/3, o ancho completo si no hay feed de actividad */}
          <div className={cn('space-y-3.5', !isStaffPlus && 'lg:col-span-3')}>
            {/* Discipleship */}
            {installedModules.includes('discipleship') && (
              <Card
                className="cursor-pointer rounded-md3-lg border-0 bg-surface-container shadow-none transition-colors hover:bg-surface-container-high"
                onClick={() => navigate('/dashboard/discipleship')}
              >
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Discipulado</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {loading
                        ? '—'
                        : `${discipleshipStats.totalGroups} grupos · ${discipleshipStats.totalMembers} miembros`}
                    </p>
                    {discipleshipStats.alertsCount > 0 && (
                      <Badge variant="destructive" className="text-[10px] mt-1.5">
                        {discipleshipStats.alertsCount} alerta
                        {discipleshipStats.alertsCount !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            )}

            {/* Zones */}
            {installedModules.includes('zones') && (
              <Card
                className="cursor-pointer rounded-md3-lg border-0 bg-surface-container shadow-none transition-colors hover:bg-surface-container-high"
                onClick={() => navigate('/dashboard/zones')}
              >
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Zonas</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {zonesCount === null
                        ? '—'
                        : `${zonesCount} zona${zonesCount !== 1 ? 's' : ''} configurada${zonesCount !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            )}

            {/* Roles */}
            <Card
              className="cursor-pointer rounded-md3-lg border-0 bg-surface-container shadow-none transition-colors hover:bg-surface-container-high"
              onClick={() => navigate('/dashboard/roles')}
            >
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Roles y permisos</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {loading ? '—' : `${stats.activeRoles} roles · ${stats.totalUsers} usuarios`}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>

            {/* Register shortcut — only for admin/pastor/staff */}
            {currentUserRole && ['admin', 'pastor', 'staff'].includes(currentUserRole) && (
              <Button className="w-full" onClick={() => navigate('/dashboard/register')}>
                <UserPlus className="h-4 w-4 mr-2" />
                Registrar usuario
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
