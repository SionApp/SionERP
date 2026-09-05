import { useEffect, useState, useMemo } from 'react';

/**
 * Modo mobile: activa las pantallas dedicadas mobile (filosofía daas).
 *
 * isMobile = true cuando:
 *   1. App nativa Capacitor (siempre, en cualquier entorno).
 *   2. Viewport < 768px en producción (web móvil: teléfono abriendo la PWA).
 *   3. Dev override: agrega ?m=1 a la URL para previsualizar en browser
 *      (persiste en localStorage). ?m=0 lo desactiva.
 */
const BREAKPOINT = 768;
const PREVIEW_KEY = 'sionerp:mobile-preview';

function isNativePlatform(): boolean {
  const cap = (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return !!cap?.isNativePlatform?.();
}

const previewOverride: boolean = (() => {
  if (!import.meta.env.DEV) return false;
  try {
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
  } catch {
    // localStorage can throw or be unavailable (test runners, private
    // browsing, blocked site data) — the dev-only preview override is a
    // convenience, never worth crashing module load over.
    return false;
  }
})();

export function useMobileMode(): boolean {
  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < BREAKPOINT
  );

  useEffect(() => {
    if (isNativePlatform() || previewOverride) return; // no necesita listener
    const mql = window.matchMedia(`(max-width: ${BREAKPOINT - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsNarrow(e.matches);
    mql.addEventListener('change', handler);
    setIsNarrow(mql.matches);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return useMemo(() => isNativePlatform() || previewOverride || isNarrow, [isNarrow]);
}
