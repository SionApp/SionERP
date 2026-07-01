import { SettingsService, type PublicSystemSettings } from '@/services/settings.service';
import { useEffect, useRef, useState } from 'react';

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;

/**
 * Carga el subset público de system_settings y APLICA lo que gobierna la UI:
 *  - animations_enabled  → clase `no-animations` en <html>
 *  - session_timeout_minutes → logout por inactividad (si > 0)
 *  - maintenance_mode / site_name → expuestos para que el layout decida
 */
export function useSystemPublicSettings(onIdleLogout?: () => void) {
  const [settings, setSettings] = useState<PublicSystemSettings | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    SettingsService.getPublicSettings().then(data => {
      if (!cancelled && data) setSettings(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Animaciones on/off global
  useEffect(() => {
    if (!settings) return;
    document.documentElement.classList.toggle('no-animations', !settings.animations_enabled);
    return () => document.documentElement.classList.remove('no-animations');
  }, [settings]);

  // Logout por inactividad
  useEffect(() => {
    const minutes = settings?.session_timeout_minutes ?? 0;
    if (!minutes || minutes <= 0 || !onIdleLogout) return;

    const reset = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => onIdleLogout(), minutes * 60_000);
    };

    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, reset));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [settings?.session_timeout_minutes, onIdleLogout]);

  return { settings };
}
