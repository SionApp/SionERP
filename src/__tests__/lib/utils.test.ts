import { cn, normalizeNullString } from '@/lib/utils';

describe('cn (className merger)', () => {
  test('combina clases simples', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  test('Tailwind: la clase más reciente gana el conflicto', () => {
    // tailwind-merge resuelve conflictos: p-4 gana sobre p-2
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  test('ignora valores falsy', () => {
    expect(cn('base', false && 'oculto', undefined, null, '')).toBe('base');
  });

  test('soporta expresiones condicionales', () => {
    const isActive = true;
    expect(cn('base', isActive && 'active')).toBe('base active');
  });
});

describe('normalizeNullString', () => {
  test('devuelve el string si es string', () => {
    expect(normalizeNullString('hola')).toBe('hola');
  });

  test('retorna null para null y undefined', () => {
    expect(normalizeNullString(null)).toBeNull();
    expect(normalizeNullString(undefined)).toBeNull();
  });

  test('extrae el valor de un sql.NullString válido', () => {
    expect(normalizeNullString({ String: 'zona norte', Valid: true })).toBe('zona norte');
  });

  test('retorna null si NullString tiene Valid=false', () => {
    expect(normalizeNullString({ String: 'ignorado', Valid: false })).toBeNull();
  });

  test('convierte números a string', () => {
    expect(normalizeNullString(42)).toBe('42');
  });
});
