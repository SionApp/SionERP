import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import LessonEditor from '../admin/LessonEditor';
import { EducationService } from '@/services/education.service';
import { useEducationAccess } from '../use-education-access';
import type { EducationCurriculum, EducationLessonDetail } from '@/types/education.types';

// tasks-v2-part2 I.7: "editing a block in LessonEditor reflects in
// LivePreview through the identical blocks/* component (preview-fidelity-
// by-construction assertion from spec)". Two independent proofs, per the
// launch prompt's own instruction not to rely on just one:
//   1. Static: `LivePreview.tsx`'s own source imports `BlockRenderer` from
//      `../blocks/` — the SAME module `student/LessonViewer.tsx` imports —
//      not a fork/copy. A regex on the real file, not a guess.
//   2. Behavioral: editing a heading block's text in `LessonEditor`'s local
//      state re-renders `LivePreview`'s `BlockRenderer` output with the new
//      text, proving the two panels share one source of truth (the same
//      `blocks` state array) rather than two independently-maintained
//      copies that merely happen to look similar.

vi.mock('../use-education-access', () => ({ useEducationAccess: vi.fn() }));
vi.mock('@/services/education.service', () => ({
  EducationService: {
    getLessonDetail: vi.fn(),
    getCurriculumById: vi.fn(),
    updateStep: vi.fn().mockResolvedValue(undefined),
    createStep: vi.fn(),
    deleteStep: vi.fn(),
    reorderSteps: vi.fn(),
    updateCurriculumStatus: vi.fn(),
    getEducationAssetSignedUrl: vi.fn(),
  },
}));

const mockedAccess = vi.mocked(useEducationAccess);
const mockedService = vi.mocked(EducationService);

// jsdom doesn't implement `window.matchMedia` — `LessonEditor`'s own
// `useBelowReorderBreakpoint` (the arrow-vs-drag-handle breakpoint, I.3)
// needs it. Same minimal stub shape widely used for this exact jsdom gap;
// unrelated to anything this suite is testing.
beforeAll(() => {
  window.matchMedia =
    window.matchMedia ||
    ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }));
});

function curriculum(overrides: Partial<EducationCurriculum> = {}): EducationCurriculum {
  return {
    id: 'c1',
    name: 'Fundamentos de la fe',
    description: null,
    status: 'draft',
    track: 'discipulado',
    level: 'I',
    hours: 8,
    teacherUserId: null,
    teacherName: null,
    coverPath: null,
    objectives: [],
    requirements: null,
    lessonCount: 1,
    studentCount: 0,
    createdBy: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function lessonDetail(): EducationLessonDetail {
  return {
    id: 'l1',
    curriculumId: 'c1',
    moduleId: null,
    orderIndex: 1,
    title: 'Lección 1',
    durationMinutes: null,
    steps: [
      {
        id: 's1',
        lessonId: 'l1',
        orderIndex: 1,
        label: 'Paso 1',
        blocks: [{ id: 'b1', type: 'heading', data: { text: 'Título original', level: 2 } }],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ],
    progress: null,
  };
}

function renderEditor() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/edit/c1/l1']}>
        <Routes>
          <Route path="/edit/:curriculumId/:lessonId" element={<LessonEditor />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('LivePreview — reuses the shared blocks/* renderer (I.7)', () => {
  it('imports BlockRenderer from ../blocks, not a private copy', () => {
    const source = readFileSync(join(__dirname, '..', 'admin', 'LivePreview.tsx'), 'utf-8');
    expect(source).toMatch(/from '\.\.\/blocks\/BlockRenderer'/);
  });

  it('reflects an edit made in LessonEditor immediately, through the same block data', async () => {
    mockedAccess.mockReturnValue({
      level: 5,
      hasAccess: true,
      isAuthor: true,
      isModuleAdmin: true,
      loadingAccess: false,
    });
    mockedService.getLessonDetail.mockResolvedValue(lessonDetail());
    mockedService.getCurriculumById.mockResolvedValue(curriculum());

    renderEditor();

    const headingInput = await screen.findByDisplayValue('Título original');
    // Present in BOTH the editor's own input AND LivePreview's rendered
    // heading before any edit — proves the preview starts in sync.
    expect(screen.getByText('Título original')).toBeInTheDocument();

    fireEvent.change(headingInput, { target: { value: 'Título editado en vivo' } });

    // The SAME `HeadingBlock` (via `BlockRenderer`) now renders the edited
    // text — no separate preview-only copy of the heading markup exists.
    expect(await screen.findByText('Título editado en vivo')).toBeInTheDocument();
    expect(screen.queryByText('Título original')).not.toBeInTheDocument();
  });
});
