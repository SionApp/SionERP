import { useCallback, useEffect, useState } from 'react';
import { ApiService } from '@/services/api.service';

// Convierte la clave pública VAPID (base64url) al Uint8Array que espera
// pushManager.subscribe({ applicationServerKey }).
function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return buffer;
}

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);

  useEffect(() => {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsPushSupported(true);
      navigator.serviceWorker.ready
        .then(reg => reg.pushManager.getSubscription())
        .then(sub => setIsPushSubscribed(!!sub))
        .catch(() => {});
    }
  }, []);

  const requestPermission = async () => {
    if (!isSupported) return false;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  const sendNotification = (title: string, options?: NotificationOptions) => {
    if (permission === 'granted' && isSupported) {
      new Notification(title, {
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        ...options,
      });
    }
  };

  const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        return await navigator.serviceWorker.register('/sw.js');
      } catch (error) {
        console.error('Service Worker registration failed:', error);
        return null;
      }
    }
    return null;
  };

  // Activa las notificaciones push (issue #24): pide permiso, se suscribe al
  // PushManager con la clave VAPID del backend, y registra la suscripción.
  const subscribeToPush = useCallback(async () => {
    if (!isPushSupported) return false;
    const granted = await requestPermission();
    if (!granted) return false;
    try {
      const reg = (await navigator.serviceWorker.ready) as ServiceWorkerRegistration;
      const { publicKey } = await ApiService.get<{ publicKey: string }>('/push/vapid-public-key');
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      await ApiService.post('/push/subscribe', { endpoint: json.endpoint, keys: json.keys });
      setIsPushSubscribed(true);
      return true;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPushSupported]);

  const unsubscribeFromPush = useCallback(async () => {
    if (!isPushSupported) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await ApiService.post('/push/unsubscribe', { endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setIsPushSubscribed(false);
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
    }
  }, [isPushSupported]);

  return {
    permission,
    isSupported,
    isPushSupported,
    isPushSubscribed,
    requestPermission,
    sendNotification,
    registerServiceWorker,
    subscribeToPush,
    unsubscribeFromPush,
  };
};
