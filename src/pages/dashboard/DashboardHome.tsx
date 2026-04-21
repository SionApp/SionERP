import { AuditLogModal } from '@/components/AuditLogModal';
import { DiscipleshipAnalyticsSection } from '@/components/dashboard/DiscipleshipAnalyticsSection';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { RecentActivity } from '@/services/dashboard.service';
import { AuditLog } from '@/types/audit.types';
import { Activity, Calendar, Shield, Target, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer } from 'recharts';

const DashboardHome = () => {
  const { user } = useAuth(); // Obtener usuario del contexto
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const {
    stats,
    discipleshipStats,
    roleDistribution,
    recentActivity,
    recentLogin,
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

  const lastLogin = user?.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleString('es-ES')
    : 'Nunca';

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 p-6 space-y-8">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl p-8 shadow-lg transition-transform hover:shadow-xl dark:shadow-none bg-gradient-to-r from-primary/90 via-blue-600/80 to-purple-600/80 dark:from-primary/20 dark:via-blue-900/40 dark:to-purple-900/30 border border-primary/20 dark:border-white/10 backdrop-blur-md animate-fade-in">
          {/* Subtle noise/pattern overlay for texture */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
          {/* Accent glow on the edges */}
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-white/10 dark:bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-4xl font-extrabold mb-2 text-white drop-shadow-md">
                  Bienvenido de vuelta,{' '}
                  {user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Admin'}
                </h1>
                <p className="text-white/80 text-sm sm:text-lg font-medium mt-1">
                  Sistema de Gestión Sion - Panel de Control
                </p>
              </div>
              <div className="hidden md:flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm text-white/70 font-medium">Último acceso</p>
                  <p className="font-semibold text-white">{lastLogin}</p>
                </div>
                <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                  <Activity className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards con Glass Morphism */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: 'Total Usuarios',
              value: stats.totalUsers,
              change: '+12%',
              icon: Users,
              color: 'from-blue-500 to-cyan-500',
              description: 'Usuarios registrados',
            },
            {
              title: 'Nuevos Registros',
              value: stats.newRegistrations,
              change: '+24%',
              icon: UserPlus,
              color: 'from-emerald-500 to-green-500',
              description: 'Últimos 7 días',
            },
            {
              title: 'Roles Activos',
              value: stats.activeRoles,
              change: '100%',
              icon: Shield,
              color: 'from-purple-500 to-pink-500',
              description: 'Tipos configurados',
            },
            {
              title: 'Sistema Online',
              value: `${stats.systemActivity}%`,
              change: '+2%',
              icon: Target,
              color: 'from-orange-500 to-red-500',
              description: 'Uptime del sistema',
            },
          ].map((stat, index) => (
            <Card
              key={index}
              className="relative overflow-hidden border-0 bg-[var(--glass-background)] backdrop-blur-lg shadow-[var(--shadow-glass)] hover:shadow-[var(--shadow-accent)] transition-all duration-300 hover:scale-105"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-10`}></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color} shadow-lg`}>
                  <stat.icon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <span className="text-xs font-medium text-green-500 bg-green-500/10 px-2 py-1 rounded-full">
                    {stat.change}
                  </span>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Role Distribution */}
          <Card className="border-0 bg-[var(--glass-background)] backdrop-blur-lg shadow-[var(--shadow-glass)]">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Distribución de Roles
              </CardTitle>
              <CardDescription>Usuarios por tipo de rol</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  admin: { label: 'Admin', color: 'hsl(var(--primary))' },
                  moderador: { label: 'Moderador', color: 'hsl(266 85% 68%)' },
                  usuario: { label: 'Usuario', color: 'hsl(295 85% 58%)' },
                }}
                className="h-[250px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={roleDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
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
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Actividades Recientes del Sistema
                </CardTitle>
                <CardDescription>
                  Registro de audit logs - Visible para Admin, Pastor y Staff
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-60 overflow-y-auto space-y-4 pr-2">
                  {recentActivity.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No hay actividades recientes registradas
                    </p>
                  ) : (
                    recentActivity.slice(0, 10).map((activity, index) => (
                      <div
                        key={activity.id || index}
                        className="flex items-center space-x-4 p-4 rounded-xl bg-gradient-to-r from-accent/50 to-transparent border border-border/50 hover:shadow-md transition-all duration-200 cursor-pointer hover:bg-accent/30"
                        onClick={() => handleActivityClick(activity)}
                      >
                        <div
                          className={`w-3 h-3 rounded-full ${
                            activity.type === 'success'
                              ? 'bg-green-500'
                              : activity.type === 'warning'
                                ? 'bg-orange-500'
                                : activity.type === 'error' || activity.type === 'danger'
                                  ? 'bg-red-500'
                                  : 'bg-blue-500'
                          } shadow-lg`}
                        ></div>
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

        {/* Sección de Analytics de Discipulado - Visible para Admin y Pastor Y si el módulo está instalado */}
        {['admin', 'pastor'].includes(currentUserRole || '') &&
          installedModules.includes('discipleship') && (
            <DiscipleshipAnalyticsSection />
          )}
      </div>

      {/* Modal de detalles de audit log */}
      <AuditLogModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        auditLog={selectedAuditLog}
      />
    </>
  );
};

export default DashboardHome;
