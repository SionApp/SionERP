import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { DiscipleshipService } from '@/services/discipleship.service';
import {
  useDiscipleshipSettings,
  useUpdateDiscipleshipSettings,
} from '@/hooks/use-discipleship-settings';

vi.mock('@/services/discipleship.service', () => ({
  DiscipleshipService: {
    getDiscipleshipSettings: vi.fn(),
    updateDiscipleshipSettings: vi.fn(),
  },
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  }
  return { wrapper, invalidateSpy };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useDiscipleshipSettings', () => {
  test('fetches the church-level curriculum pointer', async () => {
    vi.mocked(DiscipleshipService.getDiscipleshipSettings).mockResolvedValue({
      conversion_path_curriculum_id: 'c1',
    });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useDiscipleshipSettings(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(DiscipleshipService.getDiscipleshipSettings).toHaveBeenCalled();
    expect(result.current.data).toEqual({ conversion_path_curriculum_id: 'c1' });
  });
});

describe('useUpdateDiscipleshipSettings', () => {
  test('sends the new pointer and invalidates the settings key on success', async () => {
    vi.mocked(DiscipleshipService.updateDiscipleshipSettings).mockResolvedValue({ message: 'ok' });
    const { wrapper, invalidateSpy } = createWrapper();

    const { result } = renderHook(() => useUpdateDiscipleshipSettings(), { wrapper });

    result.current.mutate({ conversion_path_curriculum_id: 'c2' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(DiscipleshipService.updateDiscipleshipSettings).toHaveBeenCalledWith({
      conversion_path_curriculum_id: 'c2',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['discipleship-settings'] });
  });

  test('clearing the pointer sends an explicit null, not an omitted field', async () => {
    vi.mocked(DiscipleshipService.updateDiscipleshipSettings).mockResolvedValue({ message: 'ok' });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdateDiscipleshipSettings(), { wrapper });

    result.current.mutate({ conversion_path_curriculum_id: null });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(DiscipleshipService.updateDiscipleshipSettings).toHaveBeenCalledWith({
      conversion_path_curriculum_id: null,
    });
  });
});
