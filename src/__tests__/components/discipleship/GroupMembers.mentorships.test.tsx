import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { GroupMembers } from '@/components/discipleship/GroupMembers';
import { DiscipleshipService } from '@/services/discipleship.service';
import { useDiscipleshipAccess } from '@/hooks/use-discipleship-access';
import type { GroupMemberWithDetails } from '@/types/discipleship.types';

// Behavior tested here (Slice 2 — disciple-maker, task B4/B5): the "Asignar
// discípulo" row action is gated the same way as the manual-conversion door
// (use-discipleship-access's canConvert, DiscipleshipLevelAuxiliary=2), and
// the group's live mentorship count (spec R6, the leader's "weekly report")
// renders from GET /discipleship/groups/:id/mentorships.

vi.mock('@/hooks/use-discipleship-access');
vi.mock('@/hooks/useMobileMode', () => ({ useMobileMode: () => false }));
vi.mock('@/contexts/SystemContext', () => ({
  useSystem: () => ({ isModuleInstalled: () => false }),
}));
vi.mock('@/components/discipleship/GroupVisitors', () => ({
  GroupVisitors: () => null,
}));
vi.mock('@/services/discipleship.service', () => ({
  DiscipleshipService: {
    getGroupMembers: vi.fn(),
    getGroupAttendance: vi.fn(),
    getJourney: vi.fn(),
    getGroupMentorships: vi.fn(),
    createMentorship: vi.fn(),
    endMentorship: vi.fn(),
  },
}));

function makeMember(overrides: Partial<GroupMemberWithDetails> = {}): GroupMemberWithDetails {
  return {
    id: 'gm1',
    group_id: 'g1',
    user_id: 'u1',
    role_in_group: 'member',
    is_active: true,
    joined_at: '2026-01-01',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    user_name: 'Ana Gómez',
    user_email: 'ana@iglesia.com',
    ...overrides,
  };
}

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(DiscipleshipService.getGroupMembers).mockResolvedValue([makeMember()]);
  vi.mocked(DiscipleshipService.getGroupAttendance).mockResolvedValue([]);
  vi.mocked(DiscipleshipService.getJourney).mockResolvedValue([]);
  vi.mocked(DiscipleshipService.getGroupMentorships).mockResolvedValue({
    mentorships: [],
    count: 0,
  });
});

describe('GroupMembers — mentorship gating', () => {
  test('below supervisor level (canConvert=false): no "Asignar discípulo" action', async () => {
    vi.mocked(useDiscipleshipAccess).mockReturnValue({
      level: 1,
      isFullAccess: false,
      canConvert: false,
      loadingAccess: false,
    });

    renderWithClient(<GroupMembers groupId="g1" groupName="Célula 1" />);

    await screen.findByText('Ana Gómez');
    expect(screen.queryByRole('button', { name: /asignar discípulo/i })).not.toBeInTheDocument();
  });

  test('supervisor-or-above (canConvert=true): shows "Asignar discípulo" action', async () => {
    vi.mocked(useDiscipleshipAccess).mockReturnValue({
      level: 2,
      isFullAccess: false,
      canConvert: true,
      loadingAccess: false,
    });

    renderWithClient(<GroupMembers groupId="g1" groupName="Célula 1" />);

    await screen.findByText('Ana Gómez');
    expect(screen.getByRole('button', { name: /asignar discípulo/i })).toBeInTheDocument();
  });
});

describe('GroupMembers — mentorship count', () => {
  beforeEach(() => {
    vi.mocked(useDiscipleshipAccess).mockReturnValue({
      level: 2,
      isFullAccess: false,
      canConvert: true,
      loadingAccess: false,
    });
  });

  test('renders the group active-pair count from the mentorships endpoint', async () => {
    vi.mocked(DiscipleshipService.getGroupMentorships).mockResolvedValue({
      mentorships: [
        {
          id: 'm1',
          group_id: 'g1',
          mentor_user_id: 'u1',
          mentor_name: 'Ana Gómez',
          mentee_user_id: 'u2',
          mentee_name: 'Juan Pérez',
          status: 'active',
          started_at: '2026-09-01T00:00:00Z',
          ended_at: null,
        },
      ],
      count: 1,
    });

    renderWithClient(<GroupMembers groupId="g1" groupName="Célula 1" />);

    await screen.findByText('Ana Gómez');
    expect(await screen.findByText('1 discipulado activo')).toBeInTheDocument();
  });

  test('renders the plural form when count is not 1', async () => {
    vi.mocked(DiscipleshipService.getGroupMentorships).mockResolvedValue({
      mentorships: [],
      count: 3,
    });

    renderWithClient(<GroupMembers groupId="g1" groupName="Célula 1" />);

    await screen.findByText('Ana Gómez');
    expect(await screen.findByText('3 discipulados activos')).toBeInTheDocument();
  });
});
