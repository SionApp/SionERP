import { DiscipleshipService } from '@/services/discipleship.service';
import { useAuth } from '@/hooks/useAuth';
import { useDiscipleshipData } from '@/hooks/useDiscipleshipData';
import { useCallback, useEffect, useState } from 'react';
import type { DiscipleshipGroup, DiscipleshipReport } from '@/types/discipleship.types';

/**
 * Hook específico para el dashboard del supervisor auxiliar (nivel 2)
 * Extiende useDiscipleshipData con datos adicionales necesarios para supervisores auxiliares
 */
export function useAuxiliarySupervisorData() {
  const { user } = useAuth();
  
  // Usar el hook base para datos generales
  const {
    loading: baseLoading,
    stats,
    groups,
    refetch: refetchBase,
  } = useDiscipleshipData({ level: 2, enabled: !!user });

  // Estados adicionales específicos del supervisor auxiliar
  const [myReports, setMyReports] = useState<DiscipleshipReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar reportes del supervisor auxiliar
  const loadMyReports = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoadingReports(true);
      const reports = await DiscipleshipService.getReports({
        reporter_id: user.id,
        report_type: 'supervision',
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

  // Cargar reportes cuando el usuario esté disponible
  useEffect(() => {
    if (user?.id) {
      loadMyReports();
    }
  }, [user?.id, loadMyReports]);

  // Función para recargar reportes (útil después de crear uno nuevo)
  const refetchReports = useCallback(async () => {
    await loadMyReports();
  }, [loadMyReports]);

  // Función para recargar todo
  const refetch = useCallback(async () => {
    await Promise.all([refetchBase(), loadMyReports()]);
  }, [refetchBase, loadMyReports]);

  return {
    // Datos del hook base
    stats,
    groups: groups || [],
    
    // Datos específicos del supervisor auxiliar
    myReports,
    
    // Estados de carga
    loading: baseLoading || loadingReports,
    error,
    
    // Funciones de recarga
    refetch,
    refetchReports,
  };
}

