import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NotificationService } from '@/services/notification.service';
import type { Notification } from '@/components/ui/notifications';

export function useNotificationsData() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Fetch HTTP (carga inicial y reconexión) ─────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const data = await NotificationService.getAll();
      setNotifications(data ?? []);
    } catch (e) {
      console.error('[notifications] fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Suscripción Realtime ────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      // Fetch inicial mientras se conecta el canal
      fetchAll();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const channel = supabase
        .channel(`notifications:${user.id}`)
        // Nueva notificación → prepender al estado
        .on(
          'postgres_changes',
          {
            event:  'INSERT',
            schema: 'public',
            table:  'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          ({ new: row }) => {
            setNotifications(prev => [row as Notification, ...prev]);
          },
        )
        // Notificación marcada como leída en otra pestaña → sincronizar
        .on(
          'postgres_changes',
          {
            event:  'UPDATE',
            schema: 'public',
            table:  'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          ({ new: row }) => {
            const updated = row as Notification;
            setNotifications(prev =>
              prev.map(n => (n.id === updated.id ? updated : n)),
            );
          },
        )
        .subscribe(status => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            // Canal caído → refetch por HTTP como fallback
            console.warn('[notifications] Realtime error, refetching via HTTP');
            if (!cancelled) fetchAll();
          }
        });

      channelRef.current = channel;
    };

    setup();

    // Refetch al volver al tab (por si se perdió un evento mientras el canal
    // estaba en background o reconectando)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchAll();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchAll]);

  // ── Acciones (optimistic updates) ──────────────────────────────────────────
  const markAsRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    await NotificationService.markAsRead(id);
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await NotificationService.markAllAsRead();
  }, []);

  const dismiss = useCallback(async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    await NotificationService.dismiss(id);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, dismiss };
}
