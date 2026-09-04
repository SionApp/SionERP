// `LessonFunnel.tsx` imports `useLessonFunnel` → `EducationService`, which
// imports the real Supabase client at module scope — same pre-existing gap
// `review-queue.test.tsx`/`admin-course-list.test.tsx` already stub for the
// identical reason. Only `biggestDropOff` (a pure function, no rendering)
// is under test here, but the module-scope import chain still runs.
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

import { biggestDropOff } from '../admin/LessonFunnel';
import type { LessonFunnelPoint } from '@/types/education.types';

function point(overrides: Partial<LessonFunnelPoint>): LessonFunnelPoint {
  return {
    lessonId: 'l1',
    title: 'Lección 1',
    orderIndex: 1,
    reached: 10,
    completed: 10,
    ...overrides,
  };
}

describe('biggestDropOff (K.3, pure logic — no chart/DOM dependency)', () => {
  it('picks the lesson with the largest reached→completed percentage drop', () => {
    const points = [
      point({ lessonId: 'l1', title: 'Introducción', reached: 20, completed: 18 }), // 10% drop
      point({ lessonId: 'l2', title: 'El desafío', reached: 18, completed: 9 }), // 50% drop
      point({ lessonId: 'l3', title: 'Cierre', reached: 9, completed: 9 }), // 0% drop
    ];

    const worst = biggestDropOff(points);

    expect(worst).not.toBeNull();
    expect(worst?.title).toBe('El desafío');
    expect(worst?.dropPct).toBeCloseTo(50, 5);
  });

  it('triangulates with a DIFFERENT lesson as the worst one — proves the comparison is real, not hardcoded to the first case', () => {
    const points = [
      point({ lessonId: 'l1', title: 'Fácil', reached: 30, completed: 30 }), // 0% drop
      point({ lessonId: 'l2', title: 'Trabada', reached: 30, completed: 6 }), // 80% drop
    ];

    const worst = biggestDropOff(points);

    expect(worst?.title).toBe('Trabada');
    expect(worst?.dropPct).toBeCloseTo(80, 5);
  });

  it('ignores lessons nobody reached (reached=0) — a 0/0 division would be NaN, not a real drop-off', () => {
    const points = [
      point({ lessonId: 'l1', title: 'Nunca vista', reached: 0, completed: 0 }),
      point({ lessonId: 'l2', title: 'Vista y completada', reached: 5, completed: 5 }),
    ];

    const worst = biggestDropOff(points);

    // The only lesson with reached>0 has a 0% drop — still the correct
    // "worst" (only candidate), proving the reached=0 guard skips l1 rather
    // than crashing or returning NaN.
    expect(worst?.title).toBe('Vista y completada');
    expect(worst?.dropPct).toBe(0);
  });

  it('returns null for an empty funnel — no lessons, no insight to show', () => {
    expect(biggestDropOff([])).toBeNull();
  });
});
