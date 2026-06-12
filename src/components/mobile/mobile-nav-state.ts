import { useSyncExternalStore } from 'react';

/**
 * Estado del bottom nav (patrón pushed-detail de daas):
 * las pantallas de detalle con `back` ocultan el nav al montarse.
 * Store externo mínimo — sin context, sin provider.
 */
let hidden = false;
const listeners = new Set<() => void>();

export function setMobileNavHidden(value: boolean) {
  if (hidden === value) return;
  hidden = value;
  listeners.forEach(l => l());
}

export function useMobileNavHidden(): boolean {
  return useSyncExternalStore(
    cb => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => hidden
  );
}
