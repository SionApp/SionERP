import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AuditLogModal } from '@/components/AuditLogModal';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { supabase } from '@/integrations/supabase/client';
import { AuditLog } from '@/types/audit.types';
import { RecentActivity } from '@/services/dashboard.service';
import { cn } from '@/lib/utils';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  ChevronRight,
  Map,
  Settings,
  UserPlus,
  Users,
} from 'lucide-react';

// ── Quick action config ──────────────────────────────────────────────────────

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  to: string;
  color: string;
  roles: string[];
  module?: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Registrar usuario',
    icon: <UserPlus className="h-5 w-5" />,
    to: '/dashboard/register',
    color: 'from-blue-500 to-cyan-500',
    roles: ['pastor', 'staff', 'admin'],
  },
  {
    label: 'Discipulado',
    icon: <BookOpen className="h-5 w-5" />,
    to: '/dashboard/discipleship',
    color: 'from-emerald-500 to-green-500',
    roles: ['pastor', 'staff', 'supervisor', 'server', 'admin'],
    module: 'discipleship',
  },
  {
    label: 'Zonas',
    icon: <Map className="h-5 w-5" />,
    to: '/dashboard/zones',
    color: 'from-violet-500 to-purple-500',
    roles: ['pastor', 'staff', 'admin'],
    module: 'zones',
  },
  {
    label: 'Configuración',
    icon: <Settings className="h-5 w-5" />,
    to: '/dashboard/settings',
    color: 'from-orange-500 to-red-500',
    roles: ['pastor', 'staff', 'admin'],
  },
];

// ── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: number | string;
  sub: string;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
}

const StatCard = ({ title, value, sub, icon, color, loading }: StatCardProps) => (
  <Card className="relative overflow-hidden border-0 bg-[var(--glass-background)] backdrop-blur-lg shadow-[var(--shadow-glass)]">
    <div className={cn('absolute inset-0 bg-gradient-to-br opacity-10', color)} />
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 relative z-10 p-3 sm:p-4">
      <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
        {title}
      </CardTitle>
      <div className={cn('p-1.5 sm:p-2 rounded-lg bg-gradient-to-br shadow-md', color)}>{icon}</div>
    </CardHeader>
    <CardContent className="relative z-10 p-3 sm:p-4 pt-0">
      {loading ? (
        <Skeleton className="h-7 w-16" />
      ) : (
        <div className="text-2xl sm:text-3xl font-bold">{value}</div>
      )}
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </CardContent>
  </Card>
);

// ── Activity dot color ───────────────────────────────────────────────────────

const activityDot = (type: string) => {
  switch (type) {
    case 'success':
      return 'bg-green-500';
    case 'warning':
      return 'bg-orange-500';
    case 'error':
    case 'danger':
      return 'bg-red-500';
    default:
      return 'bg-blue-500';
  }
};

// ── Role badge label ─────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  pastor: 'Pastor',
  staff: 'Personal',
  supervisor: 'Supervisor',
  server: 'Servidor',
};

// ── Main component ───────────────────────────────────────────────────────────

const DashboardHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [zonesCount, setZonesCount] = useState<number | null>(null);
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { stats, discipleshipStats, recentActivity, currentUserRole, installedModules, loading } =
    useDashboardStats();

  // Fetch zones count independently (not in Go dashboard endpoint yet)
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('zones')
      .select('id', { count: 'exact', head: true })
      .then(({ count }: { count: number | null }) => setZonesCount(count ?? 0));
  }, []);

  const firstName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Admin';
  const lastLogin = user?.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

  const visibleActions = QUICK_ACTIONS.filter(a => {
    if (!currentUserRole || !a.roles.includes(currentUserRole)) return false;
    if (a.module && !installedModules.includes(a.module)) return false;
    return true;
  });

  const handleActivityClick = (activity: RecentActivity) => {
    if (activity?.details) {
      setSelectedAuditLog(activity.details as unknown as AuditLog);
      setIsModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-b-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-lg bg-gradient-to-r from-primary/90 via-blue-600/80 to-purple-600/80 border border-primary/20">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl md:text-4xl font-extrabold text-white drop-shadow-md">
                Hola, {firstName}
              </h1>
              {currentUserRole && (
                <Badge className="bg-white/20 text-white border-white/30 text-xs shrink-0">
                  {ROLE_LABELS[currentUserRole] ?? currentUserRole}
                </Badge>
              )}
            </div>
            <p className="text-white/70 text-xs sm:text-sm mt-1">Último acceso: {lastLogin}</p>
          </div>
          <div className="hidden sm:flex w-14 h-14 rounded-full bg-white/10 backdrop-blur-md items-center justify-center border border-white/20 shrink-0">
            <Activity className="h-7 w-7 text-white" />
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
        {/* ── Stat cards ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <StatCard
            title="Usuarios activos"
            value={stats.totalUsers}
            sub="Registrados en el sistema"
            icon={<Users className="h-4 w-4 text-white" />}
            color="from-blue-500 to-cyan-500"
            loading={loading}
          />
          <StatCard
            title="Grupos celulares"
            value={discipleshipStats.totalGroups}
            sub={`${discipleshipStats.totalMembers} miembros`}
            icon={<BookOpen className="h-4 w-4 text-white" />}
            color="from-emerald-500 to-green-500"
            loading={loading}
          />
          <StatCard
            title="Nuevos este mes"
            value={stats.newRegistrations}
            sub="Últimos 30 días"
            icon={<UserPlus className="h-4 w-4 text-white" />}
            color="from-violet-500 to-purple-500"
            loading={loading}
          />
          <StatCard
            title="Alertas activas"
            value={discipleshipStats.alertsCount}
            sub="Requieren atención"
            icon={<AlertTriangle className="h-4 w-4 text-white" />}
            color={
              discipleshipStats.alertsCount > 0
                ? 'from-red-500 to-orange-500'
                : 'from-slate-400 to-slate-500'
            }
            loading={loading}
          />
        </div>

        {/* ── Quick actions ─────────────────────────────────────────────────── */}
        {visibleActions.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {visibleActions.map(action => (
              <button
                key={action.to}
                onClick={() => navigate(action.to)}
                className="flex items-center gap-3 p-3 sm:p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors cursor-pointer text-left"
              >
                <div
                  className={cn(
                    'p-2 rounded-lg bg-gradient-to-br text-white shrink-0',
                    action.color
                  )}
                >
                  {action.icon}
                </div>
                <span className="text-sm font-medium truncate">{action.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── Two column grid ───────────────────────────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Activity feed — takes 2/3 */}
          <Card className="lg:col-span-2 border-0 bg-[var(--glass-background)] backdrop-blur-lg shadow-[var(--shadow-glass)]">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Actividad reciente
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Skeleton key={i} className="h-12 w-full rounded-xl" />
                  ))}
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                  <Activity className="h-8 w-8 opacity-20" />
                  <p className="text-sm">Sin actividad reciente</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentActivity.slice(0, 8).map((activity, i) => (
                    <div
                      key={activity.id ?? i}
                      onClick={() => handleActivityClick(activity)}
                      className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-accent/40 to-transparent border border-border/50 hover:from-accent/60 transition-colors cursor-pointer"
                    >
                      <div
                        className={cn(
                          'w-2.5 h-2.5 rounded-full shrink-0',
                          activityDot(activity.type)
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{activity.action}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          por {activity.user}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                        {activity.time}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Module summary — takes 1/3 */}
          <div className="space-y-3">
            {/* Discipleship */}
            {installedModules.includes('discipleship') && (
              <Card
                className="border-0 bg-[var(--glass-background)] backdrop-blur-lg shadow-[var(--shadow-glass)] cursor-pointer hover:shadow-md transition-shadow"
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
                className="border-0 bg-[var(--glass-background)] backdrop-blur-lg shadow-[var(--shadow-glass)] cursor-pointer hover:shadow-md transition-shadow"
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
              className="border-0 bg-[var(--glass-background)] backdrop-blur-lg shadow-[var(--shadow-glass)] cursor-pointer hover:shadow-md transition-shadow"
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

      <AuditLogModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        auditLog={selectedAuditLog}
      />
    </div>
  );
};

export default DashboardHome;
