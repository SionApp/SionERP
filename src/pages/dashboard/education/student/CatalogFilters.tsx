import { cn } from '@/lib/utils';
import type { EducationTrack } from '@/types/education.types';

const TRACK_OPTIONS: { value: EducationTrack | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'discipulado', label: 'Discipulado' },
  { value: 'servicio', label: 'Servicio' },
  { value: 'liderazgo', label: 'Liderazgo' },
  { value: 'familia', label: 'Familia' },
];

export function CatalogFilters({
  value,
  onChange,
  compact = false,
}: {
  value: EducationTrack | 'all';
  onChange: (track: EducationTrack | 'all') => void;
  /** Mobile handoff, screen 2: the chip row scrolls horizontally instead of
   * wrapping — "El último chip queda deliberadamente cortado por el borde:
   * es la señal de que la fila desplaza." */
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5',
        compact ? 'flex-nowrap overflow-x-auto' : 'flex-wrap'
      )}
    >
      {TRACK_OPTIONS.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors',
            value === opt.value
              ? 'bg-edu-primary text-white'
              : 'border border-border bg-card text-muted-foreground hover:text-foreground'
          )}
        >
          {opt.label}
        </button>
      ))}
      {!compact && (
        <>
          <div className="flex-1" />
          {/* "Más recientes" is the catalog's only sort mode (spec: "sort by
              recency" — the backend's GetCatalog already orders by created_at
              DESC unconditionally). Rendered as a static label, not a dropdown
              with nowhere else to go, per the same "no dead affordance"
              principle spec applies to the editor's Historial button. */}
          <span className="hidden items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground sm:flex">
            Más recientes
          </span>
        </>
      )}
    </div>
  );
}
