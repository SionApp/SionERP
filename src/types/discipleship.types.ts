// =====================================================
// GRUPOS
// =====================================================

export interface DiscipleshipGroup {
  id: string;
  group_name: string;
  leader_id: string;
  supervisor_id: string | null;
  zone_name: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  meeting_location: string | null;
  member_count: number;
  active_members: number;
  status: 'active' | 'inactive' | 'multiplying';
  created_at: string;
  updated_at: string;
  // Campos adicionales del JOIN
  leader_name?: string;
  supervisor_name?: string;
}

export interface CreateGroupRequest {
  group_name: string;
  leader_id: string;
  supervisor_id?: string;
  zone_name?: string;
  meeting_day?: string;
  meeting_time?: string;
  meeting_location?: string;
}

export interface UpdateGroupRequest {
  group_name?: string;
  leader_id?: string;
  supervisor_id?: string;
  zone_name?: string;
  meeting_day?: string;
  meeting_time?: string;
  meeting_location?: string;
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
  hierarchy_level: number; // 1=Líder, 2=Sup.Aux, 3=Sup.Gral, 4=Coord, 5=Pastor
  supervisor_id: string | null;
  zone_name: string | null;
  territory: string | null;
  active_groups_assigned: number;
  created_at: string;
  updated_at: string;
  // Campos adicionales
  user_name?: string;
  user_email?: string;
  supervisor_name?: string;
}

export interface AssignHierarchyRequest {
  user_id: string;
  hierarchy_level: number;
  supervisor_id?: string;
  zone_name?: string;
  territory?: string;
}

// =====================================================
// MÉTRICAS
// =====================================================

export interface DiscipleshipMetrics {
  id: string;
  group_id: string;
  week_date: string;
  week_number?: number;
  attendance: number;
  new_visitors: number;
  returning_visitors: number;
  conversions: number;
  baptisms: number;
  spiritual_temperature: number;
  testimonies_count: number;
  prayer_requests: number;
  offering_amount: number;
  leader_notes: string | null;
  created_at: string;
  updated_at: string;
  // Adicional
  group_name?: string;
}

export interface CreateMetricsRequest {
  group_id: string;
  week_date: string;
  attendance: number;
  new_visitors?: number;
  returning_visitors?: number;
  conversions?: number;
  baptisms?: number;
  spiritual_temperature: number;
  testimonies_count?: number;
  prayer_requests?: number;
  offering_amount?: number;
  leader_notes?: string;
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
  status: 'draft' | 'submitted' | 'approved' | 'revision_required';
  report_data: Record<string, unknown>;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  // Adicional
  reporter_name?: string;
}

export interface CreateReportRequest {
  report_type: string;
  report_level: number;
  period_start: string;
  period_end: string;
  report_data: Record<string, unknown>;
}

// =====================================================
// ALERTAS
// =====================================================

export interface DiscipleshipAlert {
  id: string;
  alert_type:
    | 'no_reports'
    | 'low_attendance'
    | 'multiplication_ready'
    | 'needs_attention'
    | 'custom';
  title: string;
  message: string;
  priority: number;
  related_group_id: string | null;
  related_user_id: string | null;
  zone_name: string | null;
  action_required: boolean;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  // Adicional
  group_name?: string;
  user_name?: string;
}

// =====================================================
// ANALYTICS
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
  zone_name: string;
  total_groups: number;
  total_members: number;
  avg_attendance: number;
  growth_rate: number;
}

export interface GroupPerformance {
  group_id: string;
  group_name: string;
  leader_name: string;
  avg_attendance: number;
  growth_rate: number;
  spiritual_temp: number;
  status: string;
  last_report_date: string;
}

// =====================================================
// FILTROS Y PAGINACIÓN
// =====================================================

export interface GroupFilters {
  zone_name?: string;
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
