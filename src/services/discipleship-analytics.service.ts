import { supabase } from '@/integrations/supabase/client';

export interface DiscipleshipAnalytics {
  totalGroups: number;
  totalMembers: number;
  averageAttendance: number;
  growthRate: number;
  activeLeaders: number;
  multiplications: number;
  spiritualHealth: number;
  dateRange: {
    from: string;
    to: string;
  };
}

export interface ZoneStats {
  zoneName: string;
  groups: number;
  members: number;
  attendance: number;
  growthRate: number;
  spiritualHealth: number;
  multiplications: number;
}

export interface GroupPerformance {
  groupId: string;
  groupName: string;
  leaderName: string;
  attendance: number;
  growth: number;
  spiritualHealth: number;
  consistency: number;
  lastActivity: string;
}

export interface DiscipleshipAlert {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  actionRequired: boolean;
  priority: number;
  createdAt: string;
  groupName?: string;
  leaderName?: string;
}

export interface MultiplicationTracker {
  parentGroup: string;
  newGroup?: string;
  date: string;
  status: 'planned' | 'successful' | 'struggling' | 'failed';
  initialMembers: number;
  notes?: string;
}

export interface WeeklyTrend {
  week: string;
  attendance: number;
  visitors: number;
  conversions: number;
  spiritualHealth: number;
}

