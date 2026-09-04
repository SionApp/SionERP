import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { BookmarksCard } from '../student/BookmarksCard';
import type { LessonBookmark } from '@/types/education.types';

// Lesson bookmarks — small follow-up closing the design-handoff's undefined
// "Guardar" pill (README.md line 247). Covers the StudentHome sidebar card:
// it renders each bookmarked lesson's title + curriculum name, and clicking
// one navigates straight to that lesson's viewer route.

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function bookmark(overrides: Partial<LessonBookmark>): LessonBookmark {
  return {
    id: 'b1',
    lessonId: 'l1',
    lessonTitle: 'La gracia de Dios',
    curriculumId: 'c1',
    curriculumName: 'Fundamentos de la fe',
    moduleTitle: null,
    createdAt: '2026-09-04T00:00:00Z',
    ...overrides,
  };
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

describe('BookmarksCard — "Lecciones guardadas" (StudentHome sidebar)', () => {
  it('renders each bookmarked lesson title + curriculum name', () => {
    render(
      <BookmarksCard
        items={[
          bookmark({}),
          bookmark({
            id: 'b2',
            lessonId: 'l2',
            lessonTitle: 'El fruto del Espíritu',
            curriculumName: 'Vida en el Espíritu',
          }),
        ]}
      />,
      { wrapper }
    );

    expect(screen.getByText('La gracia de Dios')).toBeInTheDocument();
    expect(screen.getByText('Fundamentos de la fe')).toBeInTheDocument();
    expect(screen.getByText('El fruto del Espíritu')).toBeInTheDocument();
    expect(screen.getByText('Vida en el Espíritu')).toBeInTheDocument();
  });

  it('navigates straight to the lesson viewer route on click', () => {
    render(
      <BookmarksCard items={[bookmark({ curriculumId: 'course-9', lessonId: 'lesson-9' })]} />,
      {
        wrapper,
      }
    );

    fireEvent.click(screen.getByText('La gracia de Dios'));

    expect(mockNavigate).toHaveBeenCalledWith(
      '/dashboard/education/curso/course-9/leccion/lesson-9'
    );
  });

  it('caps the visible list at 5 even when more bookmarks are passed', () => {
    const items = Array.from({ length: 8 }, (_, i) =>
      bookmark({ id: `b${i}`, lessonId: `l${i}`, lessonTitle: `Lección ${i}` })
    );
    render(<BookmarksCard items={items} />, { wrapper });

    // 8 seeded, only 5 should render as buttons.
    expect(screen.getAllByRole('button')).toHaveLength(5);
  });
});
