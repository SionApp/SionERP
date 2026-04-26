import { DiscipleshipService } from '@/services/discipleship.service';
import type {
  DiscipleshipLevel,
  CreateDiscipleshipLevelRequest,
  UpdateDiscipleshipLevelRequest,
} from '@/types/discipleship.types';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

const normalizeNullString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'String' in value && 'Valid' in value) {
    const nullString = value as { String: string; Valid: boolean };
    return nullString.Valid ? nullString.String : null;
  }
  return String(value);
};

interface UseDiscipleshipLevelsOptions {
  autoLoad?: boolean;
  onlyActive?: boolean;
}

interface UseDiscipleshipLevelsReturn {
  levels: DiscipleshipLevel[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getLevel: (id: string) => DiscipleshipLevel | undefined;
  createLevel: (data: CreateDiscipleshipLevelRequest) => Promise<string | null>;
  updateLevel: (id: string, data: UpdateDiscipleshipLevelRequest) => Promise<boolean>;
  deleteLevel: (id: string) => Promise<boolean>;
}

export function useDiscipleshipLevels(
  options: UseDiscipleshipLevelsOptions = {}
): UseDiscipleshipLevelsReturn {
  const { autoLoad = true, onlyActive = true } = options;

  const [levels, setLevels] = useState<DiscipleshipLevel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizeLevel = (level: DiscipleshipLevel): DiscipleshipLevel => {
    return {
      ...level,
      name: normalizeNullString(level.name) || level.name,
      description: normalizeNullString(level.description) || undefined,
      icon: normalizeNullString(level.icon) || 'users',
      color: normalizeNullString(level.color) || '#3b82f6',
    };
  };

  const loadLevels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = onlyActive ? '?is_active=true' : '';
      const data = await DiscipleshipService.getLevels();

      const normalizedLevels = (Array.isArray(data) ? data : []).map(normalizeLevel);
      setLevels(normalizedLevels);
    } catch (err) {
      console.error('Error loading discipleship levels:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar niveles de discipulado');
      toast.error('Error al cargar niveles de discipulado');
    } finally {
      setLoading(false);
    }
  }, [onlyActive]);

  useEffect(() => {
    if (autoLoad) {
      loadLevels();
    }
  }, [autoLoad, loadLevels]);

  const getLevel = useCallback(
    (id: string): DiscipleshipLevel | undefined => {
      return levels.find(l => l.id === id);
    },
    [levels]
  );

  const createLevel = useCallback(
    async (data: CreateDiscipleshipLevelRequest): Promise<string | null> => {
      try {
        const newLevel = await DiscipleshipService.createLevel(data);
        await loadLevels();
        toast.success('Nivel de discipulado creado exitosamente');
        return newLevel.id;
      } catch (err) {
        console.error('Error creating discipleship level:', err);
        toast.error(err instanceof Error ? err.message : 'Error al crear nivel de discipulado');
        return null;
      }
    },
    [loadLevels]
  );

  const updateLevel = useCallback(
    async (id: string, data: UpdateDiscipleshipLevelRequest): Promise<boolean> => {
      try {
        await DiscipleshipService.updateLevel(id, data);
        await loadLevels();
        toast.success('Nivel de discipulado actualizado exitosamente');
        return true;
      } catch (err) {
        console.error('Error updating discipleship level:', err);
        toast.error(
          err instanceof Error ? err.message : 'Error al actualizar nivel de discipulado'
        );
        return false;
      }
    },
    [loadLevels]
  );

  const deleteLevel = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await DiscipleshipService.deleteLevel(id);
        await loadLevels();
        toast.success('Nivel de discipulado eliminado exitosamente');
        return true;
      } catch (err) {
        console.error('Error deleting discipleship level:', err);
        toast.error(err instanceof Error ? err.message : 'Error al eliminar nivel de discipulado');
        return false;
      }
    },
    [loadLevels]
  );

  return {
    levels,
    loading,
    error,
    refetch: loadLevels,
    getLevel,
    createLevel,
    updateLevel,
    deleteLevel,
  };
}
