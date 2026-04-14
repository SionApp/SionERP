import type {
  CreateZoneRequest,
  DiscipleshipGroup,
  UpdateZoneRequest,
  Zone,
  ZoneStats,
  ZoneMapResponse,
} from '@/types/discipleship.types';

import { User } from '@/types/user.types';
import { ApiService } from './api.service';

export class ZonesService {
  static async getZones(filters?: { is_active?: boolean }): Promise<Zone[]> {
    const params = new URLSearchParams();

    if (filters?.is_active !== undefined) {
      params.append('is_active', filters.is_active.toString());
    }

    const query = params.toString();
    return ApiService.get(`/zones${query ? `?${query}` : ''}`);
  }

  static async getZone(zoneId: string): Promise<Zone> {
    return ApiService.get(`/zones/${zoneId}`);
  }

  static async createZone(data: CreateZoneRequest): Promise<{ zone_id: string; message: string }> {
    return ApiService.post(`/zones`, data);
  }

  static async updateZone(zoneId: string, data: UpdateZoneRequest): Promise<{ message: string }> {
    return ApiService.put(`/zones/${zoneId}`, data);
  }

  static async deleteZone(zoneId: string): Promise<{ message: string }> {
    return ApiService.delete(`/zones/${zoneId}`);
  }

  static getZoneStats(zoneId: string): Promise<ZoneStats> {
    return ApiService.get(`/zones/${zoneId}/stats`);
  }

  static async getAllZoneStats(): Promise<ZoneStats[]> {
    const zones = await this.getZones({ is_active: true });
    const statsPromises = zones.map(z =>
      this.getZoneStats(z.id).catch(() => ({
        zone_id: z.id,
        zone_name: z.name,
        total_groups: z.total_groups || 0,
        total_members: z.total_members || 0,
        avg_attendance: z.avg_attendance || 0,
        growth_rate: 0,
        active_leaders: 0,
        multiple_groups: 0,
      }))
    );
    return Promise.all(statsPromises) as unknown as ZoneStats[];
  }

  static async getZoneGroups(zoneId: string): Promise<DiscipleshipGroup[]> {
    return ApiService.get(`/zones/${zoneId}/groups`);
  }

  static async getMapData(filters?: {
    is_active?: boolean;
    zone_id?: string;
  }): Promise<ZoneMapResponse> {
    const params = new URLSearchParams();

    if (filters?.is_active !== undefined) {
      params.append('is_active', String(filters.is_active));
    }

    if (filters?.zone_id) {
      params.append('zone_id', filters.zone_id);
    }

    const query = params.toString();
    return ApiService.get(`/zones/map${query ? `?${query}` : ''}`);
  }

  static async assignGroupToZone(zoneId: string, groupId: string): Promise<{ message: string }> {
    return ApiService.put(`/zones/${zoneId}/groups/${groupId}`);
  }

  static async assignUserToZone(zoneId: string, userId: string): Promise<{ message: string }> {
    return ApiService.put(`/zones/${zoneId}/users/${userId}`);
  }

  static async getAvailableSupervisors(): Promise<User[]> {
    const response = await ApiService.get<{ users: User[]; total: number } | User[]>(
      `/users?role=supervisor,staff,pastor`
    );

    if (Array.isArray(response)) return response;
    if (response && typeof response === 'object' && 'users' in response)
      return response.users || [];

    return [];
  }
}
