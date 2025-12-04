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
    if (filters?.zone_name) params.append('zone_name', filters.zone_name);
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

  static async getSubordinates(supervisorId: string): Promise<DiscipleshipHierarchy[]> {
    return ApiService.get(`${this.baseUrl}/hierarchy/${supervisorId}/subordinates`);
  }

  // =====================================================
  // ANALYTICS
  // =====================================================

  static async getAnalytics(zoneName?: string): Promise<DiscipleshipAnalytics> {
    const url = zoneName
      ? `${this.baseUrl}/analytics?zone_name=${zoneName}`
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
    reporter_id?: string;
  }): Promise<DiscipleshipReport[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.reporter_id) params.append('reporter_id', filters.reporter_id);

    const queryString = params.toString();
    const url = `${this.baseUrl}/reports${queryString ? `?${queryString}` : ''}`;
    return ApiService.get(url);
  }

  static async createReport(
    data: CreateReportRequest
  ): Promise<{ report_id: string; message: string }> {
    return ApiService.post(`${this.baseUrl}/reports`, data);
  }

  static async approveReport(id: string): Promise<{ message: string }> {
    return ApiService.put(`${this.baseUrl}/reports/${id}/approve`, {});
  }

  static async rejectReport(id: string, feedback: string): Promise<{ message: string }> {
    return ApiService.put(`${this.baseUrl}/reports/${id}/reject`, { feedback });
  }

  // =====================================================
  // ALERTAS
  // =====================================================

  static async getAlerts(filters?: {
    resolved?: boolean;
    zone_name?: string;
    priority?: number;
  }): Promise<DiscipleshipAlert[]> {
    const params = new URLSearchParams();
    if (filters?.resolved !== undefined) params.append('resolved', filters.resolved.toString());
    if (filters?.zone_name) params.append('zone_name', filters.zone_name);
    if (filters?.priority) params.append('priority', filters.priority.toString());

    const queryString = params.toString();
    const url = `${this.baseUrl}/alerts${queryString ? `?${queryString}` : ''}`;
    return ApiService.get(url);
  }

  static async resolveAlert(id: string): Promise<{ message: string }> {
    return ApiService.put(`${this.baseUrl}/alerts/${id}/resolve`, {});
  }

  static async generateAutomaticAlerts(): Promise<{ alerts_created: number; message: string }> {
    return ApiService.post(`${this.baseUrl}/alerts/generate`, {});
  }
}
