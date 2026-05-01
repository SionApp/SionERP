// =====================================================
// ZONAS
// =====================================================

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface GeoJSONMultiPolygon {
  type: 'MultiPolygon';
  coordinates: number[][][][];
}

export type ZoneGeometry = GeoJSONPolygon | GeoJSONMultiPolygon;

export interface ZoneBoundaries {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface Zone {
  id: string;
  name: string;
  description?: string;
  color: string;
  supervisor_id?: string | null;
  boundaries?: ZoneGeometry | ZoneBoundaries | null;
  center_lat?: number;
  center_lng?: number;
  is_active?: boolean;
  total_groups?: number;
  total_members?: number;
  avg_attendance?: number;
  created_at: string;
  updated_at: string;
  supervisor_name?: string;
}

export interface ZoneMapGroup extends DiscipleshipGroup {
  leader_name?: string;
  supervisor_name?: string;
}

export interface ZoneMapData {
  zone: Zone;
  groups: ZoneMapGroup[];
}

export interface ZoneMapResponse {
  zones: ZoneMapData[];
}

export interface CreateZoneRequest {
  name: string;
  description?: string;
  color?: string;
  supervisor_id?: string;
  boundaries?: ZoneGeometry;
  center_lat?: number;
  center_lng?: number;
}

export interface UpdateZoneRequest {
  name?: string;
  description?: string;
  color?: string;
  supervisor_id?: string;
  boundaries?: ZoneGeometry;
  center_lat?: number;
  center_lng?: number;
  is_active?: boolean;
}

// =====================================================
// GRUPOS
// =====================================================

export interface DiscipleshipGroup {
  id: string;
  group_name: string;
  leader_id: string;
  supervisor_id: string | null;
  zone_id?: string | null;
  zone_name: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  meeting_location: string | null;
  meeting_address?: string | null;
  latitude?: number;
  longitude?: number;
  member_count: number;
  active_members: number;
  status: 'active' | 'inactive' | 'multiplying';
  phase?: string;
  created_at: string;
  updated_at: string;
  leader_name?: string;
  supervisor_name?: string;
}

export interface CreateGroupRequest {
  group_name: string;
  leader_id: string;
  supervisor_id?: string;
  zone_id?: string;
  zone_name?: string;
  meeting_day?: string;
  meeting_time?: string;
  meeting_location?: string;
  meeting_address?: string;
  latitude?: number;
  longitude?: number;
  status?: string;
}

export interface UpdateGroupRequest {
  group_name?: string;
  leader_id?: string;
  supervisor_id?: string;
  zone_id?: string;
  zone_name?: string;
  meeting_day?: string;
  meeting_time?: string;
  meeting_location?: string;
  meeting_address?: string;
  latitude?: number;
  longitude?: number;
  member_count?: number;
  active_members?: number;
  status?: string;
}

// =====================================================
// JERARQUÍA
// =====================================================

export interface DiscipleshipHierarchy {
  id: string;
  user_id: string;
  hierarchy_level: number;
  supervisor_id: string | null;
  zone_id?: string | null;
  zone_name: string | null;
  territory: string | null;
  active_groups_assigned: number;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_email?: string;
  supervisor_name?: string;
}

export interface AssignHierarchyRequest {
  user_id: string;
  hierarchy_level: number;
  supervisor_id?: string;
  zone_id?: string;
  zone_name?: string;
  territory?: string;
}

// =====================================================
// REPORTES
// =====================================================

export interface DiscipleshipReport {
  id: string;
  reporter_id: string;
  supervisor_id: string | null;
  report_type: string;
  report_level: number;
  period_start: string;
  period_end: string;
  zone_id?: string | null;
  status: 'draft' | 'submitted' | 'approved' | 'revision_required';
  report_data: Record<string, unknown>;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  reporter_name?: string;
  zone_name?: string;
}

export interface CreateReportRequest {
  report_type: string;
  report_level: number;
  period_start: string;
  period_end: string;
  zone_id?: string;
  report_data: Record<string, unknown>;
}

// =====================================================
// REPORTES POR NIVEL
// =====================================================

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
    spiritualTemperature: number;
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
  groupsSupervised: number;
  totalAttendance: number;
  groupsSummary: Array<{
    groupId: string;
    groupName: string;
    avgAttendance: number;
    status: string;
  }>;
  highlights: string[];
  concerns: string[];
}

export interface MonthlyGeneralReport {
  supervisorId: string;
  month: string;
  year: number;
  zoneStats: {
    totalGroups: number;
    totalMembers: number;
    avgAttendance: number;
    growthRate: number;
  };
  topPerformingGroups: string[];
  groupsNeedingAttention: string[];
  recommendations: string[];
}

export interface QuarterlyCoordinatorReport {
  coordinatorId: string;
  quarter: number;
  year: number;
  overallStats: {
    totalZones: number;
    totalGroups: number;
    totalMembers: number;
    netGrowth: number;
  };
  zoneBreakdown: Array<{
    zoneName: string;
    performance: number;
    highlights: string[];
  }>;
  strategicRecommendations: string[];
}

// =====================================================
// ALERTAS
// =====================================================

export interface DiscipleshipAlert {
  id: string;
  alert_type:
    | 'no_reports'
    | 'low_attendance'
    | 'spiritual_decline'
    | 'no_growth'
    | 'consistency_milestone'
    | 'evangelism_champion'
    | 'solid_group'
    | 'multiplication_ready'
    | 'needs_attention'
    | 'custom';
  title: string;
  message: string;
  priority: number;
  related_group_id: string | null;
  related_user_id: string | null;
  zone_id?: string | null;
  zone_name: string | null;
  action_required: boolean;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  group_name?: string;
  user_name?: string;
}

export interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title?: string;
  message: string;
  actionRequired: boolean;
  relatedGroup?: string;
  relatedLeader?: string;
  groupName?: string;
  created_at: string;
}

// =====================================================
// ANALYTICS Y PERFORMANCE
// =====================================================

export interface DiscipleshipAnalytics {
  total_groups: number;
  total_members: number;
  average_attendance: number;
  growth_rate: number;
  active_leaders: number;
  multiplications: number;
  spiritual_health: number;
  pending_alerts: number;
}

export interface ZoneStats {
  zone_id?: string;
  zone_name?: string;
  zoneName: string;
  total_groups?: number;
  groups?: number;
  total_members?: number;
  members?: number;
  avg_attendance?: number;
  avgAttendance?: number;
  growth_rate?: number;
  growthRate?: number;
  healthIndex?: number;
}

export interface GroupPerformance {
  group_id?: string;
  groupId: string;
  group_name?: string;
  groupName: string;
  leader_name?: string;
  leaderName: string;
  avg_attendance?: number;
  avgAttendance?: number;
  growth_rate?: number;
  growthRate?: number;
  spiritual_temp?: number;
  spiritualTemp?: number;
  status: string;
  last_report_date?: string;
  lastReportDate?: string;
}

export interface ZonePerformance {
  zoneId?: string;
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

// =====================================================
// DATOS PARA GRÁFICOS
// =====================================================

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

export interface WeeklyTrend {
  week: string;
  attendance: number;
  visitors: number;
  conversions: number;
}

// =====================================================
// OBJETIVOS Y METAS
// =====================================================

export interface Goal {
  id: string;
  description: string;
  target: number;
  current: number;
  deadline: string;
  status: 'on_track' | 'behind' | 'critical' | 'completed';
  zone_id?: string;
  zone_name?: string;
}

export interface DiscipleshipGoal {
  id: string;
  goal_type: string;
  target_metric: string;
  description?: string;
  target_value: number;
  current_value: number;
  progress_percentage: number;
  deadline: string;
  status: string;
  zone_id?: string;
  zone_name?: string;
}

// =====================================================
// MULTIPLICACIÓN
// =====================================================

export interface MultiplicationTracker {
  id: string;
  parentGroupId?: string;
  parentGroupName: string;
  newGroupId?: string;
  newGroupName?: string | null;
  parentLeaderName?: string;
  newLeaderName?: string | null;
  multiplicationDate?: string;
  date?: string;
  status: 'planned' | 'successful' | 'failed' | 'in_progress';
  initialMembers: number;
  targetDate?: string;
}

export interface CellMultiplicationTracking {
  id: string;
  parent_group_id: string;
  new_group_id: string | null;
  multiplication_date: string;
  initial_members: number;
  success_status: 'planned' | 'successful' | 'failed';
  notes: string | null;
  created_at: string;
  updated_at: string;
  parent_group_name?: string;
  new_group_name?: string;
}

// =====================================================
// FILTROS Y PAGINACIÓN
// =====================================================

export interface GroupFilters {
  zone_id?: string;
  zone_name?: string; // Esto se removera en su momento. No se filtara las zonas por el nombre sino por el ID
  status?: string;
  leader_id?: string;
  supervisor_id?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T;
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// =====================================================
// NIVELES DE JERARQUÍA
// =====================================================

export const HIERARCHY_LEVELS = {
  1: { name: 'Líder', color: 'blue' },
  2: { name: 'Supervisor Auxiliar', color: 'green' },
  3: { name: 'Supervisor General', color: 'purple' },
  4: { name: 'Coordinador', color: 'orange' },
  5: { name: 'Pastoral', color: 'red' },
} as const;

export type HierarchyLevel = keyof typeof HIERARCHY_LEVELS;

// =====================================================
// NIVELES DE DISCIPULADO (desde DB)
// =====================================================

export interface DiscipleshipLevel {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateDiscipleshipLevelRequest {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  order_index?: number;
}

export interface UpdateDiscipleshipLevelRequest {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  order_index?: number;
  is_active?: boolean;
}

// =====================================================
// MIEMBROS DE GRUPO
// =====================================================

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role_in_group: string;
  is_active: boolean;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMemberWithDetails extends GroupMember {
  user_name: string;
  user_email: string;
}

export interface AddGroupMemberRequest {
  user_id: string;
  role_in_group?: string;
}

export interface UpdateGroupMemberRequest {
  role_in_group?: string;
  is_active?: boolean;
}

// =====================================================
// ASISTENCIA
// =====================================================

export interface Attendance {
  id: string;
  group_id: string;
  user_id: string;
  meeting_date: string;
  present: boolean;
  attendance_type: string;
  notes?: string;
  created_at: string;
}

export interface AttendanceWithDetails extends Attendance {
  user_name: string;
}

export interface RecordAttendanceRequest {
  user_id: string;
  present: boolean;
  attendance_type?: string;
  notes?: string;
}

export interface BulkAttendanceRequest {
  meeting_date: string;
  attendance: RecordAttendanceRequest[];
}

export interface MemberAttendanceStats {
  total_meetings: number;
  present_count: number;
  attendance_percentage: number;
}
