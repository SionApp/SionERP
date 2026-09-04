import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

import ReviewQueue from '../admin/ReviewQueue';
import { EducationService } from '@/services/education.service';
import type { QuizReviewQueueItem } from '@/types/education.types';

// K.4/K.5: the "Por revisar" KPI on this screen must equal the queue's own
// row count — computed from the SAME `useReviewQueue()` response the list
// below it renders, never a separately-derived number that could drift
// (spec scenario: "Queue count matches"). Reflections never reach this
// component at all (GetReviewQueue's own query structurally excludes them —
// see the backend's TestAnalyticsReviewQueueExcludesReflections), so there
// is nothing for this frontend test to filter.

vi.mock('@/services/education.service', () => ({
  EducationService: {
    getReviewQueue: vi.fn(),
    reviewAnswer: vi.fn(),
  },
}));
// `ReviewQueue.tsx` imports `KpiCard` from `./AdminCourseList` (reuse, not a
// copy — per the design's explicit instruction). That module-scope import
// also pulls in `useMobileMode` (top-level `localStorage` read — crashes in
// jsdom without a mock) and `CourseFormDialog` → `UserSearchPicker` →
// `UserService` → the real Supabase client. Same two stubs
// `admin-course-list.test.tsx` already needs for the identical reason.
vi.mock('@/hooks/useMobileMode', () => ({ useMobileMode: () => false }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

function reviewItem(overrides: Partial<QuizReviewQueueItem>): QuizReviewQueueItem {
  return {
    answerId: 'ans1',
    attemptId: 'att1',
    questionId: 'q1',
    prompt: '¿Qué es el discipulado?',
    points: 10,
    textAnswer: 'Seguir a Jesús en comunidad',
    studentName: 'Alumno Uno',
    lessonId: 'l1',
    lessonTitle: 'Lección 1',
    submittedAt: '2026-01-03T00:00:00Z',
    ...overrides,
  };
}

describe('ReviewQueue — count matches + grading (K.4/K.5)', () => {
  it('the "Por revisar" KPI equals the real queue length (2), for 2 seeded items', async () => {
    vi.mocked(EducationService.getReviewQueue).mockResolvedValue([
      reviewItem({ answerId: 'ans1', studentName: 'Alumno Uno' }),
      reviewItem({ answerId: 'ans2', studentName: 'Alumno Dos', questionId: 'q2' }),
    ]);

    render(<ReviewQueue />, { wrapper });

    // Wait for the data-dependent row to render (the "Por revisar" LABEL
    // renders unconditionally during loading too — asserting on it alone
    // would pass before the query even settles). KPI value and the "N
    // respuestas pendientes" header must BOTH read 2 — same source array,
    // not two independently-derived counts.
    expect(await screen.findByText('Alumno Uno')).toBeInTheDocument();
    expect(screen.getByText('Por revisar')).toBeInTheDocument();
    expect(screen.getByText('2 respuestas pendientes')).toBeInTheDocument();
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    expect(screen.getByText('Alumno Dos')).toBeInTheDocument();
  });

  it('the KPI reads 0 and shows the empty state when the queue is genuinely empty', async () => {
    vi.mocked(EducationService.getReviewQueue).mockResolvedValue([]);

    render(<ReviewQueue />, { wrapper });

    expect(await screen.findByText('Sin pendientes')).toBeInTheDocument();
    expect(screen.getByText('0 respuestas pendientes')).toBeInTheDocument();
  });

  it('grading "Correcta" calls reviewAnswer with is_correct=true and the entered points', async () => {
    const user = userEvent.setup();
    vi.mocked(EducationService.getReviewQueue).mockResolvedValue([reviewItem({ points: 10 })]);
    vi.mocked(EducationService.reviewAnswer).mockResolvedValue(undefined);

    render(<ReviewQueue />, { wrapper });

    await screen.findByText('Alumno Uno');
    await user.click(screen.getByRole('button', { name: /^correcta$/i }));

    await waitFor(() => {
      expect(EducationService.reviewAnswer).toHaveBeenCalledWith('ans1', {
        isCorrect: true,
        awardedPoints: 10,
      });
    });
  });

  it('grading "Incorrecta" calls reviewAnswer with is_correct=false and zero points, regardless of the points field', async () => {
    const user = userEvent.setup();
    vi.mocked(EducationService.getReviewQueue).mockResolvedValue([reviewItem({ points: 10 })]);
    vi.mocked(EducationService.reviewAnswer).mockResolvedValue(undefined);

    render(<ReviewQueue />, { wrapper });

    await screen.findByText('Alumno Uno');
    await user.click(screen.getByRole('button', { name: /incorrecta/i }));

    await waitFor(() => {
      expect(EducationService.reviewAnswer).toHaveBeenCalledWith('ans1', {
        isCorrect: false,
        awardedPoints: 0,
      });
    });
  });
});
