import { DiscipleshipService } from '@/services/discipleship.service';
import { useCallback, useEffect, useState } from 'react';

export interface DiscipleshipActivity {
  id: string;
  type: 'report' | 'alert' | 'group' | 'metric';
  title: string;
  description: string;
  timestamp: string;
  color: string;
  icon: string;
  details?: Record<string, unknown>;
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  weekly_leader: 'Reporte semanal',
  biweekly_auxiliary: 'Reporte quincenal',
  monthly_general: 'Reporte mensual',
  quarterly_coordinator: 'Reporte trimestral',
  annual_pastoral: 'Reporte anual',
};

const REPORT_STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-blue-500',
  approved: 'bg-green-500',
  draft: 'bg-gray-500',
  revision_required: 'bg-orange-500',
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  no_reports: 'Sin Reportes',
  low_attendance: 'Asistencia Baja',
  spiritual_decline: 'Declive Espiritual',
  no_growth: 'Sin Crecimiento',
  consistency_milestone: 'Hito de Consistencia',
  evangelism_champion: 'Campeón de Evangelismo',
  solid_group: 'Grupo Sólido',
  multiplication_ready: 'Listo para Multiplicar',
  needs_attention: 'Requiere Atención',
  custom: 'Personalizada',
};

const ALERT_TYPE_ICONS: Record<string, string> = {
  no_reports: '📋',
  low_attendance: '📉',
  spiritual_decline: '⬇️',
  no_growth: '🔄',
  consistency_milestone: '🏆',
  evangelism_champion: '⭐',
  solid_group: '💪',
  multiplication_ready: '🔥',
  needs_attention: '⚠️',
  custom: '📌',
};

const ALERT_TYPE_COLORS: Record<string, string> = {
  no_reports: 'bg-red-500',
  low_attendance: 'bg-orange-500',
  spiritual_decline: 'bg-red-600',
  no_growth: 'bg-orange-600',
  consistency_milestone: 'bg-green-500',
  evangelism_champion: 'bg-emerald-500',
  solid_group: 'bg-blue-500',
  multiplication_ready: 'bg-green-500',
  needs_attention: 'bg-yellow-500',
  custom: 'bg-blue-500',
};

const GROUP_STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500',
  inactive: 'bg-gray-500',
  multiplying: 'bg-blue-500',
};

/**
 * Extrae un string ISO de un valor que puede ser:
 * - string ISO directo (time.Time de Go)
 * - objeto {Time: string, Valid: bool} (sql.NullTime de Go)
 * - null / undefined
 */
function extractTimestampString(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') return value;
  if (
    typeof value === 'object' &&
    value !== null &&
    'Valid' in value &&
    'Time' in value &&
    (value as { Valid: boolean }).Valid
  ) {
    return (value as { Time: string }).Time;
  }
  return new Date().toISOString();
}

/**
 * Extrae el valor string de un campo que puede ser:
 * - string directo
 * - objeto {String: string, Valid: bool} (sql.NullString de Go)
 * - null / undefined
 */
function extractStringValue(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (
    typeof value === 'object' &&
    value !== null &&
    'Valid' in value &&
    (value as { Valid: boolean }).Valid &&
    'String' in value
  ) {
    return (value as { String: string }).String || null;
  }
  return null;
}

export function useRecentDiscipleshipActivity(limit = 10) {
  const [activities, setActivities] = useState<DiscipleshipActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [reports, alerts, groupsResponse] = await Promise.allSettled([
        DiscipleshipService.getReports({ limit, offset: 0 }),
        DiscipleshipService.getAlerts({ limit, resolved: false }),
        DiscipleshipService.getGroups({ limit: 5 }),
      ]);

      const allActivities: DiscipleshipActivity[] = [];

      // Procesar reportes
      if (reports.status === 'fulfilled') {
        const reportList = reports.value == null ? [] : Array.isArray(reports.value) ? reports.value : reports.value.data ?? [];
        const reportActivities = (reportList as any[]).slice(0, limit).map((r) => {
          const zoneName = extractStringValue(r.zone_name);
          return {
            id: `report-${r.id}`,
            type: 'report' as const,
            title: r.reporter_name
              ? `${REPORT_TYPE_LABELS[r.report_type] || r.report_type} — ${r.reporter_name}`
              : `${REPORT_TYPE_LABELS[r.report_type] || r.report_type}`,
            description:
              r.status === 'submitted'
                ? 'Reporte enviado para revisión'
                : r.status === 'approved'
                  ? 'Reporte aprobado'
                  : r.status === 'revision_required'
                    ? 'Requiere revisiones'
                    : 'Borrador guardado',
            timestamp: extractTimestampString(r.submitted_at || r.created_at),
            color: REPORT_STATUS_COLORS[r.status] || 'bg-gray-500',
            icon: '📊',
            details: { status: r.status, report_type: r.report_type, zone_name: zoneName },
          };
        });
        allActivities.push(...reportActivities);
      }

      // Procesar alertas
      if (alerts.status === 'fulfilled') {
        const alertList = alerts.value == null ? [] : Array.isArray(alerts.value) ? alerts.value : alerts.value.data ?? [];
        const alertActivities = (alertList as any[]).slice(0, limit).map((a) => ({
          id: `alert-${a.id}`,
          type: 'alert' as const,
          title: a.title || ALERT_TYPE_LABELS[a.alert_type] || a.alert_type,
          description: a.message || ALERT_TYPE_LABELS[a.alert_type] || a.alert_type,
          timestamp: extractTimestampString(a.created_at),
          color: ALERT_TYPE_COLORS[a.alert_type] || 'bg-yellow-500',
          icon: ALERT_TYPE_ICONS[a.alert_type] || '⚠️',
          details: { alert_type: a.alert_type, priority: a.priority, group_name: extractStringValue(a.group_name) },
        }));
        allActivities.push(...alertActivities);
      }

      // Procesar grupos nuevos
      if (groupsResponse.status === 'fulfilled') {
        const groupList = groupsResponse.value == null ? [] : Array.isArray(groupsResponse.value) ? groupsResponse.value : groupsResponse.value.data ?? [];
        const groupActivities = (groupList as any[]).slice(0, 5).map((g) => {
          const leaderName = extractStringValue(g.leader_name);
          const zoneName = extractStringValue(g.zone_name);
          return {
            id: `group-${g.id}`,
            type: 'group' as const,
            title: g.group_name || 'Nuevo grupo',
            description: leaderName
              ? `Liderado por ${leaderName}${zoneName ? ` en zona ${zoneName}` : ''}`
              : zoneName
                ? `En zona ${zoneName}`
                : `Grupo ${g.status === 'active' ? 'activo' : g.status === 'multiplying' ? 'multiplicando' : 'inactivo'}`,
            timestamp: extractTimestampString(g.created_at),
            color: GROUP_STATUS_COLORS[g.status] || 'bg-blue-500',
            icon: g.status === 'multiplying' ? '🔄' : '👥',
            details: { status: g.status, leader_name: leaderName, zone_name: zoneName },
          };
        });
        allActivities.push(...groupActivities);
      }

      // Ordenar por fecha (más reciente primero) y limitar
      const sorted = allActivities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);

      setActivities(sorted);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar actividad reciente';
      setError(message);
      console.error('Error loading discipleship activity:', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  return { activities, loading, error, refetch: loadActivities };
}
