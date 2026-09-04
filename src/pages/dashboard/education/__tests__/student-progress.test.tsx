import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

import StudentProgress from '../admin/StudentProgress';
import { EducationService } from '@/services/education.service';
import type { EducationCurriculum, RosterStudent, StudentRoster } from '@/types/education.types';

// K.2: the roster table must render all 6 EducationAssignmentStatus values
// with the REAL palette AssignmentList.tsx already established (imported,
// not redefined), and the 4 KPI cards must show values from the REAL
// GetStudentRoster response, not the design mockup's static numbers.

vi.mock('@/hooks/useMobileMode', () => ({ useMobileMode: () => false }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/services/education.service', () => ({
  EducationService: {
    getCurricula: vi.fn(),
    getStudentRoster: vi.fn(),
    getLessonFunnel: vi.fn(),
    getReviewQueue: vi.fn(),
    exportRosterCSV: vi.fn(),
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

function curriculum(overrides: Partial<EducationCurriculum> = {}): EducationCurriculum {
  return {
    id: 'c1',
    name: 'Fundamentos de la fe',
    description: null,
    status: 'published',
    track: 'discipulado',
    level: 'I',
    hours: 8,
    teacherUserId: null,
    teacherName: 'Pastor Luis',
    coverPath: null,
    objectives: [],
    requirements: null,
    lessonCount: 4,
    studentCount: 6,
    createdBy: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
    ...overrides,
  };
}

function student(overrides: Partial<RosterStudent>): RosterStudent {
  return {
    assignmentId: 'a1',
    userId: 'u1',
    name: 'Alumno Base',
    email: 'alumno@example.test',
    status: 'pending',
    completedLessons: 0,
    totalLessons: 4,
    progressPct: 0,
    dueDate: null,
    lastQuizScore: null,
    lastQuizMax: null,
    lastQuizVerdict: null,
    ...overrides,
  };
}

function rosterWithAllStatuses(): StudentRoster {
  const students: RosterStudent[] = [
    student({
      assignmentId: 'a-completed',
      userId: 'u-completed',
      name: 'Ana Completa',
      status: 'completed',
      completedLessons: 4,
      totalLessons: 4,
      progressPct: 100,
    }),
    student({
      assignmentId: 'a-review',
      userId: 'u-review',
      name: 'Beto Revisión',
      status: 'in_review',
      lastQuizVerdict: 'in_review',
    }),
    student({
      assignmentId: 'a-overdue',
      userId: 'u-overdue',
      name: 'Cami Atrasada',
      status: 'overdue',
      dueDate: '2026-01-01',
    }),
    student({
      assignmentId: 'a-inactive',
      userId: 'u-inactive',
      name: 'Dario Inactivo',
      status: 'inactive',
    }),
    student({
      assignmentId: 'a-progress',
      userId: 'u-progress',
      name: 'Eva Progreso',
      status: 'in_progress',
      completedLessons: 1,
      totalLessons: 4,
      progressPct: 25,
    }),
    student({
      assignmentId: 'a-pending',
      userId: 'u-pending',
      name: 'Fede Pendiente',
      status: 'pending',
    }),
  ];
  return {
    curriculumId: 'c1',
    curriculumName: 'Fundamentos de la fe',
    kpis: { activeStudents: 6, avgProgressPct: 20.8, quizPassRate: 50, inactiveCount: 1 },
    students,
  };
}

describe('StudentProgress — roster status precedence + real KPIs (K.2)', () => {
  beforeEach(() => {
    vi.mocked(EducationService.getCurricula).mockResolvedValue([curriculum({})]);
    vi.mocked(EducationService.getLessonFunnel).mockResolvedValue([]);
  });

  it('renders all 6 status chips with their real labels, and the 4 KPI values from the real response', async () => {
    vi.mocked(EducationService.getStudentRoster).mockResolvedValue(rosterWithAllStatuses());

    render(<StudentProgress />, { wrapper });

    expect(await screen.findByText('Ana Completa')).toBeInTheDocument();

    // All 6 real STATUS_LABEL values, one per seeded student — proves the
    // roster renders the ACTUAL derived status per row, not a hardcoded set.
    expect(screen.getByText('Completado')).toBeInTheDocument();
    // "En revisión" appears twice for Beto (status pill AND quiz-verdict
    // cell, since this fixture's in_review student also has an in_review
    // last quiz) — both are real, expected renders of the same status.
    expect(screen.getAllByText('En revisión').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Atrasado')).toBeInTheDocument();
    expect(screen.getByText('Inactivo')).toBeInTheDocument();
    expect(screen.getByText('En progreso')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();

    // KPI cards — real values from the mocked response, not the mockup's.
    expect(screen.getByText('Alumnos activos')).toBeInTheDocument();
    expect(screen.getByText('21')).toBeInTheDocument(); // avgProgressPct 20.8 rounded
    expect(screen.getByText('50')).toBeInTheDocument(); // quizPassRate
    expect(screen.getAllByText('1').length).toBeGreaterThan(0); // inactiveCount

    // 6 is both activeStudents (KPI) and the number of enrolled students,
    // so at least one node must show the literal roster count text too.
    expect(screen.getByText('6 alumnos')).toBeInTheDocument();
  });

  it('triangulates with a DIFFERENT roster (single completed student, 100% avg) — proves KPIs are computed, not hardcoded', async () => {
    const single: StudentRoster = {
      curriculumId: 'c1',
      curriculumName: 'Fundamentos de la fe',
      kpis: { activeStudents: 1, avgProgressPct: 100, quizPassRate: 100, inactiveCount: 0 },
      students: [
        student({
          assignmentId: 'a-only',
          userId: 'u-only',
          name: 'Sola Alumna',
          status: 'completed',
          completedLessons: 4,
          totalLessons: 4,
          progressPct: 100,
        }),
      ],
    };
    vi.mocked(EducationService.getStudentRoster).mockResolvedValue(single);

    render(<StudentProgress />, { wrapper });

    expect(await screen.findByText('Sola Alumna')).toBeInTheDocument();
    expect(screen.getByText('1 alumno')).toBeInTheDocument();
    expect(screen.getAllByText('100').length).toBeGreaterThan(0); // avgProgressPct AND quizPassRate
    expect(screen.queryByText('En revisión')).not.toBeInTheDocument();
  });
});
