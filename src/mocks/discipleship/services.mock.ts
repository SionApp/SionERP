import {
  DiscipleshipGroup,
  DiscipleshipReport,
  DiscipleshipMetrics,
  WeeklyLeaderReport,
  BiweeklyAuxiliaryReport,
  MonthlyGeneralReport,
  QuarterlyCoordinatorReport,
  ZonePerformance,
  LeaderPerformance,
  Alert,
  Goal,
} from '@/types/discipleship.types';
import {
  mockGroups,
  mockMetrics,
  mockWeeklyReports,
  mockZonePerformance,
  mockLeaderPerformance,
  mockAlerts,
  mockGoals,
  mockGrowthData,
  mockAttendanceData,
  mockGroupStatusData,
  mockSpiritualHealthData,
} from './data.mock';

// Simulated API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class DiscipleshipMockService {
  // Groups management
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
      supervisor_id: group.supervisor_id,
      meeting_location: group.meeting_location,
      meeting_day: group.meeting_day,
      meeting_time: group.meeting_time,
      member_count: group.member_count || 0,
      active_members: group.active_members || 0,
      status: group.status || 'active',
      zone_name: group.zone_name,
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

  // Metrics management
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
    // Simulate saving the report
    const reportId = `report-${Date.now()}`;
    return { success: true, id: reportId };
  }

  static async submitBiweeklyReport(
    report: BiweeklyAuxiliaryReport
  ): Promise<{ success: boolean; id: string }> {
    await delay(700);
    const reportId = `aux-report-${Date.now()}`;
    return { success: true, id: reportId };
  }

  static async submitMonthlyReport(
    report: MonthlyGeneralReport
  ): Promise<{ success: boolean; id: string }> {
    await delay(800);
    const reportId = `monthly-report-${Date.now()}`;
    return { success: true, id: reportId };
  }

  static async submitQuarterlyReport(
    report: QuarterlyCoordinatorReport
  ): Promise<{ success: boolean; id: string }> {
    await delay(900);
    const reportId = `quarterly-report-${Date.now()}`;
    return { success: true, id: reportId };
  }

  // Dashboard data
  static async getDashboardStats(level: number, userId: string) {
    await delay(400);

    switch (level) {
      case 5: // Pastor
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

      case 4: // Coordinator
        return {
          totalGroups: 18,
          totalMembers: 216,
          totalLeaders: 18,
          totalSupervisors: 6,
          zoneGrowthRate: 15.2,
          zoneHealthIndex: 8.1,
          quarterlyGoalProgress: 68,
        };

      case 3: // General Supervisor
        return {
          totalGroups: 8,
          totalMembers: 96,
          activeLeaders: 8,
          auxiliarySupervisors: 3,
          territoryGrowthRate: 18.5,
          territoryHealthIndex: 8.7,
          monthlyGoalProgress: 82,
        };

      case 2: // Auxiliary Supervisor
        return {
          groupsUnderSupervision: 4,
          totalMembers: 48,
          averageAttendance: 89,
          leadersSupportNeeded: 1,
          biweeklyGoalProgress: 91,
        };

      case 1: // Group Leader
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
    // Filter alerts based on user level and responsibilities
    return mockAlerts.filter(alert => {
      if (level === 5) return true; // Pastor sees all
      if (level === 4) return alert.type !== 'info'; // Coordinator sees critical and warnings
      if (level === 3) return alert.type === 'critical'; // General supervisor sees only critical
      return []; // Levels 1-2 handle alerts differently
    });
  }

  static async getGoals(level: number, userId: string): Promise<Goal[]> {
    await delay(300);
    return mockGoals;
  }

  // Reports management
  static async getReports(filters?: {
    level?: number;
    status?: string;
    dateRange?: { start: string; end: string };
  }): Promise<DiscipleshipReport[]> {
    await delay(400);
    // Return mock reports based on filters
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

  // User hierarchy helpers
  static async getUserHierarchyLevel(userId: string): Promise<number> {
    await delay(100);
    // Mock logic to determine user level
    if (userId === '00000000-0000-0000-0000-000000000001') return 5; // Pastor
    if (
      ['00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003'].includes(
        userId
      )
    )
      return 4; // Coordinators
    if (
      [
        '00000000-0000-0000-0000-000000000004',
        '00000000-0000-0000-0000-000000000005',
        '00000000-0000-0000-0000-000000000006',
        '00000000-0000-0000-0000-000000000007',
      ].includes(userId)
    )
      return 3; // General Supervisors
    if (
      userId.includes('aux-supervisor') ||
      [
        '00000000-0000-0000-0000-000000000008',
        '00000000-0000-0000-0000-000000000009',
        '00000000-0000-0000-0000-000000000010',
        '00000000-0000-0000-0000-000000000011',
        '00000000-0000-0000-0000-000000000012',
        '00000000-0000-0000-0000-000000000013',
      ].includes(userId)
    )
      return 2; // Auxiliary Supervisors
    return 1; // Group Leaders
  }

  static async getUserZone(userId: string): Promise<string | null> {
    await delay(100);
    // Mock logic to get user zone
    const user = mockGroups.find(g => g.leader_id === userId || g.supervisor_id === userId);
    return user?.zone_name || null;
  }

  static async getSubordinates(userId: string): Promise<string[]> {
    await delay(200);
    // Mock logic to get user's subordinates
    return [];
  }
}
