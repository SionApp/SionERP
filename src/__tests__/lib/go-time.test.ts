import { parseGoTime, extractString, extractTimeString, formatRelativeDate } from '@/lib/go-time';

// Funciones puras = sin mocks. Solo input → output.
// Esta es la forma más simple de test que existe.

describe('parseGoTime', () => {
  test('parsea un ISO string directo (time.Time de Go)', () => {
    const result = parseGoTime('2024-01-15T10:30:00Z');
    expect(result).toBeInstanceOf(Date);
    expect(result?.toISOString()).toBe('2024-01-15T10:30:00.000Z');
  });

  test('parsea un objeto sql.NullTime válido', () => {
    const nullTime = { Time: '2024-06-01T00:00:00Z', Valid: true };
    const result = parseGoTime(nullTime);
    expect(result).toBeInstanceOf(Date);
  });

  test('retorna null si sql.NullTime tiene Valid=false', () => {
    expect(parseGoTime({ Time: '2024-06-01T00:00:00Z', Valid: false })).toBeNull();
  });

  test('retorna null para null, undefined, string vacío', () => {
    expect(parseGoTime(null)).toBeNull();
    expect(parseGoTime(undefined)).toBeNull();
    expect(parseGoTime('')).toBeNull();
  });
});

describe('extractString', () => {
  test('devuelve el string directo', () => {
    expect(extractString('hola')).toBe('hola');
  });

  test('extrae el valor de un sql.NullString válido', () => {
    expect(extractString({ String: 'mundo', Valid: true })).toBe('mundo');
  });

  test('retorna null si NullString tiene Valid=false', () => {
    expect(extractString({ String: 'ignorado', Valid: false })).toBeNull();
  });

  test('retorna null para valores vacíos', () => {
    expect(extractString(null)).toBeNull();
    expect(extractString(undefined)).toBeNull();
  });
});

describe('formatRelativeDate', () => {
  test('retorna "Hoy" para fecha de hoy', () => {
    expect(formatRelativeDate(new Date().toISOString())).toBe('Hoy');
  });

  test('retorna "Ayer" para fecha de ayer', () => {
    const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeDate(ayer)).toBe('Ayer');
  });

  test('retorna "Hace N días" para fechas recientes', () => {
    const haceTresDias = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeDate(haceTresDias)).toBe('Hace 3 días');
  });

  test('retorna "Fecha desconocida" para valores inválidos', () => {
    expect(formatRelativeDate(null)).toBe('Fecha desconocida');
    expect(formatRelativeDate('no-es-fecha')).toBe('Fecha desconocida');
  });
});

describe('extractTimeString', () => {
  test('retorna el ISO string de una fecha válida', () => {
    const result = extractTimeString('2024-03-10T12:00:00Z');
    expect(result).toBe('2024-03-10T12:00:00.000Z');
  });

  test('retorna string de "ahora" como fallback si el valor es inválido', () => {
    const before = Date.now();
    const result = extractTimeString(null);
    const after = Date.now();
    expect(new Date(result).getTime()).toBeGreaterThanOrEqual(before);
    expect(new Date(result).getTime()).toBeLessThanOrEqual(after);
  });
});
