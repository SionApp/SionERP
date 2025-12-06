import type {
  DiscipleshipAlert,
  DiscipleshipAnalytics,
  GroupPerformance,
  MultiplicationTracker,
  WeeklyTrend,
  ZoneStats,
} from '@/services/discipleship-analytics.service';
import { DiscipleshipAnalyticsService } from '@/services/discipleship-analytics.service';
import { useCallback, useEffect, useState } from 'react';

export const useDiscipleshipAnalytics = (zoneName?: string) => {
  const [analytics, setAnalytics] = useState<DiscipleshipAnalytics>({
    totalGroups: 0,
    totalMembers: 0,
    averageAttendance: 0,
    growthRate: 0,
    activeLeaders: 0,
    multiplications: 0,
    spiritualHealth: 0,
    dateRange: { from: '', to: '' },
  });

  const [zoneStats, setZoneStats] = useState<ZoneStats[]>([]);
  const [groupPerformance, setGroupPerformance] = useState<GroupPerformance[]>([]);
  const [alerts, setAlerts] = useState<DiscipleshipAlert[]>([]);
  const [multiplications, setMultiplications] = useState<MultiplicationTracker[]>([]);
  const [weeklyTrends, setWeeklyTrends] = useState<WeeklyTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDiscipleshipData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await DiscipleshipAnalyticsService.getAllDiscipleshipData();

      setAnalytics(data.analytics);
      setZoneStats(data.zoneStats);
      setGroupPerformance(data.groupPerformance);
      setAlerts(data.alerts);
      setMultiplications(data.multiplications);
      setWeeklyTrends(data.weeklyTrends);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error desconocido al cargar los datos de discipulado');
      }
      console.error('Error loading discipleship data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Resolver una alerta
  const resolveAlert = useCallback(
    async (alertId: string) => {
      try {
        await DiscipleshipAnalyticsService.getAlerts(); // Recargar alertas
        // Actualizar estado local
        setAlerts(prev => prev.map(a => (a.id === alertId ? { ...a, resolved: true } : a)));
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
          console.error('Error resolving alert:', err);
        } else {
          setError('Error desconocido al resolver alerta');
          console.error('Error resolving alert:', err);
        }
      }
    },
    [setAlerts]
  );

  useEffect(() => {
    loadDiscipleshipData();
  }, [loadDiscipleshipData]);

  return {
    analytics,
    zoneStats,
    groupPerformance,
    alerts,
    multiplications,
    weeklyTrends,
    loading,
    error,
    refetch: loadDiscipleshipData,
    resolveAlert,
  };
};

export default useDiscipleshipAnalytics;
