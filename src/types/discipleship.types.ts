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
  /** Timestamp del último reporte real recibido de este grupo (MAX(submitted_at)), '' si nunca reportó. */
  last_report_date?: string;
  /** El grupo tiene un reporte enviado sin aprobar (status='submitted'). El marcador titila hasta que lo aprueban. */
  has_pending_report?: boolean;
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
  title?: string;
  target_metric: string;
  description?: string;
  target_value: number;
  current_value: number;
  progress_percentage: number;
  deadline: string;
  status: string;
  priority?: number;
  created_by?: string;
  zone_id?: string;
  zone_name?: string;
  measurement_type?: 'automatic' | 'manual';
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

export interface Visitor {
  id: string;
  group_id: string | null;
  first_name: string;
  last_name: string;
  phone: string | null;
  invited_by: string | null;
  invited_by_name: string;
  first_visit_date: string;
  status: 'new' | 'following_up' | 'converted' | 'inactive';
  converted_user_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// =====================================================
// MEMBER JOURNEY (Slice 1 — backbone)
// =====================================================

/**
 * Stage as derived and emitted by the backend (`journeyStageSQL` /
 * `scanJourneyEntry`, apps/backend-go/handlers/discipleship_journey.go).
 * `disciple_maker` is structurally reachable (spec: Derived Stage) but never
 * emitted in Slice 1 — there is no mentorship entity yet (that's Slice 2).
 */
export const JOURNEY_STAGE = {
  NEW_CONVERT: 'new_convert',
  DISCIPLE: 'disciple',
  DISCIPLE_MAKER: 'disciple_maker',
} as const;

export type JourneyStage = (typeof JOURNEY_STAGE)[keyof typeof JOURNEY_STAGE];

/**
 * Frontend-only stage: a member with no anchor row at all (spec:
 * Not-Tracked Rendering). Never emitted by the backend — `JourneyEntry.stage`
 * only exists for members who already have an anchor.
 */
export const NOT_TRACKED_STAGE = 'not_tracked' as const;

export type DerivedJourneyStage = JourneyStage | typeof NOT_TRACKED_STAGE;

export const JOURNEY_ACTIVITY_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

export type JourneyActivityStatus =
  (typeof JOURNEY_ACTIVITY_STATUS)[keyof typeof JOURNEY_ACTIVITY_STATUS];

export const JOURNEY_ORIGIN = {
  CONVERSION: 'conversion',
  MANUAL: 'manual',
} as const;

export type JourneyOrigin = (typeof JOURNEY_ORIGIN)[keyof typeof JOURNEY_ORIGIN];

/** The church-level conversion-path curriculum pointer. GET/PUT /discipleship/settings. */
export interface DiscipleshipSettings {
  conversion_path_curriculum_id: string | null;
}

export interface UpdateDiscipleshipSettingsRequest {
  conversion_path_curriculum_id: string | null;
}

/**
 * One member's anchor + derived stage, as returned by the batch
 * GET /discipleship/journey?user_ids= endpoint. Mirrors `handlers.JourneyEntry`
 * field-for-field (apps/backend-go/handlers/discipleship_journey.go). Members
 * with no anchor simply do not appear in the response array — callers must
 * derive `NOT_TRACKED_STAGE` for any requested user_id not found here (spec:
 * Not-Tracked Rendering — no anchor must never be mislabeled as a stage).
 */
export interface JourneyEntry {
  user_id: string;
  origin: JourneyOrigin;
  activity_status: JourneyActivityStatus;
  activity_changed_at: string;
  converted_at: string | null;
  stage: JourneyStage;
  assignment_id: string | null;
  curriculum_id: string | null;
}

export interface CreateJourneyEntryRequest {
  user_id: string;
}

export interface CreateJourneyEntryResponse {
  journey_id: string;
  assignment_id: string | null;
  path_configured: boolean;
  message: string;
}

export interface UpdateJourneyActivityRequest {
  activity_status: JourneyActivityStatus;
}

/**
 * POST /discipleship/visitors/:id/convert body (design G4 — identity
 * matching is staff-driven, never implicit).
 *   - `user_id` set   → link an existing member (verified in-church + active
 *     server-side; name/phone/email/role are never overwritten).
 *   - `user_id` empty → create a new member; `email` is optional (a synthetic
 *     `convert+<visitor_id>@no-email.local` is used server-side when omitted).
 */
export interface ConvertVisitorRequest {
  user_id?: string;
  email?: string;
}

export interface ConvertVisitorResponse {
  user_id: string;
  journey_id: string;
  assignment_id: string | null;
  path_configured: boolean;
  message: string;
}

// =====================================================
// DISCIPLE-MAKER MENTORSHIPS (Slice 2)
// =====================================================

/**
 * One mentor↔mentee link scoped to a cell group, as returned by
 * GET /discipleship/groups/:id/mentorships. Mirrors `handlers.Mentorship`
 * field-for-field (apps/backend-go/handlers/discipleship_mentorships.go).
 * A mentor may hold several active rows at once (cardinality decision #579);
 * a mentee has at most one active row (`uq_mentorship_active_mentee`).
 */
export interface Mentorship {
  id: string;
  group_id: string;
  mentor_user_id: string;
  mentor_name: string;
  mentee_user_id: string;
  mentee_name: string;
  status: 'active' | 'ended';
  started_at: string;
  ended_at: string | null;
}

/**
 * POST /discipleship/groups/:id/mentorships body. Backend also enforces
 * mentor ≠ mentee and same-group membership (spec R2/R3) — this is just the
 * wire shape, not validation.
 */
export interface CreateMentorshipRequest {
  mentor_user_id: string;
  mentee_user_id: string;
}

/**
 * GET /discipleship/groups/:id/mentorships response — active pairs plus the
 * live-derived count that IS the leader's "weekly report" (spec R6, no
 * snapshot table).
 */
export interface GroupMentorshipsResponse {
  mentorships: Mentorship[];
  count: number;
}
