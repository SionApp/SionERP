import { DiscipleshipService } from '@/services/discipleship.service';
import { DiscipleshipAnalyticsService } from '@/services/discipleship-analytics.service';
import { useAuth } from '@/hooks/useAuth';
import { useDiscipleshipData } from '@/hooks/useDiscipleshipData';
import { useCallback, useEffect, useState } from 'react';
import type { DiscipleshipGroup, DiscipleshipReport } from '@/types/discipleship.types';

/**
 * Hook específico para el dashboard del líder (nivel 1)
 * Extiende useDiscipleshipData con datos adicionales necesarios para líderes
 */
export function useLeaderDiscipleshipData() {
  const { user } = useAuth();
  
  // Usar el hook base para datos generales
  const {
    loading: baseLoading,
    stats,
    goals,
    refetch: refetchBase,
  } = useDiscipleshipData({ level: 1, enabled: !!user });

  // Estados adicionales específicos del líder
  const [groups, setGroups] = useState<DiscipleshipGroup[]>([]);
  const [myReports, setMyReports] = useState<DiscipleshipReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar grupos del líder
  const loadGroups = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoadingGroups(true);
      const response = await DiscipleshipService.getGroups({
        leader_id: user.id,
        status: 'active',
        limit: 10,
      });
      setGroups(response.data || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al cargar grupos');
      }
      console.error('Error loading groups:', err);
    } finally {
      setLoadingGroups(false);
    }
  }, [user?.id]);

  // Cargar reportes del líder
  const loadMyReports = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoadingReports(true);
      const reports = await DiscipleshipService.getReports({
        reporter_id: user.id,
        limit: 20,
      });
      setMyReports(reports || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al cargar reportes');
      }
      console.error('Error loading reports:', err);
    } finally {
      setLoadingReports(false);
    }
  }, [user?.id]);

  // Cargar todos los datos cuando el usuario esté disponible
  useEffect(() => {
    if (user?.id) {
      loadGroups();
      loadMyReports();
    }
  }, [user?.id, loadGroups, loadMyReports]);

  // Función para recargar reportes (útil después de crear uno nuevo)
  const refetchReports = useCallback(async () => {
    await loadMyReports();
  }, [loadMyReports]);

  // Función para recargar todo
  const refetch = useCallback(async () => {
    await Promise.all([refetchBase(), loadGroups(), loadMyReports()]);
  }, [refetchBase, loadGroups, loadMyReports]);

  return {
    // Datos del hook base
    stats,
    goals,
    
    // Datos específicos del líder
    groups,
    myReports,
    
    // Estados de carga
    loading: baseLoading || loadingGroups || loadingReports,
    error,
    
    // Funciones de recarga
    refetch,
    refetchReports,
  };
}

