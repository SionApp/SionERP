import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { DiscipleshipService } from '@/services/discipleship.service';
import {
  resolveJourneyStage,
  useConvertVisitor,
  useCreateJourneyEntry,
  useMemberJourney,
  useUpdateJourneyActivity,
} from '@/hooks/use-member-journey';
import type { JourneyEntry } from '@/types/discipleship.types';

// Behavior tested here, not implementation: each hook calls the right
// DiscipleshipService method with the right arguments, invalidates the
// 'discipleship-journey' query key on success, and `resolveJourneyStage`
// never mislabels a member with no anchor (spec: Not-Tracked Rendering).

vi.mock('@/services/discipleship.service', () => ({
  DiscipleshipService: {
    getJourney: vi.fn(),
    convertVisitor: vi.fn(),
    createJourneyEntry: vi.fn(),
    updateJourneyActivity: vi.fn(),
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

function makeEntry(overrides: Partial<JourneyEntry> = {}): JourneyEntry {
  return {
    user_id: 'u1',
    origin: 'conversion',
    activity_status: 'active',
    activity_changed_at: '2026-09-01T00:00:00Z',
    converted_at: '2026-09-01T00:00:00Z',
    stage: 'new_convert',
    assignment_id: null,
    curriculum_id: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useMemberJourney', () => {
  test('fetches with the given user_ids and exposes the entries', async () => {
    vi.mocked(DiscipleshipService.getJourney).mockResolvedValue([makeEntry()]);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useMemberJourney(['u1', 'u2']), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(DiscipleshipService.getJourney).toHaveBeenCalledWith(['u1', 'u2']);
    expect(result.current.data).toEqual([makeEntry()]);
  });

  test('does not fetch when user_ids is empty', async () => {
    const { wrapper } = createWrapper();

    renderHook(() => useMemberJourney([]), { wrapper });

    await new Promise(resolve => setTimeout(resolve, 0));
    expect(DiscipleshipService.getJourney).not.toHaveBeenCalled();
  });
});

describe('resolveJourneyStage', () => {
  test('returns the entry stage when the user_id is present', () => {
    const entries = [makeEntry({ user_id: 'u1', stage: 'disciple' })];
    expect(resolveJourneyStage(entries, 'u1')).toBe('disciple');
  });

  test('returns not_tracked when the user_id has no anchor in the batch', () => {
    const entries = [makeEntry({ user_id: 'u1' })];
    expect(resolveJourneyStage(entries, 'u2')).toBe('not_tracked');
  });

  test('returns not_tracked for an empty entries array', () => {
    expect(resolveJourneyStage([], 'u1')).toBe('not_tracked');
  });
});

describe('useConvertVisitor', () => {
  test('calls convertVisitor with visitorId + body, invalidates the journey key on success', async () => {
    vi.mocked(DiscipleshipService.convertVisitor).mockResolvedValue({
      user_id: 'u1',
      journey_id: 'j1',
      assignment_id: 'a1',
      path_configured: true,
      message: 'ok',
    });
    const { wrapper, invalidateSpy } = createWrapper();

    const { result } = renderHook(() => useConvertVisitor(), { wrapper });

    result.current.mutate({ visitorId: 'v1', data: { user_id: 'u1' } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(DiscipleshipService.convertVisitor).toHaveBeenCalledWith('v1', { user_id: 'u1' });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['discipleship-journey'] });
  });
});

describe('useCreateJourneyEntry', () => {
  test('calls createJourneyEntry, invalidates the journey key on success', async () => {
    vi.mocked(DiscipleshipService.createJourneyEntry).mockResolvedValue({
      journey_id: 'j1',
      assignment_id: null,
      path_configured: false,
      message: 'ok',
    });
    const { wrapper, invalidateSpy } = createWrapper();

    const { result } = renderHook(() => useCreateJourneyEntry(), { wrapper });

    result.current.mutate({ user_id: 'u2' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(DiscipleshipService.createJourneyEntry).toHaveBeenCalledWith({ user_id: 'u2' });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['discipleship-journey'] });
  });
});

describe('useUpdateJourneyActivity', () => {
  test('calls updateJourneyActivity with userId + wrapped activity_status body', async () => {
    vi.mocked(DiscipleshipService.updateJourneyActivity).mockResolvedValue({ message: 'ok' });
    const { wrapper, invalidateSpy } = createWrapper();

    const { result } = renderHook(() => useUpdateJourneyActivity(), { wrapper });

    result.current.mutate({ userId: 'u1', activityStatus: 'inactive' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(DiscipleshipService.updateJourneyActivity).toHaveBeenCalledWith('u1', {
      activity_status: 'inactive',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['discipleship-journey'] });
  });
});
