import { useQuery } from '@tanstack/react-query';
import { Download, FileText } from 'lucide-react';

import { cn } from '@/lib/utils';
import { EducationService } from '@/services/education.service';
import type { BlockSize, EducationPdfBlock } from './block.types';

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Signed download link — same private-bucket rule as ImageBlock. */
export function PdfBlock({ block, size }: { block: EducationPdfBlock; size: BlockSize }) {
  const compact = size !== 'full';
  const { data: url } = useQuery({
    queryKey: ['education-asset-url', block.data.path],
    queryFn: () => EducationService.getEducationAssetSignedUrl(block.data.path),
    staleTime: 50 * 60 * 1000,
    enabled: !!block.data.path,
  });

  const meta = formatBytes(block.data.sizeBytes);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-disabled={!url}
      onClick={e => {
        if (!url) e.preventDefault();
      }}
      className={cn(
        'flex items-center rounded-md3-option border border-border bg-muted',
        compact ? 'mt-4 gap-2.5 px-4 py-3' : 'mt-6 gap-4 px-5 py-4'
      )}
    >
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full bg-edu-orange-container text-on-edu-orange-container',
          compact ? 'h-9 w-9' : 'h-11 w-11'
        )}
      >
        <FileText className={compact ? 'h-4 w-4' : 'h-5 w-5'} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate font-medium text-foreground',
            compact ? 'text-xs' : 'text-sm'
          )}
        >
          {block.data.name}
        </span>
        {meta && <span className="block text-xs text-outline">{meta}</span>}
      </span>
      <Download
        className={cn('shrink-0 text-edu-primary', compact ? 'h-4 w-4' : 'h-[22px] w-[22px]')}
        aria-hidden="true"
      />
    </a>
  );
}
