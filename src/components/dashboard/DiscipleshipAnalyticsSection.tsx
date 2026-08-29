import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Progress } from '@/components/ui/progress';
import { useDiscipleshipAnalytics } from '@/hooks/useDiscipleshipAnalytics';
import { CHART_COLORS } from '@/lib/chart-colors';
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
import { useNavigate } from 'react-router-dom';
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
  // Ya no necesita props ya que usa el hook directamente
  discipleshipStats?: DiscipleshipDashboardStats;
}

/**
 * Formatea una fecha ISO a una etiqueta corta para mobile.
 * Ej: "2026-03-23T00:00:00Z" → "23 Mar"
 */
const formatWeekLabel = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = date.getDate();
    const months = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];
    return `${day} ${months[date.getMonth()]}`;
  } catch {
    return dateStr;
  }
};

/**
 * Redondea un número a 1 decimal.
 * Ej: 43.05555 → 43.1
 */
const formatPercent = (value: number): string => {
  return Number(value.toFixed(1)).toString();
};

export const DiscipleshipAnalyticsSection = ({
  discipleshipStats: _discipleshipStats,
}: DiscipleshipAnalyticsSectionProps) => {
  const { analytics, zoneStats, groupPerformance, alerts, multiplications, weeklyTrends, loading } =
    useDiscipleshipAnalytics();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
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

  // Datos para el radar chart de salud espiritual por zona — el eje va 0-10
  // (PolarRadiusAxis domain={[0, 10]}), así que healthIndex y avgAttendance
  // (ambos 0-100) se normalizan /10. Antes "asistencia" usaba /20*10 (=/2),
  // que para cualquier asistencia > 20% ya se salía del eje y quedaba recortada.
  const spiritualHealthRadarData = zoneStats.map(zone => ({
    zone: zone.zoneName.replace('Zona ', ''),
    salud: (zone.healthIndex || 0) / 10,
    asistencia: (zone.avgAttendance || 0) / 10,
  }));

  // Formatear tendencias semanales con fechas legibles
  const formattedWeeklyTrends = weeklyTrends.map(trend => ({
    ...trend,
    weekLabel: formatWeekLabel(trend.week),
  }));

  const redirectTo = () => {
    navigate('/dashboard/discipleship');
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header con resumen ejecutivo */}
      <div className="text-center space-y-1 px-2">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">Analytics de Discipulado</h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Trazabilidad completa del ministerio de células
        </p>
      </div>

      {/* Cards de métricas principales - 2 cols en mobile, 4 en desktop */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: 'Grupos Activos',
            value: analytics.totalGroups,
            change: analytics.growthRate,
            icon: Users,
            color: 'from-blue-500 to-cyan-500',
            description: 'Células activas',
          },
          {
            title: 'Miembros',
            value: analytics.totalMembers,
            change: analytics.growthRate,
            icon: UserCheck,
            color: 'from-emerald-500 to-green-500',
            description: 'En discipulado',
          },
          {
            title: 'Asistencia',
            value: `${Math.round(analytics.averageAttendance)}%`,
            change: analytics.growthRate,
            icon: Activity,
            color: 'from-purple-500 to-pink-500',
            description: 'Promedio semanal',
          },
          {
            title: 'Salud Espiritual',
            value: `${analytics.spiritualHealth.toFixed(1)}/10`,
            change: analytics.spiritualHealth,
            icon: Heart,
            color: 'from-orange-500 to-red-500',
            description: 'Del ministerio',
          },
        ].map((stat, index) => (
          <Card
            key={index}
            className="relative overflow-hidden border bg-card shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 relative z-10 p-3 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground leading-tight">
                {stat.title}
              </CardTitle>
              <div
                className={`p-1.5 md:p-2 rounded-lg bg-gradient-to-br ${stat.color} shadow-lg flex-shrink-0`}
              >
                <stat.icon className="h-3 w-3 md:h-4 md:w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10 p-3 sm:p-4 lg:p-6 pt-0">
              <div className="text-xl md:text-3xl font-bold text-foreground">{stat.value}</div>
              <div className="flex items-center gap-1 mt-1 md:mt-2 flex-wrap">
                <div className="flex items-center gap-0.5">
                  {getTrendIcon(stat.change)}
                  <span
                    className={`text-[10px] md:text-xs font-medium ${getTrendColor(stat.change)}`}
                  >
                    {stat.change > 0 ? '+' : ''}
                    {formatPercent(stat.change)}%
                  </span>
                </div>
                <p className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">
                  {stat.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Grid principal de gráficas - Mobile: 1 col, Desktop: 2 cols */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        {/* Tendencias semanales */}
        <Card className="rounded-md3-xl border-outline-variant bg-surface-white shadow-none">
          <CardHeader className="p-3 sm:p-4 lg:p-6 pb-2">
            <CardTitle className="text-base md:text-xl font-bold flex items-center gap-2">
              <TrendingUp className="h-4 md:h-5 w-4 md:w-5 text-primary flex-shrink-0" />
              Tendencias Semanales
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Asistencia y crecimiento últimas 12 semanas
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
            <ChartContainer
              config={{
                attendance: { label: 'Asistencia', color: '#8b5cf6' },
                visitors: { label: 'Visitantes', color: '#06b6d4' },
                conversions: { label: 'Conversiones', color: CHART_COLORS.success },
              }}
              className="h-[180px] sm:h-[200px] lg:h-[300px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={formattedWeeklyTrends}
                  margin={{ top: 10, right: 5, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gradAttendance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradVisitors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradConversions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    strokeOpacity={0.4}
                  />
                  <XAxis
                    dataKey="weekLabel"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={9}
                    tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                    angle={-35}
                    textAnchor="end"
                    height={40}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={9}
                    tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    width={35}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="attendance"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fill="url(#gradAttendance)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#8b5cf6', strokeWidth: 0 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="visitors"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fill="url(#gradVisitors)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#06b6d4', strokeWidth: 0 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="conversions"
                    stroke={CHART_COLORS.success}
                    strokeWidth={2}
                    fill="url(#gradConversions)"
                    dot={false}
                    activeDot={{ r: 4, fill: CHART_COLORS.success, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Radar de salud espiritual por zona */}
        <Card className="rounded-md3-xl border-outline-variant bg-surface-white shadow-none">
          <CardHeader className="p-3 sm:p-4 lg:p-6 pb-2">
            <CardTitle className="text-base md:text-xl font-bold flex items-center gap-2">
              <Heart className="h-4 md:h-5 w-4 md:w-5 text-red-500 flex-shrink-0" />
              Salud Espiritual por Zona
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Temperatura espiritual y crecimiento
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
            <ChartContainer
              config={{
                salud: { label: 'Salud Espiritual', color: '#8b5cf6' },
                asistencia: { label: 'Asistencia', color: '#06b6d4' },
              }}
              className="h-[180px] sm:h-[220px] lg:h-[300px] w-full mx-auto"
            >
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={spiritualHealthRadarData} cx="50%" cy="50%" outerRadius="65%">
                  <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <PolarAngleAxis
                    dataKey="zone"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9, fontWeight: 500 }}
                  />
                  <PolarRadiusAxis
                    angle={0}
                    domain={[0, 10]}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 8 }}
                    tickCount={4}
                    axisLine={false}
                  />
                  <Radar
                    name="Salud Espiritual"
                    dataKey="salud"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fill="#8b5cf6"
                    fillOpacity={0.2}
                    dot={{ fill: '#8b5cf6', r: 3, strokeWidth: 0 }}
                  />
                  <Radar
                    name="Asistencia"
                    dataKey="asistencia"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fill="#06b6d4"
                    fillOpacity={0.15}
                    dot={{ fill: '#06b6d4', r: 3, strokeWidth: 0 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend
                    wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
                    iconType="circle"
                    iconSize={8}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Performance por zona - Bar Chart */}
        <Card className="rounded-md3-xl border-outline-variant bg-surface-white shadow-none">
          <CardHeader className="p-3 sm:p-4 lg:p-6 pb-2">
            <CardTitle className="text-base md:text-xl font-bold flex items-center gap-2">
              <BarChart3 className="h-4 md:h-5 w-4 md:w-5 text-blue-500 flex-shrink-0" />
              Performance por Zona
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Comparativa de grupos, miembros y crecimiento
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
            <ChartContainer
              config={{
                totalGroups: { label: 'Grupos', color: '#8b5cf6' },
                totalMembers: { label: 'Miembros', color: '#06b6d4' },
              }}
              className="h-[180px] sm:h-[200px] lg:h-[300px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={zoneStats}
                  layout="vertical"
                  margin={{ top: 5, right: 16, left: 0, bottom: 0 }}
                  barCategoryGap="30%"
                  barGap={4}
                >
                  <defs>
                    <linearGradient id="gradGroups" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#7c3aed" />
                      <stop offset="100%" stopColor="#a78bfa" />
                    </linearGradient>
                    <linearGradient id="gradMembers" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#0891b2" />
                      <stop offset="100%" stopColor="#67e8f9" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    strokeOpacity={0.4}
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={9}
                    tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="zoneName"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={9}
                    tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    width={70}
                    tickFormatter={(value: string) =>
                      value.length > 10 ? value.substring(0, 10) + '…' : value
                    }
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                  />
                  <Bar
                    dataKey="totalGroups"
                    fill="url(#gradGroups)"
                    name="Grupos"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={14}
                  />
                  <Bar
                    dataKey="totalMembers"
                    fill="url(#gradMembers)"
                    name="Miembros"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={14}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }}
                    iconType="circle"
                    iconSize={8}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Alertas críticas y tracking de multiplicación */}
        <Card className="rounded-md3-xl border-outline-variant bg-surface-white shadow-none">
          <CardHeader className="p-3 sm:p-4 lg:p-6 pb-2">
            <CardTitle className="text-base md:text-xl font-bold flex items-center gap-2">
              <AlertTriangle className="h-4 md:h-5 w-4 md:w-5 text-orange-500 flex-shrink-0" />
              Alertas y Multiplicaciones
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Situaciones que requieren atención
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0 space-y-4">
            {/* Alertas críticas */}
            <div className="space-y-2">
              <h4 className="font-semibold text-xs md:text-sm text-muted-foreground text-center md:text-left">
                Alertas Activas
              </h4>
              {alerts.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Sin alertas activas
                </p>
              )}
              {alerts.slice(0, 3).map((alert, alertIndex) => (
                <div
                  key={
                    alert.id && alert.id.trim()
                      ? alert.id
                      : `alert-${alertIndex}-${alert.title || 'unknown'}`
                  }
                  className="flex items-start gap-2 md:gap-3 p-2 md:p-3 rounded-lg bg-accent/20 border border-accent/30"
                >
                  <div
                    className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      alert.type === 'critical'
                        ? 'bg-red-500'
                        : alert.type === 'warning'
                          ? 'bg-orange-500'
                          : 'bg-blue-500'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm font-medium leading-tight">{alert.title}</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground line-clamp-2">
                      {alert.message}
                    </p>
                    {alert.groupName && (
                      <Badge variant="outline" className="mt-1 text-[10px] md:text-xs">
                        {alert.groupName}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Multiplicaciones recientes */}
            <div className="space-y-2">
              <h4 className="font-semibold text-xs md:text-sm text-muted-foreground text-center md:text-left">
                Multiplicaciones Recientes
              </h4>
              {multiplications.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Sin multiplicaciones registradas
                </p>
              )}
              {multiplications.slice(0, 3).map((mult, index) => (
                <div
                  key={
                    mult.id && mult.id.trim()
                      ? mult.id
                      : `mult-${index}-${mult.parentGroupName || 'unknown'}-${mult.multiplicationDate || index}`
                  }
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 md:p-3 rounded-lg bg-green-500/10 border border-green-500/20"
                >
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm font-medium truncate">
                      {mult.parentGroupName}
                    </p>
                    <p className="text-[10px] md:text-xs text-muted-foreground truncate">
                      {mult.newGroupName || 'En planificación'} • {mult.initialMembers} miembros
                    </p>
                  </div>
                  <Badge
                    variant={mult.status === 'successful' ? 'default' : 'secondary'}
                    className="text-[10px] md:text-xs self-start sm:self-center flex-shrink-0"
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

            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs md:text-sm"
              onClick={() => redirectTo()}
            >
              <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 mr-2" />
              Ver Panel Completo de Discipulado
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de performance de líderes - Solo top 6 */}
      <Card className="rounded-md3-xl border-outline-variant bg-surface-white shadow-none">
        <CardHeader className="p-3 sm:p-4 lg:p-6 pb-2">
          <CardTitle className="text-base md:text-xl font-bold flex items-center gap-2">
            <Target className="h-4 md:h-5 w-4 md:w-5 text-purple-500 flex-shrink-0" />
            Top Líderes por Performance
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Rendimiento de los mejores líderes de célula
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
          <div className="space-y-2 md:space-y-3">
            {groupPerformance.slice(0, 6).map((leader, index) => {
              const uniqueKey =
                leader.groupId && leader.groupId.trim()
                  ? leader.groupId
                  : `leader-${index}-${leader.leaderName || 'unknown'}-${leader.groupName || 'nogroup'}`;
              return (
                <div
                  key={uniqueKey}
                  className="flex items-start md:items-center gap-2 md:gap-4 p-2.5 md:p-4 rounded-xl bg-gradient-to-r from-accent/30 to-transparent border border-border/50"
                >
                  {/* Ranking number */}
                  <div className="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-full bg-primary text-primary-foreground text-xs md:text-sm font-bold flex-shrink-0">
                    {index + 1}
                  </div>

                  {/* Leader info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs md:text-sm font-medium truncate max-w-[120px] md:max-w-none">
                        {leader.leaderName}
                      </p>
                      <Badge
                        variant="outline"
                        className="text-[10px] md:text-xs truncate max-w-[80px] md:max-w-none"
                      >
                        {leader.groupName}
                      </Badge>
                    </div>

                    {/* Stats - vertical stack on mobile, horizontal on desktop */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                      <div className="flex items-center gap-0.5">
                        <Users className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-[10px] md:text-xs text-muted-foreground whitespace-nowrap">
                          {leader.avgAttendance}%
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <Heart className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-[10px] md:text-xs text-muted-foreground whitespace-nowrap">
                          {leader.spiritualTemp}/10
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <TrendingUp className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span
                          className={`text-[10px] md:text-xs whitespace-nowrap ${getTrendColor(leader.growthRate)}`}
                        >
                          {leader.growthRate > 0 ? '+' : ''}
                          {formatPercent(leader.growthRate)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right side - progress indicator */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs md:text-sm font-medium">{leader.avgAttendance}%</div>
                    <Progress value={leader.avgAttendance} className="w-12 md:w-16 mt-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
