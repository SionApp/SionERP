import type {
  AssignHierarchyRequest,
  CreateGroupRequest,
  CreateMetricsRequest,
  CreateReportRequest,
  DiscipleshipAlert,
  DiscipleshipAnalytics,
  DiscipleshipGroup,
  DiscipleshipHierarchy,
  DiscipleshipMetrics,
  DiscipleshipReport,
  GroupFilters,
  GroupPerformance,
  PaginatedResponse,
  UpdateGroupRequest,
  ZoneStats,
} from '@/types/discipleship.types';
import { ApiService } from './api.service';

export class DiscipleshipService {
  private static baseUrl = '/discipleship';

  // =====================================================
  // GRUPOS
  // =====================================================

  static async getGroups(filters?: GroupFilters): Promise<PaginatedResponse<DiscipleshipGroup[]>> {
    const params = new URLSearchParams();
    if (filters?.zone_id) params.append('zone_id', filters.zone_id);
    else if (filters?.zone_name) params.append('zone_name', filters.zone_name); // temporal para compatibilidad con frontend - no olvidar refactorizar frontend para usar solo zone_id :()

    if (filters?.status) params.append('status', filters.status);
    if (filters?.leader_id) params.append('leader_id', filters.leader_id);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const url = `${this.baseUrl}/groups${queryString ? `?${queryString}` : ''}`;
    return ApiService.get(url);
  }

  static async getGroup(id: string): Promise<DiscipleshipGroup> {
    return ApiService.get(`${this.baseUrl}/groups/${id}`);
  }

  static async createGroup(
    data: CreateGroupRequest
  ): Promise<{ group_id: string; message: string }> {
    return ApiService.post(`${this.baseUrl}/groups`, data);
  }

  static async updateGroup(id: string, data: UpdateGroupRequest): Promise<{ message: string }> {
    return ApiService.put(`${this.baseUrl}/groups/${id}`, data);
  }

  static async deleteGroup(id: string): Promise<{ message: string }> {
    return ApiService.delete(`${this.baseUrl}/groups/${id}`);
  }

  // =====================================================
  // JERARQUÍA
  // =====================================================

  static async getHierarchy(userId?: string): Promise<DiscipleshipHierarchy[]> {
    const url = userId
      ? `${this.baseUrl}/hierarchy?user_id=${userId}`
      : `${this.baseUrl}/hierarchy`;
    return ApiService.get(url);
  }

  static async assignHierarchy(data: AssignHierarchyRequest): Promise<{ message: string }> {
    return ApiService.post(`${this.baseUrl}/hierarchy`, data);
  }

  static async getSubordinates(supervisorId?: string): Promise<DiscipleshipHierarchy[]> {
    if (supervisorId) {
      return ApiService.get(`${this.baseUrl}/hierarchy/${supervisorId}/subordinates`);
    }
    return ApiService.get(`${this.baseUrl}/subordinates`);
  }

  // =====================================================
  // ANALYTICS
  // =====================================================

  static async getAnalytics(zoneId?: string): Promise<DiscipleshipAnalytics> {
    const url = zoneId
      ? `${this.baseUrl}/analytics?zone_name=${zoneId}`
      : `${this.baseUrl}/analytics`;
    return ApiService.get(url);
  }

  static async getZoneStats(): Promise<ZoneStats[]> {
    return ApiService.get(`${this.baseUrl}/analytics/zones`);
  }

  static async getGroupPerformance(): Promise<GroupPerformance[]> {
    return ApiService.get(`${this.baseUrl}/analytics/performance`);
  }

  // =====================================================
  // MÉTRICAS
  // =====================================================

