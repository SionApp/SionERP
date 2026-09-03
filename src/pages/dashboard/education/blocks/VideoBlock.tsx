import { useState } from 'react';
import { Play } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { BlockSize, EducationVideoBlock } from './block.types';

/**
 * The iframe `src` is composed ONLY from the server-validated
 * `provider`/`videoId` pair (threat matrix: "SSRF / arbitrary embed via the
 * video block" — the block's Go validator already restricts `provider` to
 * `youtube|vimeo` and `videoId` to `^[A-Za-z0-9_-]{6,32}$`). There is no raw
 * `url` field on this block type at all, so there is nothing to smuggle a
 * different origin through.
 */
function embedSrc(block: EducationVideoBlock): string {
  if (block.data.provider === 'youtube') {
    return `https://www.youtube-nocookie.com/embed/${block.data.videoId}?autoplay=1`;
  }
  return `https://player.vimeo.com/video/${block.data.videoId}?autoplay=1`;
}

/** Design (README §4, "Video"): frame 330px, `border-radius:20px`, fondo
 * hex 1D1B20 (reuses `--edu-on-light-chip`, same fixed hex, not
 * theme-flipped — a video frame stays dark in both app themes). Play
 * button 66px `rgba(255,255,255,.16)`; caption `rgba(255,255,255,.7)`. */
export function VideoBlock({ block, size }: { block: EducationVideoBlock; size: BlockSize }) {
  const compact = size !== 'full';
  const [playing, setPlaying] = useState(false);

  return (
    <div className={cn(compact ? 'mt-4' : 'mt-6')}>
      <div
        className={cn(
          'relative mx-auto overflow-hidden rounded-md3-block bg-edu-on-light-chip',
          compact ? 'h-[160px] w-full' : 'h-[330px] w-full'
        )}
      >
        {playing ? (
          <iframe
            src={embedSrc(block)}
            title={block.data.caption ?? 'Video de la lección'}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="flex h-full w-full items-center justify-center"
            aria-label="Reproducir video"
          >
            <span
              className={cn(
                'flex items-center justify-center rounded-full bg-white/[0.16]',
                compact ? 'h-12 w-12' : 'h-[66px] w-[66px]'
              )}
            >
              <Play
                className={cn('fill-white text-white', compact ? 'h-5 w-5' : 'h-[34px] w-[34px]')}
                aria-hidden="true"
              />
            </span>
          </button>
        )}
        {!playing && block.data.caption && (
          <span className="absolute bottom-3 left-4 text-xs text-white/70">
            {block.data.caption}
          </span>
        )}
      </div>
    </div>
  );
}
