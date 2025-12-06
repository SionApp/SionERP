import { ApiService } from './api.service';
import { DiscipleshipService } from './discipleship.service';

// =====================================================
// TIPOS
// =====================================================

export interface DiscipleshipAnalytics {
  totalGroups: number;
  totalMembers: number;
  averageAttendance: number;
  growthRate: number;
  activeLeaders: number;
  multiplications: number;
  spiritualHealth: number;
  dateRange: { from: string; to: string };
}

export interface ZoneStats {
  zoneName: string;
  totalGroups: number;
  totalMembers: number;
  avgAttendance: number;
  growthRate: number;
  healthIndex: number;
}

export interface GroupPerformance {
  groupId: string;
  groupName: string;
  leaderName: string;
  avgAttendance: number;
  growthRate: number;
  spiritualTemp: number;
  status: string;
  lastReportDate: string;
}

export interface DiscipleshipAlert {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  groupName?: string;
  userName?: string;
  createdAt: string;
  priority: number;
  actionRequired: boolean;
  resolved: boolean;
}

export interface MultiplicationTracker {
  id: string;
  parentGroupName: string;
  newGroupName: string | null;
  parentLeaderName: string;
  newLeaderName: string | null;
  multiplicationDate: string;
  status: 'planned' | 'in_progress' | 'successful' | 'failed';
  initialMembers: number;
}

export interface WeeklyTrend {
  week: string;
  attendance: number;
  visitors: number;
  conversions: number;
  spiritualTemp: number;
}

export interface LeaderStats {
  groupId: string;
  groupName: string;
  memberCount: number;
  activeMembers: number;
  avgAttendance: number;
  spiritualTemperature: number;
  lastReportDate: string;
  meetingDay: string;
  meetingTime: string;
  meetingLocation: string;
}

export interface DashboardStats {
  totalGroups?: number;
  totalMembers?: number;
  averageAttendance?: number;
  growthRate?: number;
  healthIndex?: number;
  groupsUnderSupervision?: number;
  auxiliarySupervisors?: number;
  leadersSupportNeeded?: number;
  territoryHealthIndex?: number;
  totalSupervisors?: number;
  zoneGrowthRate?: number;
}

// =====================================================
// SERVICIO
// =====================================================

export class DiscipleshipAnalyticsService {
  private static baseUrl = '/discipleship';

  // Obtener analytics generales
  static async getAnalytics(zoneName?: string): Promise<DiscipleshipAnalytics> {
    const url = zoneName
      ? `${this.baseUrl}/analytics?zone_name=${zoneName}`
      : `${this.baseUrl}/analytics`;

    const data = await ApiService.get(url);

    return {
      totalGroups: data.total_groups || 0,
      totalMembers: data.total_members || 0,
      averageAttendance: data.average_attendance || 0,
      growthRate: data.growth_rate || 0,
      activeLeaders: data.active_leaders || 0,
      multiplications: data.multiplications || 0,
      spiritualHealth: data.spiritual_health || 0,
      dateRange: { from: '', to: '' },
    };
  }

  // Obtener estadísticas por zona
  static async getZoneStats(): Promise<ZoneStats[]> {
    const data = await ApiService.get(`${this.baseUrl}/analytics/zones`);

    return (data || []).map((zone: any) => ({
      zoneName: zone.zone_name || 'Sin zona',
      totalGroups: zone.total_groups || 0,
      totalMembers: zone.total_members || 0,
      avgAttendance: zone.avg_attendance || 0,
      growthRate: zone.growth_rate || 0,
      healthIndex: zone.health_index || 0,
    }));
  }

  // Obtener rendimiento de grupos
  static async getGroupPerformance(): Promise<GroupPerformance[]> {
    const data = await ApiService.get(`${this.baseUrl}/analytics/performance`);

    return (data || []).map((group: any) => ({
      groupId: group.group_id || '',
      groupName: group.group_name || 'Sin nombre',
      leaderName: group.leader_name || 'Sin líder',
      avgAttendance: group.avg_attendance || 0,
      growthRate: group.growth_rate || 0,
      spiritualTemp: group.spiritual_temp || 0,
      status: group.status || 'active',
      lastReportDate: group.last_report_date || '',
    }));
  }

