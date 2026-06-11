import { useMemo } from 'react';

/**
 * Modo mobile EXCLUSIVO (filosofía daas): no es responsive por viewport.
 * isMobile = app nativa (Capacitor) || override de preview en dev.
 *
 * Preview: agregá `?m=1` a la URL para activar el modo mobile en el navegador
 * (persiste en localStorage). `?m=0` lo desactiva. Solo funciona en dev —
 * en producción el override se tree-shakea y únicamente Capacitor activa el modo.
 */
const PREVIEW_KEY = 'sionerp:mobile-preview';

function isNativePlatform(): boolean {
  const cap = (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return !!cap?.isNativePlatform?.();
}

// El ?m=1 se captura al CARGAR el módulo (no al montar un componente):
// el query param vive en /login pero el layout monta recién post-navegación.
const previewOverride: boolean = (() => {
  if (!import.meta.env.DEV) return false;
  const m = new URLSearchParams(window.location.search).get('m');
  if (m === '1') {
    localStorage.setItem(PREVIEW_KEY, '1');
    return true;
  }
  if (m === '0') {
    localStorage.removeItem(PREVIEW_KEY);
    return false;
  }
  return localStorage.getItem(PREVIEW_KEY) === '1';
})();

export function useMobileMode(): boolean {
  return useMemo(() => isNativePlatform() || previewOverride, []);
}
