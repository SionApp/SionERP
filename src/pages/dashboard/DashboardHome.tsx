import { AuditLogModal } from '@/components/AuditLogModal';
import { DiscipleshipAnalyticsSection } from '@/components/dashboard/DiscipleshipAnalyticsSection';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { cn } from '@/lib/utils';
import { RecentActivity } from '@/services/dashboard.service';
import { AuditLog } from '@/types/audit.types';
import {
  Activity,
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronUp,
  Shield,
  Target,
  UserPlus,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer } from 'recharts';

// ========================================
// INTERFAZ PARA SECCIONES COLAPSABLES
// ========================================

interface DashboardSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
}

const SECTIONS: DashboardSection[] = [
  { id: 'summary', title: 'Resumen', icon: <Activity className="h-4 w-4" />, defaultOpen: true },
  { id: 'discipleship', title: 'Discipulado', icon: <Users className="h-4 w-4" /> },
  { id: 'reports', title: 'Reportes', icon: <Calendar className="h-4 w-4" /> },
];

// ========================================
// COMPONENTES AUXILIARES
// ========================================

// Stats Card individual (reusable)
interface StatsCardProps {
  title: string;
  value: number | string;
  change: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

const StatsCard = ({ title, value, change, icon, color, description }: StatsCardProps) => (
  <Card className="relative overflow-hidden border-0 bg-[var(--glass-background)] backdrop-blur-lg shadow-[var(--shadow-glass)]">
    <div className={cn('absolute inset-0 bg-gradient-to-br', color, 'opacity-10')}></div>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10 p-4">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <div className={cn('p-2 rounded-lg bg-gradient-to-br shadow-lg', color)}>{icon}</div>
    </CardHeader>
    <CardContent className="relative z-10 p-4 pt-0">
      <div className="text-2xl md:text-3xl font-bold">{value}</div>
      <div className="flex items-center space-x-2 mt-1">
        <span className="text-xs font-medium text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
          {change}
        </span>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
    </CardContent>
  </Card>
);

// Sección colapsable
interface CollapsibleSectionProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const CollapsibleSection = ({
  id,
  title,
  icon,
  isOpen,
  onToggle,
  children,
}: CollapsibleSectionProps) => (
  <Card className="border-0 bg-[var(--glass-background)] backdrop-blur-lg shadow-[var(--shadow-glass)] overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-3 md:p-4 hover:bg-muted/20 transition-colors"
    >
      <div className="flex items-center gap-2 md:gap-3">
        <span className="text-primary">{icon}</span>
        <h2 className="text-lg md:text-xl font-bold">{title}</h2>
      </div>
      {isOpen ? (
        <ChevronUp className="h-5 w-5 text-muted-foreground" />
      ) : (
        <ChevronDown className="h-5 w-5 text-muted-foreground" />
      )}
    </button>
    <div
      className={cn(
        'transition-all duration-300 overflow-hidden',
        isOpen ? 'max-h-[9999px] opacity-100' : 'max-h-0 opacity-0'
      )}
    >
      <div className="p-4 md:p-6 pt-0">{children}</div>
    </div>
  </Card>
);

// ========================================
// MAIN COMPONENT
// ========================================

const DashboardHome = () => {
  const { user } = useAuth();
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estado de secciones abiertas
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    summary: true,
    discipleship: false,
    reports: false,
  });

  const {
    stats,
    roleDistribution,
    recentActivity,
    currentUserRole,
    installedModules,
    loading: statsLoading,
  } = useDashboardStats();

  const handleActivityClick = (activity: RecentActivity) => {
    if (activity) {
      setSelectedAuditLog(activity.details as unknown as AuditLog);
      setIsModalOpen(true);
    }
  };

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const lastLogin = user?.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleString('es-ES')
    : 'Nunca';

  // Verificar si puede ver discipulado
  const canSeeDiscipleship = currentUserRole && ['admin', 'pastor'].includes(currentUserRole);

  // Verificar si puede ver reportes
  const canSeeReports =
    currentUserRole && ['admin', 'pastor', 'supervisor'].includes(currentUserRole);

  // ========================================
  // RENDER: ESTADO DE CARGA
  // ========================================

  if (statsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 p-4 md:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-muted/20 rounded-3xl"></div>
          <div className="flex gap-4 overflow-hidden">
            <div className="h-32 min-w-[140px] bg-muted/20 rounded-2xl"></div>
            <div className="h-32 min-w-[140px] bg-muted/20 rounded-2xl"></div>
            <div className="h-32 min-w-[140px] bg-muted/20 rounded-2xl"></div>
          </div>
          <div className="h-64 bg-muted/20 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  // ========================================
  // RENDER: CONTENIDO PRINCIPAL
  // ========================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-b-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-lg bg-gradient-to-r from-primary/90 via-blue-600/80 to-purple-600/80 border border-primary/20 backdrop-blur-md">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="text-xl md:text-4xl font-extrabold text-white drop-shadow-md truncate">
              Bienvenido, {user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Admin'}
            </h1>
            <p className="text-white/80 text-sm md:text-lg font-medium mt-1 truncate">
              Sistema de Gestión Sion
            </p>
          </div>
          <div className="hidden lg:flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-white/70 font-medium">Último acceso</p>
              <p className="font-semibold text-white">{lastLogin}</p>
            </div>
            <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Activity className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal con secciones colapsables */}
      <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
        {/* ===================== RESUMEN ===================== */}
        <CollapsibleSection
          id="summary"
          title="Resumen"
          icon={<Activity className="h-4 w-4" />}
          isOpen={openSections.summary || false}
          onToggle={() => toggleSection('summary')}
        >
          {/* Stats Cards - Mobile: 2 cols, Desktop: 4 cols */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
            <StatsCard
              title="Total Usuarios"
              value={stats.totalUsers}
              change="+12%"
              icon={<Users className="h-4 w-4 text-white" />}
              color="from-blue-500 to-cyan-500"
              description="Registrados"
            />
            <StatsCard
              title="Nuevos Registros"
              value={stats.newRegistrations}
              change="+24%"
              icon={<UserPlus className="h-4 w-4 text-white" />}
              color="from-emerald-500 to-green-500"
              description="Últimos 30 días"
            />
            <StatsCard
              title="Roles Activos"
              value={stats.activeRoles}
              change="100%"
              icon={<Shield className="h-4 w-4 text-white" />}
              color="from-purple-500 to-pink-500"
              description="Tipos configurados"
            />
            <StatsCard
              title="Sistema Online"
              value={`${stats.systemActivity}%`}
              change="+2%"
              icon={<Target className="h-4 w-4 text-white" />}
              color="from-orange-500 to-red-500"
              description="Uptime"
            />
          </div>

          {/* Acciones rápidas - Solo mobile */}
          <div className="grid grid-cols-2 gap-3 md:hidden mt-4">
            <button className="flex items-center gap-3 p-3 bg-red-500/20 rounded-xl border border-red-500/30 active:bg-red-500/30">
              <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
              <div className="text-left min-w-0">
                <p className="font-medium text-sm truncate">3 Alertas</p>
                <p className="text-xs text-red-300 truncate">Requieren atención</p>
              </div>
            </button>
            <button className="flex items-center gap-3 p-3 bg-blue-500/20 rounded-xl border border-blue-500/30 active:bg-blue-500/30">
              <Calendar className="h-5 w-5 text-blue-400 shrink-0" />
              <div className="text-left min-w-0">
                <p className="font-medium text-sm truncate">Actividad</p>
                <p className="text-xs text-blue-300 truncate">Ver últimas</p>
              </div>
            </button>
          </div>

          {/* Charts Grid - Mobile: 1 col, Desktop: 2 cols */}
          <div className="grid gap-3 sm:gap-4 lg:grid-cols-2 lg:gap-6 mt-4 sm:mt-6">
            {/* Role Distribution */}
            <Card className="border-0 bg-[var(--glass-background)] backdrop-blur-lg shadow-[var(--shadow-glass)]">
              <CardHeader className="p-3 sm:p-4 lg:p-6">
                <CardTitle className="text-lg lg:text-xl font-bold flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Distribución de Roles
                </CardTitle>
                <CardDescription>Usuarios por tipo de rol</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6 flex flex-col items-center lg:items-start">
                <ChartContainer
                  config={{
                    admin: { label: 'Admin', color: 'hsl(var(--primary))' },
                    moderador: { label: 'Moderador', color: 'hsl(266 85% 68%)' },
                    usuario: { label: 'Usuario', color: 'hsl(295 85% 58%)' },
                  }}
                  className="h-[180px] sm:h-[200px] lg:h-[250px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={roleDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={60}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {roleDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Recent Activity - Visible for admin, pastor and staff */}
            {currentUserRole && ['admin', 'pastor', 'staff'].includes(currentUserRole) && (
              <Card className="border-0 bg-[var(--glass-background)] backdrop-blur-lg shadow-[var(--shadow-glass)]">
                <CardHeader className="p-3 sm:p-4 lg:p-6">
<CardTitle className="text-lg lg:text-xl font-bold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Actividades Recientes
                </CardTitle>
                <CardDescription>Registro del sistema</CardDescription>
              </CardHeader>
                <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
                  <div className="max-h-60 overflow-y-auto space-y-3 lg:space-y-4 pr-2">
                    {recentActivity.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">
                        No hay actividades recientes
                      </p>
                    ) : (
                      recentActivity.slice(0, 10).map((activity, index) => (
                        <div
                          key={activity.id || index}
                          className="flex items-center space-x-3 md:space-x-4 p-3 md:p-4 rounded-xl bg-gradient-to-r from-accent/50 to-transparent border border-border/50 hover:shadow-md transition-all duration-200 cursor-pointer hover:bg-accent/30"
                          onClick={() => handleActivityClick(activity)}
                        >
                          <div
                            className={cn(
                              'w-3 h-3 rounded-full shrink-0',
                              activity.type === 'success'
                                ? 'bg-green-500'
                                : activity.type === 'warning'
                                  ? 'bg-orange-500'
                                  : activity.type === 'error' || activity.type === 'danger'
                                    ? 'bg-red-500'
                                    : 'bg-blue-500'
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{activity.action}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              por {activity.user}
                            </p>
                          </div>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {activity.time}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CollapsibleSection>

        {/* ===================== DISCIPULADO ===================== */}
        {canSeeDiscipleship && installedModules.includes('discipleship') && (
          <CollapsibleSection
            id="discipleship"
            title="📊 Discipulado"
            icon={<Users className="h-4 w-4" />}
            isOpen={openSections.discipleship || false}
            onToggle={() => toggleSection('discipleship')}
          >
            <DiscipleshipAnalyticsSection />
          </CollapsibleSection>
        )}

        {/* ===================== REPORTES ===================== */}
        {canSeeReports && (
          <CollapsibleSection
            id="reports"
            title="📋 Reportes"
            icon={<Calendar className="h-4 w-4" />}
            isOpen={openSections.reports || false}
            onToggle={() => toggleSection('reports')}
          >
            <Card className="border-0 bg-[var(--glass-background)] backdrop-blur-lg">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">Sección de reportes en desarrollo...</p>
              </CardContent>
            </Card>
          </CollapsibleSection>
        )}
      </div>

      {/* Modal de audit log */}
      <AuditLogModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        auditLog={selectedAuditLog}
      />
    </div>
  );
};

export default DashboardHome;
