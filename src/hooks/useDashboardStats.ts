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
  id?: string;
  action: string;
  user: string;
  time: string;
  type: 'success' | 'warning' | 'info';
  details?: any;
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
      // Solo cargar audit logs para pastor y staff
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) return;

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
          users!audit_logs_changed_by_fkey (nombres, apellidos, correo)
        `)
        .order('changed_at', { ascending: false })
        .limit(5);

      if (auditLogs) {
        const activities = auditLogs.map((log) => {
          const user = log.users ? `${log.users.nombres} ${log.users.apellidos}` : 'Sistema';
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