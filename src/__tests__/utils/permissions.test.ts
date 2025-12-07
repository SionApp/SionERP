import {
  mockAlerts,
  mockAttendanceData,
  mockGoals,
  mockGroupStatusData,
  mockGroups,
  mockGrowthData,
  mockLeaderPerformance,
  mockMetrics,
  mockSpiritualHealthData,
  mockZonePerformance,
} from '@/mocks/discipleship/data.mock';
import {
  Alert,
  DiscipleshipGroup,
  DiscipleshipMetrics,
  DiscipleshipReport,
  Goal,
  LeaderPerformance,
  WeeklyLeaderReport,
  ZonePerformance,
} from '@/types/discipleship.types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class DiscipleshipMockService {
  static async getGroups(filters?: {
    zone?: string;
    supervisor?: string;
    status?: string;
  }): Promise<DiscipleshipGroup[]> {
    await delay(300);
    let filteredGroups = [...mockGroups];

    if (filters?.zone) {
      filteredGroups = filteredGroups.filter(g => g.zone_name === filters.zone);
    }
    if (filters?.supervisor) {
      filteredGroups = filteredGroups.filter(g => g.supervisor_id === filters.supervisor);
    }
    if (filters?.status) {
      filteredGroups = filteredGroups.filter(g => g.status === filters.status);
    }

    return filteredGroups;
  }

  static async getGroupById(id: string): Promise<DiscipleshipGroup | null> {
    await delay(200);
    return mockGroups.find(g => g.id === id) || null;
  }

  static async createGroup(group: Partial<DiscipleshipGroup>): Promise<DiscipleshipGroup> {
    await delay(500);
    const newGroup: DiscipleshipGroup = {
      id: `group-${Date.now()}`,
      group_name: group.group_name!,
      leader_id: group.leader_id!,
      supervisor_id: group.supervisor_id || null,
      meeting_location: group.meeting_location || null,
      meeting_day: group.meeting_day || null,
      meeting_time: group.meeting_time || null,
      member_count: group.member_count || 0,
      active_members: group.active_members || 0,
      status: group.status || 'active',
      zone_name: group.zone_name || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockGroups.push(newGroup);
    return newGroup;
  }

  static async updateGroup(
    id: string,
    updates: Partial<DiscipleshipGroup>
  ): Promise<DiscipleshipGroup> {
    await delay(400);
    const groupIndex = mockGroups.findIndex(g => g.id === id);
    if (groupIndex === -1) throw new Error('Group not found');

    mockGroups[groupIndex] = {
      ...mockGroups[groupIndex],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    return mockGroups[groupIndex];
  }

  static async getGroupMetrics(
    groupId: string,
    startDate?: string,
    endDate?: string
  ): Promise<DiscipleshipMetrics[]> {
    await delay(300);
    let filteredMetrics = mockMetrics.filter(m => m.group_id === groupId);

    if (startDate) {
      filteredMetrics = filteredMetrics.filter(m => m.week_date >= startDate);
    }
    if (endDate) {
      filteredMetrics = filteredMetrics.filter(m => m.week_date <= endDate);
    }

    return filteredMetrics;
  }

  static async submitWeeklyReport(
    report: WeeklyLeaderReport
  ): Promise<{ success: boolean; id: string }> {
    await delay(600);
    const reportId = `report-${Date.now()}`;
    return { success: true, id: reportId };
  }

  static async getDashboardStats(level: number, userId: string) {
    await delay(400);

    switch (level) {
      case 5:
        return {
          totalGroups: 36,
          totalMembers: 432,
          totalLeaders: 36,
          totalSupervisors: 12,
          growthRate: 12.8,
          healthIndex: 8.3,
          activeZones: 4,
          monthlyGoalProgress: 75,
        };
      case 4:
        return {
          totalGroups: 18,
          totalMembers: 216,
          totalLeaders: 18,
          totalSupervisors: 6,
          zoneGrowthRate: 15.2,
          zoneHealthIndex: 8.1,
          quarterlyGoalProgress: 68,
        };
      case 3:
        return {
          totalGroups: 8,
          totalMembers: 96,
          activeLeaders: 8,
          auxiliarySupervisors: 3,
          territoryGrowthRate: 18.5,
          territoryHealthIndex: 8.7,
          monthlyGoalProgress: 82,
        };
      case 2:
        return {
          groupsUnderSupervision: 4,
          totalMembers: 48,
          averageAttendance: 89,
          leadersSupportNeeded: 1,
          biweeklyGoalProgress: 91,
        };
      case 1:
        return {
          groupMembers: 12,
          weeklyAttendance: 10,
          monthlyGrowth: 2,
          spiritualTemperature: 8.5,
          visitorsThisMonth: 5,
          weeklyGoalProgress: 85,
        };
      default:
        return {};
    }
  }

  static async getZonePerformance(): Promise<ZonePerformance[]> {
    await delay(350);
    return mockZonePerformance;
  }

  static async getLeaderPerformance(): Promise<LeaderPerformance[]> {
    await delay(380);
    return mockLeaderPerformance;
  }

  static async getGrowthData() {
    await delay(300);
    return mockGrowthData;
  }

  static async getAttendanceData() {
    await delay(280);
    return mockAttendanceData;
  }

  static async getGroupStatusData() {
    await delay(250);
    return mockGroupStatusData;
  }

  static async getSpiritualHealthData() {
    await delay(260);
    return mockSpiritualHealthData;
  }

  static async getAlerts(level: number, userId: string): Promise<Alert[]> {
    await delay(200);
    return mockAlerts.filter(alert => {
      if (level === 5) return true;
      if (level === 4) return alert.type !== 'info';
      if (level === 3) return alert.type === 'critical';
      return [];
    });
  }

  static async getGoals(level: number, userId: string): Promise<Goal[]> {
    await delay(300);
    return mockGoals;
  }

  static async getReports(filters?: {
    level?: number;
    status?: string;
    dateRange?: { start: string; end: string };
  }): Promise<DiscipleshipReport[]> {
    await delay(400);
    return [];
  }

  static async approveReport(reportId: string): Promise<{ success: boolean }> {
    await delay(500);
    return { success: true };
  }

  static async requestReportRevision(
    reportId: string,
    feedback: string
  ): Promise<{ success: boolean }> {
    await delay(600);
    return { success: true };
  }

  static async getUserHierarchyLevel(userId: string): Promise<number> {
    await delay(100);
    if (userId === '00000000-0000-0000-0000-000000000001') return 5;
    if (
      ['00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003'].includes(
        userId
      )
    )
      return 4;
    return 1;
  }

  static async getUserZone(userId: string): Promise<string | null> {
    await delay(100);
    const user = mockGroups.find(g => g.leader_id === userId || g.supervisor_id === userId);
    return user?.zone_name || null;
  }

  static async getSubordinates(userId: string): Promise<string[]> {
    await delay(200);
    return [];
  }
}