  // Obtener alertas
  static async getAlerts(resolved = false): Promise<DiscipleshipAlert[]> {
    const data = await ApiService.get(`${this.baseUrl}/alerts?resolved=${resolved}`);

    return (data || []).map((alert: any) => ({
      id: alert.id || '',
      type: this.mapAlertPriorityToType(alert.priority),
      title: alert.title || '',
      message: alert.message || '',
      groupName: alert.group_name,
      userName: alert.user_name,
      createdAt: alert.created_at || '',
      priority: alert.priority || 3,
      actionRequired: alert.action_required || false,
      resolved: alert.resolved || false,
    }));
  }

  // Obtener multiplicaciones
  static async getMultiplications(): Promise<MultiplicationTracker[]> {
    const data = await ApiService.get(`${this.baseUrl}/multiplications`);

    return (data || []).map((mult: any) => ({
      id: mult.id || '',
      parentGroupName: mult.parent_group_name || '',
      newGroupName: mult.new_group_name,
      parentLeaderName: mult.parent_leader_name || '',
      newLeaderName: mult.new_leader_name,
      multiplicationDate: mult.multiplication_date || '',
      status: mult.success_status || 'planned',
      initialMembers: mult.initial_members || 0,
    }));
  }

  // Obtener tendencias semanales agregadas (para dashboards)
  // Si necesitas métricas individuales de un grupo, usa DiscipleshipService.getMetrics()
  static async getWeeklyTrends(weeks: number = 12, groupId?: string): Promise<WeeklyTrend[]> {
    // Si se especifica un group_id, usar el endpoint de metrics y procesar
    if (groupId) {
      const metrics = await DiscipleshipService.getMetrics({ group_id: groupId });

      // Agrupar métricas por semana
      const weeklyMap = new Map<string, any>();

      metrics.forEach((metric: any) => {
        const weekStart = new Date(metric.week_date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Lunes de esa semana
        const weekKey = weekStart.toISOString().split('T')[0];

        if (!weeklyMap.has(weekKey)) {
          weeklyMap.set(weekKey, {
            week_start: weekKey,
            total_attendance: 0,
            total_visitors: 0,
            total_conversions: 0,
            avg_spiritual_temp: 0,
            groups_reporting: 1,
            count: 0,
          });
        }

        const week = weeklyMap.get(weekKey);
        week.total_attendance += metric.attendance || 0;
        week.total_visitors += (metric.new_visitors || 0) + (metric.returning_visitors || 0);
        week.total_conversions += metric.conversions || 0;
        week.avg_spiritual_temp += metric.spiritual_temperature || 0;
        week.count += 1;
      });

      // Calcular promedios y convertir a array
      return Array.from(weeklyMap.values())
        .map(week => ({
          week: week.week_start,
          week_start: week.week_start,
          attendance: week.total_attendance,
          total_attendance: week.total_attendance,
          visitors: week.total_visitors,
          total_visitors: week.total_visitors,
          conversions: week.total_conversions,
          total_conversions: week.total_conversions,
          spiritualTemp: week.count > 0 ? week.avg_spiritual_temp / week.count : 5,
          groups_reporting: week.groups_reporting,
        }))
        .sort((a, b) => a.week_start.localeCompare(b.week_start))
        .slice(-weeks); // Últimas N semanas
    }

    // Para tendencias generales, usar el endpoint específico de weekly-trends
    const url = `${this.baseUrl}/weekly-trends?weeks=${weeks}`;
    const data = await ApiService.get(url);

    return (data || []).map((trend: any) => ({
      week: trend.week_start || '',
      week_start: trend.week_start || '',
      attendance: trend.total_attendance || 0,
      total_attendance: trend.total_attendance || 0,
      visitors: trend.total_visitors || 0,
      total_visitors: trend.total_visitors || 0,
      conversions: trend.total_conversions || 0,
      total_conversions: trend.total_conversions || 0,
      spiritualTemp: trend.avg_spiritual_temp || 5,
      groups_reporting: trend.groups_reporting || 0,
    }));
  }

  // Obtener estadísticas del dashboard por nivel
  static async getDashboardStats(level: number, userId?: string): Promise<DashboardStats> {
    const analytics = await this.getAnalytics();
    const zoneStats = await this.getZoneStats();
    const alerts = await this.getAlerts(false);

    return {
      totalGroups: analytics.totalGroups,
      totalMembers: analytics.totalMembers,
      averageAttendance: analytics.averageAttendance,
      growthRate: analytics.growthRate,
      healthIndex: analytics.spiritualHealth,
      groupsUnderSupervision: level === 2 ? Math.ceil(analytics.totalGroups / 3) : undefined,
      auxiliarySupervisors: level >= 3 ? Math.ceil(analytics.activeLeaders / 4) : undefined,
      leadersSupportNeeded: alerts.filter(a => a.actionRequired && !a.resolved).length,
      territoryHealthIndex: analytics.spiritualHealth,
      totalSupervisors: analytics.activeLeaders,
      zoneGrowthRate: analytics.growthRate,
    };
  }

  // Obtener datos del grupo para un líder
  static async getLeaderGroupStats(leaderId: string): Promise<LeaderStats | null> {
    try {
      const response = await ApiService.get(`${this.baseUrl}/groups?leader_id=${leaderId}`);
      const groups = response.data || [];

      if (groups.length === 0) return null;

      const group = groups[0];
      return {
        groupId: group.id,
        groupName: group.group_name,
        memberCount: group.member_count || 0,
        activeMembers: group.active_members || 0,
        avgAttendance:
          group.active_members > 0
            ? Math.round((group.active_members / group.member_count) * 100)
            : 0,
        spiritualTemperature: 7, // Default, se obtendría de métricas
        lastReportDate: group.updated_at || '',
        meetingDay: group.meeting_day || 'No definido',
        meetingTime: group.meeting_time || 'No definido',
        meetingLocation: group.meeting_location || 'No definido',
      };
    } catch (error) {
      console.error('Error getting leader stats:', error);
      return null;
    }
  }

  // Obtener todos los datos del dashboard de discipulado
  static async getAllDiscipleshipData() {
    try {
      const [analytics, zoneStats, groupPerformance, alerts, multiplications, weeklyTrends] =
        await Promise.all([
          this.getAnalytics(),
          this.getZoneStats(),
          this.getGroupPerformance(),
          this.getAlerts(),
          this.getMultiplications(),
          this.getWeeklyTrends(),
        ]);

      return {
        analytics,
        zoneStats,
        groupPerformance,
        alerts,
        multiplications,
        weeklyTrends,
      };
    } catch (error) {
      console.error('Error loading discipleship data:', error);
      throw error;
    }
  }
  // Agregar estos métodos al servicio existente:

  static async getDashboardStatsByLevel(level: number): Promise<any> {
    const data = await ApiService.get(`/discipleship/dashboard-stats?level=${level}`);
    return data as any;
  }

  static async getSupervisorSubordinates(supervisorId: string): Promise<any[]> {
    const data = await ApiService.get(`/discipleship/supervisors/${supervisorId}/subordinates`);
    return data as any[];
  }

  static async getGoals(status?: string): Promise<any[]> {
    const url = status ? `/discipleship/goals?status=${status}` : '/discipleship/goals';
    const data = await ApiService.get(url);
    return data as any[];
  }

  // Helper para mapear prioridad a tipo de alerta
  private static mapAlertPriorityToType(
    priority: number
  ): 'critical' | 'warning' | 'info' | 'success' {
    switch (priority) {
      case 1:
        return 'critical';
      case 2:
        return 'warning';
      case 4:
        return 'success';
      default:
        return 'info';
    }
  }
}
