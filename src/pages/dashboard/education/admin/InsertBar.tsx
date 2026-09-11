import {
  FileText,
  Heading2,
  Image as ImageIcon,
  Lightbulb,
  type LucideIcon,
  Minus,
  Quote,
  Film,
  HelpCircle,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import type { EducationBlockType } from '../blocks/block.types';

export const BLOCK_TYPE_META: Record<EducationBlockType, { icon: LucideIcon; label: string }> = {
  heading: { icon: Heading2, label: 'Título' },
  paragraph: { icon: FileText, label: 'Párrafo' },
  list: { icon: Minus, label: 'Lista' },
  image: { icon: ImageIcon, label: 'Imagen' },
  video: { icon: Film, label: 'Video' },
  quote: { icon: Quote, label: 'Versículo' },
  callout: { icon: Lightbulb, label: 'Callout' },
  pdf: { icon: FileText, label: 'PDF' },
  question: { icon: HelpCircle, label: 'Pregunta' },
  divider: { icon: Minus, label: 'Separador' },
};

// InsertBar's own pill order matches README §8, "2. Barra de insertar
// bloques" verbatim: Título · Imagen · Video · Versículo · Callout · PDF ·
// Pregunta · Separador. `paragraph`/`list` have no pill there (paragraph is
// the lesson's default/most-common block — inserted by pressing "Añadir
// bloque" at the bottom of the list, matching the design's "Zona final"
// affordance; `list` is covered by the same zone since the mockup's pill row
// doesn't list it either — flagged as a design gap filled by the same
// "Añadir bloque" catch-all rather than inventing a 9th pill the mockup
// doesn't show).
const INSERT_BAR_TYPES: EducationBlockType[] = [
  'heading',
  'image',
  'video',
  'quote',
  'callout',
  'pdf',
  'question',
  'divider',
];

// Mobile handoff §8, "1. Insertar bloque": same 7 types minus `divider` — the
// mockup's own literal list ("Título · Imagen · Video · Versículo · Callout ·
// PDF · Pregunta") has no separator pill, unlike the desktop bar which adds
// one as a design gap-fill (see INSERT_BAR_TYPES's own comment above). Not
// dropped by oversight — `divider` stays reachable via "Añadir bloque" on
// mobile too.
const COMPACT_INSERT_BAR_TYPES: EducationBlockType[] = INSERT_BAR_TYPES.filter(
  t => t !== 'divider'
);

/**
 * Design (README §8, "2. Barra de insertar bloques"): horizontal-scroll pill
 * row, "INSERTAR" label + one pill per block type. Clicking a pill inserts a
 * new block of that type right after the currently selected block (or at
 * the end when nothing is selected) in the step being edited — tasks-v2-part2
 * I.6.
 *
 * `compact` (mobile handoff, screen 8 "1. Insertar bloque"): pills become
 * 56px-wide columns — a 40px icon container (`border-radius:13px`,
 * `#F1ECF4` fill, 20px icon) with a 9px label below, not the desktop's
 * inline pill+label row (too cramped for a touch target at that density).
 */
export function InsertBar({
  onInsert,
  compact = false,
}: {
  onInsert: (type: EducationBlockType) => void;
  compact?: boolean;
}) {
  const types = compact ? COMPACT_INSERT_BAR_TYPES : INSERT_BAR_TYPES;

  if (compact) {
    return (
      <div className="flex items-center gap-2.5 overflow-x-auto px-3 py-[9px]">
        {types.map(type => {
          const meta = BLOCK_TYPE_META[type];
          return (
            <button
              key={type}
              type="button"
              onClick={() => onInsert(type)}
              className="flex w-14 shrink-0 flex-col items-center gap-1"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-muted">
                <meta.icon className="h-5 w-5 text-edu-primary" aria-hidden="true" />
              </span>
              <span className="truncate text-[9px] font-normal text-outline">{meta.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto border-b border-border px-3.5 py-3">
      <span className="shrink-0 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        Insertar
      </span>
      {types.map(type => {
        const meta = BLOCK_TYPE_META[type];
        return (
          <button
            key={type}
            type="button"
            onClick={() => onInsert(type)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-medium text-foreground',
              'hover:bg-muted'
            )}
          >
            <meta.icon className="h-[17px] w-[17px] text-edu-primary" aria-hidden="true" />
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}
