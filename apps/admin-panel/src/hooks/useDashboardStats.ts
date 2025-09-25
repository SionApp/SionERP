import { useState, useEffect } from 'react';

export interface DashboardStats {
  totalUsers: number;
  newRegistrations: number;
  activeRoles: number;
  systemActivity: number;
}

export interface RoleDistribution {
  name: string;
  value: number;
  color: string;
}

export interface RecentActivity {
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
    activeRoles: 0,
    systemActivity: 0
  });
  
  const [roleDistribution, setRoleDistribution] = useState<RoleDistribution[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data for now
    setTimeout(() => {
      setStats({
        totalUsers: 156,
        newRegistrations: 12,
        activeRoles: 4,
        systemActivity: 89
      });

      setRoleDistribution([
        { name: 'Miembros', value: 120, color: '#8884d8' },
        { name: 'Líderes', value: 24, color: '#82ca9d' },
        { name: 'Pastores', value: 8, color: '#ffc658' },
        { name: 'Administradores', value: 4, color: '#ff7c7c' }
      ]);

      setRecentActivity([
        { id: '1', action: 'Nuevo usuario registrado', user: 'Juan Pérez', time: 'hace 5 min', type: 'success' },
        { id: '2', action: 'Actualización de perfil', user: 'María García', time: 'hace 15 min', type: 'info' },
        { id: '3', action: 'Cambio de rol', user: 'Pedro López', time: 'hace 30 min', type: 'warning' }
      ]);

      setLoading(false);
    }, 1000);
  }, []);

  return {
    stats,
    roleDistribution,
    recentActivity,
    loading
  };
};