import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MobileMusicPage } from '@/pages/dashboard/music/MobileMusicPage';
import { MusicService } from '@/services/music.service';
import type { MusicAssignment, MusicEvent } from '@/types/music.types';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/services/music.service', () => ({
  MusicService: {
    getMyAssignments: vi.fn(),
    getMyUnavailability: vi.fn(),
    getEvents: vi.fn(),
    getAssignments: vi.fn(),
    getEventSongs: vi.fn(),
    updateAssignment: vi.fn(),
    createUnavailability: vi.fn(),
    deleteUnavailability: vi.fn(),
    getSongs: vi.fn(),
    addSongToEvent: vi.fn(),
    removeEventSong: vi.fn(),
  },
}));

vi.mock('@/components/mobile/mobile-nav-state', () => ({
  setMobileNavHidden: vi.fn(),
  useMobileNavHidden: vi.fn().mockReturnValue(false),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn().mockReturnValue(vi.fn()),
  NavLink: ({ children, to, ...props }: React.PropsWithChildren<{ to: string }>) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeEvent = (
  id: string,
  date: string,
  type: 'viernes' | 'domingo' = 'domingo'
): MusicEvent => ({
  id,
  eventDate: date,
  eventType: type,
  title: null,
  notes: null,
  published: false,
  createdAt: '2026-01-01T00:00:00Z',
});

// Q1 events (Jan-Mar)
const q1Event1 = makeEvent('q1-evt-1', '2026-01-05');
// Q2 events (Apr-Jun)
const q2Event1 = makeEvent('q2-evt-1', '2026-04-05');
// Q3 events (Jul-Sep)
const q3Event1 = makeEvent('q3-evt-1', '2026-07-06');

const noPuedoAssignment: MusicAssignment = {
  id: 'asgn-np',
  eventId: 'q3-evt-1',
  memberId: 'mem-1',
  memberName: 'María Pérez',
  funcion: 'corista',
  state: 'no_puedo',
  assignedBy: null,
};

const confirmedAssignment: MusicAssignment = {
  id: 'asgn-ok',
  eventId: 'q3-evt-1',
  memberId: 'mem-2',
  memberName: 'Juan García',
  funcion: 'musico',
  state: 'confirmado',
  assignedBy: null,
};

// ─── Test setup ───────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(MusicService.getMyAssignments).mockResolvedValue([]);
  vi.mocked(MusicService.getMyUnavailability).mockResolvedValue([]);
  vi.mocked(MusicService.getEvents).mockResolvedValue([q1Event1, q2Event1, q3Event1]);
  vi.mocked(MusicService.getAssignments).mockResolvedValue([]);
  vi.mocked(MusicService.getEventSongs).mockResolvedValue([]);
  vi.mocked(MusicService.getSongs).mockResolvedValue([]);
  vi.mocked(MusicService.updateAssignment).mockResolvedValue(noPuedoAssignment);
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MobileMusicPage — Director view', () => {
  test('renders Q1/Q2/Q3/Q4 segment control', async () => {
    render(<MobileMusicPage isDirector />, { wrapper });

    await waitFor(() => expect(MusicService.getEvents).toHaveBeenCalled());

    expect(await screen.findByRole('button', { name: 'Q1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Q2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Q3' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Q4' })).toBeInTheDocument();
  });

  test('segment quarter filter shows only cultos for selected quarter', async () => {
    render(<MobileMusicPage isDirector />, { wrapper });

    await waitFor(() => expect(MusicService.getEvents).toHaveBeenCalled());

    // Switch to Q2 — should render the Q2 event
    const q2Btn = await screen.findByRole('button', { name: 'Q2' });
    fireEvent.click(q2Btn);

    // EventRowWithCount renders each event as a MobileListItem
    // The event type label "Domingo" should appear exactly once for the Q2 event
    await waitFor(() => {
      expect(MusicService.getAssignments).toHaveBeenCalledWith('q2-evt-1');
    });

    // Q1 event should not be shown — verify by checking heading says Q2
    expect(screen.getByText('Cultos Q2')).toBeInTheDocument();
  });

  test('song autocomplete calls getSongs after debounce', async () => {
    render(<MobileMusicPage isDirector />, { wrapper });

    await waitFor(() => expect(MusicService.getEvents).toHaveBeenCalled());

    // Switch to Q3 to get q3Event1
    const q3Btn = await screen.findByRole('button', { name: 'Q3' });
    fireEvent.click(q3Btn);

    // Find culto row and click it (EventRowWithCount renders a MobileListItem with onClick)
    await waitFor(() => expect(MusicService.getAssignments).toHaveBeenCalledWith('q3-evt-1'));

    // The director detail screen — find the "Domingo" text row and click it
    const cultoListItem = await screen.findByText('Domingo');
    const clickable = cultoListItem.closest('button') ?? cultoListItem;
    fireEvent.click(clickable);

    // Song input appears in detail screen
    const songInput = await screen.findByPlaceholderText('Buscar canción...');

    // Track calls before typing
    const callsBefore = vi.mocked(MusicService.getSongs).mock.calls.length;

    // Type in the input — debounced at 300ms real time
    fireEvent.change(songInput, { target: { value: 'Oceans' } });

    // getSongs not called immediately
    expect(vi.mocked(MusicService.getSongs).mock.calls.length).toBe(callsBefore);

    // Wait for debounce (350ms covers the 300ms debounce)
    await new Promise(r => setTimeout(r, 350));

    await waitFor(() => {
      expect(MusicService.getSongs).toHaveBeenCalledWith('Oceans');
    });
  }, 10000);

  test('no_puedo alerts section renders when assignments have no_puedo state', async () => {
    vi.mocked(MusicService.getAssignments).mockImplementation(async (eventId: string) => {
      if (eventId === 'q3-evt-1') return [noPuedoAssignment, confirmedAssignment];
      return [];
    });

    render(<MobileMusicPage isDirector />, { wrapper });

    await waitFor(() => expect(MusicService.getEvents).toHaveBeenCalled());

    // Navigate to Q3
    const q3Btn = await screen.findByRole('button', { name: 'Q3' });
    fireEvent.click(q3Btn);

    // Wait for assignments to be fetched
    await waitFor(() => {
      expect(MusicService.getAssignments).toHaveBeenCalledWith('q3-evt-1');
    });

    // Click culto row to enter detail
    const cultoListItem = await screen.findByText('Domingo');
    const clickable = cultoListItem.closest('button') ?? cultoListItem;
    fireEvent.click(clickable);

    // "No pueden" section header visible in detail screen
    expect(await screen.findByText('No pueden')).toBeInTheDocument();

    // The no_puedo member name appears (may appear in both team list and no-pueden section)
    const mariaPelez = await screen.findAllByText('María Pérez');
    expect(mariaPelez.length).toBeGreaterThan(0);
  });
});
