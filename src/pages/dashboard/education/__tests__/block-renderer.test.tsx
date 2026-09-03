import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { BlockRenderer } from '../blocks/BlockRenderer';
import { EducationService } from '@/services/education.service';
import type { EducationBlock } from '@/types/education.types';
import type { BlockSize } from '../blocks/block.types';

// E.7 (tasks-v2): "size prop parity assertion (block components are reused
// unchanged by a later slice's LivePreview — don't couple them to
// LessonViewer-only concerns) + a BlockRenderer snapshot per block type."
//
// Deliberately renders `BlockRenderer` with ONLY a `QueryClientProvider`
// around it — no `MemoryRouter`, no assignment/curriculum context. If a
// block component ever grew a `useParams`/`useNavigate`/route dependency
// (a LessonViewer-only concern PR-I's `LivePreview` cannot supply), this
// suite would fail to render at all, not just look different — proving the
// parity by construction rather than by comparing two render trees.

vi.mock('@/services/education.service', () => ({
  EducationService: {
    getEducationAssetSignedUrl: vi.fn().mockResolvedValue('https://signed.example/asset.bin'),
    getReflection: vi.fn().mockResolvedValue(null),
    upsertReflection: vi.fn().mockResolvedValue(undefined),
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function pmDoc(text: string) {
  return {
    type: 'doc' as const,
    content: [{ type: 'paragraph' as const, content: [{ type: 'text' as const, text }] }],
  };
}

const SAMPLE_BLOCKS: Record<string, EducationBlock> = {
  heading: { id: 'b-heading', type: 'heading', data: { text: 'Título de ejemplo', level: 2 } },
  paragraph: { id: 'b-paragraph', type: 'paragraph', data: { doc: pmDoc('Texto de ejemplo') } },
  list: { id: 'b-list', type: 'list', data: { style: 'bullet', items: ['Uno', 'Dos'] } },
  image: {
    id: 'b-image',
    type: 'image',
    data: { path: 'education/c1/img.png', alt: 'Alt de imagen' },
  },
  video: { id: 'b-video', type: 'video', data: { provider: 'youtube', videoId: 'abc123XYZ' } },
  quote: {
    id: 'b-quote',
    type: 'quote',
    data: { doc: pmDoc('Cita de ejemplo'), attribution: 'Juan 1:1' },
  },
  callout: {
    id: 'b-callout',
    type: 'callout',
    data: { doc: pmDoc('Aviso de ejemplo'), variant: 'warning' },
  },
  pdf: {
    id: 'b-pdf',
    type: 'pdf',
    data: { path: 'education/c1/doc.pdf', name: 'Guía.pdf', sizeBytes: 2048 },
  },
  question: { id: 'b-question', type: 'question', data: { prompt: '¿Qué aprendiste hoy?' } },
  divider: { id: 'b-divider', type: 'divider', data: {} },
};

describe('BlockRenderer — one snapshot per block type (E.7)', () => {
  it.each(Object.entries(SAMPLE_BLOCKS))('renders %s', (_type, block) => {
    const { container } = render(<BlockRenderer block={block} size="full" lessonId="lesson-1" />, {
      wrapper,
    });
    expect(container.innerHTML).toMatchSnapshot();
  });
});

describe('BlockRenderer — size prop parity (E.7)', () => {
  const SIZES: BlockSize[] = ['full', 'preview-desktop', 'preview-mobile'];

  it.each(SIZES)('paragraph block renders for size=%s with no route/context dependency', size => {
    render(<BlockRenderer block={SAMPLE_BLOCKS.paragraph} size={size} lessonId="lesson-1" />, {
      wrapper,
    });
    expect(screen.getByText('Texto de ejemplo')).toBeInTheDocument();
  });

  it.each(SIZES)('every block type accepts size=%s without crashing', size => {
    for (const block of Object.values(SAMPLE_BLOCKS)) {
      const { unmount } = render(<BlockRenderer block={block} size={size} lessonId="lesson-1" />, {
        wrapper,
      });
      unmount();
    }
  });
});

describe('ReflectionBlock — orphaned reflection degrades, never crashes (E.3)', () => {
  it('renders "Pregunta eliminada" for a blank prompt instead of the form', () => {
    const orphaned: EducationBlock = { id: 'b-orphan', type: 'question', data: { prompt: '' } };
    render(<BlockRenderer block={orphaned} size="full" lessonId="lesson-1" />, { wrapper });
    expect(screen.getByText('Pregunta eliminada')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Escribe tu respuesta/i)).not.toBeInTheDocument();
  });
});
