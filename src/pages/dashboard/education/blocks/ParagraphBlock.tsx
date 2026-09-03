import { cn } from '@/lib/utils';
import { renderInline } from './renderInline';
import type { BlockSize, EducationParagraphBlock } from './block.types';

/** Design (README §4, "Párrafo"): Roboto 400 16px/1.75 hex 3A3540
 * (`--edu-prose`), margin-top:14px, text-wrap:pretty. `size="full"` uses
 * `em` — see `HeadingBlock`'s comment on why. */
export function ParagraphBlock({
  block,
  size,
}: {
  block: EducationParagraphBlock;
  size: BlockSize;
}) {
  const compact = size !== 'full';
  const content = renderInline(block.data.doc);
  if (!content) return null;

  return (
    <p
      className={cn(
        'text-edu-prose [text-wrap:pretty]',
        compact ? 'mt-2.5 text-sm leading-relaxed' : 'mt-3.5 text-[1em] leading-[1.75]'
      )}
    >
      {content}
    </p>
  );
}
