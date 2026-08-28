import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import MusicPage from '@/pages/dashboard/MusicPage';
import MusicMembers from '@/pages/dashboard/music/MusicMembers';
import { MusicService } from '@/services/music.service';

vi.mock('@/hooks/useMobileMode', () => ({
  useMobileMode: vi.fn().mockReturnValue(false),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(),
}));

vi.mock('@/services/music.service', () => ({
  MusicService: {
    getEvents: vi.fn().mockResolvedValue([]),
    getAssignments: vi.fn().mockResolvedValue([]),
    getMembers: vi.fn().mockResolvedValue([]),
    getInstruments: vi.fn().mockResolvedValue([]),
    getSongStats: vi.fn().mockResolvedValue([]),
    getMyAssignments: vi.fn().mockResolvedValue([]),
    getMyUnavailability: vi.fn().mockResolvedValue([]),
    getMyModuleRole: vi.fn().mockResolvedValue({ roleLevel: 1, isDirector: false, hasRole: true }),
  },
}));

vi.mock('@/integrations/supabase/client', () => {
  // Canal Realtime encadenable (useRealtimeTable lo monta al abrir MusicPage).
  const channel = { on: vi.fn(() => channel), subscribe: vi.fn(() => channel) };
  return {
    supabase: {
      auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
      channel: vi.fn(() => channel),
      removeChannel: vi.fn(),
    },
  };
});

import { usePermissions } from '@/hooks/usePermissions';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

function renderWithDirector() {
  vi.mocked(usePermissions).mockReturnValue({
    permissions: {
      role: 'pastor',
      role_level: 400,
      has_admin_access: true,
      installed_modules: ['music'],
    },
    loading: false,
    isLoading: false,
    hasAccess: () => true,
    canManageRoles: true,
    canManageUsers: true,
    refresh: vi.fn(),
  });
  return render(<MusicPage />, { wrapper });
}

function renderWithServidor() {
  vi.mocked(usePermissions).mockReturnValue({
    permissions: {
      role: 'member',
      role_level: 0,
      has_admin_access: false,
      installed_modules: ['music'],
    },
    loading: false,
    isLoading: false,
    hasAccess: () => false,
    canManageRoles: false,
    canManageUsers: false,
    refresh: vi.fn(),
  });
  return render(<MusicPage />, { wrapper });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(MusicService.getEvents).mockResolvedValue([]);
  vi.mocked(MusicService.getMembers).mockResolvedValue([]);
  vi.mocked(MusicService.getSongStats).mockResolvedValue([]);
  vi.mocked(MusicService.getMyAssignments).mockResolvedValue([]);
  vi.mocked(MusicService.getMyUnavailability).mockResolvedValue([]);
  vi.mocked(MusicService.getMyModuleRole).mockResolvedValue({
    roleLevel: 1,
    isDirector: false,
    hasRole: true,
  });
});

describe('MusicPage — director role', () => {
  test('shows all 4 tabs for director', () => {
    renderWithDirector();

    expect(screen.getByRole('tab', { name: 'Cronograma' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Cultos' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Integrantes' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Canciones' })).toBeInTheDocument();
  });

  test('does not show servidor-only view for director', () => {
    renderWithDirector();

    expect(screen.queryByText('Mis cultos')).not.toBeInTheDocument();
    expect(screen.queryByText('Mis indisponibilidades')).not.toBeInTheDocument();
  });
});

describe('MusicPage — servidor role', () => {
  test('shows Mis cultos and Mis indisponibilidades for servidor', async () => {
    renderWithServidor();

    expect(await screen.findByText('Mis cultos')).toBeInTheDocument();
    expect(screen.getByText('Mis indisponibilidades')).toBeInTheDocument();
  });

  test('does not show director tabs for servidor', () => {
    renderWithServidor();

    expect(screen.queryByRole('tab', { name: 'Cronograma' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Cultos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Integrantes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Canciones' })).not.toBeInTheDocument();
  });
});

function renderMembers(isDirector: boolean) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MusicMembers isDirector={isDirector} />
    </QueryClientProvider>
  );
}

describe('MusicMembers — instrument picker', () => {
  beforeEach(() => {
    vi.mocked(MusicService.getMembers).mockResolvedValue([]);
    vi.mocked(MusicService.getInstruments).mockResolvedValue([]);
  });

  test('instrument picker absent until the form opens', async () => {
    renderMembers(true);
    await screen.findByRole('button', { name: /agregar/i });
    expect(screen.queryByText('Instrumento / voz')).not.toBeInTheDocument();
  });

  // New behavior: instrument is picked from the catalog and shown for every
  // función (not just músico), so it appears as soon as the form opens.
  test('instrument picker shown once the form opens, regardless of función', async () => {
    renderMembers(true);
    const addBtn = await screen.findByRole('button', { name: /agregar/i });
    fireEvent.click(addBtn);

    expect(await screen.findByText('Instrumento / voz')).toBeInTheDocument();

    // Still present after toggling a non-músico función.
    const coristaCheckbox = await screen.findByLabelText('Corista');
    fireEvent.click(coristaCheckbox);
    expect(screen.getByText('Instrumento / voz')).toBeInTheDocument();
  });
});

describe('MusicPage — assignment state badge colors', () => {
  test('no_puedo assignment uses destructive badge', async () => {
    vi.mocked(MusicService.getMyAssignments).mockResolvedValue([
      {
        id: 'a1',
        eventId: 'e1',
        memberId: 'm1',
        funcion: 'corista',
        state: 'no_puedo',
        assignedBy: null,
      },
    ]);

    renderWithServidor();

    const badge = await screen.findByText('No puedo');
    expect(badge).toBeInTheDocument();
  });

  test('confirmado assignment uses default (success) badge', async () => {
    vi.mocked(MusicService.getMyAssignments).mockResolvedValue([
      {
        id: 'a2',
        eventId: 'e1',
        memberId: 'm1',
        funcion: 'corista',
        state: 'confirmado',
        assignedBy: null,
      },
    ]);

    renderWithServidor();

    const badge = await screen.findByText('Confirmado');
    expect(badge).toBeInTheDocument();
  });
});
