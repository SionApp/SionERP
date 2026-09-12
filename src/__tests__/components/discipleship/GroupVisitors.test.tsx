import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';

import { GroupVisitors } from '@/components/discipleship/GroupVisitors';
import { DiscipleshipService, type UserForHierarchy } from '@/services/discipleship.service';
import { useDiscipleshipAccess } from '@/hooks/use-discipleship-access';
import type { Visitor } from '@/types/discipleship.types';

// Behavior tested here: the "Convertir a miembro" action is gated to
// supervisor-or-above (design G4 / r2 user decision: DiscipleshipLevelAuxiliary),
// and both convert-dialog modes send the right payload to the dedicated
// conversion door, surfacing the backend's own message on a 409.

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/hooks/use-discipleship-access');
vi.mock('@/services/discipleship.service', () => ({
  DiscipleshipService: {
    getGroupVisitors: vi.fn(),
    updateVisitor: vi.fn(),
    convertVisitor: vi.fn(),
    getUsersForHierarchy: vi.fn(),
  },
}));

function makeVisitor(overrides: Partial<Visitor> = {}): Visitor {
  return {
    id: 'v1',
    group_id: 'g1',
    first_name: 'Ana',
    last_name: 'Gómez',
    phone: null,
    invited_by: null,
    invited_by_name: '',
    first_visit_date: '2026-09-01',
    status: 'following_up',
    converted_user_id: null,
    notes: null,
    created_at: '2026-09-01',
    updated_at: '2026-09-01',
    ...overrides,
  };
}

function makeCandidate(overrides: Partial<UserForHierarchy> = {}): UserForHierarchy {
  return {
    id: 'u1',
    first_name: 'Juan',
    last_name: 'Pérez',
    email: 'juan@iglesia.com',
    phone: '',
    id_number: '',
    role: 'member',
    hierarchy_level: null,
    supervisor_id: null,
    zone_id: null,
    zone_name: null,
    territory: null,
    latitude: null,
    longitude: null,
    ...overrides,
  };
}

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(DiscipleshipService.getGroupVisitors).mockResolvedValue([makeVisitor()]);
});

describe('GroupVisitors — convert gating', () => {
  test('level 1 (leader) sees the Convert action disabled', async () => {
    vi.mocked(useDiscipleshipAccess).mockReturnValue({
      level: 1,
      isFullAccess: false,
      canConvert: false,
      loadingAccess: false,
    });
    renderWithClient(<GroupVisitors groupId="g1" />);
    await screen.findByText('Ana Gómez');
    const button = screen.getByRole('button', { name: /convertir a miembro/i });
    expect(button).toBeDisabled();
  });

  test('supervisor-or-above sees the Convert action enabled', async () => {
    vi.mocked(useDiscipleshipAccess).mockReturnValue({
      level: 2,
      isFullAccess: false,
      canConvert: true,
      loadingAccess: false,
    });
    renderWithClient(<GroupVisitors groupId="g1" />);
    await screen.findByText('Ana Gómez');
    const button = screen.getByRole('button', { name: /convertir a miembro/i });
    expect(button).not.toBeDisabled();
  });
});

describe('GroupVisitors — convert dialog', () => {
  beforeEach(() => {
    vi.mocked(useDiscipleshipAccess).mockReturnValue({
      level: 2,
      isFullAccess: false,
      canConvert: true,
      loadingAccess: false,
    });
    vi.mocked(DiscipleshipService.getUsersForHierarchy).mockResolvedValue([makeCandidate()]);
  });

  test('link-existing mode sends { user_id }', async () => {
    vi.mocked(DiscipleshipService.convertVisitor).mockResolvedValue({
      user_id: 'u1',
      journey_id: 'j1',
      assignment_id: null,
      path_configured: false,
      message: 'ok',
    });
    renderWithClient(<GroupVisitors groupId="g1" />);
    await screen.findByText('Ana Gómez');
    fireEvent.click(screen.getByRole('button', { name: /convertir a miembro/i }));

    await screen.findByText('Juan Pérez');
    fireEvent.click(screen.getByText('Juan Pérez'));
    fireEvent.click(screen.getByRole('button', { name: /^convertir$/i }));

    await waitFor(() =>
      expect(DiscipleshipService.convertVisitor).toHaveBeenCalledWith('v1', { user_id: 'u1' })
    );
  });

  test('create-new mode sends the optional email and surfaces a 409 message', async () => {
    vi.mocked(DiscipleshipService.convertVisitor).mockRejectedValue(
      new Error(
        'este usuario ya tiene una asignación de camino vinculada a otro registro de discipulado'
      )
    );
    renderWithClient(<GroupVisitors groupId="g1" />);
    await screen.findByText('Ana Gómez');
    fireEvent.click(screen.getByRole('button', { name: /convertir a miembro/i }));

    fireEvent.click(screen.getByRole('button', { name: /crear nuevo/i }));
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'ana@iglesia.com' } });
    fireEvent.click(screen.getByRole('button', { name: /^convertir$/i }));

    await waitFor(() =>
      expect(DiscipleshipService.convertVisitor).toHaveBeenCalledWith('v1', {
        email: 'ana@iglesia.com',
      })
    );
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'este usuario ya tiene una asignación de camino vinculada a otro registro de discipulado'
      )
    );
  });
});
