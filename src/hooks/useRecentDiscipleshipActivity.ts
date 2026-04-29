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

const ALERT_TYPE_COLORS: Record<string, string> = {
  no_reports: 'bg-red-500',
  low_attendance: 'bg-orange-500',
  multiplication_ready: 'bg-green-500',
  needs_attention: 'bg-yellow-500',
  custom: 'bg-blue-500',
};

const GROUP_STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500',
  inactive: 'bg-gray-500',
  multiplying: 'bg-blue-500',
};

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
        const reportList = Array.isArray(reports.value) ? reports.value : reports.value.data || [];
        const reportActivities = (reportList as any[]).slice(0, limit).map((r) => ({
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
          timestamp: r.submitted_at || r.created_at,
          color: REPORT_STATUS_COLORS[r.status] || 'bg-gray-500',
          icon: '📊',
          details: { status: r.status, report_type: r.report_type, zone_name: r.zone_name },
        }));
        allActivities.push(...reportActivities);
      }

      // Procesar alertas
      if (alerts.status === 'fulfilled') {
        const alertList = Array.isArray(alerts.value) ? alerts.value : alerts.value.data || [];
        const alertActivities = (alertList as any[]).slice(0, limit).map((a) => ({
          id: `alert-${a.id}`,
          type: 'alert' as const,
          title: a.title,
          description: a.message || `Alerta de ${a.alert_type}`,
          timestamp: a.created_at,
          color: ALERT_TYPE_COLORS[a.alert_type] || 'bg-yellow-500',
          icon: a.alert_type === 'multiplication_ready' ? '🔥' : '⚠️',
          details: { alert_type: a.alert_type, priority: a.priority, group_name: a.group_name },
        }));
        allActivities.push(...alertActivities);
      }

      // Procesar grupos nuevos
      if (groupsResponse.status === 'fulfilled') {
        const groupList = Array.isArray(groupsResponse.value)
          ? groupsResponse.value
          : groupsResponse.value.data || [];
        const groupActivities = (groupList as any[]).slice(0, 5).map((g) => ({
          id: `group-${g.id}`,
          type: 'group' as const,
          title: g.group_name || 'Nuevo grupo',
          description: g.leader_name
            ? `Liderado por ${g.leader_name}${g.zone_name ? ` en zona ${g.zone_name}` : ''}`
            : g.zone_name
              ? `En zona ${g.zone_name}`
              : `Grupo ${g.status === 'active' ? 'activo' : g.status === 'multiplying' ? 'multiplicando' : 'inactivo'}`,
          timestamp: g.created_at,
          color: GROUP_STATUS_COLORS[g.status] || 'bg-blue-500',
          icon: g.status === 'multiplying' ? '🔄' : '👥',
          details: { status: g.status, leader_name: g.leader_name, zone_name: g.zone_name },
        }));
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
