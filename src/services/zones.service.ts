import type { ZoneStats } from '@/types/discipleship.types';
import {
  CreateZoneRequest,
  DiscipleshipGroup,
  UpdateZoneRequest,
  Zone,
} from '@/types/discipleship.types';
import { User } from '@/types/user.types';
import { ApiService } from './api.service';

export class ZonesService {
  static async getZones(filters?: { is_active?: boolean }): Promise<Zone[]> {
    const params = new URLSearchParams();

    if (filters?.is_active !== undefined) {
      params.append('is_active', filters.is_active.toString());
    }

    return ApiService.get(`/zones?${params}`);
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

  static async getZoneStats(zoneId: string): Promise<ZoneStats> {
    return ApiService.get(`/zones/${zoneId}/stats`);
  }

  static async getAllZoneStats(): Promise<ZoneStats[]> {
    const zones = await this.getZones({ is_active: true });
    const statsPromises = zones.map(z =>
      this.getZoneStats(z.id).catch(() => ({
        zoneId: z.id,
        zoneName: z.name,
        totalGroups: z.total_groups || 0,
        totalMembers: z.total_members || 0,
        avgAttendance: z.avg_attendance || 0,
        growthRate: 0,
        healthIndex: 0,
      }))
    );
    return (await Promise.all(statsPromises)) as unknown as ZoneStats[];
  }

  static async getZoneGroups(zoneId: string): Promise<DiscipleshipGroup[]> {
    return ApiService.get(`/zones/${zoneId}/groups`);
  }

  static async assignGroupToZone(zoneId: string, groupId: string): Promise<{ message: string }> {
    return ApiService.put(`/zones/${zoneId}/groups/${groupId}`);
  }

  static async assignUserToZone(zoneId: string, userId: string): Promise<{ message: string }> {
    return ApiService.put(`/zones/${zoneId}/users/${userId}`);
  }

  static async getAvailableSupervisors(): Promise<User[]> {
    return ApiService.get(`/users?role=supervisor,staff,pastor`);
  }
}
