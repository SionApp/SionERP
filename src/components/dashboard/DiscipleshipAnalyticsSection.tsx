import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Progress } from '@/components/ui/progress';
import { useDiscipleshipAnalytics } from '@/hooks/useDiscipleshipAnalytics';
import type { DiscipleshipDashboardStats } from '@/services/dashboard.service';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  Heart,
  Minus,
  Target,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';

interface DiscipleshipAnalyticsSectionProps {
  discipleshipStats: DiscipleshipDashboardStats;
}

export const DiscipleshipAnalyticsSection = ({
  discipleshipStats,
}: DiscipleshipAnalyticsSectionProps) => {
  const { analytics, zoneStats, groupPerformance, alerts, multiplications, weeklyTrends, loading } =
    useDiscipleshipAnalytics();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array(4)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="h-32 bg-muted/20 rounded-lg animate-pulse" />
            ))}
        </div>
      </div>
    );
  }

  const getTrendIcon = (value: number) => {
    if (value > 0) return <ArrowUpRight className="h-4 w-4 text-green-500" />;
    if (value < 0) return <ArrowDownRight className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return 'text-green-500';
    if (value < 0) return 'text-red-500';
    return 'text-muted-foreground';
  };

  // Datos para el radar chart de salud espiritual por zona
  const spiritualHealthRadarData = zoneStats.map(zone => ({
    zone: zone.zoneName.replace('Zona ', ''),
    salud: zone.healthIndex || 8,
    asistencia: (zone.avgAttendance / 20) * 10,
    crecimiento: Math.max(0, zone.growthRate / 2),
  }));

  return (
    <div className="space-y-8">
      {/* Header con resumen ejecutivo */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Analytics de Discipulado
        </h2>
        <p className="text-muted-foreground">
          Trazabilidad completa del ministerio de células - Pastor David Martínez
        </p>
      </div>

      {/* Cards de métricas principales con efectos glassmorphism */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: 'Grupos Activos',
            value: discipleshipStats.totalGroups,
            change: analytics.growthRate,
            icon: Users,
            color: 'from-blue-500 to-cyan-500',
            description: 'Células en funcionamiento',
          },
          {
            title: 'Miembros Totales',
            value: discipleshipStats.totalMembers,
            change: discipleshipStats.monthlyGrowth,
            icon: UserCheck,
            color: 'from-emerald-500 to-green-500',
            description: 'Personas en discipulado',
          },
          {
            title: 'Asistencia Promedio',
            value: `${discipleshipStats.avgAttendance}%`,
            change: 5.2,
            icon: Activity,
            color: 'from-purple-500 to-pink-500',
            description: 'Consistencia semanal',
          },
          {
            title: 'Temperatura Espiritual',
            value: `${discipleshipStats.spiritualHealth}/10`,
            change: 0.8,
            icon: Heart,
            color: 'from-orange-500 to-red-500',
            description: 'Salud del ministerio',
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
                <div className="flex items-center space-x-1">
                  {getTrendIcon(stat.change)}
                  <span className={`text-xs font-medium ${getTrendColor(stat.change)}`}>
                    {stat.change > 0 ? '+' : ''}
                    {stat.change}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Grid principal de gráficas */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tendencias semanales */}
        <Card className="border-0 bg-[var(--glass-background)] backdrop-blur-lg shadow-[var(--shadow-glass)]">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Tendencias Semanales
            </CardTitle>
            <CardDescription>Asistencia y crecimiento en las últimas 12 semanas</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                attendance: { label: 'Asistencia', color: 'hsl(var(--primary))' },
                visitors: { label: 'Visitantes', color: 'hsl(220 70% 50%)' },
                conversions: { label: 'Conversiones', color: 'hsl(142 76% 36%)' },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="attendance"
                    stackId="1"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="visitors"
                    stackId="1"
                    stroke="hsl(220 70% 50%)"
                    fill="hsl(220 70% 50%)"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="conversions"
                    stackId="1"
                    stroke="hsl(142 76% 36%)"
                    fill="hsl(142 76% 36%)"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Radar de salud espiritual por zona */}
        <Card className="border-0 bg-[var(--glass-background)] backdrop-blur-lg shadow-[var(--shadow-glass)]">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Salud Espiritual por Zona
            </CardTitle>
            <CardDescription>Métricas de temperatura espiritual y crecimiento</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                salud: { label: 'Salud Espiritual', color: 'hsl(var(--primary))' },
                asistencia: { label: 'Asistencia', color: 'hsl(220 70% 50%)' },
                crecimiento: { label: 'Crecimiento', color: 'hsl(142 76% 36%)' },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={spiritualHealthRadarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis
                    dataKey="zone"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <PolarRadiusAxis
                    angle={0}
                    domain={[0, 10]}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  />
                  <Radar
                    name="Salud Espiritual"
                    dataKey="salud"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.3}
                  />
                  <Radar
                    name="Asistencia"
                    dataKey="asistencia"
                    stroke="hsl(220 70% 50%)"
                    fill="hsl(220 70% 50%)"
                    fillOpacity={0.3}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Performance por zona - Bar Chart */}
        <Card className="border-0 bg-[var(--glass-background)] backdrop-blur-lg shadow-[var(--shadow-glass)]">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Performance por Zona
            </CardTitle>
            <CardDescription>Comparativa de grupos, miembros y crecimiento</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                groups: { label: 'Grupos', color: 'hsl(var(--primary))' },
                members: { label: 'Miembros', color: 'hsl(220 70% 50%)' },
                growth: { label: 'Crecimiento %', color: 'hsl(142 76% 36%)' },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={zoneStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="zoneName" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="groups" fill="hsl(var(--primary))" />
                  <Bar dataKey="members" fill="hsl(220 70% 50%)" />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Alertas críticas y tracking de multiplicación */}
        <Card className="border-0 bg-[var(--glass-background)] backdrop-blur-lg shadow-[var(--shadow-glass)]">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Alertas y Multiplicaciones
            </CardTitle>
            <CardDescription>Situaciones que requieren atención y nuevos grupos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Alertas críticas */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground">Alertas Activas</h4>
              {alerts.slice(0, 3).map(alert => (
                <div
                  key={alert.id}
                  className="flex items-start space-x-3 p-3 rounded-lg bg-accent/20 border border-accent/30"
                >
                  <div
                    className={`w-2 h-2 rounded-full mt-2 ${
                      alert.type === 'critical'
                        ? 'bg-red-500'
                        : alert.type === 'warning'
                          ? 'bg-orange-500'
                          : 'bg-blue-500'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{alert.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{alert.message}</p>
                    {alert.groupName && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        {alert.groupName}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Multiplicaciones recientes */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground">
                Multiplicaciones Recientes
              </h4>
              {multiplications.slice(0, 3).map((mult, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20"
                >
                  <div>
                    <p className="text-sm font-medium">{mult.parentGroupName}</p>
                    <p className="text-xs text-muted-foreground">
                      {mult.newGroupName || 'En planificación'} • {mult.initialMembers} miembros
                    </p>
                  </div>
                  <Badge
                    variant={mult.status === 'successful' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {mult.status === 'successful'
                      ? '✅ Exitosa'
                      : mult.status === 'planned'
                        ? '📅 Planeada'
                        : '⚠️ En proceso'}
                  </Badge>
                </div>
              ))}
            </div>

            <Button variant="outline" size="sm" className="w-full">
              <Calendar className="h-4 w-4 mr-2" />
              Ver Panel Completo de Discipulado
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de performance de líderes - Solo top 10 */}
      <Card className="border-0 bg-[var(--glass-background)] backdrop-blur-lg shadow-[var(--shadow-glass)]">
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-500" />
            Top Líderes por Performance
          </CardTitle>
          <CardDescription>Rendimiento de los mejores líderes de célula</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {groupPerformance.slice(0, 6).map((leader, index) => (
              <div
                key={leader.groupId}
                className="flex items-center space-x-4 p-4 rounded-xl bg-gradient-to-r from-accent/30 to-transparent border border-border/50"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="font-medium truncate">{leader.leaderName}</p>
                    <Badge variant="outline" className="text-xs">
                      {leader.groupName}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-4 mt-1">
                    <div className="flex items-center space-x-1">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {leader.avgAttendance}% asistencia
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Heart className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {leader.spiritualTemp}/10 salud
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <TrendingUp className="h-3 w-3 text-muted-foreground" />
                      <span className={`text-xs ${getTrendColor(leader.growthRate)}`}>
                        {leader.growthRate > 0 ? '+' : ''}
                        {leader.growthRate}% crecimiento
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{leader.avgAttendance}%</div>
                  <div className="text-xs text-muted-foreground">asistencia</div>
                  <Progress value={leader.avgAttendance} className="w-16 mt-1" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
