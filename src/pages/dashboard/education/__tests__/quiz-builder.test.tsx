import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import QuizBuilder from '../admin/QuizBuilder';
import { EducationService } from '@/services/education.service';
import { useEducationAccess } from '../use-education-access';
import type {
  EducationLessonDetail,
  QuizAuthorView,
  UpsertQuizRequest,
} from '@/types/education.types';

// tasks-v2-part2 J: QuizBuilder + QuestionList + QuestionEditor + QuizSettings.
// Covers the two invariants the launch prompt calls out explicitly as "real,
// not just a UI nicety": (1) marking one option correct unmarks its sibling
// in the SAME question — mirrors the server's
// `uq_education_quiz_options_correct` partial unique index (PR-F.6) — and
// (2) the guarded-delete flow surfaces the real `answer_count` and resends
// the save with `force: true` when the question already has student answers
// (`DeleteQuestion`'s guard, education_quiz_admin.go).

vi.mock('../use-education-access', () => ({ useEducationAccess: vi.fn() }));
vi.mock('@/services/education.service', () => ({
  EducationService: {
    getLessonDetail: vi.fn(),
    getQuizAuthor: vi.fn(),
    upsertQuiz: vi.fn(),
  },
}));

const mockedAccess = vi.mocked(useEducationAccess);
const mockedService = vi.mocked(EducationService);

// jsdom doesn't implement `window.matchMedia` — `QuizBuilder`'s own
// `useBelowReorderBreakpoint` (same pattern as `LessonEditor`'s, I.3) needs
// it. Unrelated to anything this suite actually asserts on.
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
  // jsdom doesn't implement `Element.scrollIntoView` — Radix `Select`'s
  // viewport-scroll-on-open effect needs it (`QuestionEditor`'s type
  // selector). Unrelated to anything this suite asserts on.
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});
});

function lessonDetail(): EducationLessonDetail {
  return {
    id: 'l1',
    curriculumId: 'c1',
    moduleId: null,
    orderIndex: 5,
    title: 'Lección 5',
    durationMinutes: null,
    steps: [],
    progress: null,
  };
}

function quizView(overrides: Partial<QuizAuthorView> = {}): QuizAuthorView {
  return {
    id: 'q1',
    lessonId: 'l1',
    passScore: 60,
    timeLimitMinutes: null,
    shuffleOptions: true,
    allowRetry: false,
    showResult: true,
    questions: [
      {
        id: 'question-1',
        orderIndex: 1,
        type: 'multiple',
        prompt: '¿Cuál es la capital de Israel?',
        points: 10,
        feedbackOk: '¡Correcto!',
        feedbackBad: 'Fijate de nuevo.',
        answerCount: 3,
        options: [
          { id: 'opt-1', orderIndex: 1, text: 'Tel Aviv', isCorrect: false },
          { id: 'opt-2', orderIndex: 2, text: 'Jerusalén', isCorrect: true },
        ],
      },
    ],
    ...overrides,
  };
}

function renderBuilder() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/admin/c1/l1/quiz']}>
        <Routes>
          <Route path="/admin/:curriculumId/:lessonId/quiz" element={<QuizBuilder />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedAccess.mockReturnValue({
    level: 5,
    hasAccess: true,
    isAuthor: true,
    isModuleAdmin: true,
    loadingAccess: false,
  });
  mockedService.getLessonDetail.mockResolvedValue(lessonDetail());
});

describe('QuestionEditor — marking a correct option unmarks its sibling (J.3)', () => {
  it('keeps exactly one correct option per question after a click', async () => {
    mockedService.getQuizAuthor.mockResolvedValue(quizView());
    renderBuilder();

    // Auto-selects the first (only) question on load.
    await screen.findByText('Pregunta 1');

    const tealAvivRow = screen.getByDisplayValue('Tel Aviv').closest('div') as HTMLElement;
    const jerusalemRow = screen.getByDisplayValue('Jerusalén').closest('div') as HTMLElement;

    // Before the click: Jerusalén is the only CORRECTA chip.
    expect(within(jerusalemRow).getByText('CORRECTA')).toBeInTheDocument();
    expect(within(tealAvivRow).queryByText('CORRECTA')).not.toBeInTheDocument();

    const markCorrect = within(tealAvivRow).getByRole('button', { name: 'Marcar como correcta' });
    fireEvent.click(markCorrect);

    // After: Tel Aviv is now the ONLY correct option — Jerusalén's chip is gone.
    expect(await within(tealAvivRow).findByText('CORRECTA')).toBeInTheDocument();
    expect(within(jerusalemRow).queryByText('CORRECTA')).not.toBeInTheDocument();
  });
});

describe('QuestionEditor — `short` hides the options section entirely (J.2)', () => {
  it('renders no option rows and no "Añadir opción" once the type is short', async () => {
    mockedService.getQuizAuthor.mockResolvedValue(quizView());
    renderBuilder();

    await screen.findByText('Pregunta 1');
    expect(screen.getByDisplayValue('Tel Aviv')).toBeInTheDocument();

    const typeTrigger = screen.getByRole('combobox');
    fireEvent.click(typeTrigger);
    const shortOption = await screen.findByText('Respuesta corta');
    fireEvent.click(shortOption);

    await waitFor(() => {
      expect(screen.queryByDisplayValue('Tel Aviv')).not.toBeInTheDocument();
    });
    expect(screen.queryByText('Añadir opción')).not.toBeInTheDocument();
    expect(screen.queryByText('Opciones · marcá la correcta')).not.toBeInTheDocument();
  });
});

describe('QuestionEditor — guarded delete (J.4)', () => {
  it('shows the real answer count and resends the save with force=true on confirm', async () => {
    mockedService.getQuizAuthor.mockResolvedValue(quizView());
    mockedService.upsertQuiz.mockResolvedValue(quizView({ questions: [] }));
    renderBuilder();

    await screen.findByText('Pregunta 1');

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar pregunta' }));

    // The dialog copy names the REAL answer_count from the already-loaded
    // author view — no extra round trip needed to discover it.
    expect(await screen.findByText(/ya tiene 3 respuestas de alumnos/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar de todos modos' }));

    await waitFor(() => expect(mockedService.upsertQuiz).toHaveBeenCalledTimes(1));
    const [, payload] = mockedService.upsertQuiz.mock.calls[0] as [string, UpsertQuizRequest];
    expect(payload.force).toBe(true);
    expect(payload.questions).toHaveLength(0);
  });

  it('does not require force when the question has zero answers', async () => {
    mockedService.getQuizAuthor.mockResolvedValue(quizView({ questions: [] }));
    mockedService.upsertQuiz.mockResolvedValue(quizView({ questions: [] }));
    renderBuilder();

    await screen.findAllByText('Añadir pregunta');
    fireEvent.click(screen.getAllByText('Añadir pregunta')[0]);
    await screen.findByText('Pregunta 1');

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar pregunta' }));
    expect(await screen.findByText('¿Eliminar esta pregunta?')).toBeInTheDocument();
    expect(screen.queryByText(/respuestas de alumnos/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => expect(mockedService.upsertQuiz).toHaveBeenCalledTimes(1));
    const [, payload] = mockedService.upsertQuiz.mock.calls[0] as [string, UpsertQuizRequest];
    expect(payload.force).toBe(false);
  });
});
