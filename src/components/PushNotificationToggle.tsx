import { useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';

/**
 * PushNotificationToggle — activa/desactiva las notificaciones push del
 * navegador (issue #24). Autocontenido: encapsula el flujo de permiso +
 * suscripción para poder soltarlo en el panel de notificaciones o en ajustes.
 */
export function PushNotificationToggle() {
  const { isPushSupported, isPushSubscribed, subscribeToPush, unsubscribeFromPush } =
    useNotifications();
  const [busy, setBusy] = useState(false);

  if (!isPushSupported) return null;

  const toggle = async () => {
    setBusy(true);
    try {
      if (isPushSubscribed) {
        await unsubscribeFromPush();
        toast.success('Notificaciones push desactivadas');
      } else {
        const ok = await subscribeToPush();
        toast[ok ? 'success' : 'error'](
          ok ? 'Notificaciones push activadas' : 'No se pudo activar (permiso denegado)'
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      onClick={toggle}
      disabled={busy}
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : isPushSubscribed ? (
        <BellOff className="h-3.5 w-3.5" />
      ) : (
        <Bell className="h-3.5 w-3.5" />
      )}
      {isPushSubscribed ? 'Desactivar push' : 'Activar push'}
    </Button>
  );
}

export default PushNotificationToggle;
