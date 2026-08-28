import { useEffect } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Options {
  /** Filtro Realtime, ej: `church_id=eq.${churchId}`. Sin filtro escucha toda la tabla. */
  filter?: string;
  /** Si false, no se suscribe (útil mientras carga el churchId). Default true. */
  enabled?: boolean;
}

/**
 * useRealtimeTable — realtime de "pantalla actual" (issue: actualización
 * automática asíncrona). Se suscribe a los cambios de `table` e invalida las
 * `queryKeys` dadas, para que TanStack Query re-fetchee solo. Realtime actúa
 * como "ping: algo cambió", el backend Go (con su TenantTx) sigue sirviendo la
 * data — no se confía en el payload para pintar.
 *
 * Requisitos por tabla: estar en la publicación supabase_realtime y tener una
 * policy SELECT que scopee al cliente (ver migraciones *_realtime.sql). El
 * cliente NO pasa por TenantTx, así que la policy debe basarse en el JWT
 * (app_metadata.church_id) o en auth.uid(), no en current_setting.
 */
export function useRealtimeTable(table: string, queryKeys: QueryKey[], opts: Options = {}) {
  const { filter, enabled = true } = opts;
  const queryClient = useQueryClient();
  // Serializar las keys para una dependencia estable sin re-suscribir en cada render.
  const keysDep = JSON.stringify(queryKeys);

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel(`rt:${table}:${filter ?? 'all'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) },
        () => {
          queryKeys.forEach(key => queryClient.invalidateQueries({ queryKey: key }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, filter, enabled, keysDep]);
}
