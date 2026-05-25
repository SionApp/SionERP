import { ZonesService } from '@/services/zones.service';
import { ApiService } from '@/services/api.service';

vi.mock('@/services/api.service', () => ({
  ApiService: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ZonesService.getZones — filtros', () => {
  test('sin filtros → URL base', async () => {
    vi.mocked(ApiService.get).mockResolvedValue([]);

    await ZonesService.getZones();

    expect(ApiService.get).toHaveBeenCalledWith('/zones');
  });

  test('is_active=true → agrega query param', async () => {
    vi.mocked(ApiService.get).mockResolvedValue([]);

    await ZonesService.getZones({ is_active: true });

    expect(ApiService.get).toHaveBeenCalledWith('/zones?is_active=true');
  });

  test('is_active=false → también agrega el param (no lo omite por falsy)', async () => {
    // Caso borde importante: false es falsy en JS, un bug común es omitirlo con if(filters.is_active)
    vi.mocked(ApiService.get).mockResolvedValue([]);

    await ZonesService.getZones({ is_active: false });

    expect(ApiService.get).toHaveBeenCalledWith('/zones?is_active=false');
  });
});

describe('ZonesService.getAllZoneStats — lógica de agregación', () => {
  // Este método es el más interesante: hace N llamadas en paralelo y tiene fallback por zona.
  // Es exactamente el tipo de lógica que NECESITA test — tiene manejo de errores parciales.

  test('llama a getZoneStats por cada zona activa', async () => {
    const zonas = [
      { id: 'z1', name: 'Norte', total_groups: 3, total_members: 30, avg_attendance: 80 },
      { id: 'z2', name: 'Sur', total_groups: 2, total_members: 20, avg_attendance: 75 },
    ];

    // Primera llamada: getZones (retorna las zonas)
    // Llamadas 2 y 3: getZoneStats para cada zona
    vi.mocked(ApiService.get)
      .mockResolvedValueOnce(zonas)
      .mockResolvedValueOnce({ zone_id: 'z1', total_groups: 3 })
      .mockResolvedValueOnce({ zone_id: 'z2', total_groups: 2 });

    const result = await ZonesService.getAllZoneStats();

    expect(ApiService.get).toHaveBeenCalledTimes(3);
    expect(result).toHaveLength(2);
  });

  test('si una zona falla, retorna el fallback con datos básicos de esa zona', async () => {
    const zonas = [
      { id: 'z1', name: 'Norte', total_groups: 5, total_members: 50, avg_attendance: 90 },
    ];

    vi.mocked(ApiService.get)
      .mockResolvedValueOnce(zonas) // getZones OK
      .mockRejectedValueOnce(new Error('timeout')); // getZoneStats falla

    const result = await ZonesService.getAllZoneStats();

    // No debe explotar — debe retornar el fallback con los datos que ya tenía
    expect(result).toHaveLength(1);
    expect(result[0].zone_id).toBe('z1');
    expect(result[0].zone_name).toBe('Norte');
    expect(result[0].total_groups).toBe(5); // usa el valor de la zona
  });

  test('sin zonas activas → retorna array vacío', async () => {
    vi.mocked(ApiService.get).mockResolvedValueOnce([]);

    const result = await ZonesService.getAllZoneStats();

    expect(result).toEqual([]);
    expect(ApiService.get).toHaveBeenCalledTimes(1);
  });
});

describe('ZonesService.getAvailableSupervisors — manejo de doble formato de respuesta', () => {
  // El backend puede retornar { users: [], total: N } o directamente []
  // El servicio maneja ambos — testeamos que lo hace bien.

  test('respuesta como array directo → la retorna tal cual', async () => {
    const users = [{ id: '1', first_name: 'Ana' }];
    vi.mocked(ApiService.get).mockResolvedValue(users);

    const result = await ZonesService.getAvailableSupervisors();

    expect(result).toEqual(users);
  });

  test('respuesta como objeto { users, total } → extrae el array', async () => {
    const users = [{ id: '1', first_name: 'Ana' }];
    vi.mocked(ApiService.get).mockResolvedValue({ users, total: 1 });

    const result = await ZonesService.getAvailableSupervisors();

    expect(result).toEqual(users);
  });

  test('respuesta inesperada → retorna array vacío', async () => {
    vi.mocked(ApiService.get).mockResolvedValue(null);

    const result = await ZonesService.getAvailableSupervisors();

    expect(result).toEqual([]);
  });
});
