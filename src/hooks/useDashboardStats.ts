import { useState, useEffect } from 'react';
import { DashboardService, DashboardStats, RoleDistribution, RecentActivity } from '@/services/dashboard.service';
import { supabase } from '@/integrations/supabase/client';

// Types imported from DashboardService

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
      // Try API first but expect it to fail in development
      try {
        const dashboardData = await DashboardService.getAllDashboardData();
        setStats(dashboardData.stats);
        setRoleDistribution(dashboardData.roleDistribution);
        return; // Success, no need for fallback
      } catch (apiError) {
        console.log('API not available, using Supabase fallback');
      }

      // Fallback to direct Supabase calls
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
          { name: 'Staff', value: roleCount.staff || 0, color: 'hsl(220 90% 50%)' },
          { name: 'Supervisor', value: roleCount.supervisor || 0, color: 'hsl(45 93% 50%)' },
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
      // Set default values if everything fails
      setStats({
        totalUsers: 0,
        newRegistrations: 0,
        activeRoles: 4,
        systemActivity: 98
      });
      setRoleDistribution([
        { name: 'Pastor', value: 0, color: 'hsl(var(--primary))' },
        { name: 'Staff', value: 0, color: 'hsl(220 90% 50%)' },
        { name: 'Supervisor', value: 0, color: 'hsl(45 93% 50%)' },
        { name: 'Server', value: 0, color: 'hsl(217 32.6% 17.5%)' },
      ]);
    }
  };

  const loadRecentActivity = async () => {
    try {
      // Try API first but expect it to fail in development
      try {
        const activity = await DashboardService.getRecentActivity();
        setRecentActivity(activity);
        return; // Success, no need for fallback
      } catch (apiError) {
        console.log('API not available for recent activity, using Supabase fallback');
      }

      // Fallback to direct Supabase calls
      // Solo cargar audit logs para pastor y staff
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        setRecentActivity([]);
        return;
      }

      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', currentUser.user.id)
        .single();

      // Solo pastor y staff pueden ver audit logs
      if (!userProfile || !['pastor', 'staff'].includes(userProfile.role)) {
        setRecentActivity([]);
        return;
      }

      // Obtener audit logs reales
      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select(`
          *,
          users!audit_logs_changed_by_fkey (first_name, last_name, email)
        `)
        .order('changed_at', { ascending: false })
        .limit(5);

      if (auditLogs) {
        const activities = auditLogs.map((log) => {
          const user = log.users ? `${log.users.first_name} ${log.users.last_name}` : 'Sistema';
          const timeAgo = getTimeAgo(new Date(log.changed_at));
          
          let action = '';
          let actionType: 'success' | 'warning' | 'info' = 'info';

          switch (log.action) {
            case 'INSERT':
              action = `Creó un nuevo ${getTableDisplayName(log.table_name)}`;
              actionType = 'success';
              break;
            case 'UPDATE':
              action = `Actualizó ${getTableDisplayName(log.table_name)}`;
              actionType = 'warning';
              break;
            case 'DELETE':
              action = `Eliminó ${getTableDisplayName(log.table_name)}`;
              actionType = 'info';
              break;
            default:
              action = `Modificó ${getTableDisplayName(log.table_name)}`;
          }

          return {
            id: log.id,
            action,
            user,
            time: timeAgo,
            type: actionType,
            details: log
          };
        });

        setRecentActivity(activities);
      } else {
        setRecentActivity([]);
      }
    } catch (error) {
      console.error('Error loading recent activity:', error);
      setRecentActivity([]);
    }
  };

  const getTableDisplayName = (tableName: string) => {
    const displayNames: Record<string, string> = {
      'users': 'usuario',
      'live_streams': 'transmisión en vivo',
      'reports': 'reporte',
      'user_permissions': 'permiso de usuario',
      'role_permissions': 'permiso de rol'
    };
    return displayNames[tableName] || tableName;
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Hace menos de 1 minuto';
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} minutos`;
    if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} horas`;
    return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      // Load stats and recent activity (each method handles its own API/fallback logic)
      await Promise.all([loadStats(), loadRecentActivity()]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAll();

    // Set up real-time subscriptions for automatic updates
    const usersChannel = supabase
      .channel('dashboard-users-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'users'
        },
        (payload) => {
          console.log('Users table changed:', payload);
          // Reload stats when users table changes
          loadStats();
        }
      )
      .subscribe();

    const auditLogsChannel = supabase
      .channel('dashboard-audit-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Only listen to new audit logs
          schema: 'public',
          table: 'audit_logs'
        },
        (payload) => {
          console.log('New audit log:', payload);
          // Reload recent activity when new audit log is created
          loadRecentActivity();
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(auditLogsChannel);
    };
  }, []);

  return {
    stats,
    roleDistribution,
    recentActivity,
    loading,
    refresh: loadAll
  };
};