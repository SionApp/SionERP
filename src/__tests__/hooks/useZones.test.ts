import { renderHook, act, waitFor } from '@testing-library/react';

// ─── El problema del singleton ───────────────────────────────────────────────
// useZones tiene un `cache` a nivel de módulo:
//
//   const cache = { zones: [], initialized: false, loading: false, ... }
//
// Si el test A deja cache.initialized = true, el test B NO va a hacer fetch.
// Vi.clearAllMocks() limpia el historial de llamadas pero NO resetea el módulo.
//
// La solución: vi.resetModules() antes de cada test + vi.doMock() (no hoisted).
// vi.doMock() a diferencia de vi.mock() NO se mueve al top del archivo —
// corre en orden, justo después del reset.
// ─────────────────────────────────────────────────────────────────────────────

// Variables que re-importamos en cada test para tener siempre el módulo fresco
let useZones: (typeof import('@/hooks/useZones'))['useZones'];
let useAvailableSupervisors: (typeof import('@/hooks/useZones'))['useAvailableSupervisors'];
let mockGetZones: ReturnType<typeof vi.fn>;
let mockGetAllZoneStats: ReturnType<typeof vi.fn>;
let mockCreateZone: ReturnType<typeof vi.fn>;
let mockUpdateZone: ReturnType<typeof vi.fn>;
let mockDeleteZone: ReturnType<typeof vi.fn>;
let mockGetAvailableSupervisors: ReturnType<typeof vi.fn>;
let mockToastSuccess: ReturnType<typeof vi.fn>;
let mockToastError: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  // 1. Resetea TODOS los módulos — borra el cache singleton
  vi.resetModules();

  // 2. Preparamos los mocks con valores por defecto sensatos
  mockGetZones = vi.fn().mockResolvedValue([]);
  mockGetAllZoneStats = vi.fn().mockResolvedValue([]);
  mockCreateZone = vi.fn();
  mockUpdateZone = vi.fn();
  mockDeleteZone = vi.fn();
  mockGetAvailableSupervisors = vi.fn().mockResolvedValue([]);
  mockToastSuccess = vi.fn();
  mockToastError = vi.fn();

  // 3. vi.doMock() — registra los mocks DESPUÉS del reset (no hoisted)
  vi.doMock('@/services/zones.service', () => ({
    ZonesService: {
      getZones: mockGetZones,
      getAllZoneStats: mockGetAllZoneStats,
      createZone: mockCreateZone,
      updateZone: mockUpdateZone,
      deleteZone: mockDeleteZone,
      getZone: vi.fn(),
      getZoneGroups: vi.fn(),
      assignGroupToZone: vi.fn(),
      assignUserToZone: vi.fn(),
      getAvailableSupervisors: mockGetAvailableSupervisors,
    },
  }));

  vi.doMock('sonner', () => ({
    toast: { success: mockToastSuccess, error: mockToastError },
  }));

  // 4. Re-importamos el hook desde cero — ahora usa el módulo limpio
  const mod = await import('@/hooks/useZones');
  useZones = mod.useZones;
  useAvailableSupervisors = mod.useAvailableSupervisors;
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useZones — carga inicial', () => {
  test('autoLoad=true → carga zonas y stats al montar', async () => {
    const zonas = [{ id: 'z1', name: 'Norte', is_active: true }];
    const stats = [{ zone_id: 'z1', total_groups: 3 }];

    mockGetZones.mockResolvedValue(zonas);
    mockGetAllZoneStats.mockResolvedValue(stats);

    const { result } = renderHook(() => useZones());

    // Justo al montar: loading es true
    expect(result.current.loading).toBe(true);

    // Esperamos que termine el fetch
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.zones).toHaveLength(1);
    expect(result.current.zones[0].name).toBe('Norte');
    expect(result.current.zoneStats).toHaveLength(1);
  });

  test('autoLoad=false → NO hace fetch al montar', async () => {
    renderHook(() => useZones({ autoLoad: false }));

    // Damos tiempo suficiente para que cualquier efecto async corra
    await new Promise(r => setTimeout(r, 50));

    expect(mockGetZones).not.toHaveBeenCalled();
  });

  test('error en la carga → expone el mensaje de error', async () => {
    mockGetZones.mockRejectedValue(new Error('Sin conexión'));

    const { result } = renderHook(() => useZones());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Sin conexión');
    expect(result.current.zones).toEqual([]);
  });
});

