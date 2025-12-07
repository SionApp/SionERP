import { ZonesService } from '@/services/zones.service';
import type { ZoneStats } from '@/types/discipleship.types';
import {
  CreateZoneRequest,
  DiscipleshipGroup,
  UpdateZoneRequest,
  Zone,
} from '@/types/discipleship.types';
import { User } from '@/types/user.types';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface UseZonesOptions {
  autoLoad?: boolean;
  onlyActive?: boolean;
}

interface UseZonesReturn {
  zones: Zone[];
  zoneStats: ZoneStats[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getZone: (zoneId: string) => Promise<Zone | null>;
  getZoneGroups: (zoneId: string) => Promise<DiscipleshipGroup[]>;
  createZone: (data: CreateZoneRequest) => Promise<string | null>;
  updateZone: (zoneId: string, data: UpdateZoneRequest) => Promise<boolean>;
  deleteZone: (zoneId: string) => Promise<boolean>;
  assignGroupToZone: (zoneId: string, groupId: string) => Promise<boolean>;
  assignUserToZone: (zoneId: string, userId: string) => Promise<boolean>;
  assignSupervisor: (zoneId: string, supervisorId: string) => Promise<boolean>;
}

export const useZones = (options: UseZonesOptions = {}): UseZonesReturn => {
  const { autoLoad = true, onlyActive = true } = options;

  const [zones, setZones] = useState<Zone[]>([]);
  const [zoneStats, setZoneStats] = useState<ZoneStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadZones = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [zonesData, statsData] = await Promise.all([
        ZonesService.getZones({ is_active: onlyActive }),
        ZonesService.getAllZoneStats().catch(() => []),
      ]);

      setZones(zonesData);
      setZoneStats(statsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar zonas';
      console.error('Error loading zones:', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [onlyActive]);

  const getZone = useCallback(async (zoneId: string): Promise<Zone | null> => {
    try {
      return await ZonesService.getZone(zoneId);
    } catch (err) {
      console.error('Error getting zone:', err);
      return null;
    }
  }, []);

  const getZoneGroups = useCallback(async (zoneId: string): Promise<DiscipleshipGroup[]> => {
    try {
      return await ZonesService.getZoneGroups(zoneId);
    } catch (err) {
      console.error('Error getting zone groups:', err);
      return [];
    }
  }, []);

  const createZone = useCallback(
    async (data: CreateZoneRequest): Promise<string | null> => {
      try {
        setLoading(true);
        const result = await ZonesService.createZone(data);
        toast.success('Zona creada exitosamente');
        await loadZones();
        return result.zone_id;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al crear zona';
        toast.error(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [loadZones]
  );

  const updateZone = useCallback(
    async (zoneId: string, data: UpdateZoneRequest): Promise<boolean> => {
      try {
        setLoading(true);
        await ZonesService.updateZone(zoneId, data);
        toast.success('Zona actualizada exitosamente');
        await loadZones();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al actualizar zona';
        toast.error(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [loadZones]
  );

  const deleteZone = useCallback(
    async (zoneId: string): Promise<boolean> => {
      try {
        setLoading(true);
        await ZonesService.deleteZone(zoneId);
        toast.success('Zona eliminada exitosamente');
        await loadZones();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al eliminar zona';
        toast.error(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [loadZones]
  );

  const assignGroupToZone = useCallback(
    async (zoneId: string, groupId: string): Promise<boolean> => {
      try {
        await ZonesService.assignGroupToZone(zoneId, groupId);
        toast.success('Grupo asignado a zona exitosamente');
        await loadZones();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al asignar grupo';
        toast.error(message);
        return false;
      }
    },
    [loadZones]
  );

  const assignUserToZone = useCallback(async (zoneId: string, userId: string): Promise<boolean> => {
    try {
      await ZonesService.assignUserToZone(zoneId, userId);
      toast.success('Usuario asignado a zona exitosamente');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al asignar usuario';
      toast.error(message);
      return false;
    }
  }, []);

  const assignSupervisor = useCallback(
    async (zoneId: string, supervisorId: string): Promise<boolean> => {
      try {
        await ZonesService.updateZone(zoneId, { supervisor_id: supervisorId });
        toast.success('Supervisor asignado exitosamente');
        await loadZones();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al asignar supervisor';
        toast.error(message);
        return false;
      }
    },
    [loadZones]
  );

  useEffect(() => {
    if (autoLoad) {
      loadZones();
    }
  }, [autoLoad, loadZones]);

  return {
    zones,
    zoneStats,
    loading,
    error,
    refetch: loadZones,
    getZone,
    getZoneGroups,
    createZone,
    updateZone,
    deleteZone,
    assignGroupToZone,
    assignUserToZone,
    assignSupervisor,
  };
};

export const useAvailableSupervisors = () => {
  const [supervisors, setSupervisors] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSupervisors = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ZonesService.getAvailableSupervisors();
      setSupervisors(data as User[]);
    } catch (err) {
      console.error('Error loading supervisors:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSupervisors();
  }, [loadSupervisors]);

  return { supervisors, loading, refetch: loadSupervisors };
};
