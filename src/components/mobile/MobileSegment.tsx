import { cn } from '@/lib/utils';

interface SegmentOption {
  value: string;
  label: string;
}

interface MobileSegmentProps {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
  /** Para 4+ opciones: pills deslizables en vez de ancho fijo repartido */
  scrollable?: boolean;
  className?: string;
}

/** Control segmentado mobile (equivalente a MobileSegment de daas). */
export function MobileSegment({
  options,
  value,
  onChange,
  scrollable = false,
  className,
}: MobileSegmentProps) {
  if (scrollable) {
    return (
      <div
        className={cn(
          'flex gap-1.5 overflow-x-auto snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          className
        )}
      >
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              'snap-start shrink-0 py-1.5 px-3.5 rounded-full text-xs font-medium transition-all cursor-pointer border',
              value === opt.value
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-card text-muted-foreground border-border active:bg-accent'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('flex p-1 rounded-xl bg-muted/60 gap-1', className)}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer',
            value === opt.value
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground active:bg-card/50'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
