import { supabase } from '@/integrations/supabase/client';
import { ApiService } from './api.service';

// Singleton para callbacks de loading
let dashboardLoadingCallbacks: {
  setFetching?: (loading: boolean) => void;
} = {};

export const setDashboardLoadingCallbacks = (callbacks: typeof dashboardLoadingCallbacks) => {
  dashboardLoadingCallbacks = callbacks;
};

// ========================================
// INTERFACES
// ========================================

export interface DashboardStats {
  totalUsers: number;
  newRegistrations: number;
  activeRoles: number;
  systemActivity: number;
  lastLogin: string;
}

export interface RoleDistribution {
  name: string;
  value: number;
  color: string;
}

export type TraceabilityDomain = 'discipulado' | 'usuarios' | 'configuracion';

export interface TraceabilityEntry {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  user: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  changed_at: string;
}

export interface TraceabilityResponse {
  items: TraceabilityEntry[];
  total: number;
}

export interface DiscipleshipDashboardStats {
  totalGroups: number;
  totalMembers: number;
  activeLeaders: number;
  avgAttendance: number;
  monthlyGrowth: number;
  spiritualHealth: number;
  multiplications: number;
  alertsCount: number;
}

// ========================================
// DASHBOARD SERVICE - TODO DESDE GO
// ========================================

export class DashboardService {
  /**
   * Obtiene todos los datos del dashboard desde el backend Go
   * Esta es la única función que debe usarse
   */
  static async getAllDashboardDataFromGo(): Promise<{
    stats: DashboardStats;
    discipleshipStats: DiscipleshipDashboardStats;
    roleDistribution: RoleDistribution[];
    currentUserRole?: string;
    installedModules: string[];
  }> {
    dashboardLoadingCallbacks.setFetching?.(true);
    try {
      // Obtener token de Supabase Auth
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Llamar al backend Go
      const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:8181';
      const response = await fetch(`${apiBase}/api/v1/dashboard/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Dashboard data from Go:', data);

      // El backend Go devuelve toda la estructura
      return {
        stats: data.stats || {
          totalUsers: 0,
          newRegistrations: 0,
          activeRoles: 0,
          systemActivity: 0,
          lastLogin: new Date().toISOString(),
        },
        roleDistribution: data.roleDistribution || [],
        discipleshipStats: data.discipleshipStats || this.getEmptyDiscipleshipStats(),
        currentUserRole: data.currentUserRole || null,
        installedModules: data.installedModules || [],
      };
    } catch (error) {
      console.error('Error fetching dashboard data from Go backend:', error);
      console.error('Error details:', error);
      throw error;
    } finally {
      dashboardLoadingCallbacks.setFetching?.(false);
    }
  }

  /** Historial de auditoría paginado — módulo de Trazabilidad (staff+/pastor/admin). */
  static async getTraceability(filters?: {
    domain?: TraceabilityDomain;
    limit?: number;
    offset?: number;
  }): Promise<TraceabilityResponse> {
    const params = new URLSearchParams();
    if (filters?.domain) params.append('domain', filters.domain);
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.offset) params.append('offset', String(filters.offset));
    const query = params.toString();
    return ApiService.get(`/dashboard/traceability${query ? `?${query}` : ''}`);
  }

  /**
   * Placeholder para estadísticas de discipulado
   * TODO: Implementar en Go
   */
  private static getEmptyDiscipleshipStats(): DiscipleshipDashboardStats {
    return {
      totalGroups: 0,
      totalMembers: 0,
      activeLeaders: 0,
      avgAttendance: 0,
      monthlyGrowth: 0,
      spiritualHealth: 0,
      multiplications: 0,
      alertsCount: 0,
    };
  }
}
