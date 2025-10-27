import { useState, useEffect } from 'react';
import { DiscipleshipAnalyticsService } from '@/services/discipleship-analytics.service';
import type {
  DiscipleshipAnalytics,
  ZoneStats,
  GroupPerformance,
  DiscipleshipAlert,
  MultiplicationTracker,
  WeeklyTrend,
} from '@/services/discipleship-analytics.service';

export const useDiscipleshipAnalytics = () => {
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

  const loadDiscipleshipData = async () => {
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
    } catch (err) {
      console.error('Error loading discipleship data:', err);
      setError('Error al cargar los datos de discipulado');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDiscipleshipData();
  }, []);

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
  };
};
