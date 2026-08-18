/* eslint-disable @typescript-eslint/no-explicit-any */
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
  auxiliarySupervisors: number;
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
// CASCADE ASSIGNMENT TYPES (Phase 1-3)
// =====================================================

export interface GoalAssignment {
  id: string;
  goal_id: string;
  assigned_to: string;
  assigned_by: string;
  assigned_level: number;
  target_value: number;
  current_value: number;
  progress_percentage: number;
  parent_assignment_id?: string | null;
  status: string;
  notes?: string | null;
  created_at: string;
  assigned_to_name?: string;
}

export interface AssignmentTreeNode extends GoalAssignment {
  children: AssignmentTreeNode[];
}

export interface CreateAssignmentsPayload {
  assignments: Array<{
    assigned_to: string;
    target_value: number;
    parent_assignment_id?: string | null;
    notes?: string | null;
  }>;
}

export interface ActiveAssignment {
  assignment_id: string;
  goal_id: string;
  goal_title: string;
  goal_type: string;
  target_value: number;
  current_value: number;
  deadline: string;
  already_reported_for_period: boolean;
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
      auxiliarySupervisors: data.auxiliary_supervisors || 0,
      dateRange: { from: '', to: '' },
    };
  }

  // Obtener estadísticas por zona
  static async getZoneStats(): Promise<ZoneStats[]> {
    let data: any;
    try {
      data = await ApiService.get(`/zones`);
    } catch {
      return [];
    }

    // El backend devuelve snake_case + is_active (basado en grupos activos)
    // Devolver ambos formatos para compatibilidad
    // /zones devuelve { id, name, total_groups, total_members, avg_attendance, is_active }
    return ((data as any[]) || []).map((zone: any) => ({
      zoneName: zone.name || zone.zone_name || 'Sin zona',
      zone_name: zone.name || zone.zone_name || 'Sin zona',
      zoneID: zone.id || zone.zone_id,
      totalGroups: zone.total_groups || 0,
      total_members: zone.total_members || 0,
      totalMembers: zone.total_members || 0,
      avgAttendance: zone.avg_attendance || 0,
      avg_attendance: zone.avg_attendance || 0,
      isActive: zone.is_active || false,
      growthRate: zone.growth_rate || 0,
      healthIndex: zone.health_index || 0,
    }));
  }

  static async getGroupPerformanceList(): Promise<GroupPerformance[]> {
    try {
      const data = (await ApiService.get('/discipleship/analytics')) as Record<string, unknown>;
      return this.mapGroupPerformance((data?.group_performance as any[]) || []);
    } catch {
      return [];
    }
  }

  private static mapGroupPerformance(list: any[]): GroupPerformance[] {
    return (list || []).map((g: any) => ({
      groupId: g.group_id || '',
      groupName: g.group_name || 'Sin nombre',
      leaderName: g.leader_name || 'Sin líder',
      avgAttendance: g.avg_attendance || 0,
      growthRate: g.growth_rate || 0,
      spiritualTemp: g.spiritual_temp || 0,
      status: g.status || 'active',
      lastReportDate: g.last_report_date || '',
    }));
  }

  // Obtener alertas
  static async getAlerts(resolved = false): Promise<DiscipleshipAlert[]> {
    const data = await ApiService.get(`/discipleship/alerts?resolved=${resolved}`);

    return ((data as any[]) || []).map((alert: any) => ({
      id: alert.id || '',
      type: this.mapAlertPriorityToType(alert.priority),
      title: alert.title || '',
      message: alert.message || '',
      groupName: alert.group_name || alert.groupName || undefined,
      userName: alert.user_name || alert.userName || undefined,
      createdAt: alert.created_at || alert.createdAt || '',
      priority: alert.priority || 3,
      actionRequired: alert.action_required ?? alert.actionRequired ?? false,
      resolved: alert.resolved || false,
    }));
  }

  // Obtener multiplicaciones
  static async getMultiplications(): Promise<MultiplicationTracker[]> {
    const data = await ApiService.get(`/discipleship/multiplications`);

    return ((data as any[]) || []).map((mult: any) => ({
      id: mult.id || '',
      parentGroupName: mult.parent_group_name || mult.parentGroupName || '',
      newGroupName: mult.new_group_name || mult.newGroupName || null,
      parentLeaderName: mult.parent_leader_name || mult.parentLeaderName || '',
      newLeaderName: mult.new_leader_name || mult.newLeaderName || null,
      multiplicationDate: mult.multiplication_date || mult.multiplicationDate || '',
      status: mult.success_status || mult.status || 'planned',
      initialMembers: mult.initial_members ?? mult.initialMembers ?? 0,
    }));
  }

  // Obtener tendencias semanales agregadas (para dashboards)
  static async getWeeklyTrends(weeks: number = 12): Promise<WeeklyTrend[]> {
    const url = `/discipleship/weekly-trends?weeks=${weeks}`;
    const data = await ApiService.get(url);

    return ((data as any[]) || []).map((trend: any) => ({
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
      // Ambos ya vienen scoped desde el backend según el nivel jerárquico de quien
      // consulta — antes se estimaban con divisores arbitrarios (÷3, ÷4) sin
      // relación con la data real.
      groupsUnderSupervision: level === 2 ? analytics.totalGroups : undefined,
      auxiliarySupervisors: level >= 3 ? analytics.auxiliarySupervisors : undefined,
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
      const groups = (response as any).data || [];

      if (groups.length === 0) return null;

      const group = groups[0];

      return {
        groupId: group.id,
        groupName: group.group_name,
        memberCount: group.member_count || 0,
        activeMembers: group.active_members || 0,
        avgAttendance:
          group.member_count > 0
            ? Math.round((group.active_members / group.member_count) * 100)
            : 0,
        spiritualTemperature: group.spiritual_temperature || 0,
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
    const [analyticsResult, zoneResult, alertsResult, multsResult, trendsResult] =
      await Promise.allSettled([
        ApiService.get('/discipleship/analytics') as Promise<any>,
        this.getZoneStats(),
        this.getAlerts(),
        this.getMultiplications(),
        this.getWeeklyTrends(),
      ]);

    const rawAnalytics = analyticsResult.status === 'fulfilled' ? analyticsResult.value : null;
    const zoneStats = zoneResult.status === 'fulfilled' ? zoneResult.value : [];
    const alerts = alertsResult.status === 'fulfilled' ? alertsResult.value : [];
    const multiplications = multsResult.status === 'fulfilled' ? multsResult.value : [];
    const weeklyTrends = trendsResult.status === 'fulfilled' ? trendsResult.value : [];

    if (analyticsResult.status === 'rejected')
      console.error('Analytics fetch failed:', analyticsResult.reason);
    if (zoneResult.status === 'rejected')
      console.error('Zone stats fetch failed:', zoneResult.reason);
    if (alertsResult.status === 'rejected')
      console.error('Alerts fetch failed:', alertsResult.reason);
    if (multsResult.status === 'rejected')
      console.error('Multiplications fetch failed:', multsResult.reason);
    if (trendsResult.status === 'rejected')
      console.error('Weekly trends fetch failed:', trendsResult.reason);

    const analytics: DiscipleshipAnalytics = {
      totalGroups: rawAnalytics?.total_groups || 0,
      totalMembers: rawAnalytics?.total_members || 0,
      averageAttendance: rawAnalytics?.average_attendance || 0,
      growthRate: rawAnalytics?.growth_rate || 0,
      activeLeaders: rawAnalytics?.active_leaders || 0,
      multiplications: rawAnalytics?.multiplications || 0,
      spiritualHealth: rawAnalytics?.spiritual_health || 0,
      auxiliarySupervisors: rawAnalytics?.auxiliary_supervisors || 0,
      dateRange: { from: '', to: '' },
    };

    const groupPerformance = this.mapGroupPerformance(rawAnalytics?.group_performance || []);

    return { analytics, zoneStats, groupPerformance, alerts, multiplications, weeklyTrends };
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

  static async createGoal(goalData: any): Promise<any> {
    return await ApiService.post('/discipleship/goals', goalData);
  }

  static async updateGoal(id: string, data: any): Promise<any> {
    return await ApiService.put(`/discipleship/goals/${id}`, data);
  }

  static async deleteGoal(id: string): Promise<void> {
    return await ApiService.delete(`/discipleship/goals/${id}`);
  }

  static async extendGoal(id: string, newDeadline: string, reason: string): Promise<any> {
    return await ApiService.post(`/discipleship/goals/${id}/extend`, {
      new_deadline: newDeadline,
      reason,
    });
  }

  static async closeIncomplete(
    id: string,
    reason: string,
    achievedPercentage: number
  ): Promise<any> {
    return await ApiService.post(`/discipleship/goals/${id}/close-incomplete`, {
      reason,
      achieved_percentage: achievedPercentage,
    });
  }

  // =====================================================
  // PHASE 1+2+3: CASCADE ASSIGNMENT & MANUAL PROGRESS
  // =====================================================

  static async getGoalActivity(goalId: string): Promise<
    {
      id: string;
      action: string;
      table: string;
      meta: string;
      user_name: string;
      created_at: string;
    }[]
  > {
    const data = await ApiService.get(`/discipleship/goals/${goalId}/activity`);
    return (data as any[]) ?? [];
  }

  static async getAvailableAssignees(
    goalId: string
  ): Promise<{ user_id: string; user_name: string; hierarchy_level: number }[]> {
    const data = await ApiService.get(`/discipleship/goals/${goalId}/available-assignees`);
    return (data as { user_id: string; user_name: string; hierarchy_level: number }[]) ?? [];
  }

  static async getAssignmentTree(goalId: string): Promise<AssignmentTreeNode> {
    const data = await ApiService.get(`/discipleship/goals/${goalId}/assignments`);
    return data as AssignmentTreeNode;
  }

  static async createAssignments(
    goalId: string,
    payload: CreateAssignmentsPayload
  ): Promise<GoalAssignment[]> {
    const data = await ApiService.post(`/discipleship/goals/${goalId}/assignments`, payload);
    return (data as { created: GoalAssignment[] }).created ?? [];
  }

  static async batchAssignToZones(
    goalId: string,
    defaultTargetValue?: number
  ): Promise<GoalAssignment[]> {
    const body =
      defaultTargetValue !== undefined ? { default_target_value: defaultTargetValue } : {};
    const data = await ApiService.post(
      `/discipleship/goals/${goalId}/assignments/batch-zones`,
      body
    );
    return (data as { created: GoalAssignment[] }).created ?? [];
  }

  static async getActiveManualAssignments(period: string): Promise<ActiveAssignment[]> {
    const data = await ApiService.get(
      `/discipleship/me/active-manual-assignments?period=${period}`
    );
    return (data as { assignments: ActiveAssignment[] }).assignments ?? [];
  }

  static async submitManualProgress(
    assignmentId: string,
    value: number,
    reportId: string | null,
    periodStart?: string,
    periodEnd?: string
  ): Promise<void> {
    await ApiService.post(`/discipleship/assignments/${assignmentId}/progress`, {
      value_reported: value,
      report_id: reportId,
      period_start: periodStart,
      period_end: periodEnd,
    });
  }

  static async deleteAssignment(assignmentId: string): Promise<void> {
    await ApiService.delete(`/discipleship/assignments/${assignmentId}`);
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
