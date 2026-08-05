import { GoalsDashboard } from '@/pages/dashboard/GoalsDashboard';
import { MinistryHealthTab } from './MinistryHealthTab';
import { AlertDetailSheet } from './AlertDetailSheet';
import { ReportDetailSheet } from './ReportDetailSheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MobileSectionHeader } from '@/components/mobile/MobileSectionHeader';
import { MobileSegment } from '@/components/mobile/MobileSegment';
import { MobileStatTile } from '@/components/mobile/MobileStatTile';
import { useAuth } from '@/contexts/AuthContext';
import { useDiscipleshipData } from '@/hooks/useDiscipleshipData';
import { useMobileMode } from '@/hooks/useMobileMode';
import { DiscipleshipService } from '@/services/discipleship.service';
import type { DiscipleshipAlert, DiscipleshipReport } from '@/types/discipleship.types';
import {
  AlertTriangle,
  Building2,
  CheckCircle,
  Clock,
  Crown,
  Loader2,
  PartyPopper,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { CHART_COLORS } from '@/lib/chart-colors';
import React, { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';

interface DashboardStats {
  total_groups: number;
  total_members: number;
  active_leaders: number;
  multiplications: number;
  average_attendance: number;
  spiritual_health: number;
  pending_alerts: number;
  pending_reports: number;
}

interface Goal {
  id: string;
  description: string;
  target_value: number;
  current_value: number;
  progress_percentage: number;
  status: string;
  deadline: string;
}

interface PendingReport {
  id: string;
  reporter_name: string;
  report_type: string;
  period_end: string;
  submitted_at: string;
}

/**
 * Extrae un Date de un campo que puede ser:
 * - string ISO (time.Time de Go)
 * - objeto {Time: string, Valid: bool} (sql.NullTime de Go)
 * - null / undefined
 */
function parseGoNullTime(value: unknown): Date | null {
  if (!value) return null;
  if (typeof value === 'string') return new Date(value);
  if (
    typeof value === 'object' &&
    value !== null &&
    'Valid' in value &&
    'Time' in value &&
    (value as { Valid: boolean }).Valid
  ) {
    return new Date((value as { Time: string }).Time);
  }
  return null;
}

const PastoralDashboard: React.FC = React.memo(() => {
  const { user, currentUser } = useAuth();
  const isMobileApp = useMobileMode();
  const [selectedTab, setSelectedTab] = useState('overview');
  const [selectedAlert, setSelectedAlert] = useState<DiscipleshipAlert | null>(null);
  const [alertSheetOpen, setAlertSheetOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<DiscipleshipReport | null>(null);
  const [reportSheetOpen, setReportSheetOpen] = useState(false);

  // Usar hook compartido para evitar consultas duplicadas
  const { loading, stats, zoneStats, weeklyTrends, alerts, pendingReports, refetch } =
    useDiscipleshipData({ userId: user?.id, level: 5 });
  const handleApproveReport = async (reportId: string) => {
    try {
      await DiscipleshipService.approveReport(reportId);
      toast.success('Reporte aprobado');
      refetch();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error((errorMessage as string) || 'Error al aprobar el reporte');
    }
  };

  const handleRejectReport = async (reportId: string, feedback: string) => {
    try {
      await DiscipleshipService.rejectReport(reportId, feedback);
      toast.success('Reporte rechazado');
      refetch();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(errorMessage || 'Error al rechazar el reporte');
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await DiscipleshipService.resolveAlert(alertId);
      toast.success('Alerta resuelta');
      refetch();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error((errorMessage as string) || 'Error al resolver la alerta');
    }
  };

  const getAlertPriorityColor = (priority: number) => {
    switch (priority) {
      case 1:
        return 'destructive';
      case 2:
        return 'default';
      case 3:
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    if (isMobileApp) {
      return (
        <div className="px-4 pt-4 space-y-3">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-20 w-24 rounded-2xl shrink-0" />
            ))}
          </div>
          <Skeleton className="h-9 w-full rounded-full" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Cargando dashboard pastoral...</span>
      </div>
    );
  }

  // ── Contenido compartido entre web y mobile ──

  const growthChart =
    weeklyTrends.length > 0 ? (
      <div style={{ width: '100%', height: 280, minHeight: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={weeklyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="pgradAttendance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="pgradGroups" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.25} />
                <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="pgradConversions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.4} vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Area
              type="monotone"
              dataKey="miembros"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#pgradAttendance)"
              dot={false}
              activeDot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
              name="Asistencia"
            />
            <Area
              type="monotone"
              dataKey="grupos"
              stroke={CHART_COLORS.success}
              strokeWidth={2}
              fill="url(#pgradGroups)"
              dot={false}
              activeDot={{ r: 4, fill: CHART_COLORS.success, strokeWidth: 0 }}
              name="Grupos Activos"
            />
            <Area
              type="monotone"
              dataKey="conversiones"
              stroke="#f59e0b"
              strokeWidth={2}
              fill="url(#pgradConversions)"
              dot={false}
              activeDot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }}
              name="Conversiones"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    ) : (
      <p className="text-center text-muted-foreground py-8 md:py-12 text-sm">
        No hay datos de tendencias disponibles
      </p>
    );

  const zoneChart =
    zoneStats.length > 0 ? (
      <div style={{ width: '100%', height: 250, minHeight: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={zoneStats}
            margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
            barCategoryGap="35%"
          >
            <defs>
              <linearGradient id="pgradBar1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.7} />
              </linearGradient>
              <linearGradient id="pgradBar2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#16a34a" />
                <stop offset="100%" stopColor="#4ade80" stopOpacity={0.7} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              strokeOpacity={0.4}
              horizontal={true}
              vertical={false}
            />
            <XAxis
              dataKey="zoneName"
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: string) => v.replace('Zona ', 'Z')}
            />
            <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
            />
            <Bar
              dataKey="totalGroups"
              fill="url(#pgradBar1)"
              name="Grupos"
              radius={[4, 4, 0, 0]}
              maxBarSize={20}
            />
            <Bar
              dataKey="totalMembers"
              fill="url(#pgradBar2)"
              name="Miembros"
              radius={[4, 4, 0, 0]}
              maxBarSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    ) : (
      <p className="text-center text-muted-foreground py-8 text-sm">No hay datos de zonas</p>
    );

  const kpiGrid = (
    <div className="grid gap-3 md:gap-4 grid-cols-2">
      <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
        <div className="text-2xl font-bold text-green-600">
          {Math.round(stats.average_attendance || 0)}%
        </div>
        <div className="text-sm text-green-700 dark:text-green-300">Asistencia</div>
      </div>
      <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
        <div className="text-2xl font-bold text-blue-600">{stats.active_leaders || 0}</div>
        <div className="text-sm text-blue-700 dark:text-blue-300">Líderes Activos</div>
      </div>
      <div className="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
        <div className="text-2xl font-bold text-purple-600">{stats.multiplications || 0}</div>
        <div className="text-sm text-purple-700 dark:text-purple-300">Multiplicaciones</div>
      </div>
      <div className="text-center p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
        <div className="text-2xl font-bold text-orange-600">{zoneStats.length}</div>
        <div className="text-sm text-orange-700 dark:text-orange-300">Zonas Activas</div>
      </div>
    </div>
  );

  const approvalsList =
    pendingReports.length === 0 ? (
      <div className="text-center py-8">
        <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
        <p className="text-muted-foreground">No hay reportes pendientes</p>
      </div>
    ) : (
      <div className="space-y-4">
        {(pendingReports as unknown as DiscipleshipReport[]).map(report => (
          <div
            key={report.id}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border rounded-lg"
          >
            <div className="min-w-0">
              <h4 className="font-medium text-sm truncate">{report.reporter_name}</h4>
              <p className="text-xs text-muted-foreground truncate">
                {report.report_type} - Período:{' '}
                {parseGoNullTime(report.period_end)?.toLocaleDateString('es-AR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                }) ?? report.period_end}
              </p>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <Clock className="w-3 h-3 mr-1 shrink-0" />
                Enviado:{' '}
                {parseGoNullTime(report.submitted_at)?.toLocaleDateString('es-AR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                }) ?? 'Sin fecha'}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                variant="ghost"
                className="flex-1 sm:flex-none"
                onClick={() => {
                  setSelectedReport(report);
                  setReportSheetOpen(true);
                }}
              >
                Ver
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleApproveReport(report.id)}
                className="flex-1 sm:flex-none"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Aprobar
              </Button>
            </div>
          </div>
        ))}
      </div>
    );

  const alertsList =
    alerts.length === 0 ? (
      <div className="text-center py-8">
        <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
        <p className="text-muted-foreground">No hay alertas pendientes</p>
      </div>
    ) : (
      <div className="space-y-2">
        {(alerts as unknown as DiscipleshipAlert[]).map(alert => (
          <button
            key={alert.id}
            type="button"
            className="w-full text-left flex items-start gap-3 p-3 sm:p-4 border rounded-xl hover:bg-muted/50 active:bg-muted transition-colors"
            onClick={() => {
              setSelectedAlert(alert);
              setAlertSheetOpen(true);
            }}
          >
            {alert.priority >= 5 ? (
              <PartyPopper className="w-4 h-4 mt-0.5 shrink-0 text-green-500" />
            ) : (
              <AlertTriangle
                className={`w-4 h-4 mt-0.5 shrink-0 ${
                  alert.priority >= 3
                    ? 'text-red-500'
                    : alert.priority === 2
                      ? 'text-orange-500'
                      : 'text-yellow-500'
                }`}
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-snug truncate">{alert.title}</p>
                <Badge
                  variant={getAlertPriorityColor(alert.priority)}
                  className="text-[10px] shrink-0"
                >
                  {alert.priority >= 5
                    ? 'Celebración'
                    : alert.priority >= 3
                      ? 'Alta'
                      : alert.priority === 2
                        ? 'Media'
                        : 'Baja'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{alert.message}</p>
              <p className="text-xs text-muted-foreground mt-1 opacity-70">
                {new Date(alert.created_at).toLocaleDateString('es-AR', {
                  day: 'numeric',
                  month: 'short',
                })}
                {' · '}
                Toca para ver detalles
              </p>
            </div>
          </button>
        ))}
      </div>
    );

  const detailSheets = (
    <>
      <AlertDetailSheet
        alert={selectedAlert}
        open={alertSheetOpen}
        onOpenChange={open => {
          setAlertSheetOpen(open);
          if (!open) setSelectedAlert(null);
        }}
        onResolve={handleResolveAlert}
      />
      <ReportDetailSheet
        report={selectedReport}
        open={reportSheetOpen}
        onOpenChange={open => {
          setReportSheetOpen(open);
          if (!open) setSelectedReport(null);
        }}
        onApprove={handleApproveReport}
        onReject={handleRejectReport}
      />
    </>
  );

  // ── Modo mobile exclusivo ──
  if (isMobileApp) {
    const mobileSubTabs = [
      { value: 'overview', label: 'Vista General' },
      { value: 'strategic', label: 'Estratégico' },
      {
        value: 'approvals',
        label:
          pendingReports.length > 0 ? `Aprobaciones · ${pendingReports.length}` : 'Aprobaciones',
      },
      {
        value: 'alerts',
        label: stats.pending_alerts > 0 ? `Alertas · ${stats.pending_alerts}` : 'Alertas',
      },
      { value: 'health', label: 'Salud' },
    ];

    return (
      <div className="pb-4">
        {/* ── Stats: chips compactos horizontales ── */}
        <div className="flex gap-2 px-4 pt-4 overflow-x-auto snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <MobileStatTile label="Grupos" value={stats.total_groups || 0} />
          <MobileStatTile label="Miembros" value={stats.total_members || 0} />
          <MobileStatTile label="Multiplicaciones" value={stats.multiplications || 0} />
          <MobileStatTile label="Salud" value={`${(stats.spiritual_health || 0).toFixed(1)}/10`} />
        </div>

        {/* ── Sub-tabs ── */}
        <MobileSegment
          scrollable
          options={mobileSubTabs}
          value={selectedTab}
          onChange={setSelectedTab}
          className="px-4 pt-4"
        />

        {selectedTab === 'overview' && (
          <>
            <MobileSectionHeader title="Crecimiento · 24 semanas" />
            <div className="px-4">{growthChart}</div>
            <MobileSectionHeader title="Distribución por zonas" />
            <div className="px-4">{zoneChart}</div>
            <MobileSectionHeader title="Indicadores clave" />
            <div className="px-4">{kpiGrid}</div>
          </>
        )}

        {selectedTab === 'strategic' && <GoalsDashboard />}

        {selectedTab === 'approvals' && (
          <>
            <MobileSectionHeader title="Cola de aprobaciones" />
            <div className="px-4">{approvalsList}</div>
          </>
        )}

        {selectedTab === 'alerts' && (
          <>
            <MobileSectionHeader title="Alertas del sistema" />
            <div className="px-4">{alertsList}</div>
          </>
        )}

        {selectedTab === 'health' && (
          <MinistryHealthTab
            stats={stats}
            zoneStats={zoneStats}
            weeklyTrends={weeklyTrends}
            alerts={alerts as DiscipleshipAlert[]}
          />
        )}

        {detailSheets}
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 md:gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard Pastoral</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {currentUser?.first_name} {currentUser?.last_name} - Vista Ejecutiva General
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Badge
            variant="default"
            className="text-xs sm:text-sm md:text-lg px-3 md:px-4 py-1.5 md:py-2"
          >
            <Crown className="mr-2 h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">
              Nivel 5 - {currentUser?.role.toUpperCase() ?? 'Pastor'}
            </span>
            <span className="sm:hidden">N5</span>
          </Badge>
        </div>
      </div>

      {/* Executive Summary Cards */}
      <div className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="border-blue-200 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-3 pt-3 sm:px-4 sm:pt-4 md:px-6 md:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Grupos</CardTitle>
            <Building2 className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="px-3 pb-3 sm:px-4 sm:pb-4 md:px-6 md:pb-6">
            <div className="text-xl sm:text-2xl font-bold">{stats.total_groups || 0}</div>
            <p className="text-xs text-muted-foreground truncate">En todo el ministerio</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/60 dark:border-green-900 dark:bg-green-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-3 pt-3 sm:px-4 sm:pt-4 md:px-6 md:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Miembros</CardTitle>
            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="px-3 pb-3 sm:px-4 sm:pb-4 md:px-6 md:pb-6">
            <div className="text-xl sm:text-2xl font-bold">{stats.total_members || 0}</div>
            <p className="text-xs text-muted-foreground truncate">Activos en células</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/60 dark:border-purple-900 dark:bg-purple-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-3 pt-3 sm:px-4 sm:pt-4 md:px-6 md:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Multiplicaciones</CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="px-3 pb-3 sm:px-4 sm:pb-4 md:px-6 md:pb-6">
            <div className="text-xl sm:text-2xl font-bold">{stats.multiplications || 0}</div>
            <p className="text-xs text-muted-foreground truncate">Este año</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50/60 dark:border-orange-900 dark:bg-orange-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-3 pt-3 sm:px-4 sm:pt-4 md:px-6 md:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Índice de Salud</CardTitle>
            <Zap className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="px-3 pb-3 sm:px-4 sm:pb-4 md:px-6 md:pb-6">
            <div className="text-xl sm:text-2xl font-bold">
              {(stats.spiritual_health || 0).toFixed(1)}/10
            </div>
            <p className="text-xs text-muted-foreground truncate">Promedio general</p>
          </CardContent>
        </Card>
      </div>

      {/* Acciones Rápidas */}

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        {/* Los tabs envuelven en vez de scrollear o comprimirse: con grid de N
            columnas fijas el label más largo quedaba cortado entre 768 y 1280px.
            `grow` los reparte en la fila y `flex-wrap` baja el sobrante. */}
        <TabsList className="flex h-auto w-full flex-wrap gap-2 p-1.5">
          <TabsTrigger value="overview" className="min-h-11 grow px-3 text-xs sm:text-sm">
            Vista General
          </TabsTrigger>
          <TabsTrigger value="strategic" className="min-h-11 grow px-3 text-xs sm:text-sm">
            Estratégico
          </TabsTrigger>
          <TabsTrigger value="approvals" className="min-h-11 grow gap-1.5 px-3 text-xs sm:text-sm">
            Aprobaciones
            {pendingReports.length > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                {pendingReports.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="alerts" className="min-h-11 grow gap-1.5 px-3 text-xs sm:text-sm">
            Alertas
            {stats.pending_alerts > 0 ? (
              <Badge variant="destructive" className="h-5 animate-pulse px-1.5 text-[10px]">
                {stats.pending_alerts}
              </Badge>
            ) : (
              <Badge variant="outline" className="h-5 px-1.5 text-[10px] text-muted-foreground">
                0
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="health" className="min-h-11 grow px-3 text-xs sm:text-sm">
            <span className="sm:hidden">Salud</span>
            <span className="hidden sm:inline">Salud del Sistema</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Comprehensive Growth Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Análisis Integral de Crecimiento</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Tendencias de las últimas 24 semanas
              </CardDescription>
            </CardHeader>
            <CardContent>{growthChart}</CardContent>
          </Card>

          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {/* Zone Health Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base md:text-lg">Distribución por Zonas</CardTitle>
              </CardHeader>
              <CardContent>{zoneChart}</CardContent>
            </Card>

            {/* Key Performance Indicators */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base md:text-lg">Indicadores Clave</CardTitle>
              </CardHeader>
              <CardContent>{kpiGrid}</CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="strategic" className="space-y-4">
          <GoalsDashboard />
        </TabsContent>

        <TabsContent value="approvals" className="space-y-4">
          {/* Approval Queue */}
          <Card>
            <CardHeader>
              <CardTitle>Cola de Aprobaciones</CardTitle>
              <CardDescription>Reportes pendientes de tu aprobación</CardDescription>
            </CardHeader>
            <CardContent>{approvalsList}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader className="px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-6 pb-2 sm:pb-3">
              <CardTitle className="text-base sm:text-lg">Alertas del Sistema</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Situaciones que requieren atención
              </CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6">
              {alertsList}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <MinistryHealthTab
            stats={stats}
            zoneStats={zoneStats}
            weeklyTrends={weeklyTrends}
            alerts={alerts as DiscipleshipAlert[]}
          />
        </TabsContent>
      </Tabs>

      {detailSheets}
    </div>
  );
});

PastoralDashboard.displayName = 'PastoralDashboard';

export default PastoralDashboard;
