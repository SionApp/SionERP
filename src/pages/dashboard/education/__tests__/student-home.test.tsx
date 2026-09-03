import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

import StudentHome from '../student/StudentHome';
import { EducationService } from '@/services/education.service';
import { useAuth } from '@/contexts/AuthContext';
import type { EducationAssignment, EducationHomeAggregate } from '@/types/education.types';

// D.7 (tasks-v2): the student profile mini-stat row must be a real 2-up
// ("En curso"/"Completados") and no certificate string/icon may render
// anywhere on this screen (spec: education-copy-and-omissions,
// "Certificates are absent, not stubbed").

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/services/education.service', () => ({
  EducationService: {
    getHome: vi.fn(),
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

function assignment(overrides: Partial<EducationAssignment>): EducationAssignment {
  return {
    id: 'a1',
    curriculumId: 'c1',
    curriculumName: 'Fundamentos de la fe',
    assignedTo: 'u1',
    assignedBy: null,
    sourceModule: null,
    sourceRefId: null,
    dueDate: null,
    completedAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    completedLessons: 2,
    totalLessons: 8,
    status: 'in_progress',
    assignedToName: null,
    assignedToEmail: null,
    track: 'discipulado',
    teacherName: 'Pastor Luis Mendoza',
    ...overrides,
  };
}

describe('StudentHome — profile stat row + certificate omission (D.7)', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        id: 'u1',
        email: 'alumno@example.com',
        first_name: 'Daniel',
        last_name: 'Ramírez',
        zone_name: 'Zona Oeste 2',
      },
    } as unknown as ReturnType<typeof useAuth>);
  });

  it('renders exactly two profile mini-stats and no certificate copy', async () => {
    const home: EducationHomeAggregate = {
      inProgressCount: 1,
      completedCount: 5,
      continueAssignment: assignment({ status: 'in_progress' }),
      assignments: [
        assignment({ id: 'a1', status: 'in_progress' }),
        assignment({
          id: 'a2',
          curriculumId: 'c2',
          curriculumName: 'Introducción a la Biblia',
          completedLessons: 6,
          totalLessons: 6,
          status: 'completed',
        }),
      ],
    };
    vi.mocked(EducationService.getHome).mockResolvedValue(home);

    render(<StudentHome />, { wrapper });

    // D.7's literal assertion: the profile mini-stat row is a real 2-up.
    // "En curso" also appears as a status chip inside "Mis cursos", so scope
    // strictly to the profile-stats container, not a page-wide text search.
    const statsRow = await screen.findByTestId('profile-stats');
    expect(within(statsRow).getByText('En curso')).toBeInTheDocument();
    expect(within(statsRow).getByText('Completados')).toBeInTheDocument();
    expect(statsRow.children).toHaveLength(2);

    // No certificate copy anywhere on the rendered DOM — a targeted query
    // plus a blunt full-body substring check (belt and suspenders).
    expect(screen.queryByText(/certificad/i)).not.toBeInTheDocument();
    expect(document.body.textContent?.toLowerCase()).not.toContain('certificad');
  });
});
