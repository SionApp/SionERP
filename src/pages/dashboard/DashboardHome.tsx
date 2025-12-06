import { AuditLogModal } from '@/components/AuditLogModal';
import { DiscipleshipAnalyticsSection } from '@/components/dashboard/DiscipleshipAnalyticsSection';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { RecentActivity } from '@/services/dashboard.service';
import { AuditLog } from '@/types/audit.types';
import {
  Activity,
  Calendar,
  Shield,
  Target,
  UserPlus,
  Users
} from 'lucide-react';
import { useState } from 'react';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer
} from 'recharts';

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
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-accent to-primary p-8 shadow-[var(--shadow-primary)] animate-fade-in">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/30 to-primary/20"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2 text-foreground drop-shadow-sm">
                  Bienvenido de vuelta,{' '}
                  {user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Admin'}
                </h1>
                <p className="text-foreground/80 text-lg font-medium">
                  Sistema de Gestión Sion - Panel de Control
                </p>
              </div>
              <div className="hidden md:flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm text-foreground/70 font-medium">Último acceso</p>
                  <p className="font-semibold text-foreground">{lastLogin}</p>
                </div>
                <div className="w-16 h-16 rounded-full bg-primary/20 backdrop-blur-sm flex items-center justify-center border border-primary/30">
                  <Activity className="h-8 w-8 text-primary" />
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

          {/* Recent Activity - Solo para pastor y staff */}
          {currentUserRole && ['pastor', 'staff'].includes(currentUserRole) && (
            <Card className="border-0 bg-[var(--glass-background)] backdrop-blur-lg shadow-[var(--shadow-glass)]">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Actividades Recientes del Sistema
                </CardTitle>
                <CardDescription>
                  Registro de audit logs - Solo visible para Pastor y Staff
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

        {/* Sección de Analytics de Discipulado - Solo para Pastor */}
        {currentUserRole === 'pastor' && (
          <DiscipleshipAnalyticsSection discipleshipStats={discipleshipStats} />
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
