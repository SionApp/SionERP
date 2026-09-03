import { cn } from '@/lib/utils';
import type { BlockSize, EducationHeadingBlock } from './block.types';

/**
 * Design (README §4, "Título"): H3 Roboto 500 20px hex 1D1B20, margin-top:26px
 * — that's `level: 2`. `level: 3` (a sub-heading one step down) has no
 * literal mockup value; sized smaller by inference, matching this file's
 * own established convention of a bold, slightly-smaller step in the type
 * scale rather than inventing a wholly new visual language for it.
 *
 * `size="full"` sizes are written in `em`, not Tailwind's default `rem`:
 * `LessonViewer`'s content wrapper sets `font-size: N%` for the "Texto"
 * reading-size preference (`use-lesson-font-size.ts`), and only `em` units
 * cascade from an ancestor override — `rem` is root-anchored and would
 * silently ignore it. `compact` (preview) sizes stay `rem`/fixed on
 * purpose: PR-I's `LivePreview` never renders `size="full"` and must not be
 * affected by a student-only reading preference.
 */
export function HeadingBlock({ block, size }: { block: EducationHeadingBlock; size: BlockSize }) {
  const compact = size !== 'full';
  const isLevel2 = block.data.level === 2;
  const Tag = isLevel2 ? 'h3' : 'h4';

  return (
    <Tag
      className={cn(
        'font-medium text-foreground',
        compact ? 'mt-4' : 'mt-[26px]',
        isLevel2
          ? compact
            ? 'text-base'
            : 'text-[1.25em]'
          : compact
            ? 'text-sm'
            : 'text-[1.0625em]'
      )}
    >
      {block.data.text}
    </Tag>
  );
}
