import { DiscipleshipService } from '@/services/discipleship.service';
import { ApiService } from '@/services/api.service';

// Nivel 2: Services
// A diferencia de los tests de lib, los servicios son delgados wrappers sobre ApiService.
// No testeamos "¿llama a ApiService.get?" — eso es obvio.
// Testeamos DOS cosas con valor real:
//   1. Construcción de URLs con query params (lógica no trivial)
//   2. Transformación de respuestas (cuando el servicio remapea el shape del backend)

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

describe('DiscipleshipService.getGroups — construcción de URL', () => {
  test('sin filtros → URL base sin query string', async () => {
    vi.mocked(ApiService.get).mockResolvedValue({ data: [], total: 0 });

    await DiscipleshipService.getGroups();

    expect(ApiService.get).toHaveBeenCalledWith('/discipleship/groups');
  });

  test('con zone_id → agrega ?zone_id=...', async () => {
    vi.mocked(ApiService.get).mockResolvedValue({ data: [], total: 0 });

    await DiscipleshipService.getGroups({ zone_id: 'zona-123' });

    expect(ApiService.get).toHaveBeenCalledWith('/discipleship/groups?zone_id=zona-123');
  });

  test('con múltiples filtros → todos aparecen en la URL', async () => {
    vi.mocked(ApiService.get).mockResolvedValue({ data: [], total: 0 });

    await DiscipleshipService.getGroups({ status: 'active', page: 2, limit: 10 });

    const url = vi.mocked(ApiService.get).mock.calls[0][0] as string;
    expect(url).toContain('status=active');
    expect(url).toContain('page=2');
    expect(url).toContain('limit=10');
  });

  test('zone_id tiene prioridad sobre zone_name cuando ambos están presentes', async () => {
    vi.mocked(ApiService.get).mockResolvedValue({ data: [], total: 0 });

    await DiscipleshipService.getGroups({ zone_id: 'id-123', zone_name: 'Norte' });

    const url = vi.mocked(ApiService.get).mock.calls[0][0] as string;
    expect(url).toContain('zone_id=id-123');
    expect(url).not.toContain('zone_name');
  });
});

describe('DiscipleshipService.getGroupPerformance — transformación de respuesta', () => {
  // Este método es el más valioso de testear porque transforma el shape del backend.
  // Si el backend cambia un campo, este test lo detecta antes de que llegue a la UI.

  test('mapea correctamente los campos del backend al shape del frontend', async () => {
    const backendShape = {
      group_performance: [
        {
          group_id: 'g1',
          group_name: 'Grupo Alfa',
          leader_name: 'Juan Pérez',
          avg_attendance: 15,
          growth_rate: 0.2,
          spiritual_temp: 4,
          status: 'active',
          last_report_date: '2024-06-01',
        },
      ],
    };

    vi.mocked(ApiService.get).mockResolvedValue(backendShape);

    const result = await DiscipleshipService.getGroupPerformance();

    expect(result[0]).toEqual({
      groupId: 'g1',
      groupName: 'Grupo Alfa',
      leaderName: 'Juan Pérez',
      avgAttendance: 15,
      growthRate: 0.2,
      spiritualTemp: 4,
      status: 'active',
      lastReportDate: '2024-06-01',
    });
  });

  test('usa valores por defecto cuando los campos del backend vienen vacíos', async () => {
    vi.mocked(ApiService.get).mockResolvedValue({ group_performance: [{}] });

    const result = await DiscipleshipService.getGroupPerformance();

    expect(result[0].groupName).toBe('Sin nombre');
    expect(result[0].leaderName).toBe('Sin líder');
    expect(result[0].avgAttendance).toBe(0);
    expect(result[0].growthRate).toBe(0);
    expect(result[0].status).toBe('active');
  });

  test('retorna array vacío si group_performance es null/undefined', async () => {
    vi.mocked(ApiService.get).mockResolvedValue({});

    const result = await DiscipleshipService.getGroupPerformance();

    expect(result).toEqual([]);
  });
});

describe('DiscipleshipService.getReports — construcción de URL', () => {
  test('sin filtros → URL base', async () => {
    vi.mocked(ApiService.get).mockResolvedValue([]);

    await DiscipleshipService.getReports();

    expect(ApiService.get).toHaveBeenCalledWith('/discipleship/reports');
  });

  test('con status y type → ambos en la URL', async () => {
    vi.mocked(ApiService.get).mockResolvedValue([]);

    await DiscipleshipService.getReports({ status: 'submitted', type: 'leader' });

    const url = vi.mocked(ApiService.get).mock.calls[0][0] as string;
    expect(url).toContain('status=submitted');
    expect(url).toContain('type=leader');
  });

  test('con paginación → limit y offset en la URL', async () => {
    vi.mocked(ApiService.get).mockResolvedValue([]);

    await DiscipleshipService.getReports({ limit: 20, offset: 40 });

    const url = vi.mocked(ApiService.get).mock.calls[0][0] as string;
    expect(url).toContain('limit=20');
    expect(url).toContain('offset=40');
  });
});

describe('DiscipleshipService.getAlerts — filtros de alerta', () => {
  test('resolved=false → aparece en la URL como string "false"', async () => {
    vi.mocked(ApiService.get).mockResolvedValue([]);

    await DiscipleshipService.getAlerts({ resolved: false });

    expect(ApiService.get).toHaveBeenCalledWith(expect.stringContaining('resolved=false'));
  });

  test('resolved=true → aparece en la URL', async () => {
    vi.mocked(ApiService.get).mockResolvedValue([]);

    await DiscipleshipService.getAlerts({ resolved: true });

    expect(ApiService.get).toHaveBeenCalledWith(expect.stringContaining('resolved=true'));
  });
});
