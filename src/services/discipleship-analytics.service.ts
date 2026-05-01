import { ApiService } from './api.service';

// =====================================================
// TIPOS
// =====================================================

export type MultiplicationTypeStatus =
  | 'planned'
  | 'in_progress'
  | 'successful'
  | 'struggling'
  | 'failed';
export type MultiplicationType = 'standard' | 'planned' | 'emergency';
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
  zone_name?: string; // Alias para compatibilidad
  zoneID?: string;
  totalGroups: number;
  total_groups?: number; // Alias para compatibilidad
  totalMembers: number;
  total_members?: number; // Alias para compatibilidad
  avgAttendance: number;
  avg_attendance?: number; // Alias para compatibilidad
  isActive: boolean;
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

export interface MultiplicationWithDetails {
  id: string;
  parentGroupId: string;
  parentLeaderId: string;
  newGroupId: string | null;
  newLeaderId: string | null;
  multiplicationDate: string;
  multiplicationType: MultiplicationType;
  successStatus: MultiplicationTypeStatus;
  initialMembers: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  parentGroupName: string;
  newGroupName: string | null;
  parentLeaderName: string;
  newLeaderName: string | null;
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
  // Obtener analytics generales
  static async getAnalytics(zoneName?: string): Promise<DiscipleshipAnalytics> {
    const url = zoneName
      ? `/discipleship/analytics?zone_name=${zoneName}`
      : `/discipleship/analytics`;

    const data = (await ApiService.get(url)) as Record<string, number>;

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
    const data = await ApiService.get(`/discipleship/analytics/zones`);

    // El backend devuelve snake_case + is_active (basado en grupos activos)
    // Devolver ambos formatos para compatibilidad
    return (data as any[]).map((zone: any) => ({
      zoneName: zone.zone_name || 'Sin zona',
      zone_name: zone.zone_name || 'Sin zona', // Alias para compatibilidad
      zoneID: zone.zone_id || zone.zoneId,
      totalGroups: zone.total_groups || 0,
      total_members: zone.total_groups || 0, // Alias para compatibilidad
      totalMembers: zone.total_members || 0,
      avgAttendance: zone.avg_attendance || 0,
      avg_attendance: zone.avg_attendance || 0, // Alias para compatibilidad
      isActive: zone.is_active || false,
      growthRate: 0,
      healthIndex: 0,
    }));
  }

  // Obtener rendimiento de grupos
  static async getGroupPerformance(): Promise<GroupPerformance[]> {
    const data = await ApiService.get(`/discipleship/analytics/performance`);

    return (data as GroupPerformance[]).map((group: GroupPerformance) => ({
      groupId: group.groupId || '',
      groupName: group.groupName || 'Sin nombre',
      leaderName: group.leaderName || 'Sin líder',
      avgAttendance: group.avgAttendance || 0,
      growthRate: group.growthRate || 0,
      spiritualTemp: group.spiritualTemp || 0,
      status: group.status || 'active',
      lastReportDate: group.lastReportDate || '',
    }));
  }

  // Obtener alertas
  static async getAlerts(resolved = false): Promise<DiscipleshipAlert[]> {
    const data = await ApiService.get(`/discipleship/alerts?resolved=${resolved}`);

    return (data as DiscipleshipAlert[]).map((alert: DiscipleshipAlert) => ({
      id: alert.id || '',
      type: this.mapAlertPriorityToType(alert.priority),
      title: alert.title || '',
      message: alert.message || '',
      groupName: alert.groupName,
      userName: alert.userName,
      createdAt: alert.createdAt || '',
      priority: alert.priority || 3,
      actionRequired: alert.actionRequired || false,
      resolved: alert.resolved || false,
    }));
  }

  // Obtener multiplicaciones
  static async getMultiplications(): Promise<MultiplicationTracker[]> {
    const data = await ApiService.get(`/discipleship/multiplications`);

    return (data as MultiplicationTracker[]).map((mult: MultiplicationTracker) => ({
      id: mult.id || '',
      parentGroupName: mult.parentGroupName || '',
      newGroupName: mult.newGroupName,
      parentLeaderName: mult.parentLeaderName || '',
      newLeaderName: mult.newLeaderName || '',
      multiplicationDate: mult.multiplicationDate || '',
      status: mult.status || 'planned',
      initialMembers: mult.initialMembers || 0,
    }));
  }

  // Obtener tendencias semanales agregadas (para dashboards)
  static async getWeeklyTrends(weeks: number = 12): Promise<WeeklyTrend[]> {
    const url = `/discipleship/weekly-trends?weeks=${weeks}`;
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
      const response = await ApiService.get(`/discipleship/groups?leader_id=${leaderId}`);
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
