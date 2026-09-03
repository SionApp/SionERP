import { CheckCircle2, Info, Lightbulb } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { renderInline } from './renderInline';
import type { BlockSize, CalloutVariant, EducationCalloutBlock } from './block.types';

/**
 * Design (README §4, "Callout") gives ONE literal example — hex FBE0D6/
 * hex B3492A with a `lightbulb` icon — which is exactly the Design Tokens
 * table's "Atención / error" semantic pairing (also reused verbatim by
 * `PdfBlock`'s icon chip). That pairing maps to `variant: 'warning'` here.
 * `success` reuses the existing "Éxito / completado" pairing
 * (`edu-container`/`on-edu-container`). `info` has no literal mockup value
 * (the design's blue "Informativo" pairing has no `edu-*` token — inventing
 * a raw hex would violate education-theming's no-raw-hex rule) so it reuses
 * the green surface pair already established by `QuoteBlock`
 * (`edu-surface`/`edu-text`), matching this block's own title/text tokens.
 */
const VARIANT_CONFIG: Record<CalloutVariant, { icon: LucideIcon; bg: string; iconColor: string }> =
  {
    warning: {
      icon: Lightbulb,
      bg: 'bg-edu-orange-container',
      iconColor: 'text-on-edu-orange-container',
    },
    success: { icon: CheckCircle2, bg: 'bg-edu-container', iconColor: 'text-on-edu-container' },
    info: { icon: Info, bg: 'bg-edu-surface', iconColor: 'text-edu-text' },
  };

export function CalloutBlock({ block, size }: { block: EducationCalloutBlock; size: BlockSize }) {
  const compact = size !== 'full';
  const content = renderInline(block.data.doc);
  if (!content) return null;

  const { icon: Icon, bg, iconColor } = VARIANT_CONFIG[block.data.variant];

  return (
    <div
      className={cn(
        'flex items-start rounded-md3-block',
        bg,
        compact ? 'mt-4 gap-2.5 px-4 py-3.5' : 'mt-6 gap-3.5 px-6 py-5'
      )}
    >
      <Icon
        className={cn('shrink-0', iconColor, compact ? 'h-5 w-5' : 'h-6 w-6')}
        aria-hidden="true"
      />
      <p
        className={cn(
          'text-edu-callout-text',
          compact ? 'text-xs leading-relaxed' : 'text-[0.9375em] leading-[1.65]'
        )}
      >
        {content}
      </p>
    </div>
  );
}
