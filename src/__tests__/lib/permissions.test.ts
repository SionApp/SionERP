import { fetchPermissions, invalidatePermissionsCache, ROLE_LEVELS } from '@/lib/permissions';
import { ApiService } from '@/services/api.service';

// La diferencia con los tests anteriores:
// fetchPermissions llama a ApiService.get(), una dependencia externa.
// No queremos que los tests hablen a la red — así que "mockeamos" el módulo completo.
// vi.mock() reemplaza TODAS las exportaciones por vi.fn() controladas por nosotros.
vi.mock('@/services/api.service', () => ({
  ApiService: {
    get: vi.fn(),
  },
}));

describe('ROLE_LEVELS (constantes)', () => {
  // Las constantes no necesitan mocks — son valores fijos.
  test('la jerarquía de roles es correcta', () => {
    expect(ROLE_LEVELS.admin).toBeGreaterThan(ROLE_LEVELS.pastor);
    expect(ROLE_LEVELS.pastor).toBeGreaterThan(ROLE_LEVELS.staff);
    expect(ROLE_LEVELS.staff).toBeGreaterThan(ROLE_LEVELS.supervisor);
    expect(ROLE_LEVELS.supervisor).toBeGreaterThan(ROLE_LEVELS.server);
    expect(ROLE_LEVELS.server).toBeGreaterThan(ROLE_LEVELS.member);
  });

  test('el admin tiene el nivel más alto (500)', () => {
    expect(ROLE_LEVELS.admin).toBe(500);
  });

  test('el miembro tiene nivel 0', () => {
    expect(ROLE_LEVELS.member).toBe(0);
  });
});

// beforeEach al nivel del archivo — corre antes de CADA test sin importar en qué describe esté.
// Esto garantiza que ningún test herede caché ni historial de llamadas del test anterior.
beforeEach(() => {
  vi.clearAllMocks();
  invalidatePermissionsCache();
});

describe('fetchPermissions', () => {
  test('llama a /permissions/me y retorna los datos', async () => {
    const mockPermissions = {
      role: 'pastor',
      role_level: 400,
      has_admin_access: true,
      installed_modules: ['discipleship', 'zones'],
    };

    // Decimos: "cuando alguien llame a ApiService.get, devolvé esto"
    vi.mocked(ApiService.get).mockResolvedValue(mockPermissions);

    const result = await fetchPermissions();

    expect(ApiService.get).toHaveBeenCalledWith('/permissions/me');
    expect(result.role).toBe('pastor');
    expect(result.has_admin_access).toBe(true);
  });

  test('usa caché en la segunda llamada (no llama a la API dos veces)', async () => {
    vi.mocked(ApiService.get).mockResolvedValue({
      role: 'staff',
      role_level: 300,
      has_admin_access: true,
      installed_modules: [],
    });

    // Primera llamada → va a la API
    await fetchPermissions();
    // Segunda llamada → debe usar la caché
    await fetchPermissions();

    // La API solo debería haberse llamado UNA vez
    expect(ApiService.get).toHaveBeenCalledTimes(1);
  });

  test('invalida la caché si cambia el userId', async () => {
    vi.mocked(ApiService.get).mockResolvedValue({
      role: 'server',
      role_level: 100,
      has_admin_access: false,
      installed_modules: [],
    });

    await fetchPermissions('user-1');
    await fetchPermissions('user-2'); // distinto usuario → debe re-llamar API

    expect(ApiService.get).toHaveBeenCalledTimes(2);
  });

  test('retorna permisos mínimos si la API falla (fallback)', async () => {
    vi.mocked(ApiService.get).mockRejectedValue(new Error('Network error'));

    const result = await fetchPermissions();

    // No debe explotar — devuelve el fallback seguro
    expect(result.role).toBe('member');
    expect(result.role_level).toBe(0);
    expect(result.has_admin_access).toBe(false);
  });
});

describe('invalidatePermissionsCache', () => {
  test('fuerza una nueva llamada a la API después de invalidar', async () => {
    vi.mocked(ApiService.get).mockResolvedValue({
      role: 'admin',
      role_level: 500,
      has_admin_access: true,
      installed_modules: ['base'],
    });

    await fetchPermissions();
    invalidatePermissionsCache();
    await fetchPermissions();

    expect(ApiService.get).toHaveBeenCalledTimes(2);
  });
});
