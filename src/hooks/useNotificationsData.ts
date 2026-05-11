import { useState, useEffect, useCallback } from 'react';
import { NotificationService } from '@/services/notification.service';
import type { Notification } from '@/components/ui/notifications';

const FETCH_KEY = 'sion_notif_last_fetch';
const POLL_MS = 30_000;
const SKIP_THRESHOLD_MS = 25_000;

export function useNotificationsData() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNow = useCallback(async (bypassGuard = false) => {
    if (!bypassGuard) {
      try {
        const last = localStorage.getItem(FETCH_KEY);
        if (last && Date.now() - Number(last) < SKIP_THRESHOLD_MS) return;
      } catch {
        // localStorage unavailable (e.g. strict incognito) — proceed with fetch
      }
    }

    try {
      setLoading(true);
      const data = await NotificationService.getAll();
      setNotifications(data ?? []);
      try {
        localStorage.setItem(FETCH_KEY, Date.now().toString());
      } catch {
        // localStorage unavailable — silently ignore
      }
    } catch (e) {
      console.error('useNotificationsData fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNow(true);

    const interval = setInterval(() => fetchNow(false), POLL_MS);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchNow(true);
      }
    };

    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchNow]);

  const markAsRead = useCallback(async (id: string) => {
    await NotificationService.markAsRead(id);
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllAsRead = useCallback(async () => {
    await NotificationService.markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const dismiss = useCallback(async (id: string) => {
    await NotificationService.dismiss(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, dismiss };
}
