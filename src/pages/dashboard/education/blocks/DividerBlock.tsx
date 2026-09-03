import { cn } from '@/lib/utils';
import type { BlockSize } from './block.types';

/** Design (README §4, "Separador"): simple horizontal rule. No literal
 * spacing value given for this block specifically — uses the doc's own
 * "Gap entre bloques de contenido de la lección: 24px" general rule
 * (the same 24px `LivePreview`/`LessonViewer` content blocks already lean
 * on, e.g. `ImageBlock`'s `figure margin-top:24px`). */
export function DividerBlock({ size }: { size: BlockSize }) {
  const compact = size !== 'full';
  return <hr className={cn('border-t border-edu-outline', compact ? 'my-4' : 'my-6')} />;
}
