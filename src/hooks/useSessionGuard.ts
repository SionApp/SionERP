import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { invalidatePermissionsCache } from '@/lib/permissions';
import { claimSession, clearSessionId, getSessionId, SESSION_INVALID_EVENT } from '@/lib/session';

// Minutos de inactividad tras los cuales se cierra la sesión localmente. Es el
// enforcer preciso de la decisión "solo inactividad (30 min)"; el backend tiene
// un backstop un poco más laxo (35 min) para no cortar en carreras.
const IDLE_LOGOUT_MIN = 30;
const IDLE_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

/**
 * useSessionGuard: sesión única activa + vencimiento por inactividad + reacción
 * en vivo a cambios críticos (rol/estado del propio usuario). Se monta UNA vez,
 * arriba del árbol autenticado (AppContent). Todo cuelga de una sola suscripción
 * Realtime + un timer de inactividad — sin polling.
 */
export function useSessionGuard() {
  const { user, logout, refreshCurrentUser } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    let done = false;

    const forceLogout = (message: string) => {
      if (done) return;
      done = true;
      toast.error(message);
      clearSessionId();
      logout();
    };

    // 1) Reclamar la sesión para este dispositivo (pisa la del dispositivo previo).
    claimSession().catch(() => {
      // Un fallo del claim no debe romper el login — el guard del backend solo
      // aplica cuando existe una fila reclamada, así que sin claim no se corta nada.
    });

    const mySessionId = getSessionId();

    // 2) Realtime: propia fila de active_sessions (kill cross-device) + propia
    //    fila de users (cambios de rol / suspensión en vivo).
    const channel = supabase
      .channel(`session-guard:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'active_sessions',
          filter: `user_id=eq.${userId}`,
        },
        ({ new: row }) => {
          if ((row as { session_id?: string }).session_id !== mySessionId) {
            forceLogout('Se inició sesión en otro dispositivo.');
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
        ({ new: row }) => {
          const u = row as { is_active?: boolean };
          if (u.is_active === false) {
            forceLogout('Tu cuenta fue desactivada.');
            return;
          }
          // Rol/estado cambió por detrás → refrescar permisos y datos sin recargar.
          invalidatePermissionsCache();
          refreshCurrentUser();
          queryClient.invalidateQueries();
        }
      )
      .subscribe();

    // 3) Timer de inactividad — se reinicia con actividad real del usuario.
    let idleTimer: ReturnType<typeof setTimeout>;
    let lastReset = 0;
    const startTimer = () => {
      idleTimer = setTimeout(
        () => forceLogout('Sesión cerrada por inactividad.'),
        IDLE_LOGOUT_MIN * 60 * 1000
      );
    };
    const resetTimer = () => {
      const now = Date.now();
      if (now - lastReset < 5000) return; // throttle: no reprogramar en cada píxel
      lastReset = now;
      clearTimeout(idleTimer);
      startTimer();
    };
    startTimer();
    IDLE_EVENTS.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));

    // 4) Backstop del backend: un 401 SESSION_* (visto por api.service) llega acá.
    const onInvalid = (e: Event) => {
      const code = (e as CustomEvent<{ code?: string }>).detail?.code;
      forceLogout(
        code === 'SESSION_EXPIRED'
          ? 'Sesión cerrada por inactividad.'
          : 'Se inició sesión en otro dispositivo.'
      );
    };
    window.addEventListener(SESSION_INVALID_EVENT, onInvalid);

    return () => {
      done = true;
      supabase.removeChannel(channel);
      clearTimeout(idleTimer);
      IDLE_EVENTS.forEach(e => window.removeEventListener(e, resetTimer));
      window.removeEventListener(SESSION_INVALID_EVENT, onInvalid);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
}
