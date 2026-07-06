/**
 * Helpers para deserializar tipos de tiempo de Go al frontend.
 *
 * Go serializa time.Time como ISO string directo, pero sql.NullTime
 * como { Time: string, Valid: bool }. Estas funciones manejan ambos casos.
 */

/**
 * Extrae un Date de:
 * - string ISO directo (time.Time)
 * - { Time: string, Valid: bool } (sql.NullTime)
 * - null / undefined
 */
export function parseGoTime(value: unknown): Date | null {
  if (!value) return null;
  if (typeof value === 'string') return new Date(value);
  if (
    typeof value === 'object' &&
    value !== null &&
    'Valid' in value &&
    'Time' in value &&
    (value as { Valid: boolean }).Valid
  ) {
    return new Date((value as { Time: string }).Time);
  }
  return null;
}

/**
 * Extrae un string ISO de:
 * - string ISO directo (time.Time)
 * - { Time: string, Valid: bool } (sql.NullTime)
 * - null / undefined
 * Retorna ISO string de "ahora" como fallback.
 */
export function extractTimeString(value: unknown): string {
  const d = parseGoTime(value);
  return d ? d.toISOString() : new Date().toISOString();
}

/**
 * Extrae un string de:
 * - string directo
 * - { String: string, Valid: bool } (sql.NullString)
 * - null / undefined
 */
export function extractString(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (
    typeof value === 'object' &&
    value !== null &&
    'Valid' in value &&
    (value as { Valid: boolean }).Valid &&
    'String' in value
  ) {
    return (value as { String: string }).String || null;
  }
  return null;
}

/**
 * Formatea una fecha relativa al presente.
 */
export function formatRelativeDate(value: unknown): string {
  const d = parseGoTime(value);
  if (!d || isNaN(d.getTime())) return 'Fecha desconocida';
  const diffDays = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
}
