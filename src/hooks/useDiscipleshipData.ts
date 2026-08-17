import { DiscipleshipAnalyticsService } from '@/services/discipleship-analytics.service';
import type { WeeklyTrend, ZoneStats } from '@/services/discipleship-analytics.service';
import { DiscipleshipService } from '@/services/discipleship.service';
import type {
  DiscipleshipAlert,
  DiscipleshipGoal,
  DiscipleshipGroup,
  DiscipleshipReport,
} from '@/types/discipleship.types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

/** getWeeklyTrends también devuelve groups_reporting, no declarado en WeeklyTrend (ver discipleship-analytics.service.ts). */
interface WeeklyTrendRaw extends WeeklyTrend {
  groups_reporting: number;
}

/** Punto de datos ya formateado para el gráfico de tendencias semanales. */
interface WeeklyTrendChartPoint {
  name: string;
  miembros: number;
  asistencia: number;
  visitantes: number;
  conversiones: number;
  grupos: number;
}

/** Respuesta de getSupervisorSubordinates (mismo shape que GeneralSupervisorDashboard). */
interface SupervisorSubordinate {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  hierarchy_level: number;
  groups_assigned: number;
  total_members: number;
  avg_attendance: number;
  performance_score: number;
}

/** Resumen de grupo derivado de DiscipleshipGroup para el listado del supervisor auxiliar. */
interface GroupSummary {
  id: string;
  group_name: string;
  leader_name: string;
  member_count: number;
  avg_attendance: number;
  status: DiscipleshipGroup['status'];
}

interface DashboardStats {
  total_groups?: number;
  total_members?: number;
  active_leaders?: number;
  multiplications?: number;
  average_attendance?: number;
  spiritual_health?: number;
  pending_alerts?: number;
  pending_reports?: number;
  groups_under_supervision?: number;
  subordinates_count?: number;
  zone_name?: string;
}

interface UseDiscipleshipDataOptions {
  userId: string | undefined;
  level: number;
  enabled?: boolean;
}

/**
 * Hook para cargar datos de discipulado de forma optimizada.
 * Recibe userId como parámetro en vez de usar useAuth() internamente
 * para evitar suscripciones duplicadas de auth.
 * Agrupa todos los estados en un solo objeto para evitar re-renders múltiples.
 */
export function useDiscipleshipData(options: UseDiscipleshipDataOptions) {
  const { userId, level, enabled = true } = options;

  interface DataState {
    loading: boolean;
    stats: DashboardStats;
    zoneStats: ZoneStats[];
    weeklyTrends: WeeklyTrendChartPoint[];
    goals: DiscipleshipGoal[];
    alerts: DiscipleshipAlert[];
    pendingReports: DiscipleshipReport[];
    subordinates: SupervisorSubordinate[];
    groups: GroupSummary[];
  }

  const initialState: DataState = {
    loading: false,
    stats: {},
    zoneStats: [],
    weeklyTrends: [],
    goals: [],
    alerts: [],
    pendingReports: [],
    subordinates: [],
    groups: [],
  };

  const [data, setData] = useState<DataState>(initialState);

  // Ref para evitar cargas duplicadas
  const loadingRef = useRef(false);
  const loadedRef = useRef(false);

  const loadData = useCallback(async () => {
    if (!enabled || !userId || loadingRef.current) return;

    try {
      loadingRef.current = true;
      setData(prev => ({ ...prev, loading: true }));

      // Ejecutar todas las promesas en paralelo y acumular resultados
      const statsPromise = DiscipleshipAnalyticsService.getDashboardStatsByLevel(level);

      const promises: Record<string, Promise<unknown>> = { stats: statsPromise };

      if (level >= 2) {
        const weeks = level >= 5 ? 24 : 12;
        promises.weeklyTrends = DiscipleshipAnalyticsService.getWeeklyTrends(weeks).then(trends =>
          trends.map((t: WeeklyTrendRaw) => ({
            name: new Date(t.week).toLocaleDateString('es', { month: 'short', day: 'numeric' }),
            miembros: t.attendance,
            asistencia: t.attendance,
            visitantes: t.visitors,
            conversiones: t.conversions,
            grupos: t.groups_reporting,
          }))
        );
      }

      if (level >= 3) {
        promises.zoneStats = DiscipleshipAnalyticsService.getZoneStats();
      }

      if (level >= 3) {
        promises.subordinates = DiscipleshipAnalyticsService.getSupervisorSubordinates(userId);
      }

      if (level >= 4) {
        promises.goals = DiscipleshipAnalyticsService.getGoals();
      }

      if (level >= 2) {
        promises.pendingReports = DiscipleshipService.getReports({ status: 'submitted' }).then(data => data.slice(0, 10));
      }

      if (level >= 5) {
        promises.alerts = DiscipleshipService.getAlerts({ resolved: false }).then(data => data.slice(0, 10));
      }

      if (level === 2) {
        promises.groups = DiscipleshipService.getGroups({
          supervisor_id: userId,
          status: 'active',
        }).then(response =>
          response.data?.map((g: DiscipleshipGroup) => ({
            id: g.id,
            group_name: g.group_name,
            leader_name: g.leader_name || 'Sin asignar',
            member_count: g.member_count || 0,
            avg_attendance: g.active_members || 0,
            status: g.status,
          })) || []
        );
      }

      // Esperar TODAS las promesas y actualizar el estado UNA sola vez
      const results = await Promise.all(
        Object.entries(promises).map(async ([key, promise]) => {
          try {
            return [key, await promise] as [string, unknown];
          } catch {
            return [key, null] as [string, unknown];
          }
        })
      );

      const updates: Partial<DataState> = { loading: false };
      for (const [key, value] of results) {
        if (value !== null) {
          (updates as Record<string, unknown>)[key] = value;
        }
      }

      setData(prev => ({ ...prev, ...updates }));
      loadedRef.current = true;
    } catch (error) {
      console.error('Error loading discipleship data:', error);
      toast.error('Error al cargar los datos');
      setData(prev => ({ ...prev, loading: false }));
    } finally {
      loadingRef.current = false;
    }
  }, [userId, level, enabled]);

  useEffect(() => {
    if (enabled && userId && !loadedRef.current) {
      loadData();
    }
  }, [loadData, enabled, userId]);

  return {
    ...data,
    refetch: loadData,
  };
}

