import { ApiService } from '@/services/api.service';

// Sesión única activa (ver middleware/session.go + hooks/useSessionGuard.ts).
// El cliente genera un session_id propio por dispositivo, lo guarda en
// localStorage y lo manda en cada request (X-Session-Id). Al loguearse lo
// "reclama" en el backend, pisando cualquier sesión anterior del mismo usuario.

const SESSION_KEY = 'sion_session_id';

/** Devuelve el session_id de este dispositivo, creándolo la primera vez. */
export function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/** Descarta el session_id (en logout) para que el próximo login genere uno nuevo. */
export function clearSessionId(): void {
  localStorage.removeItem(SESSION_KEY);
}

/** Reclama la sesión activa para este dispositivo. Idempotente. Recién tras
 *  confirmar el claim se habilita el envío del X-Session-Id (evita 401 espurios
 *  por requests que salen antes de que la fila active_sessions quede actualizada). */
export async function claimSession(): Promise<void> {
  await ApiService.post('/auth/session/claim', { session_id: getSessionId() });
  ApiService.markSessionClaimed();
}

// Evento interno: api.service lo dispara cuando el backend responde 401 con un
// code SESSION_* (sesión tomada por otro dispositivo o vencida por inactividad).
// useSessionGuard lo escucha para desloguear con un mensaje claro.
export const SESSION_INVALID_EVENT = 'sion:session-invalid';

export function emitSessionInvalid(code: string): void {
  window.dispatchEvent(new CustomEvent(SESSION_INVALID_EVENT, { detail: { code } }));
}
