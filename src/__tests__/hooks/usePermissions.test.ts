import { renderHook, waitFor } from '@testing-library/react';
import { usePermissions } from '@/hooks/usePermissions';

// usePermissions tiene DOS dependencias:
//   1. useAuth → el usuario autenticado
//   2. fetchPermissions → la llamada a la API de permisos
// Mockeamos ambas para controlar 100% lo que recibe el hook.

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/lib/permissions', () => ({
  fetchPermissions: vi.fn(),
  invalidatePermissionsCache: vi.fn(),
  ROLE_LEVELS: {
    admin: 500,
    pastor: 400,
    staff: 300,
    supervisor: 200,
    server: 100,
    member: 0,
  },
}));

// Importamos los mocks DESPUÉS de definirlos para poder configurarlos en cada test
import { useAuth } from '@/contexts/AuthContext';
import { fetchPermissions, invalidatePermissionsCache } from '@/lib/permissions';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('usePermissions — estado inicial', () => {
  test('sin usuario → permissions null, loading false, sin llamar a la API', async () => {
    // DADO: no hay usuario logueado
    vi.mocked(useAuth).mockReturnValue({ user: null } as any);

    // CUANDO: montamos el hook
    const { result } = renderHook(() => usePermissions());

    // ENTONCES: espera a que el effect termine
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.permissions).toBeNull();
    expect(fetchPermissions).not.toHaveBeenCalled();
    expect(invalidatePermissionsCache).toHaveBeenCalled();
  });

  test('con usuario → llama a fetchPermissions con su id', async () => {
    // DADO: hay un usuario logueado
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'user-123' } } as any);
    vi.mocked(fetchPermissions).mockResolvedValue({
      role: 'pastor',
      role_level: 400,
      has_admin_access: true,
      installed_modules: ['discipleship', 'zones'],
    });

    // CUANDO
    const { result } = renderHook(() => usePermissions());

    // Mientras espera la respuesta: loading debe ser true
    expect(result.current.loading).toBe(true);

    // ENTONCES: cuando resuelve el async
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetchPermissions).toHaveBeenCalledWith('user-123');
    expect(result.current.permissions?.role).toBe('pastor');
  });
});

describe('usePermissions.hasAccess — lógica de autorización', () => {
  // Esta función es pura dentro del hook, pero la testeamos aquí porque depende
  // del estado interno (permissions). Es la lógica más crítica del sistema.

  async function mountWithRole(roleLevel: number, modules: string[] = []) {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1' } } as any);
    vi.mocked(fetchPermissions).mockResolvedValue({
      role: 'test',
      role_level: roleLevel,
      has_admin_access: roleLevel >= 400,
      installed_modules: modules,
    });

    const { result } = renderHook(() => usePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));
    return result;
  }

  test('tiene acceso cuando su nivel es suficiente', async () => {
    const result = await mountWithRole(400); // pastor

    expect(result.current.hasAccess(300)).toBe(true); // puede acceder a staff+
    expect(result.current.hasAccess(400)).toBe(true); // puede acceder a su propio nivel
  });

  test('no tiene acceso cuando su nivel es insuficiente', async () => {
    const result = await mountWithRole(100); // server

    expect(result.current.hasAccess(300)).toBe(false);
    expect(result.current.hasAccess(500)).toBe(false);
  });

  test('requiere el módulo instalado además del nivel', async () => {
    const result = await mountWithRole(400, ['discipleship']); // pastor con discipleship

    expect(result.current.hasAccess(400, 'discipleship')).toBe(true);
    expect(result.current.hasAccess(400, 'events')).toBe(false); // no instalado
  });

  test('sin permissions cargadas → hasAccess siempre retorna false', async () => {
    // Sin usuario → permissions es null
    vi.mocked(useAuth).mockReturnValue({ user: null } as any);

    const { result } = renderHook(() => usePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.hasAccess(0)).toBe(false);
  });
});

describe('usePermissions — computed values', () => {
  test('canManageRoles es true solo para admin (nivel 500)', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1' } } as any);
    vi.mocked(fetchPermissions).mockResolvedValue({
      role: 'pastor',
      role_level: 400,
      has_admin_access: true,
      installed_modules: [],
    });

    const { result } = renderHook(() => usePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.canManageRoles).toBe(false); // pastor no es admin
    expect(result.current.canManageUsers).toBe(true); // pastor sí puede gestionar users (staff+)
  });

  test('canManageRoles es true para admin (nivel 500)', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1' } } as any);
    vi.mocked(fetchPermissions).mockResolvedValue({
      role: 'admin',
      role_level: 500,
      has_admin_access: true,
      installed_modules: [],
    });

    const { result } = renderHook(() => usePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.canManageRoles).toBe(true);
    expect(result.current.canManageUsers).toBe(true);
  });
});
