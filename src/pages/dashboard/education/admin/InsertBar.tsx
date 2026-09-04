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

/**
 * Design (README §8, "2. Barra de insertar bloques"): horizontal-scroll pill
 * row, "INSERTAR" label + one pill per block type. Clicking a pill inserts a
 * new block of that type right after the currently selected block (or at
 * the end when nothing is selected) in the step being edited — tasks-v2-part2
 * I.6.
 */
export function InsertBar({ onInsert }: { onInsert: (type: EducationBlockType) => void }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto border-b border-border px-3.5 py-3">
      <span className="shrink-0 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        Insertar
      </span>
      {INSERT_BAR_TYPES.map(type => {
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