  static async getMetrics(filters?: {
    group_id?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<DiscipleshipMetrics[]> {
    const params = new URLSearchParams();
    if (filters?.group_id) params.append('group_id', filters.group_id);
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);

    const queryString = params.toString();
    const url = `${this.baseUrl}/metrics${queryString ? `?${queryString}` : ''}`;
    return ApiService.get(url);
  }

  static async createMetrics(
    data: CreateMetricsRequest
  ): Promise<{ metrics_id: string; message: string }> {
    return ApiService.post(`${this.baseUrl}/metrics`, data);
  }

  // =====================================================
  // REPORTES
  // =====================================================

  static async getReports(filters?: {
    status?: string;
    type?: string;
    report_type?: string;
    report_level?: number;
    reporter_id?: string;
    zone_name?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  }): Promise<DiscipleshipReport[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.report_type) params.append('report_type', filters.report_type);
    if (filters?.report_level) params.append('report_level', filters.report_level.toString());
    if (filters?.reporter_id) params.append('reporter_id', filters.reporter_id);
    if (filters?.zone_name) params.append('zone_name', filters.zone_name);
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const queryString = params.toString();
    const url = `${this.baseUrl}/reports${queryString ? `?${queryString}` : ''}`;
    return ApiService.get(url);
  }

  static async getReportById(id: string): Promise<DiscipleshipReport> {
    return ApiService.get(`${this.baseUrl}/reports/${id}`);
  }

  static async createReport(
    data: CreateReportRequest
  ): Promise<{ report_id: string; message: string }> {
    return ApiService.post(`${this.baseUrl}/reports`, data);
  }

  static async updateReport(
    id: string,
    data: Partial<CreateReportRequest>
  ): Promise<DiscipleshipReport> {
    return ApiService.put(`${this.baseUrl}/reports/${id}`, data);
  }

  static async submitReport(id: string): Promise<{ message: string }> {
    return ApiService.put(`${this.baseUrl}/reports/${id}/submit`, {});
  }

  static async approveReport(id: string, notes?: string): Promise<{ message: string }> {
    return ApiService.put(`${this.baseUrl}/reports/${id}/approve`, notes ? { notes } : {});
  }

  static async rejectReport(id: string, feedback: string): Promise<{ message: string }> {
    return ApiService.put(`${this.baseUrl}/reports/${id}/reject`, { feedback });
  }

  static async deleteReport(id: string): Promise<{ message: string }> {
    return ApiService.delete(`${this.baseUrl}/reports/${id}`);
  }

  // =====================================================
  // ALERTAS
  // =====================================================

  static async getAlerts(filters?: {
    resolved?: boolean;
    zone_name?: string;
    priority?: number;
    alert_type?: string;
    limit?: number;
  }): Promise<DiscipleshipAlert[]> {
    const params = new URLSearchParams();
    if (filters?.resolved !== undefined) params.append('resolved', filters.resolved.toString());
    if (filters?.zone_name) params.append('zone_name', filters.zone_name);
    if (filters?.priority) params.append('priority', filters.priority.toString());
    if (filters?.alert_type) params.append('alert_type', filters.alert_type);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const url = `${this.baseUrl}/alerts${queryString ? `?${queryString}` : ''}`;
    return ApiService.get(url);
  }

  static async getAlertById(id: string): Promise<DiscipleshipAlert> {
    return ApiService.get(`${this.baseUrl}/alerts/${id}`);
  }

  static async createAlert(data: {
    alert_type: string;
    title: string;
    message: string;
    priority: number;
    related_user_id?: string;
    related_group_id?: string;
    zone_name?: string;
  }): Promise<DiscipleshipAlert> {
    return ApiService.post(`${this.baseUrl}/alerts`, data);
  }

  static async resolveAlert(id: string, notes?: string): Promise<{ message: string }> {
    return ApiService.put(
      `${this.baseUrl}/alerts/${id}/resolve`,
      notes ? { resolution_notes: notes } : {}
    );
  }

  static async generateAutomaticAlerts(): Promise<{ alerts_created: number; message: string }> {
    return ApiService.post(`${this.baseUrl}/alerts/generate`, {});
  }
}
