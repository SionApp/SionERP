import { DiscipleshipService } from '@/services/discipleship.service';
import { useAuth } from '@/hooks/useAuth';
import { useDiscipleshipData } from '@/hooks/useDiscipleshipData';
import { useCallback, useEffect, useState } from 'react';
import type { DiscipleshipReport } from '@/types/discipleship.types';

/**
 * Hook específico para el dashboard del supervisor general (nivel 3)
 * Extiende useDiscipleshipData con datos adicionales necesarios para supervisores generales
 */
export function useGeneralSupervisorData() {
  const { user } = useAuth();
  
  // Usar el hook base para datos generales
  const {
    loading: baseLoading,
    stats,
    weeklyTrends,
    subordinates,
    zoneStats,
    refetch: refetchBase,
  } = useDiscipleshipData({ level: 3, enabled: !!user });

  // Estados adicionales específicos del supervisor general
  const [myReports, setMyReports] = useState<DiscipleshipReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar reportes del supervisor general
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
    weeklyTrends,
    subordinates: subordinates || [],
    zoneStats: zoneStats || [],
    
    // Datos específicos del supervisor general
    myReports,
    
    // Estados de carga
    loading: baseLoading || loadingReports,
    error,
    
    // Funciones de recarga
    refetch,
    refetchReports,
  };
}

