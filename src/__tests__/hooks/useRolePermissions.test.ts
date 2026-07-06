import { renderHook, act, waitFor } from '@testing-library/react';

// ─── Singleton de supabase ────────────────────────────────────────────────────
// useRolePermissions importa supabase directamente.
// Usamos vi.resetModules() + vi.doMock() para que cada test tenga
// un módulo limpio y un mock de supabase controlado.
// ─────────────────────────────────────────────────────────────────────────────

let useRolePermissions: (typeof import('@/hooks/useRolePermissions'))['useRolePermissions'];
let MANAGED_MODULES: (typeof import('@/hooks/useRolePermissions'))['MANAGED_MODULES'];

let mockSelect: ReturnType<typeof vi.fn>;
let mockUpsert: ReturnType<typeof vi.fn>;
let mockToastError: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  vi.resetModules();

  mockSelect = vi.fn();
  mockUpsert = vi.fn();
  mockToastError = vi.fn();

  // supabase.from(...) returns an object with select and upsert.
  // select() is awaited directly (no .eq() chain) in load().
  // upsert() is awaited directly in toggle().
  vi.doMock('@/integrations/supabase/client', () => ({
    supabase: {
      from: vi.fn().mockReturnValue({
        select: mockSelect,
        upsert: mockUpsert,
      }),
    },
  }));

  vi.doMock('sonner', () => ({
    toast: { error: mockToastError, success: vi.fn() },
  }));

  const mod = await import('@/hooks/useRolePermissions');
  useRolePermissions = mod.useRolePermissions;
  MANAGED_MODULES = mod.MANAGED_MODULES;
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setupSelectRows(rows: { role: string; module_key: string; enabled: boolean }[]) {
  // load() awaits select() directly — no .eq() or .filter() chained after
  mockSelect.mockResolvedValue({ data: rows, error: null });
}

function setupSelectError() {
  mockSelect.mockResolvedValue({ data: null, error: new Error('DB error') });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useRolePermissions — load', () => {
  test('builds default matrix (all false) when table is empty', async () => {
    setupSelectRows([]);

    const { result } = renderHook(() => useRolePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.matrix.staff.discipleship).toBe(false);
    expect(result.current.matrix.supervisor.reports).toBe(false);
    expect(result.current.matrix.server.events).toBe(false);
  });

  test('fills matrix correctly from DB rows', async () => {
    setupSelectRows([
      { role: 'staff', module_key: 'discipleship', enabled: true },
      { role: 'supervisor', module_key: 'zones', enabled: true },
      { role: 'server', module_key: 'events', enabled: false },
    ]);

    const { result } = renderHook(() => useRolePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.matrix.staff.discipleship).toBe(true);
    expect(result.current.matrix.supervisor.zones).toBe(true);
    expect(result.current.matrix.server.events).toBe(false);
  });

  test('ignores rows with unknown role or module key', async () => {
    setupSelectRows([
      { role: 'unknown_role', module_key: 'discipleship', enabled: true },
      { role: 'staff', module_key: 'unknown_module', enabled: true },
    ]);

    const { result } = renderHook(() => useRolePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Matrix stays at defaults — unknown rows are dropped
    expect(result.current.matrix.staff.discipleship).toBe(false);
  });

  test('shows toast error and stops loading when DB returns error', async () => {
    setupSelectError();

    const { result } = renderHook(() => useRolePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockToastError).toHaveBeenCalledWith('Error al cargar permisos de roles');
  });
});

describe('useRolePermissions — toggle (optimistic update)', () => {
  test('flips the value optimistically before DB responds', async () => {
    setupSelectRows([{ role: 'staff', module_key: 'discipleship', enabled: false }]);
    // Never resolves during this test — we only check the optimistic state
    mockUpsert.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useRolePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.matrix.staff.discipleship).toBe(false);

    act(() => {
      result.current.toggle('staff', 'discipleship');
    });

    // Optimistic update is synchronous — value flips immediately
    expect(result.current.matrix.staff.discipleship).toBe(true);
  });

  test('keeps updated value when upsert succeeds', async () => {
    setupSelectRows([{ role: 'staff', module_key: 'discipleship', enabled: false }]);
    mockUpsert.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useRolePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.toggle('staff', 'discipleship');
    });

    expect(result.current.matrix.staff.discipleship).toBe(true);
    expect(mockToastError).not.toHaveBeenCalled();
  });

  test('rolls back to previous value when upsert fails', async () => {
    setupSelectRows([{ role: 'staff', module_key: 'discipleship', enabled: true }]);
    mockUpsert.mockResolvedValue({ error: new Error('upsert failed') });

    const { result } = renderHook(() => useRolePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.toggle('staff', 'discipleship');
    });

    // Rolled back to original value
    expect(result.current.matrix.staff.discipleship).toBe(true);
    expect(mockToastError).toHaveBeenCalledWith('Error al guardar permiso');
  });

  test('calls upsert with correct payload', async () => {
    setupSelectRows([{ role: 'supervisor', module_key: 'reports', enabled: false }]);
    mockUpsert.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useRolePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.toggle('supervisor', 'reports');
    });

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'supervisor', module_key: 'reports', enabled: true }),
      { onConflict: 'role,module_key' }
    );
  });

  test('silently ignores toggle for pastor (always full access)', async () => {
    setupSelectRows([]);

    const { result } = renderHook(() => useRolePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      // pastor is RoleKey | wider string — cast to test the guard
      result.current.toggle('pastor' as any, 'discipleship');
    });

    expect(mockUpsert).not.toHaveBeenCalled();
  });
});

describe('useRolePermissions — getAllowedModules', () => {
  test('returns only enabled modules for a role', async () => {
    setupSelectRows([
      { role: 'staff', module_key: 'discipleship', enabled: true },
      { role: 'staff', module_key: 'reports', enabled: true },
      { role: 'staff', module_key: 'zones', enabled: false },
      { role: 'staff', module_key: 'events', enabled: false },
    ]);

    const { result } = renderHook(() => useRolePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const allowed = result.current.getAllowedModules('staff');
    expect(allowed).toContain('discipleship');
    expect(allowed).toContain('reports');
    expect(allowed).not.toContain('zones');
    expect(allowed).not.toContain('events');
  });

  test('returns ALL managed modules for unknown role (safe fallback)', async () => {
    setupSelectRows([]);

    const { result } = renderHook(() => useRolePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const allowed = result.current.getAllowedModules('unknown-role');
    expect(allowed).toEqual([...MANAGED_MODULES]);
  });

  test('returns empty array when role has no modules enabled', async () => {
    setupSelectRows(
      [...MANAGED_MODULES].map(m => ({ role: 'server', module_key: m, enabled: false }))
    );

    const { result } = renderHook(() => useRolePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const allowed = result.current.getAllowedModules('server');
    expect(allowed).toHaveLength(0);
  });
});