export class DiscipleshipAnalyticsService {
  static async getDiscipleshipAnalytics(
    zoneFilter?: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<DiscipleshipAnalytics> {
    try {
      const { data, error } = await supabase.rpc('calculate_discipleship_stats', {
        zone_filter: zoneFilter || null,
        date_from: dateFrom || null,
        date_to: dateTo || null
      });

      if (error) throw error;

      // Casting seguro de la respuesta JSON
      return data as unknown as DiscipleshipAnalytics;
    } catch (error) {
      console.error('Error fetching discipleship analytics:', error);
      return {
        totalGroups: 0,
        totalMembers: 0,
        averageAttendance: 0,
        growthRate: 0,
        activeLeaders: 0,
        multiplications: 0,
        spiritualHealth: 0,
        dateRange: { from: '', to: '' }
      };
    }
  }

  static async getZoneStats(): Promise<ZoneStats[]> {
    try {
      const { data: groups, error: groupsError } = await supabase
        .from('discipleship_groups')
        .select(`
          zone_name,
          member_count,
          status
        `)
        .eq('status', 'active');

      if (groupsError) throw groupsError;

      const { data: metrics, error: metricsError } = await supabase
        .from('discipleship_metrics')
        .select(`
          attendance,
          spiritual_temperature,
          week_date,
          discipleship_groups!inner(zone_name)
        `)
        .gte('week_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      if (metricsError) throw metricsError;

      const { data: multiplications, error: multiError } = await supabase
        .from('cell_multiplication_tracking')
        .select(`
          multiplication_date,
          success_status,
          discipleship_groups!inner(zone_name)
        `)
        .gte('multiplication_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      if (multiError) throw multiError;

      const zoneMap = new Map<string, ZoneStats>();

      // Procesar grupos por zona
      groups?.forEach(group => {
        if (!group.zone_name) return;
        
        const existing = zoneMap.get(group.zone_name) || {
          zoneName: group.zone_name,
          groups: 0,
          members: 0,
          attendance: 0,
          growthRate: 0,
          spiritualHealth: 0,
          multiplications: 0
        };

        existing.groups++;
        existing.members += group.member_count || 0;
        
        zoneMap.set(group.zone_name, existing);
      });

      // Procesar métricas por zona
      metrics?.forEach(metric => {
        const zoneName = (metric.discipleship_groups as any)?.zone_name;
        if (!zoneName) return;

        const existing = zoneMap.get(zoneName);
        if (existing) {
          existing.attendance += metric.attendance || 0;
          existing.spiritualHealth += metric.spiritual_temperature || 0;
        }
      });

      // Procesar multiplicaciones por zona
      multiplications?.forEach(mult => {
        const zoneName = (mult.discipleship_groups as any)?.zone_name;
        if (!zoneName) return;

        const existing = zoneMap.get(zoneName);
        if (existing && mult.success_status === 'successful') {
          existing.multiplications++;
        }
      });

      // Normalizar valores y calcular promedios
      return Array.from(zoneMap.values()).map(zone => {
        const groupCount = zone.groups || 1;
        return {
          ...zone,
          attendance: Math.round(zone.attendance / groupCount),
          spiritualHealth: Math.round((zone.spiritualHealth / groupCount) * 10) / 10,
          growthRate: Math.round(Math.random() * 20 - 5) // TODO: Calcular crecimiento real
        };
      });
    } catch (error) {
      console.error('Error fetching zone stats:', error);
      return [];
    }
  }

  static async getGroupPerformance(): Promise<GroupPerformance[]> {
    try {
      const { data, error } = await supabase
        .from('discipleship_groups')
        .select(`
          id,
          group_name,
          leader_id,
          status,
          updated_at,
          users!inner(first_name, last_name),
          discipleship_metrics(
            attendance,
            spiritual_temperature,
            week_date
          )
        `)
        .eq('status', 'active')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return data?.map(group => {
        const metrics = Array.isArray(group.discipleship_metrics) ? group.discipleship_metrics : [];
        const recentMetrics = metrics.slice(0, 4); // Últimas 4 semanas
        
        const avgAttendance = recentMetrics.length > 0 ? 
          (recentMetrics as any[]).reduce((sum: number, m: any) => sum + (m.attendance || 0), 0) / recentMetrics.length : 0;
        const avgSpiritualHealth = recentMetrics.length > 0 ? 
          (recentMetrics as any[]).reduce((sum: number, m: any) => sum + (m.spiritual_temperature || 0), 0) / recentMetrics.length : 0;
        
        return {
          groupId: group.id,
          groupName: group.group_name,
          leaderName: `${(group.users as any)?.first_name || ''} ${(group.users as any)?.last_name || ''}`.trim(),
          attendance: Math.round(avgAttendance),
          growth: Math.round(Math.random() * 30 - 10), // TODO: Calcular crecimiento real
          spiritualHealth: Math.round(avgSpiritualHealth * 10) / 10,
          consistency: recentMetrics.length * 25, // % basado en reportes enviados
          lastActivity: group.updated_at
        };
      }) || [];
    } catch (error) {
      console.error('Error fetching group performance:', error);
      return [];
    }
  }

  static async getDiscipleshipAlerts(): Promise<DiscipleshipAlert[]> {
    try {
      const { data, error } = await supabase
        .from('discipleship_alerts')
        .select(`
          id,
          alert_type,
          title,
          message,
          action_required,
          priority,
          created_at,
          resolved,
          discipleship_groups(group_name),
          users(first_name, last_name)
        `)
        .eq('resolved', false)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      return data?.map(alert => ({
        id: alert.id,
        type: alert.alert_type as 'critical' | 'warning' | 'info' | 'success',
        title: alert.title,
        message: alert.message,
        actionRequired: alert.action_required,
        priority: alert.priority,
        createdAt: alert.created_at,
        groupName: (alert.discipleship_groups as any)?.group_name,
        leaderName: (alert.users as any) ? 
          `${(alert.users as any).first_name} ${(alert.users as any).last_name}`.trim() : undefined
      })) || [];
    } catch (error) {
      console.error('Error fetching discipleship alerts:', error);
      return [];
    }
  }

  static async getMultiplicationTracking(): Promise<MultiplicationTracker[]> {
    try {
      const { data, error } = await supabase
        .from('cell_multiplication_tracking')
        .select(`
          multiplication_date,
          initial_members,
          success_status,
          notes,
          parent_group:discipleship_groups!parent_group_id(group_name),
          new_group:discipleship_groups!new_group_id(group_name)
        `)
        .order('multiplication_date', { ascending: false })
        .limit(10);

      if (error) throw error;

      return data?.map(track => ({
        parentGroup: (track.parent_group as any)?.group_name || 'Grupo no encontrado',
        newGroup: (track.new_group as any)?.group_name,
        date: track.multiplication_date,
        status: track.success_status as 'planned' | 'successful' | 'struggling' | 'failed',
        initialMembers: track.initial_members || 0,
        notes: track.notes
      })) || [];
    } catch (error) {
      console.error('Error fetching multiplication tracking:', error);
      return [];
    }
  }

  static async getWeeklyTrends(weeks = 12): Promise<WeeklyTrend[]> {
    try {
      const { data, error } = await supabase
        .from('discipleship_metrics')
        .select(`
          week_date,
          attendance,
          new_visitors,
          returning_visitors,
          conversions,
          spiritual_temperature
        `)
        .gte('week_date', new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('week_date', { ascending: true });

      if (error) throw error;

      // Agrupar por semana
      const weeklyData = new Map<string, WeeklyTrend>();
      
      data?.forEach(metric => {
        const weekKey = metric.week_date;
        const existing = weeklyData.get(weekKey) || {
          week: weekKey,
          attendance: 0,
          visitors: 0,
          conversions: 0,
          spiritualHealth: 0
        };

        existing.attendance += metric.attendance || 0;
        existing.visitors += (metric.new_visitors || 0) + (metric.returning_visitors || 0);
        existing.conversions += metric.conversions || 0;
        existing.spiritualHealth += metric.spiritual_temperature || 0;

        weeklyData.set(weekKey, existing);
      });

      return Array.from(weeklyData.values())
        .slice(-weeks)
        .map(week => ({
          ...week,
          spiritualHealth: Math.round(week.spiritualHealth * 10) / 10
        }));
    } catch (error) {
      console.error('Error fetching weekly trends:', error);
      return [];
    }
  }

  static async getAllDiscipleshipData() {
    try {
      const [
        analytics,
        zoneStats,
        groupPerformance,
        alerts,
        multiplications,
        weeklyTrends
      ] = await Promise.all([
        this.getDiscipleshipAnalytics(),
        this.getZoneStats(),
        this.getGroupPerformance(),
        this.getDiscipleshipAlerts(),
        this.getMultiplicationTracking(),
        this.getWeeklyTrends()
      ]);

      return {
        analytics,
        zoneStats,
        groupPerformance,
        alerts,
        multiplications,
        weeklyTrends
      };
    } catch (error) {
      console.error('Error fetching all discipleship data:', error);
      throw error;
    }
  }
}