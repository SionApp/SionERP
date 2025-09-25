// Discipleship hierarchy and organization types
export interface DiscipleshipHierarchy {
  id: string;
  user_id: string;
  hierarchy_level: 1 | 2 | 3 | 4 | 5;
  supervisor_id?: string;
  zone_name?: string;
  territory?: string;
  active_groups_assigned: number;
  created_at: string;
  updated_at: string;
}

export interface DiscipleshipGroup {
  id: string;
  group_name: string;
  leader_id: string;
  supervisor_id?: string;
  meeting_location?: string;
  meeting_address?: string;
  latitude?: number;
  longitude?: number;
  meeting_day?: string;
  meeting_time?: string;
  member_count: number;
  active_members: number;
  status: 'active' | 'inactive' | 'multiplying' | 'planned';
  zone_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Zone {
  id: string;
  name: string;
  description?: string;
  color: string;
  supervisor_id?: string;
  boundaries?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  created_at: string;
  updated_at: string;
}

export interface DiscipleshipReport {
  id: string;
  reporter_id: string;
  supervisor_id?: string;
  report_level: 1 | 2 | 3 | 4 | 5;
  report_type: string;
  period_start: string;
  period_end: string;
  report_data: any;
  status: 'draft' | 'submitted' | 'approved' | 'needs_attention';
  submitted_at?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DiscipleshipMetrics {
  id: string;
  group_id: string;
  week_date: string;
  attendance: number;
  new_visitors: number;
  returning_visitors: number;
  testimonies_count: number;
  prayer_requests: number;
  spiritual_temperature: number; // 1-10
  leader_notes?: string;
  created_at: string;
  updated_at: string;
}

// Specific report types by level
export interface WeeklyLeaderReport {
  groupId: string;
  weekDate: string;
  attendance: {
    members: number;
    newVisitors: number;
    returningVisitors: number;
  };
  spiritualHealth: {
    testimonies: number;
    prayerRequests: string[];
    spiritualTemperature: number; // 1-10
    groupMorale: 'excellent' | 'good' | 'fair' | 'needs_attention';
  };
  followUp: {
    visitorsContacted: number;
    membersCared: string[];
    upcomingEvents: string[];
  };
  concerns: string[];
  blessings: string[];
}

export interface BiweeklyAuxiliaryReport {
  supervisorId: string;
  periodStart: string;
  periodEnd: string;
  groupsOverview: {
    totalGroups: number;
    healthyGroups: number;
    groupsNeedingAttention: string[];
    newGroupsStarted: number;
  };
  leaderDevelopment: {
    trainingSessions: number;
    leadersNeedingSupport: string[];
    potentialNewLeaders: string[];
  };
  zoneMetrics: {
    totalAttendance: number;
    growthPercentage: number;
    newConversions: number;
  };
}

export interface MonthlyGeneralReport {
  supervisorId: string;
  zoneName: string;
  month: string;
  zoneStatistics: {
    totalGroups: number;
    totalMembers: number;
    monthlyGrowth: number;
    multiplicationPlans: string[];
  };
  leadershipPipeline: {
    auxiliarySupervisors: number;
    trainingSupervisors: number;
    leadershipGaps: string[];
  };
  strategicInitiatives: {
    newGroupLocations: string[];
    communityOutreach: string[];
    specialEvents: string[];
  };
}

export interface QuarterlyCoordinatorReport {
  coordinatorId: string;
  quarter: number;
  year: number;
  ministryOverview: {
    totalZones: number;
    totalGroups: number;
    totalMembers: number;
    quarterlyGrowth: number;
  };
  strategicGoals: {
    annualTargets: Goal[];
    quarterProgress: number;
    adjustmentNeeded: boolean;
  };
  systemHealth: {
    leadershipStrength: number; // 1-10
    systemEfficiency: number; // 1-10
    memberSatisfaction: number; // 1-10
  };
}

export interface PastoralDashboard {
  timeframe: 'week' | 'month' | 'quarter' | 'year';
  keyMetrics: {
    totalGroups: number;
    totalMembers: number;
    growthRate: number;
    healthIndex: number; // 1-10
  };
  alerts: Alert[];
  approvalQueue: ApprovalItem[];
  strategicDecisions: Decision[];
}

export interface Goal {
  id: string;
  description: string;
  target: number;
  current: number;
  deadline: string;
  status: 'on_track' | 'behind' | 'completed' | 'critical';
}

export interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  actionRequired: boolean;
  relatedGroup?: string;
  relatedLeader?: string;
  created_at: string;
}

export interface ApprovalItem {
  id: string;
  type: 'new_group' | 'leader_promotion' | 'budget_request' | 'strategic_initiative';
  title: string;
  requestedBy: string;
  priority: 'high' | 'medium' | 'low';
  deadline?: string;
  created_at: string;
}

export interface Decision {
  id: string;
  title: string;
  description: string;
  options: string[];
  recommendation?: string;
  impact: 'high' | 'medium' | 'low';
  urgency: 'immediate' | 'this_week' | 'this_month';
}

// Chart and dashboard data types
export interface ChartData {
  name: string;
  value: number;
  color?: string;
}

export interface TimeSeriesData {
  date: string;
  value: number;
  comparison?: number;
}

export interface ZonePerformance {
  zoneName: string;
  totalGroups: number;
  totalMembers: number;
  growthRate: number;
  healthScore: number;
  supervisor: string;
}

export interface LeaderPerformance {
  leaderId: string;
  leaderName: string;
  groupName: string;
  attendance: number;
  retention: number;
  growth: number;
  spiritualHealth: number;
  consistencyScore: number;
}