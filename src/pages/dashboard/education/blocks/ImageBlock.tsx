import { useQuery } from '@tanstack/react-query';
import { ImageOff, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { EducationService } from '@/services/education.service';
import type { BlockSize, EducationImageBlock } from './block.types';

/**
 * Fetches a time-limited signed URL for the block's private storage path —
 * NEVER a public URL (spec: "Lesson assets are private ... served only by
 * time-limited signed URL"). `staleTime` is set comfortably under the
 * signed URL's own 1h server-side TTL (education.service.ts,
 * `getEducationAssetSignedUrl`) so a long-lived tab refetches a fresh URL
 * well before the old one expires.
 */
export function ImageBlock({ block, size }: { block: EducationImageBlock; size: BlockSize }) {
  const compact = size !== 'full';
  const {
    data: url,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['education-asset-url', block.data.path],
    queryFn: () => EducationService.getEducationAssetSignedUrl(block.data.path),
    staleTime: 50 * 60 * 1000,
    enabled: !!block.data.path,
  });

  return (
    <figure className={cn(compact ? 'mt-4' : 'mt-6')}>
      <div
        className={cn(
          'mx-auto flex items-center justify-center overflow-hidden rounded-md3-block border border-dashed border-edu-image-frame-border bg-edu-image-frame',
          compact ? 'h-[140px] w-full' : 'h-[280px] w-full'
        )}
      >
        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
        ) : isError || !url ? (
          <ImageOff className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        ) : (
          <img src={url} alt={block.data.alt} className="h-full w-full object-cover" />
        )}
      </div>
      {block.data.caption && (
        <figcaption
          className={cn('mt-2.5 text-center text-outline', compact ? 'text-[11px]' : 'text-[13px]')}
        >
          {block.data.caption}
        </figcaption>
      )}
    </figure>
  );
}
