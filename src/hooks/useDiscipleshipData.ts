import { DiscipleshipAnalyticsService } from '@/services/discipleship-analytics.service';
import { DiscipleshipService } from '@/services/discipleship.service';
import { useAuth } from '@/hooks/useAuth';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

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
}

interface UseDiscipleshipDataOptions {
  level: number;
  enabled?: boolean;
}

/**
 * Hook para cargar datos de discipulado de forma optimizada
 * Evita consultas duplicadas y maneja el estado de carga
 */
export function useDiscipleshipData(options: UseDiscipleshipDataOptions) {
  const { user } = useAuth();
  const { level, enabled = true } = options;
  
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({});
  const [zoneStats, setZoneStats] = useState<any[]>([]);
  const [weeklyTrends, setWeeklyTrends] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [pendingReports, setPendingReports] = useState<any[]>([]);
  const [subordinates, setSubordinates] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  
  // Ref para evitar cargas duplicadas
  const loadingRef = useRef(false);
  const loadedRef = useRef(false);

  const loadData = useCallback(async () => {
    if (!enabled || !user?.id || loadingRef.current) return;
    
    try {
      loadingRef.current = true;
      setLoading(true);

      // Cargar datos según el nivel
      const promises: Promise<any>[] = [];

      // Estadísticas del dashboard (siempre)
      promises.push(
        DiscipleshipAnalyticsService.getDashboardStatsByLevel(level).then(setStats)
      );

      // Datos específicos por nivel
      if (level >= 2) {
        // Tendencias semanales para niveles 2+
        const weeks = level >= 5 ? 24 : 12;
        promises.push(
          DiscipleshipAnalyticsService.getWeeklyTrends(weeks).then(trends => {
            setWeeklyTrends(
              trends.map((t: any) => ({
                name: new Date(t.week_start).toLocaleDateString('es', { month: 'short', day: 'numeric' }),
                miembros: t.total_attendance,
                asistencia: t.total_attendance,
                visitantes: t.total_visitors,
                conversiones: t.total_conversions,
                grupos: t.groups_reporting,
              }))
            );
          })
        );
      }

      if (level >= 3) {
        // Estadísticas por zona para niveles 3+
        promises.push(
          DiscipleshipAnalyticsService.getZoneStats().then(setZoneStats)
        );
      }

      if (level >= 4) {
        // Objetivos para niveles 4+
        promises.push(
          DiscipleshipAnalyticsService.getGoals().then(setGoals)
        );
        // Subordinados para niveles 4+
        promises.push(
          DiscipleshipAnalyticsService.getSupervisorSubordinates(user.id).then(setSubordinates)
        );
      }

      if (level >= 5) {
        // Alertas y reportes para nivel 5
        promises.push(
          DiscipleshipService.getAlerts({ resolved: false }).then(data => {
            setAlerts(data.slice(0, 10));
          })
        );
        promises.push(
          DiscipleshipService.getReports({ status: 'submitted' }).then(data => {
            setPendingReports(data.slice(0, 10));
          })
        );
      }

      if (level === 2) {
        // Grupos supervisados para nivel 2
        promises.push(
          DiscipleshipService.getGroups({
            supervisor_id: user.id,
            status: 'active',
          }).then(response => {
            const groupsWithStats =
              response.data?.map((g: any) => ({
                id: g.id,
                group_name: g.group_name,
                leader_name: g.leader_name || 'Sin asignar',
                member_count: g.member_count || 0,
                avg_attendance: g.active_members || 0,
                status: g.status,
              })) || [];
            setGroups(groupsWithStats);
          })
        );
      }

      // Ejecutar todas las promesas en paralelo
      await Promise.all(promises);
      loadedRef.current = true;
    } catch (error) {
      console.error('Error loading discipleship data:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [user?.id, level, enabled]);

  useEffect(() => {
    if (enabled && user?.id && !loadedRef.current) {
      loadData();
    }
  }, [loadData, enabled, user?.id]);

  return {
    loading,
    stats,
    zoneStats,
    weeklyTrends,
    goals,
    alerts,
    pendingReports,
    subordinates,
    groups,
    refetch: loadData,
  };
}

