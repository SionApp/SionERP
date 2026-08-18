import {
  DiscipleshipAnalyticsService,
  type GroupPerformance,
} from '@/services/discipleship-analytics.service';
import type { DiscipleshipAlert } from '@/types/discipleship.types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MobileSectionHeader } from '@/components/mobile/MobileSectionHeader';
import { useMobileMode } from '@/hooks/useMobileMode';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Flame,
  PartyPopper,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { CHART_COLORS } from '@/lib/chart-colors';
import { useEffect, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

// ─── Types ───────────────────────────────────────────────────────────────────

interface StatsShape {
  total_groups?: number;
  total_members?: number;
  active_leaders?: number;
  multiplications?: number;
  average_attendance?: number;
  spiritual_health?: number;
  pending_alerts?: number;
}

interface ZoneStat {
  zoneName?: string;
  zone_name?: string;
  totalGroups?: number;
  total_groups?: number;
  totalMembers?: number;
  total_members?: number;
  avgAttendance?: number;
  avg_attendance?: number;
}

interface WeeklyTrendItem {
  visitantes?: number;
  visitors?: number;
  miembros?: number;
  asistencia?: number;
  conversiones?: number;
}

interface MinistryHealthTabProps {
  stats: StatsShape;
  zoneStats: ZoneStat[];
  weeklyTrends: WeeklyTrendItem[];
  alerts: DiscipleshipAlert[];
}

// ─── Health helpers ───────────────────────────────────────────────────────────

interface HealthConfig {
  label: string;
  hex: string;
  tailwindText: string;
  tailwindBg: string;
}

function getHealthConfig(score: number): HealthConfig {
  if (score >= 7.5)
    return {
      label: 'Excelente',
      hex: CHART_COLORS.success,
      tailwindText: 'text-emerald-600 dark:text-emerald-400',
      tailwindBg: 'bg-emerald-50 dark:bg-emerald-950',
    };
  if (score >= 5)
    return {
      label: 'Saludable',
      // Tono intencionalmente distinto de CHART_COLORS.success: es el segundo
      // escalón de una escala de 4 (Excelente > Saludable > Atención > Crítico),
      // no un duplicado accidental.
      hex: '#22c55e',
      tailwindText: 'text-green-600 dark:text-green-400',
      tailwindBg: 'bg-green-50 dark:bg-green-950',
    };
  if (score >= 2.5)
    return {
      label: 'En Atención',
      hex: CHART_COLORS.warning,
      tailwindText: 'text-amber-600 dark:text-amber-400',
      tailwindBg: 'bg-amber-50 dark:bg-amber-950',
    };
  return {
    label: 'Crítico',
    hex: CHART_COLORS.danger,
    tailwindText: 'text-red-600 dark:text-red-400',
    tailwindBg: 'bg-red-50 dark:bg-red-950',
  };
}

function getAttendanceConfig(pct: number): HealthConfig {
  if (pct >= 75)
    return {
      label: 'Excelente',
      hex: CHART_COLORS.success,
      tailwindText: 'text-emerald-600',
      tailwindBg: 'bg-emerald-50 dark:bg-emerald-950',
    };
  if (pct >= 50)
    return {
      label: 'Saludable',
      hex: '#22c55e', // segundo escalón intencional — ver getHealthConfig arriba
      tailwindText: 'text-green-600',
      tailwindBg: 'bg-green-50 dark:bg-green-950',
    };
  if (pct >= 25)
    return {
      label: 'Atención',
      hex: CHART_COLORS.warning,
      tailwindText: 'text-amber-600',
      tailwindBg: 'bg-amber-50 dark:bg-amber-950',
    };
  return {
    label: 'Crítico',
    hex: CHART_COLORS.danger,
    tailwindText: 'text-red-600',
    tailwindBg: 'bg-red-50 dark:bg-red-950',
  };
}

// Umbrales alineados con getHealthConfig (misma escala /10 en ambos casos desde
// que el backend unificó el reescalado de "salud espiritual" por grupo).
function getGroupTempDot(temp: number): string {
  if (temp >= 7.5) return 'bg-emerald-500';
  if (temp >= 5) return 'bg-green-500';
  if (temp >= 2.5) return 'bg-amber-500';
  return 'bg-red-500';
}

function getGroupTempLabel(temp: number): string {
  if (temp >= 7.5) return 'Excelente';
  if (temp >= 5) return 'Bueno';
  if (temp >= 2.5) return 'Regular';
  return 'Bajo';
}

function getAlertIcon(alert: DiscipleshipAlert) {
  const positive = [
    'consistency_milestone',
    'evangelism_champion',
    'solid_group',
    'multiplication_ready',
  ];
  const isPositive = positive.includes(alert.alert_type);
  if (isPositive) return <PartyPopper className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />;
  if (alert.priority >= 3)
    return <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />;
  return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ZoneCard({ zone }: { zone: ZoneStat }) {
  const name = zone.zoneName || zone.zone_name || 'Sin nombre';
  const attendance = zone.avgAttendance ?? zone.avg_attendance ?? 0;
  const groups = zone.totalGroups ?? zone.total_groups ?? 0;
  const members = zone.totalMembers ?? zone.total_members ?? 0;
  const cfg = getAttendanceConfig(attendance);
  const pct = Math.min(100, attendance);

  const donut = [
    { value: pct, fill: cfg.hex },
    { value: Math.max(0, 100 - pct), fill: 'hsl(var(--muted))' },
  ];

  return (
    <div className={cn('rounded-xl border p-4 space-y-3', cfg.tailwindBg)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold truncate">{name}</span>
        <span className={cn('text-xs font-medium', cfg.tailwindText)}>{cfg.label}</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative w-16 h-16 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={donut}
                innerRadius="65%"
                outerRadius="90%"
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                strokeWidth={0}
              >
                {donut.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold" style={{ color: cfg.hex }}>
              {Math.round(pct)}%
            </span>
          </div>
        </div>

        <div className="space-y-1 min-w-0">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{groups}</span> grupos
          </p>
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{members}</span> miembros
          </p>
        </div>
      </div>
    </div>
  );
}

function GroupRow({ group }: { group: GroupPerformance }) {
  const temp = group.spiritualTemp || 0;
  const dot = getGroupTempDot(temp);
  const label = getGroupTempLabel(temp);
  const tempPct = Math.min(100, (temp / 10) * 100);

  const daysSinceReport = group.lastReportDate
    ? Math.floor((Date.now() - new Date(group.lastReportDate).getTime()) / 86_400_000)
    : null;

  return (
    <div className="flex items-center gap-3 py-2.5 border-b last:border-0">
      <span className={cn('size-2 rounded-full shrink-0', dot)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{group.groupName}</span>
          <span className="text-xs text-muted-foreground hidden sm:inline truncate">
            — {group.leaderName}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${tempPct}%`,
                backgroundColor: dot.replace('bg-', '').includes('emerald')
                  ? CHART_COLORS.success
                  : dot.includes('green')
                    ? '#22c55e' // segundo escalón intencional — ver getHealthConfig arriba
                    : dot.includes('amber')
                      ? CHART_COLORS.warning
                      : CHART_COLORS.danger,
              }}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {temp.toFixed(1)}/10 · {label}
          </span>
        </div>
      </div>
      <div className="text-right shrink-0 hidden sm:block">
        <p className="text-xs font-medium">{Math.round(group.avgAttendance)} asist.</p>
        <p className="text-xs text-muted-foreground">
          {daysSinceReport !== null ? `Hace ${daysSinceReport}d` : 'Sin reporte'}
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MinistryHealthTab({
  stats,
  zoneStats,
  weeklyTrends: _weeklyTrends,
  alerts,
}: MinistryHealthTabProps) {
  const isMobileApp = useMobileMode();
  const [groupPerformance, setGroupPerformance] = useState<GroupPerformance[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [groupPage, setGroupPage] = useState(0);
  const GROUP_PAGE_SIZE = 10;

  useEffect(() => {
    DiscipleshipAnalyticsService.getGroupPerformanceList()
      .then(setGroupPerformance)
      .finally(() => setLoadingGroups(false));
  }, []);

  // ─── Derived values ───────────────────────────────────────────────────────

  const healthScore = stats.spiritual_health || 0;
  const healthPct = Math.min(100, (healthScore / 10) * 100);
  const healthCfg = getHealthConfig(healthScore);

  const donutData = [
    { value: healthPct, fill: healthCfg.hex },
    { value: Math.max(0, 100 - healthPct), fill: 'hsl(var(--muted))' },
  ];

  const avgAttendance = Math.round(stats.average_attendance || 0);
  const totalMembers = stats.total_members || 0;
  const activeLeaders = stats.active_leaders || 0;
  const multiplications = stats.multiplications || 0;

  // Funnel: derived progressively smaller numbers
  const funnelItems = [
    { label: 'Total en sistema', value: totalMembers, hex: '#6366f1' },
    {
      label: 'Asistencia regular',
      value: Math.round((avgAttendance / 100) * totalMembers),
      hex: CHART_COLORS.info,
    },
    { label: 'Líderes activos', value: activeLeaders, hex: CHART_COLORS.success },
    { label: 'Multiplicaciones', value: multiplications, hex: CHART_COLORS.warning },
  ];
  const funnelMax = funnelItems[0].value || 1;

  // Alerts
  const activeAlerts = alerts.filter(a => !a.resolved && a.action_required).slice(0, 6);
  const positiveAlerts = alerts
    .filter(
      a =>
        [
          'consistency_milestone',
          'evangelism_champion',
          'solid_group',
          'multiplication_ready',
        ].includes(a.alert_type) && !a.resolved
    )
    .slice(0, 3);

  // Group performance sorted by spiritual temp desc
  const sortedGroups = [...groupPerformance].sort(
    (a, b) => (b.spiritualTemp || 0) - (a.spiritualTemp || 0)
  );
  const totalGroupPages = Math.ceil(sortedGroups.length / GROUP_PAGE_SIZE);
  const pagedGroups = sortedGroups.slice(
    groupPage * GROUP_PAGE_SIZE,
    (groupPage + 1) * GROUP_PAGE_SIZE
  );

  // ── Bloques de contenido compartidos entre web y mobile ──

  const healthRingContent = (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-48 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={donutData}
              innerRadius="68%"
              outerRadius="88%"
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              strokeWidth={0}
            >
              {donutData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold" style={{ color: healthCfg.hex }}>
            {healthScore.toFixed(1)}
          </span>
          <span className="text-xs text-muted-foreground">de 10</span>
          <span className={cn('text-sm font-semibold mt-1', healthCfg.tailwindText)}>
            {healthCfg.label}
          </span>
        </div>
      </div>

      {/* 4 sub-indicators */}
      <div className="grid grid-cols-2 gap-2 w-full">
        {[
          {
            icon: <TrendingUp className="h-3.5 w-3.5" />,
            label: 'Asistencia',
            value: `${avgAttendance}%`,
            color: getHealthConfig(avgAttendance / 10),
          },
          {
            icon: <Users className="h-3.5 w-3.5" />,
            label: 'Líderes',
            value: String(activeLeaders),
            color: {
              tailwindBg: 'bg-blue-50 dark:bg-blue-950',
              tailwindText: 'text-blue-600',
              hex: '#3b82f6',
              label: '',
            },
          },
          {
            icon: <Zap className="h-3.5 w-3.5" />,
            label: 'Multiplicaciones',
            value: String(multiplications),
            color: {
              tailwindBg: 'bg-purple-50 dark:bg-purple-950',
              tailwindText: 'text-purple-600',
              hex: '#7c3aed',
              label: '',
            },
          },
          {
            icon: <TrendingUp className="h-3.5 w-3.5" />,
            label: 'Zonas activas',
            value: String(zoneStats.length),
            color: {
              tailwindBg: 'bg-sky-50 dark:bg-sky-950',
              tailwindText: 'text-sky-600',
              hex: '#0284c7',
              label: '',
            },
          },
        ].map(item => (
          <div
            key={item.label}
            className={cn('rounded-lg px-3 py-2 flex items-center gap-2', item.color.tailwindBg)}
          >
            <span className={cn(item.color.tailwindText)}>{item.icon}</span>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">{item.label}</p>
              <p className={cn('text-base font-bold', item.color.tailwindText)}>{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const alertsSummaryContent =
    activeAlerts.length === 0 && positiveAlerts.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <PartyPopper className="h-10 w-10 text-green-500 mb-2" />
        <p className="text-sm text-muted-foreground">¡Todo en orden!</p>
      </div>
    ) : (
      <div className="space-y-1">
        {activeAlerts.map(alert => (
          <div key={alert.id} className="flex items-start gap-2 p-2.5 rounded-lg border bg-card">
            {getAlertIcon(alert)}
            <div className="min-w-0">
              <p className="text-sm font-medium leading-snug truncate">{alert.title}</p>
              <p className="text-xs text-muted-foreground line-clamp-1">{alert.message}</p>
              {alert.zone_name && (
                <p className="text-xs text-muted-foreground mt-0.5">📍 {alert.zone_name}</p>
              )}
            </div>
          </div>
        ))}
        {positiveAlerts.map(alert => (
          <div
            key={alert.id}
            className="flex items-start gap-2 p-2.5 rounded-lg border bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800"
          >
            {getAlertIcon(alert)}
            <div className="min-w-0">
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 leading-snug truncate">
                {alert.title}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 line-clamp-1">
                {alert.message}
              </p>
            </div>
          </div>
        ))}
      </div>
    );

  const zonesGrid = (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {zoneStats.map((zone, i) => (
        <ZoneCard key={i} zone={zone} />
      ))}
    </div>
  );

  const funnelContent = (
    <div className="space-y-3">
      {funnelItems.map((item, i) => {
        const pct = funnelMax > 0 ? Math.max((item.value / funnelMax) * 100, 4) : 4;
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="w-36 text-sm text-muted-foreground text-right shrink-0 hidden sm:inline">
              {item.label}
            </span>
            <span className="text-xs text-muted-foreground sm:hidden shrink-0 w-24 text-right">
              {item.label}
            </span>
            <div className="flex-1 h-9 bg-muted rounded-lg overflow-hidden">
              <div
                className="h-full rounded-lg flex items-center px-3 transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: item.hex }}
              >
                <span className="text-white text-sm font-bold whitespace-nowrap">
                  {item.value.toLocaleString()}
                </span>
              </div>
            </div>
            {i < funnelItems.length - 1 && (
              <span className="text-xs text-muted-foreground shrink-0 hidden md:block">
                {funnelItems[i + 1].value > 0 && item.value > 0
                  ? `${Math.round((funnelItems[i + 1].value / item.value) * 100)}%`
                  : '—'}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );

  const groupPerformanceContent = loadingGroups ? (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex items-center gap-3 py-2">
          <Skeleton className="size-2 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20 hidden sm:block" />
        </div>
      ))}
    </div>
  ) : sortedGroups.length === 0 ? (
    <p className="text-center text-muted-foreground py-8 text-sm">
      No hay datos de grupos disponibles
    </p>
  ) : (
    <div className="space-y-1">
      {pagedGroups.map(group => (
        <GroupRow key={group.groupId} group={group} />
      ))}
      {totalGroupPages > 1 && (
        <div className="flex items-center justify-between pt-3 border-t mt-2">
          <span className="text-xs text-muted-foreground">
            {groupPage * GROUP_PAGE_SIZE + 1}–
            {Math.min((groupPage + 1) * GROUP_PAGE_SIZE, sortedGroups.length)} de{' '}
            {sortedGroups.length} grupos
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={groupPage === 0}
              onClick={() => setGroupPage(p => p - 1)}
              className="p-1 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs px-2">
              {groupPage + 1} / {totalGroupPages}
            </span>
            <button
              disabled={groupPage >= totalGroupPages - 1}
              onClick={() => setGroupPage(p => p + 1)}
              className="p-1 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ── Modo mobile exclusivo: secciones full-width sin chrome de Cards ──
  if (isMobileApp) {
    return (
      <div className="pb-4">
        <MobileSectionHeader title="Temperatura general" className="pt-2" />
        <div className="px-4">{healthRingContent}</div>

        <MobileSectionHeader
          title={
            activeAlerts.length > 0
              ? `Situaciones activas (${activeAlerts.length})`
              : 'Situaciones activas'
          }
        />
        <div className="px-4">{alertsSummaryContent}</div>

        {zoneStats.length > 0 && (
          <>
            <MobileSectionHeader title="Temperatura por zona" />
            <div className="px-4">{zonesGrid}</div>
          </>
        )}

        <MobileSectionHeader title="Embudo de discipulado" />
        <div className="px-4">{funnelContent}</div>

        <MobileSectionHeader title="Rendimiento por grupo" />
        <div className="px-4">{groupPerformanceContent}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Row 1: Health Ring + KPIs ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Health Ring */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5" style={{ color: healthCfg.hex }} />
              Temperatura General
            </CardTitle>
            <CardDescription>Salud espiritual promedio del ministerio</CardDescription>
          </CardHeader>
          <CardContent>{healthRingContent}</CardContent>
        </Card>

        {/* Alerts summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Situaciones Activas
            </CardTitle>
            <CardDescription>
              {activeAlerts.length === 0
                ? 'Sin alertas pendientes'
                : `${activeAlerts.length} requieren atención`}
            </CardDescription>
          </CardHeader>
          <CardContent>{alertsSummaryContent}</CardContent>
        </Card>
      </div>

      {/* ── Row 2: Zone Temperature ── */}
      {zoneStats.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Temperatura por Zona</CardTitle>
            <CardDescription>Asistencia promedio como indicador de salud zonal</CardDescription>
          </CardHeader>
          <CardContent>{zonesGrid}</CardContent>
        </Card>
      )}

      {/* ── Row 3: Funnel ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Embudo de Discipulado</CardTitle>
          <CardDescription>Del registro a la multiplicación</CardDescription>
        </CardHeader>
        <CardContent>{funnelContent}</CardContent>
      </Card>

      {/* ── Row 4: Group Performance ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Rendimiento por Grupo</CardTitle>
          <CardDescription>Ordenado por temperatura espiritual (últimas 4 semanas)</CardDescription>
        </CardHeader>
        <CardContent>{groupPerformanceContent}</CardContent>
      </Card>
    </div>
  );
}
