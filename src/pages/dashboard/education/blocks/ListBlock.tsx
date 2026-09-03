import { cn } from '@/lib/utils';
import type { BlockSize, EducationListBlock } from './block.types';

/** Design (README §4, "Lista"): gap:9px between items; bullet = 6px dot
 * hex 1F6B4C (margin-top:9px) + text 16px/1.7 hex 3A3540, gap:11px between
 * dot and text. `number` style has no literal mockup — rendered as "N."
 * in the same slot the bullet occupies, by inference. */
export function ListBlock({ block, size }: { block: EducationListBlock; size: BlockSize }) {
  const compact = size !== 'full';

  return (
    <ul className={cn('flex flex-col', compact ? 'mt-2.5 gap-2' : 'mt-3.5 gap-[9px]')}>
      {block.data.items.map((item, i) => (
        <li key={i} className={cn('flex items-start', compact ? 'gap-2' : 'gap-[11px]')}>
          {block.data.style === 'number' ? (
            <span
              className={cn(
                'shrink-0 font-medium text-edu-primary',
                compact ? 'text-xs' : 'text-[0.875em]'
              )}
            >
              {i + 1}.
            </span>
          ) : (
            <span
              className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-edu-primary"
              aria-hidden="true"
            />
          )}
          <span
            className={cn(
              'text-edu-prose',
              compact ? 'text-sm leading-relaxed' : 'text-[1em] leading-[1.7]'
            )}
          >
            {item}
          </span>
        </li>
      ))}
    </ul>
  );
}
