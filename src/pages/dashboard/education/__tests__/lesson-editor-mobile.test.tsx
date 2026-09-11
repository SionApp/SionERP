import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import LessonEditor from '../admin/LessonEditor';
import { EducationService } from '@/services/education.service';
import { useEducationAccess } from '../use-education-access';
import type { EducationCurriculum, EducationLessonDetail } from '@/types/education.types';

// Mobile handoff screens 8/9 ("Editor de contenido — pestañas Editar/
// Preview"): `LessonEditor` gains an `editorTab` branch when `useMobileMode`
// is true, replacing the desktop 50/50 split with two tabs — same smoke-test
// shape `admin-course-list.test.tsx` already established for this module's
// other mobile screens.

vi.mock('@/hooks/useMobileMode', () => ({ useMobileMode: () => true }));
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
// `useBelowReorderBreakpoint` needs it, same stub `lesson-editor-live-
// preview.test.tsx` already uses.
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
    orderIndex: 5,
    title: 'La oración',
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

describe('LessonEditor — mobile Editar/Preview tabs (mobile handoff §8/§9)', () => {
  beforeEach(() => {
    mockedAccess.mockReturnValue({
      level: 5,
      hasAccess: true,
      isAuthor: true,
      isModuleAdmin: true,
      loadingAccess: false,
    });
    mockedService.getLessonDetail.mockResolvedValue(lessonDetail());
    mockedService.getCurriculumById.mockResolvedValue(curriculum());
  });

  it('renders the "Lección N · título" header, the tab switch, and a compact numbered step', async () => {
    renderEditor();

    expect(await screen.findByText('Lección 5 · La oración')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview' })).toBeInTheDocument();
    // Step 1's compact circular selector, distinguishable from the desktop
    // pill (which renders "1. Paso 1" as its own accessible name).
    expect(screen.getByRole('button', { name: 'Paso 1: Paso 1' })).toBeInTheDocument();
    // "Publicar" shows because canEdit + curriculum.status === 'draft'.
    expect(screen.getByRole('button', { name: 'Publicar' })).toBeInTheDocument();
  });

  it('switches to the Preview tab and shows "Ver como" + "Seguir editando" + the quiz shortcut', async () => {
    renderEditor();

    await screen.findByText('Lección 5 · La oración');
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    expect(await screen.findByText('Ver como')).toBeInTheDocument();
    expect(screen.getByText('Seguir editando')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Constructor de quiz' })).toBeInTheDocument();
    // The mobile stage defaults to the Móvil half of the device toggle.
    expect(screen.getByRole('tab', { name: 'Móvil' })).toHaveAttribute('aria-selected', 'true');
  });
});
