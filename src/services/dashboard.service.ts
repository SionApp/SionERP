import { supabase } from "@/integrations/supabase/client";

// Singleton para callbacks de loading
let dashboardLoadingCallbacks: {
  setFetching?: (loading: boolean) => void;
} = {};

export const setDashboardLoadingCallbacks = (callbacks: typeof dashboardLoadingCallbacks) => {
  dashboardLoadingCallbacks = callbacks;
};

// ========================================
// INTERFACES
// ========================================

export interface DashboardStats {
  totalUsers: number;
  newRegistrations: number;
  activeRoles: number;
  systemActivity: number;
  lastLogin: string;
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
  type: "success" | "warning" | "info";
  details?: Record<string, unknown>;
}

export interface DiscipleshipDashboardStats {
  totalGroups: number;
  totalMembers: number;
  activeLeaders: number;
  avgAttendance: number;
  monthlyGrowth: number;
  spiritualHealth: number;
  multiplications: number;
  alertsCount: number;
}

// ========================================
// DASHBOARD SERVICE - TODO DESDE GO
// ========================================

export class DashboardService {
  /**
   * Obtiene todos los datos del dashboard desde el backend Go
   * Esta es la única función que debe usarse
   */
  static async getAllDashboardDataFromGo(): Promise<{
    stats: DashboardStats;
    discipleshipStats: DiscipleshipDashboardStats;
    roleDistribution: RoleDistribution[];
    recentActivity: RecentActivity[];
    currentUserRole?: string;
  }> {
    dashboardLoadingCallbacks.setFetching?.(true);
    try {
      // Obtener token de Supabase Auth
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Llamar al backend Go
      const response = await fetch(
        "http://localhost:8181/api/v1/dashboard/stats",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Dashboard data from Go:", data);

      // El backend Go devuelve toda la estructura
      return {
        stats: data.stats || {
          totalUsers: 0,
          newRegistrations: 0,
          activeRoles: 0,
          systemActivity: 0,
          lastLogin: new Date().toISOString(),
        },
        roleDistribution: data.roleDistribution || [],
        recentActivity: data.recentActivity || [],
        discipleshipStats:
          data.discipleshipStats || this.getEmptyDiscipleshipStats(),
        currentUserRole: data.currentUserRole || null,
      };
    } catch (error) {
      console.error("Error fetching dashboard data from Go backend:", error);
      console.error("Error details:", error);
      throw error;
    } finally {
      dashboardLoadingCallbacks.setFetching?.(false);
    }
  }

  /**
   * Placeholder para estadísticas de discipulado
   * TODO: Implementar en Go
   */
  private static getEmptyDiscipleshipStats(): DiscipleshipDashboardStats {
    return {
      totalGroups: 0,
      totalMembers: 0,
      activeLeaders: 0,
      avgAttendance: 0,
      monthlyGrowth: 0,
      spiritualHealth: 0,
      multiplications: 0,
      alertsCount: 0,
    };
  }
}
