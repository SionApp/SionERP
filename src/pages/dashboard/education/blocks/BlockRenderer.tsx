import type { EducationBlock } from '@/types/education.types';
import type { BlockSize } from './block.types';
import { narrowEducationBlock } from './block.types';
import { HeadingBlock } from './HeadingBlock';
import { ParagraphBlock } from './ParagraphBlock';
import { ListBlock } from './ListBlock';
import { ImageBlock } from './ImageBlock';
import { VideoBlock } from './VideoBlock';
import { QuoteBlock } from './QuoteBlock';
import { CalloutBlock } from './CalloutBlock';
import { PdfBlock } from './PdfBlock';
import { ReflectionBlock } from './ReflectionBlock';
import { DividerBlock } from './DividerBlock';

/**
 * The single dispatcher every block type funnels through. Imported by BOTH
 * `student/LessonViewer.tsx` (size="full") and PR-I's `admin/LivePreview.tsx`
 * (size="preview-desktop"|"preview-mobile") — `LivePreview` MUST NOT contain
 * a copy of this switch (spec: "Block renderers are shared between viewer
 * and preview ... preview fidelity by construction").
 *
 * An unrecognized/malformed block (narrowing failure — see
 * `narrowEducationBlock`) renders nothing rather than crashing the whole
 * step: one bad block must never take the rest of the lesson down with it.
 */
export function BlockRenderer({
  block,
  size,
  lessonId,
}: {
  block: EducationBlock;
  size: BlockSize;
  lessonId: string;
}) {
  const narrowed = narrowEducationBlock(block);
  if (!narrowed) return null;

  switch (narrowed.type) {
    case 'heading':
      return <HeadingBlock block={narrowed} size={size} />;
    case 'paragraph':
      return <ParagraphBlock block={narrowed} size={size} />;
    case 'list':
      return <ListBlock block={narrowed} size={size} />;
    case 'image':
      return <ImageBlock block={narrowed} size={size} />;
    case 'video':
      return <VideoBlock block={narrowed} size={size} />;
    case 'quote':
      return <QuoteBlock block={narrowed} size={size} />;
    case 'callout':
      return <CalloutBlock block={narrowed} size={size} />;
    case 'pdf':
      return <PdfBlock block={narrowed} size={size} />;
    case 'question':
      return <ReflectionBlock block={narrowed} size={size} lessonId={lessonId} />;
    case 'divider':
      return <DividerBlock size={size} />;
    default:
      return null;
  }
}
