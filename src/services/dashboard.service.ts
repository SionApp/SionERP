import { supabase } from "@/integrations/supabase/client";

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

const roleColors = {
  pastor: "#ff7c7c",
  staff: "#ffc658",
  supervisor: "#82ca9d",
  server: "#8884d8",
};

const roleNames = {
  pastor: "Pastor",
  staff: "Personal",
  supervisor: "Supervisor",
  server: "Servidor",
};

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

export class DashboardService {
  static async getStats(): Promise<DashboardStats> {
    try {
      // Total users
      const { count: totalUsers } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      // New registrations (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count: newRegistrations } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .gte("created_at", thirtyDaysAgo.toISOString());

      // Active roles count
      const { data: roles } = await supabase
        .from("users")
        .select("role")
        .eq("is_active", true);

      const uniqueRoles = new Set(roles?.map((r) => r.role) || []);

      return {
        totalUsers: totalUsers || 0,
        newRegistrations: newRegistrations || 0,
        activeRoles: uniqueRoles.size,
        systemActivity: Math.floor(Math.random() * 100), // TODO: Implement real activity tracking
        lastLogin: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      return {
        totalUsers: 0,
        newRegistrations: 0,
        activeRoles: 0,
        systemActivity: 0,
        lastLogin: new Date().toISOString(),
      };
    }
  }

  static async getDiscipleshipStats(): Promise<DiscipleshipDashboardStats> {
    try {
      // Obtener estadísticas de discipulado usando la función SQL
      const { data: statsData } = await supabase.rpc(
        "calculate_discipleship_stats",
      );

      // Contar alertas activas
      const { count: alertsCount } = await supabase
        .from("discipleship_alerts")
        .select("*", { count: "exact", head: true })
        .eq("resolved", false);

      // Casting seguro de la respuesta JSON
      const stats = statsData as Record<string, number>;

      return {
        totalGroups: stats?.total_groups || 0,
        totalMembers: stats?.total_members || 0,
        activeLeaders: stats?.active_leaders || 0,
        avgAttendance: stats?.average_attendance || 0,
        monthlyGrowth: stats?.growth_rate || 0,
        spiritualHealth: stats?.spiritual_health || 0,
        multiplications: stats?.multiplications || 0,
        alertsCount: alertsCount || 0,
      };
    } catch (error) {
      console.error("Error fetching discipleship stats:", error);
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

  static async getRoleDistribution(): Promise<RoleDistribution[]> {
    try {
      const { data: users } = await supabase
        .from("users")
        .select("role")
        .eq("is_active", true);

      if (!users) return [];

      // Count users by role
      const roleCounts: Record<string, number> = {};
      users.forEach((user) => {
        roleCounts[user.role] = (roleCounts[user.role] || 0) + 1;
      });

      // Convert to RoleDistribution array
      return Object.entries(roleCounts).map(([role, value]) => ({
        name: roleNames[role as keyof typeof roleNames] || role,
        value,
        color: roleColors[role as keyof typeof roleColors] || "#8884d8",
      }));
    } catch (error) {
      console.error("Error fetching role distribution:", error);
      return [];
    }
  }

  static async getRecentLogin(): Promise<string> {
    const { data: users } = await supabase
      .from("users")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1);
    console.log(users);
    return users[0]?.created_at;
  }

  static async getRecentActivity(): Promise<RecentActivity[]> {
    try {
      const { data: auditLogs } = await supabase
        .from("audit_logs")
        .select(
          `
          id,
          action,
          changed_at,
          new_values,
          old_values
        `,
        )
        .order("changed_at", { ascending: false })
        .limit(10);

      if (!auditLogs) return [];

      return auditLogs.map((log) => {
        const newValues = log.new_values as Record<string, unknown>;
        const userName =
          newValues?.first_name && newValues?.last_name
            ? `${newValues.first_name} ${newValues.last_name}`
            : "Usuario desconocido";

        const timeAgo = this.getTimeAgo(new Date(log.changed_at));

        let actionText = "";
        let type: "success" | "warning" | "info" = "info";

        switch (log.action) {
          case "INSERT":
            actionText = "Usuario registrado";
            type = "success";
            break;
          case "UPDATE":
            actionText = "Perfil actualizado";
            type = "info";
            break;
          case "DELETE":
            actionText = "Usuario eliminado";
            type = "warning";
            break;
          default:
            actionText = log.action;
        }

        return {
          id: log.id,
          action: actionText,
          user: userName,
          time: timeAgo,
          type,
          details: log,
        };
      });
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      return [];
    }
  }

  private static getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `hace ${diffMins} min`;
    } else if (diffHours < 24) {
      return `hace ${diffHours} h`;
    } else {
      return `hace ${diffDays} días`;
    }
  }

  static async getAllDashboardData() {
    try {
      const [
        stats,
        discipleshipStats,
        roleDistribution,
        recentActivity,
        recentLogin,
      ] = await Promise.all([
        this.getStats(),
        this.getDiscipleshipStats(),
        this.getRoleDistribution(),
        this.getRecentActivity(),
        this.getRecentLogin(),
      ]);

      return {
        stats,
        discipleshipStats,
        roleDistribution,
        recentActivity,
        recentLogin,
      };
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      throw error;
    }
  }
}
