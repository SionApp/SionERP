import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

import AdminCourseList from '../admin/AdminCourseList';
import { EducationService } from '@/services/education.service';
import { useEducationAccess } from '../use-education-access';
import type { EducationCurriculum, QuizReviewQueueItem } from '@/types/education.types';

// H.1 (tasks-v2): the 4 KPIs must be computed from REAL data (published/
// draft counts, summed student/lesson counts, a real review-queue count) —
// never placeholder numbers the design mockup's own static example uses.

vi.mock('@/hooks/useMobileMode', () => ({ useMobileMode: () => false }));
vi.mock('../use-education-access', () => ({ useEducationAccess: vi.fn() }));
vi.mock('@/services/education.service', () => ({
  EducationService: {
    getCurricula: vi.fn(),
    getReviewQueue: vi.fn(),
  },
}));
// `CourseFormDialog` (rendered by `AdminCourseList` for the create/edit
// dialogs) pulls in `UserSearchPicker` → `UserService` → `ApiService`, which
// imports the real Supabase client at module scope — this test environment
// has no `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` (same pre-existing gap
// `user.service.test.ts` already hits in a fresh worktree, unrelated to this
// PR). Stubbed here, scoped to this file only, so the client module never
// throws at import time.
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

function curriculum(overrides: Partial<EducationCurriculum>): EducationCurriculum {
  return {
    id: 'c1',
    name: 'Fundamentos de la fe',
    description: null,
    status: 'published',
    track: 'discipulado',
    level: 'I',
    hours: 8,
    teacherUserId: null,
    teacherName: 'Pastor Luis Mendoza',
    coverPath: null,
    objectives: [],
    requirements: null,
    lessonCount: 6,
    studentCount: 12,
    createdBy: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
    ...overrides,
  };
}

function reviewItem(overrides: Partial<QuizReviewQueueItem>): QuizReviewQueueItem {
  return {
    answerId: 'ans1',
    attemptId: 'att1',
    questionId: 'q1',
    prompt: '¿Qué es el discipulado?',
    points: 10,
    textAnswer: 'Una respuesta',
    studentName: 'Alumno Uno',
    lessonId: 'l1',
    lessonTitle: 'Lección 1',
    submittedAt: '2026-01-03T00:00:00Z',
    ...overrides,
  };
}

describe('AdminCourseList — KPIs computed from real data (H.1)', () => {
  beforeEach(() => {
    vi.mocked(useEducationAccess).mockReturnValue({
      level: 3,
      hasAccess: true,
      isAuthor: true,
      isModuleAdmin: false,
      loadingAccess: false,
    });
  });

  it('renders KPI values/footers from the fetched curricula + review queue, and both course rows', async () => {
    vi.mocked(EducationService.getCurricula).mockResolvedValue([
      curriculum({
        id: 'c1',
        name: 'Fundamentos de la fe',
        status: 'published',
        lessonCount: 6,
        studentCount: 12,
      }),
      curriculum({
        id: 'c2',
        name: 'Liderazgo de células',
        status: 'draft',
        teacherName: 'Diácono Marcos',
        lessonCount: 3,
        studentCount: 0,
      }),
    ]);
    vi.mocked(EducationService.getReviewQueue).mockResolvedValue([reviewItem({})]);

    render(<AdminCourseList />, { wrapper });

    // Wait for the curricula query to resolve — the label itself renders
    // unconditionally (loading or not), so assert on data-dependent text.
    expect(await screen.findByText('1 en borrador')).toBeInTheDocument();
    expect(screen.getByText('Cursos publicados')).toBeInTheDocument();

    // KPI 2 — Alumnos inscritos: sum of studentCount across curricula (12).
    // (also appears in course 1's own ALUMNOS table cell, hence getAllByText.)
    expect(screen.getAllByText('12').length).toBeGreaterThan(0);

    // KPI 3 — Lecciones: sum of lessonCount across curricula (6 + 3 = 9).
    expect(screen.getByText('9')).toBeInTheDocument();

    // KPI 4 — Por revisar: real review-queue length (1), literal design footer.
    expect(screen.getByText('Respuestas abiertas')).toBeInTheDocument();

    // Both course rows render with their real teacher/status.
    expect(screen.getByText('Fundamentos de la fe')).toBeInTheDocument();
    expect(screen.getByText('Liderazgo de células')).toBeInTheDocument();
    expect(screen.getByText('Publicado')).toBeInTheDocument();
    expect(screen.getByText('Borrador')).toBeInTheDocument();
  });

  it('hides "Nuevo curso" for a level-1 caller (read-only student in the admin gate)', async () => {
    vi.mocked(useEducationAccess).mockReturnValue({
      level: 1,
      hasAccess: true,
      isAuthor: false,
      isModuleAdmin: false,
      loadingAccess: false,
    });
    vi.mocked(EducationService.getCurricula).mockResolvedValue([curriculum({})]);
    vi.mocked(EducationService.getReviewQueue).mockResolvedValue([]);

    render(<AdminCourseList />, { wrapper });

    await screen.findByText('Fundamentos de la fe');
    expect(screen.queryByRole('button', { name: /nuevo curso/i })).not.toBeInTheDocument();
  });
});
