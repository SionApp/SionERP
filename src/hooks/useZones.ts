import { ZonesService } from '@/services/zones.service';
import type { ZoneStats } from '@/types/discipleship.types';
import {
  CreateZoneRequest,
  DiscipleshipGroup,
  UpdateZoneRequest,
  Zone,
} from '@/types/discipleship.types';
import { User } from '@/types/user.types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

// ── Module-level singleton cache ──
// All useZones() instances share this single data source.
// Only ONE fetch happens regardless of how many components use the hook.

interface ZonesCache {
  zones: Zone[];
  zoneStats: ZoneStats[];
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

const cache: ZonesCache = {
  zones: [],
  zoneStats: [],
  loading: false,
  error: null,
  initialized: false,
};

// Subscribers react to cache changes
type Subscriber = () => void;
const subscribers = new Set<Subscriber>();

function notifySubscribers() {
  for (const sub of subscribers) {
    sub();
  }
}

// Singleton fetch — only runs once per session (until mutations refresh it)
async function fetchZones(onlyActive = true) {
  if (cache.loading) return;

  try {
    cache.loading = true;
    cache.error = null;
    notifySubscribers();

    const [zonesData, statsData] = await Promise.all([
      ZonesService.getZones({ is_active: onlyActive }),
      ZonesService.getAllZoneStats().catch(() => []),
    ]);

    cache.zones = Array.isArray(zonesData) ? zonesData.map(normalizeZone) : [];
    cache.zoneStats = statsData;
    cache.initialized = true;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al cargar zonas';
    console.error('Error loading zones:', err);
    cache.error = message;
  } finally {
    cache.loading = false;
    notifySubscribers();
  }
}

// Helper para normalizar valores sql.NullString que vienen como {String, Valid}
const normalizeNullString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'String' in value && 'Valid' in value) {
    const nullString = value as { String: string; Valid: boolean };
    return nullString.Valid ? nullString.String : null;
  }
  return String(value);
};

const normalizeZone = (zone: Zone): Zone => {
  return {
    ...zone,
    description: normalizeNullString(zone.description) || undefined,
    supervisor_id: normalizeNullString(zone.supervisor_id) || undefined,
    supervisor_name: normalizeNullString(zone.supervisor_name) || undefined,
  };
};

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

  // Mirror cache state into React state — all instances read the same data
  const [zones, setZones] = useState<Zone[]>(cache.zones);
  const [zoneStats, setZoneStats] = useState<ZoneStats[]>(cache.zoneStats);
  const [loading, setLoading] = useState(cache.loading);
  const [error, setError] = useState<string | null>(cache.error);

  // Subscribe to cache changes on mount
  const subscribedRef = useRef(false);
  useEffect(() => {
    if (subscribedRef.current) return;
    subscribedRef.current = true;

    const subscriber: Subscriber = () => {
      setZones([...cache.zones]);
      setZoneStats([...cache.zoneStats]);
      setLoading(cache.loading);
      setError(cache.error);
    };
    subscribers.add(subscriber);
    return () => {
      subscribers.delete(subscriber);
    };
  }, []);

  // Auto-load only if not already loaded (singleton guarantee)
  useEffect(() => {
    if (autoLoad && !cache.initialized) {
      fetchZones(onlyActive);
    }
  }, [autoLoad, onlyActive]);

  // Listen for cross-component zone update events
  useEffect(() => {
    const handleZonesUpdate = () => {
      fetchZones(onlyActive);
    };
    window.addEventListener('zones-updated', handleZonesUpdate);
    return () => window.removeEventListener('zones-updated', handleZonesUpdate);
  }, [onlyActive]);

  // ── Mutation operations (all refresh the shared cache) ──

  const refetch = useCallback(async () => {
    await fetchZones(onlyActive);
  }, [onlyActive]);

  const getZone = useCallback(async (zoneId: string): Promise<Zone | null> => {
    try {
      const zone = await ZonesService.getZone(zoneId);
      return zone ? normalizeZone(zone) : null;
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
        await fetchZones(onlyActive);
        window.dispatchEvent(new CustomEvent('zones-updated'));
        return result.zone_id;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al crear zona';
        toast.error(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [onlyActive]
  );

  const updateZone = useCallback(
    async (zoneId: string, data: UpdateZoneRequest): Promise<boolean> => {
      try {
        setLoading(true);
        await ZonesService.updateZone(zoneId, data);
        toast.success('Zona actualizada exitosamente');
        await fetchZones(onlyActive);
        window.dispatchEvent(new CustomEvent('zones-updated'));
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al actualizar zona';
        toast.error(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [onlyActive]
  );

  const deleteZone = useCallback(
    async (zoneId: string): Promise<boolean> => {
      try {
        setLoading(true);
        await ZonesService.deleteZone(zoneId);
        toast.success('Zona eliminada exitosamente');
        await fetchZones(onlyActive);
        window.dispatchEvent(new CustomEvent('zones-updated'));
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al eliminar zona';
        toast.error(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [onlyActive]
  );

  const assignGroupToZone = useCallback(
    async (zoneId: string, groupId: string): Promise<boolean> => {
      try {
        await ZonesService.assignGroupToZone(zoneId, groupId);
        toast.success('Grupo asignado a zona exitosamente');
        await fetchZones(onlyActive);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al asignar grupo';
        toast.error(message);
        return false;
      }
    },
    [onlyActive]
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
        await fetchZones(onlyActive);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al asignar supervisor';
        toast.error(message);
        return false;
      }
    },
    [onlyActive]
  );

  return {
    zones,
    zoneStats,
    loading,
    error,
    refetch,
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
      setSupervisors(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading supervisors:', err);
      setSupervisors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSupervisors();
  }, [loadSupervisors]);

  return { supervisors, loading, refetch: loadSupervisors };
};
