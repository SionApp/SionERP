import { DiscipleshipService } from '@/services/discipleship.service';
import type {
  DiscipleshipAlert,
  DiscipleshipAnalytics,
  DiscipleshipGroup,
  GroupFilters,
  GroupPerformance,
  ZoneStats,
} from '@/types/discipleship.types';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

export const useDiscipleship = () => {
  const [groups, setGroups] = useState<DiscipleshipGroup[]>([]);
  const [analytics, setAnalytics] = useState<DiscipleshipAnalytics | null>(null);
  const [zoneStats, setZoneStats] = useState<ZoneStats[]>([]);
  const [groupPerformance, setGroupPerformance] = useState<GroupPerformance[]>([]);
  const [alerts, setAlerts] = useState<DiscipleshipAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });

  // Cargar grupos
  const loadGroups = useCallback(async (filters?: GroupFilters) => {
    try {
      setLoading(true);
      const response = await DiscipleshipService.getGroups(filters);
      setGroups(response.data);
      setPagination({
        total: response.total,
        page: response.page,
        limit: response.limit,
        totalPages: response.total_pages,
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error desconocido al cargar grupos');
      }
      toast.error('Error al cargar grupos');
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar analytics
  const loadAnalytics = useCallback(async (zoneName?: string) => {
    try {
      const data = await DiscipleshipService.getAnalytics(zoneName);
      setAnalytics(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error desconocido al cargar analytics');
      }
      console.error('Error loading analytics:', err);
    }
  }, []);

  // Cargar estadísticas por zona
  const loadZoneStats = useCallback(async () => {
    try {
      const data = await DiscipleshipService.getZoneStats();
      setZoneStats(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error desconocido al cargar estadísticas por zona');
      }
      console.error('Error loading zone stats:', err);
    }
  }, []);

  // Cargar rendimiento de grupos
  const loadGroupPerformance = useCallback(async () => {
    try {
      const data = await DiscipleshipService.getGroupPerformance();
      setGroupPerformance(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error desconocido al cargar rendimiento de grupos');
      }
      console.error('Error loading group performance:', err);
    }
  }, []);

  // Cargar alertas
  const loadAlerts = useCallback(async (resolved = false) => {
    try {
      const data = await DiscipleshipService.getAlerts({ resolved });
      setAlerts(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error desconocido al cargar alertas');
      }
      console.error('Error loading alerts:', err);
    }
  }, []);

  // Cargar todos los datos
  const loadAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      loadGroups(),
      loadAnalytics(),
      loadZoneStats(),
      loadGroupPerformance(),
      loadAlerts(),
    ]);
    setLoading(false);
  }, [loadGroups, loadAnalytics, loadZoneStats, loadGroupPerformance, loadAlerts]);

  // Crear grupo
  const createGroup = useCallback(
    async (data: Parameters<typeof DiscipleshipService.createGroup>[0]) => {
      try {
        const result = await DiscipleshipService.createGroup(data);
        toast.success('Grupo creado exitosamente');
        await loadGroups();
        return result;
      } catch (err: unknown) {
        if (err instanceof Error) {
          toast.error(err.message);
        } else {
          toast.error('Error desconocido al crear grupo');
        }
        throw err;
      }
    },
    [loadGroups]
  );

  // Actualizar grupo
  const updateGroup = useCallback(
    async (id: string, data: Parameters<typeof DiscipleshipService.updateGroup>[1]) => {
      try {
        const result = await DiscipleshipService.updateGroup(id, data);
        toast.success('Grupo actualizado exitosamente');
        await loadGroups();
        return result;
      } catch (err: unknown) {
        if (err instanceof Error) {
          throw err;
        } else {
          throw new Error('Error desconocido al actualizar grupo');
        }
      }
    },
    [loadGroups]
  );

  // Eliminar grupo
  const deleteGroup = useCallback(
    async (id: string) => {
      try {
        await DiscipleshipService.deleteGroup(id);
        toast.success('Grupo eliminado exitosamente');
        await loadGroups();
      } catch (err: unknown) {
        if (err instanceof Error) {
          toast.error(err.message);
        } else {
          toast.error('Error desconocido al eliminar grupo');
        }
        throw new Error('Error desconocido al eliminar grupo');
      }
    },
    [loadGroups]
  );

  // Resolver alerta
  const resolveAlert = useCallback(
    async (id: string) => {
      try {
        await DiscipleshipService.resolveAlert(id);
        toast.success('Alerta resuelta');
        await loadAlerts();
      } catch (err: unknown) {
        if (err instanceof Error) {
          toast.error(err.message);
        } else {
          toast.error('Error desconocido al resolver alerta');
        }
        throw new Error('Error desconocido al resolver alerta');
      }
    },
    [loadAlerts]
  );

  // Cargar datos iniciales
  useEffect(() => {
    loadAllData();
  }, []);

  return {
    // Data
    groups,
    analytics,
    zoneStats,
    groupPerformance,
    alerts,
    pagination,
    loading,
    error,
    // Actions
    loadGroups,
    loadAnalytics,
    loadZoneStats,
    loadGroupPerformance,
    loadAlerts,
    loadAllData,
    createGroup,
    updateGroup,
    deleteGroup,
    resolveAlert,
  };
};

export default useDiscipleship;
