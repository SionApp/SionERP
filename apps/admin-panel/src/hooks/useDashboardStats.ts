import { useState, useEffect } from 'react';
import { DashboardService, DashboardStats, RoleDistribution, RecentActivity } from '@/services/dashboard.service';

export const useDashboardStats = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    newRegistrations: 0,
    activeRoles: 0,
    systemActivity: 0,
  });

  const [roleDistribution, setRoleDistribution] = useState<RoleDistribution[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await DashboardService.getAllDashboardData();

      setStats(data.stats);
      setRoleDistribution(data.roleDistribution);
      setRecentActivity(data.recentActivity);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  return {
    stats,
    roleDistribution,
    recentActivity,
    loading,
    error,
    refetch: loadDashboardData,
  };
};
