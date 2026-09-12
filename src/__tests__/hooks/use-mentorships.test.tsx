import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { DiscipleshipService } from '@/services/discipleship.service';
import {
  useCreateMentorship,
  useEndMentorship,
  useGroupMentorships,
} from '@/hooks/use-mentorships';
import type { GroupMentorshipsResponse, Mentorship } from '@/types/discipleship.types';

// Behavior tested here: each hook calls the right DiscipleshipService method
// with the right arguments, and both mutations invalidate BOTH the
// mentorship key and the member-journey key on success — so
// `JourneyStageBadge` flips to `disciple_maker` live (spec R1/R4).

vi.mock('@/services/discipleship.service', () => ({
  DiscipleshipService: {
    getGroupMentorships: vi.fn(),
    createMentorship: vi.fn(),
    endMentorship: vi.fn(),
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

function makeMentorship(overrides: Partial<Mentorship> = {}): Mentorship {
  return {
    id: 'm1',
    group_id: 'g1',
    mentor_user_id: 'u1',
    mentor_name: 'Ana Gómez',
    mentee_user_id: 'u2',
    mentee_name: 'Juan Pérez',
    status: 'active',
    started_at: '2026-09-01T00:00:00Z',
    ended_at: null,
    ...overrides,
  };
}

function makeResponse(overrides: Partial<GroupMentorshipsResponse> = {}): GroupMentorshipsResponse {
  return {
    mentorships: [makeMentorship()],
    count: 1,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useGroupMentorships', () => {
  test('fetches the group active pairs + count', async () => {
    vi.mocked(DiscipleshipService.getGroupMentorships).mockResolvedValue(makeResponse());
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useGroupMentorships('g1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(DiscipleshipService.getGroupMentorships).toHaveBeenCalledWith('g1');
    expect(result.current.data).toEqual(makeResponse());
  });

  test('does not fetch when groupId is empty', async () => {
    const { wrapper } = createWrapper();

    renderHook(() => useGroupMentorships(''), { wrapper });

    await new Promise(resolve => setTimeout(resolve, 0));
    expect(DiscipleshipService.getGroupMentorships).not.toHaveBeenCalled();
  });
});

describe('useCreateMentorship', () => {
  test('calls createMentorship with groupId + body, invalidates mentorship AND journey keys', async () => {
    vi.mocked(DiscipleshipService.createMentorship).mockResolvedValue({
      id: 'm1',
      message: 'ok',
    });
    const { wrapper, invalidateSpy } = createWrapper();

    const { result } = renderHook(() => useCreateMentorship(), { wrapper });

    result.current.mutate({
      groupId: 'g1',
      data: { mentor_user_id: 'u1', mentee_user_id: 'u2' },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(DiscipleshipService.createMentorship).toHaveBeenCalledWith('g1', {
      mentor_user_id: 'u1',
      mentee_user_id: 'u2',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['discipleship-mentorships'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['discipleship-journey'] });
  });
});

describe('useEndMentorship', () => {
  test('calls endMentorship with the mentorship id, invalidates mentorship AND journey keys', async () => {
    vi.mocked(DiscipleshipService.endMentorship).mockResolvedValue({ message: 'ok' });
    const { wrapper, invalidateSpy } = createWrapper();

    const { result } = renderHook(() => useEndMentorship(), { wrapper });

    result.current.mutate('m1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(DiscipleshipService.endMentorship).toHaveBeenCalledWith('m1');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['discipleship-mentorships'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['discipleship-journey'] });
  });
});
