import { useState, useEffect } from "react";
import {
  DashboardService,
  DashboardStats,
  DiscipleshipDashboardStats,
  RoleDistribution,
  RecentActivity,
} from "@/services/dashboard.service";

export const useDashboardStats = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    newRegistrations: 0,
    activeRoles: 0,
    systemActivity: 0,
    lastLogin: null,
  });

  const [discipleshipStats, setDiscipleshipStats] =
    useState<DiscipleshipDashboardStats>({
      totalGroups: 0,
      totalMembers: 0,
      activeLeaders: 0,
      avgAttendance: 0,
      monthlyGrowth: 0,
      spiritualHealth: 0,
      multiplications: 0,
      alertsCount: 0,
    });

  const [roleDistribution, setRoleDistribution] = useState<RoleDistribution[]>(
    [],
  );
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentLogin, setRecentLogin] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await DashboardService.getAllDashboardData();

      setStats(data.stats);
      setDiscipleshipStats(data.discipleshipStats);
      setRoleDistribution(data.roleDistribution);
      setRecentActivity(data.recentActivity);
      setRecentLogin(data.stats.lastLogin);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      setError("Error al cargar los datos del dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  return {
    stats,
    discipleshipStats,
    roleDistribution,
    recentActivity,
    recentLogin,
    loading,
    error,
    refetch: loadDashboardData,
  };
};
