import { getDiscipleshipLevelConfig, getDiscipleshipLevelLabel } from '@/lib/discipleship';

describe('getDiscipleshipLevelConfig', () => {
  test('nivel 1 → Líder', () => {
    const config = getDiscipleshipLevelConfig(1);
    expect(config.level).toBe(1);
    expect(config.label).toBe('Líder');
  });

  test('nivel 5 → Pastoral', () => {
    const config = getDiscipleshipLevelConfig(5);
    expect(config.level).toBe(5);
    expect(config.label).toBe('Pastoral');
  });

  // Aquí testeamos los casos borde — los más importantes para evitar crashes en la UI
  test('nivel 0 → "Sin nivel" (caso borde: usuario sin asignar)', () => {
    const config = getDiscipleshipLevelConfig(0);
    expect(config.label).toBe('Sin nivel');
    expect(config.level).toBe(0);
  });

  test('undefined → "Sin nivel"', () => {
    const config = getDiscipleshipLevelConfig(undefined);
    expect(config.label).toBe('Sin nivel');
  });

  test('nivel fuera de rango (6) → "Sin nivel" (mismo tratamiento que 0)', () => {
    const config = getDiscipleshipLevelConfig(6);
    expect(config.label).toBe('Sin nivel');
  });

  test('null → "Sin nivel"', () => {
    const config = getDiscipleshipLevelConfig(null as any);
    expect(config.label).toBe('Sin nivel');
  });
});

describe('getDiscipleshipLevelLabel', () => {
  test('retorna el label correcto para cada nivel', () => {
    expect(getDiscipleshipLevelLabel(1)).toBe('Líder');
    expect(getDiscipleshipLevelLabel(2)).toBe('Sup. Auxiliar');
    expect(getDiscipleshipLevelLabel(3)).toBe('Sup. General');
    expect(getDiscipleshipLevelLabel(4)).toBe('Coordinador');
    expect(getDiscipleshipLevelLabel(5)).toBe('Pastoral');
  });

  test('undefined → "Sin nivel"', () => {
    expect(getDiscipleshipLevelLabel(undefined)).toBe('Sin nivel');
  });
});
