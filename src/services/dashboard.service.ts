import { ApiService } from './api.service';

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

export class DashboardService {
  static async getStats(): Promise<DashboardStats> {
    try {
      const response = await ApiService.get('/dashboard/stats') as { data: DashboardStats };
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Fallback to default values
      return {
        totalUsers: 0,
        newRegistrations: 0,
        activeRoles: 4,
        systemActivity: 98
      };
    }
  }

  static async getRoleDistribution(): Promise<RoleDistribution[]> {
    try {
      const response = await ApiService.get('/dashboard/role-distribution') as { data: RoleDistribution[] };
      return response.data;
    } catch (error) {
      console.error('Error fetching role distribution:', error);
      // Fallback to default values
      return [
        { name: 'Pastor', value: 0, color: 'hsl(var(--primary))' },
        { name: 'Staff', value: 0, color: 'hsl(220 90% 50%)' },
        { name: 'Supervisor', value: 0, color: 'hsl(45 93% 50%)' },
        { name: 'Server', value: 0, color: 'hsl(217 32.6% 17.5%)' },
      ];
    }
  }

  static async getRecentActivity(): Promise<RecentActivity[]> {
    try {
      const response = await ApiService.get('/dashboard/recent-activity') as { data: RecentActivity[] };
      return response.data;
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return [];
    }
  }

  static async getAllDashboardData() {
    try {
      const [stats, roleDistribution, recentActivity] = await Promise.all([
        this.getStats(),
        this.getRoleDistribution(),
        this.getRecentActivity()
      ]);

      return {
        stats,
        roleDistribution,
        recentActivity
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  }
}