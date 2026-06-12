import { MusicService } from '@/services/music.service';
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

describe('MusicService.createMember — payload shape', () => {
  test('sends userId as user_id, funciones array, and instrument', async () => {
    const raw = {
      id: 'm1',
      user_id: 'u1',
      funciones: ['musico'],
      instrument: 'guitarra',
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
    };
    vi.mocked(ApiService.post).mockResolvedValue(raw);

    const result = await MusicService.createMember({
      userId: 'u1',
      funciones: ['musico'],
      instrument: 'guitarra',
    });

    expect(ApiService.post).toHaveBeenCalledWith('/music/members', {
      user_id: 'u1',
      funciones: ['musico'],
      instrument: 'guitarra',
    });

    expect(result.userId).toBe('u1');
    expect(result.funciones).toEqual(['musico']);
    expect(result.instrument).toBe('guitarra');
  });

  test('sends multiple funciones correctly', async () => {
    const raw = {
      id: 'm2',
      user_id: 'u2',
      funciones: ['corista', 'musico'],
      instrument: 'piano',
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
    };
    vi.mocked(ApiService.post).mockResolvedValue(raw);

    await MusicService.createMember({
      userId: 'u2',
      funciones: ['corista', 'musico'],
      instrument: 'piano',
    });

    const [, body] = vi.mocked(ApiService.post).mock.calls[0];
    expect((body as { funciones: string[] }).funciones).toEqual(['corista', 'musico']);
  });

  test('sends null instrument when not musico', async () => {
    const raw = {
      id: 'm3',
      user_id: 'u3',
      funciones: ['corista'],
      instrument: null,
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
    };
    vi.mocked(ApiService.post).mockResolvedValue(raw);

    await MusicService.createMember({
      userId: 'u3',
      funciones: ['corista'],
      instrument: null,
    });

    const [, body] = vi.mocked(ApiService.post).mock.calls[0];
    expect((body as { instrument: null }).instrument).toBeNull();
  });
});

describe('MusicService.createAssignment — maps unavailability_warning', () => {
  test('maps snake_case unavailability_warning → camelCase unavailabilityWarning: true', async () => {
    const rawAssignment = {
      id: 'a1',
      event_id: 'e1',
      member_id: 'm1',
      funcion: 'corista',
      state: 'asignado',
      assigned_by: 'director-id',
    };
    vi.mocked(ApiService.post).mockResolvedValue({
      assignment: rawAssignment,
      unavailability_warning: true,
    });

    const result = await MusicService.createAssignment('e1', {
      memberId: 'm1',
      funcion: 'corista',
    });

    expect(result.unavailabilityWarning).toBe(true);
    expect(result.assignment.id).toBe('a1');
    expect(result.assignment.funcion).toBe('corista');
    expect(result.assignment.state).toBe('asignado');
  });

  test('maps unavailability_warning: false correctly', async () => {
    const rawAssignment = {
      id: 'a2',
      event_id: 'e1',
      member_id: 'm2',
      funcion: 'musico',
      state: 'asignado',
      assigned_by: null,
    };
    vi.mocked(ApiService.post).mockResolvedValue({
      assignment: rawAssignment,
      unavailability_warning: false,
    });

    const result = await MusicService.createAssignment('e1', { memberId: 'm2', funcion: 'musico' });

    expect(result.unavailabilityWarning).toBe(false);
  });

  test('sends correct payload to API', async () => {
    const rawAssignment = {
      id: 'a3',
      event_id: 'ev-123',
      member_id: 'mem-456',
      funcion: 'tecnico',
      state: 'asignado',
      assigned_by: null,
    };
    vi.mocked(ApiService.post).mockResolvedValue({
      assignment: rawAssignment,
      unavailability_warning: false,
    });

    await MusicService.createAssignment('ev-123', { memberId: 'mem-456', funcion: 'tecnico' });

    expect(ApiService.post).toHaveBeenCalledWith('/music/events/ev-123/assignments', {
      member_id: 'mem-456',
      funcion: 'tecnico',
    });
  });
});

describe('MusicService.getSongs — query param', () => {
  test('without q → no query string', async () => {
    vi.mocked(ApiService.get).mockResolvedValue([]);

    await MusicService.getSongs();

    expect(ApiService.get).toHaveBeenCalledWith('/music/songs');
  });

  test('with q → appends ?q= encoded', async () => {
    vi.mocked(ApiService.get).mockResolvedValue([]);

    await MusicService.getSongs('Oceans');

    expect(ApiService.get).toHaveBeenCalledWith('/music/songs?q=Oceans');
  });

  test('q with spaces → URL-encoded', async () => {
    vi.mocked(ApiService.get).mockResolvedValue([]);

    await MusicService.getSongs('great is');

    expect(ApiService.get).toHaveBeenCalledWith('/music/songs?q=great%20is');
  });

  test('maps name_normalized to nameNormalized in response', async () => {
    vi.mocked(ApiService.get).mockResolvedValue([
      {
        id: 's1',
        name: 'Oceans',
        name_normalized: 'oceans',
        author: null,
        default_key: null,
        historical_key: 'G',
      },
    ]);

    const result = await MusicService.getSongs('Oceans');

    expect(result[0].nameNormalized).toBe('oceans');
    expect(result[0].historicalKey).toBe('G');
  });
});
