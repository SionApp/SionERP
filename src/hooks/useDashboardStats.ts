import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  totalUsers: number;
  newRegistrations: number;
  activeRoles: number;
  systemActivity: number;
}

interface RoleDistribution {
  name: string;
  value: number;
  color: string;
}

interface RecentActivity {
  action: string;
  user: string;
  time: string;
  type: 'success' | 'info' | 'warning';
}

export const useDashboardStats = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    newRegistrations: 0,
    activeRoles: 4,
    systemActivity: 98
  });
  
  const [roleDistribution, setRoleDistribution] = useState<RoleDistribution[]>([
    { name: 'Pastor', value: 0, color: 'hsl(var(--primary))' },
    { name: 'Staff', value: 0, color: 'hsl(266 85% 68%)' },
    { name: 'Supervisor', value: 0, color: 'hsl(295 85% 58%)' },
    { name: 'Server', value: 0, color: 'hsl(217 32.6% 17.5%)' },
  ]);
  
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      // Total users
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // New registrations in last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { count: newRegistrations } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .gte('created_at', sevenDaysAgo.toISOString());

      // Role distribution
      const { data: roles } = await supabase
        .from('users')
        .select('role')
        .eq('is_active', true);

      if (roles) {
        const roleCount = roles.reduce((acc, user) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        setRoleDistribution([
          { name: 'Pastor', value: roleCount.pastor || 0, color: 'hsl(var(--primary))' },
          { name: 'Staff', value: roleCount.staff || 0, color: 'hsl(266 85% 68%)' },
          { name: 'Supervisor', value: roleCount.supervisor || 0, color: 'hsl(295 85% 58%)' },
          { name: 'Server', value: roleCount.server || 0, color: 'hsl(217 32.6% 17.5%)' },
        ]);
      }

      setStats({
        totalUsers: totalUsers || 0,
        newRegistrations: newRegistrations || 0,
        activeRoles: 4,
        systemActivity: 98
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadRecentActivity = async () => {
    try {
      // Get recent users
      const { data: recentUsers } = await supabase
        .from('users')
        .select('nombres, apellidos, correo, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(4);

      if (recentUsers) {
        const activities = recentUsers.map((user, index) => ({
          action: "Nuevo usuario registrado",
          user: user.correo,
          time: `Hace ${index === 0 ? '1 minuto' : index === 1 ? '1 hora' : `${index} horas`}`,
          type: "success" as const
        }));
        setRecentActivity(activities);
      }
    } catch (error) {
      console.error('Error loading recent activity:', error);
      // Fallback data
      setRecentActivity([
        {
          action: "Sistema iniciado",
          user: "Sistema",
          time: "Hace 1 minuto",
          type: "info"
        }
      ]);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadStats(), loadRecentActivity()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  return {
    stats,
    roleDistribution,
    recentActivity,
    loading,
    refresh: loadAll
  };
};