describe('useZones — normalización de sql.NullString', () => {
  test('convierte campos NullString del backend a string o undefined', async () => {
    // El backend Go serializa campos nullable como { String: "valor", Valid: true }
    // El hook debe convertir eso a un string normal
    mockGetZones.mockResolvedValue([
      {
        id: 'z1',
        name: 'Norte',
        description: { String: 'Zona norte de la ciudad', Valid: true },
        supervisor_id: { String: '', Valid: false }, // null en Go
      },
    ]);

    const { result } = renderHook(() => useZones());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.zones[0].description).toBe('Zona norte de la ciudad');
    expect(result.current.zones[0].supervisor_id).toBeUndefined();
  });
});

describe('useZones — mutaciones', () => {
  test('createZone: retorna el id, muestra toast success y refresca', async () => {
    mockCreateZone.mockResolvedValue({ zone_id: 'nueva-zona-id', message: 'OK' });

    const { result } = renderHook(() => useZones({ autoLoad: false }));

    let zoneId: string | null = null;
    await act(async () => {
      zoneId = await result.current.createZone({ name: 'Nueva Zona', is_active: true });
    });

    expect(zoneId).toBe('nueva-zona-id');
    expect(mockToastSuccess).toHaveBeenCalledWith('Zona creada exitosamente');
    // Después de crear, refresca el cache
    expect(mockGetZones).toHaveBeenCalled();
  });

  test('createZone: retorna null y muestra toast error si falla', async () => {
    mockCreateZone.mockRejectedValue(new Error('Ya existe una zona con ese nombre'));

    const { result } = renderHook(() => useZones({ autoLoad: false }));

    let zoneId: string | null = 'no-null'; // valor inicial distinto de null
    await act(async () => {
      zoneId = await result.current.createZone({ name: 'Duplicada', is_active: true });
    });

    expect(zoneId).toBeNull();
    expect(mockToastError).toHaveBeenCalledWith('Ya existe una zona con ese nombre');
  });

  test('deleteZone: retorna true y muestra toast success', async () => {
    mockDeleteZone.mockResolvedValue({ message: 'Eliminada' });

    const { result } = renderHook(() => useZones({ autoLoad: false }));

    let ok: boolean = false;
    await act(async () => {
      ok = await result.current.deleteZone('z1');
    });

    expect(ok).toBe(true);
    expect(mockToastSuccess).toHaveBeenCalledWith('Zona eliminada exitosamente');
  });

  test('deleteZone: retorna false y muestra toast error si falla', async () => {
    mockDeleteZone.mockRejectedValue(new Error('Zona tiene grupos activos'));

    const { result } = renderHook(() => useZones({ autoLoad: false }));

    let ok: boolean = true;
    await act(async () => {
      ok = await result.current.deleteZone('z1');
    });

    expect(ok).toBe(false);
    expect(mockToastError).toHaveBeenCalledWith('Zona tiene grupos activos');
  });
});

describe('useAvailableSupervisors', () => {
  test('carga supervisores al montar y los expone', async () => {
    const supervisores = [
      { id: 's1', first_name: 'Daniel', last_name: 'Rodríguez', role: 'pastor' },
    ];
    mockGetAvailableSupervisors.mockResolvedValue(supervisores);

    const { result } = renderHook(() => useAvailableSupervisors());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.supervisors).toHaveLength(1);
    expect(result.current.supervisors[0].first_name).toBe('Daniel');
  });

  test('error en carga → supervisors queda vacío, no explota', async () => {
    mockGetAvailableSupervisors.mockRejectedValue(new Error('Forbidden'));

    const { result } = renderHook(() => useAvailableSupervisors());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.supervisors).toEqual([]);
  });
});
