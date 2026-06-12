import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MobileMusicPage } from '@/pages/dashboard/music/MobileMusicPage';
import { MusicService } from '@/services/music.service';
import type { MusicAssignment, MusicEvent, MusicUnavailability } from '@/types/music.types';

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

const mockEvent: MusicEvent = {
  id: 'evt-1',
  eventDate: '2026-07-06',
  eventType: 'domingo',
  title: null,
  notes: null,
  published: false,
  createdAt: '2026-07-01T00:00:00Z',
};

const mockAssignment: MusicAssignment = {
  id: 'asgn-1',
  eventId: 'evt-1',
  memberId: 'mem-1',
  memberName: 'Test User',
  funcion: 'corista',
  state: 'asignado',
  assignedBy: null,
};

const mockUnavailability: MusicUnavailability = {
  id: 'unavail-1',
  memberId: 'mem-1',
  startDate: '2026-07-10',
  endDate: '2026-07-20',
  reason: 'Vacaciones',
  createdAt: '2026-07-01T00:00:00Z',
};

// ─── Test setup ───────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(MusicService.getMyAssignments).mockResolvedValue([mockAssignment]);
  vi.mocked(MusicService.getMyUnavailability).mockResolvedValue([mockUnavailability]);
  vi.mocked(MusicService.getEvents).mockResolvedValue([mockEvent]);
  vi.mocked(MusicService.getAssignments).mockResolvedValue([mockAssignment]);
  vi.mocked(MusicService.getEventSongs).mockResolvedValue([]);
  vi.mocked(MusicService.updateAssignment).mockResolvedValue({
    ...mockAssignment,
    state: 'no_puedo',
  });
  vi.mocked(MusicService.createUnavailability).mockResolvedValue({
    ...mockUnavailability,
    id: 'new-1',
  });
  vi.mocked(MusicService.deleteUnavailability).mockResolvedValue(undefined);
  vi.mocked(MusicService.getSongs).mockResolvedValue([]);
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MobileMusicPage — Servidor view', () => {
  test('renders inset list with assignments from getMyAssignments', async () => {
    render(<MobileMusicPage isDirector={false} />, { wrapper });

    // Calls getMyAssignments on mount
    await waitFor(() => {
      expect(MusicService.getMyAssignments).toHaveBeenCalledTimes(1);
    });

    // Shows the funcion label for the assignment
    expect(await screen.findByText('Corista')).toBeInTheDocument();
  });

  test('renders unavailability list', async () => {
    render(<MobileMusicPage isDirector={false} />, { wrapper });

    await waitFor(() => {
      expect(MusicService.getMyUnavailability).toHaveBeenCalledTimes(1);
    });

    // Shows the date range
    expect(await screen.findByText(/2026-07-10 → 2026-07-20/)).toBeInTheDocument();
    expect(await screen.findByText('Vacaciones')).toBeInTheDocument();
  });

  test('deleteUnavailability is called when trash button is clicked', async () => {
    render(<MobileMusicPage isDirector={false} />, { wrapper });

    const trashBtn = await screen.findByLabelText('Eliminar indisponibilidad');
    fireEvent.click(trashBtn);

    await waitFor(() => {
      expect(MusicService.deleteUnavailability).toHaveBeenCalledWith('unavail-1');
    });
  });
});

describe('MobileMusicPage — Servidor culto detail', () => {
  test('tapping culto row opens detail screen', async () => {
    render(<MobileMusicPage isDirector={false} />, { wrapper });

    // Wait for the list item to appear and click it
    const row = await screen.findByText('Corista');
    fireEvent.click(row.closest('[role="button"], button') ?? row);

    // Detail screen should load songs
    await waitFor(() => {
      expect(MusicService.getEventSongs).toHaveBeenCalledWith('evt-1');
    });
  });

  test('"No puedo" button calls updateAssignment with state no_puedo', async () => {
    render(<MobileMusicPage isDirector={false} />, { wrapper });

    // Navigate to detail by clicking the list item
    const row = await screen.findByText('Corista');
    fireEvent.click(row.closest('[role="button"], button') ?? row);

    // Detail screen renders with "No puedo" button
    const noPuedoBtn = await screen.findByRole('button', { name: /no puedo/i });
    fireEvent.click(noPuedoBtn);

    await waitFor(() => {
      expect(MusicService.updateAssignment).toHaveBeenCalledWith('asgn-1', { state: 'no_puedo' });
    });
  });

  test('unavailability sheet accepts null end_date', async () => {
    render(<MobileMusicPage isDirector={false} />, { wrapper });

    // Navigate to detail
    const row = await screen.findByText('Corista');
    fireEvent.click(row.closest('[role="button"], button') ?? row);

    // Open unavailability sheet
    const declareBtn = await screen.findByRole('button', { name: /declarar indisponibilidad/i });
    fireEvent.click(declareBtn);

    // Fill only startDate (endDate left empty → null)
    const startInput = await screen.findByLabelText('Fecha inicio');
    fireEvent.change(startInput, { target: { value: '2026-08-01' } });

    const saveBtn = await screen.findByRole('button', { name: /guardar/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(MusicService.createUnavailability).toHaveBeenCalledWith(
        'me',
        expect.objectContaining({ startDate: '2026-08-01', endDate: null })
      );
    });
  });
});
