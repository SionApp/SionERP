import { Quote } from 'lucide-react';

import { cn } from '@/lib/utils';
import { renderInline } from './renderInline';
import type { BlockSize, EducationQuoteBlock } from './block.types';

/** Design (README §4, "Versículo"): hex EEF6F1 (`--edu-surface`),
 * `border-radius:20px`, `padding:26px 30px`. Text 20px/1.6 hex 14503A
 * (`--edu-primary-dark`) italic; attribution 13px 500 hex 2E6C4C
 * (`--edu-text`) `letter-spacing:.04em`; `format_quote` icon 34px
 * hex CFEEDC (`--edu-container`) top-right corner. */
export function QuoteBlock({ block, size }: { block: EducationQuoteBlock; size: BlockSize }) {
  const compact = size !== 'full';
  const content = renderInline(block.data.doc);
  if (!content) return null;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md3-block bg-edu-surface',
        compact ? 'mt-4 px-5 py-4' : 'mt-6 px-[30px] py-[26px]'
      )}
    >
      <Quote
        className={cn(
          'absolute right-4 top-4 shrink-0 text-edu-container',
          compact ? 'h-6 w-6' : 'h-[34px] w-[34px]'
        )}
        aria-hidden="true"
      />
      <p
        className={cn(
          'relative italic text-edu-primary-dark',
          compact
            ? 'max-w-[80%] text-sm leading-relaxed'
            : 'max-w-[85%] text-[1.25em] leading-[1.6]'
        )}
      >
        {content}
      </p>
      {block.data.attribution && (
        <p
          className={cn(
            'relative mt-3 font-medium uppercase tracking-[0.04em] text-edu-text',
            compact ? 'text-[11px]' : 'text-[0.8125em]'
          )}
        >
          {block.data.attribution}
        </p>
      )}
    </div>
  );
}
