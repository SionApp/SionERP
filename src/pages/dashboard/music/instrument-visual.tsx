import type { LucideIcon } from 'lucide-react';
import { Drum, Guitar, Mic, Music2, Piano, SlidersHorizontal, Sparkles, Wind } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Funcion, Instrument, InstrumentCategory } from '@/types/music.types';

// Each instrument category carries its own icon + color so the team is
// readable at a glance: who sings, who plays strings, who runs sound.
export const CATEGORY_META: Record<
  InstrumentCategory,
  { label: string; Icon: LucideIcon; chip: string; text: string }
> = {
  voz: {
    label: 'Voz',
    Icon: Mic,
    chip: 'bg-pink-500/15 text-pink-700 dark:text-pink-300',
    text: 'text-pink-700 dark:text-pink-300',
  },
  cuerdas: {
    label: 'Cuerdas',
    Icon: Guitar,
    chip: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    text: 'text-amber-700 dark:text-amber-300',
  },
  teclas: {
    label: 'Teclas',
    Icon: Piano,
    chip: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
    text: 'text-violet-700 dark:text-violet-300',
  },
  percusion: {
    label: 'Percusión',
    Icon: Drum,
    chip: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
    text: 'text-orange-700 dark:text-orange-300',
  },
  viento: {
    label: 'Viento',
    Icon: Wind,
    chip: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
    text: 'text-cyan-700 dark:text-cyan-300',
  },
  tecnico: {
    label: 'Técnico',
    Icon: SlidersHorizontal,
    chip: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  otro: {
    label: 'Otro',
    Icon: Music2,
    chip: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
    text: 'text-slate-700 dark:text-slate-300',
  },
};

// Broad role identity (independent of the specific instrument).
export const FUNCION_META: Record<Funcion, { label: string; Icon: LucideIcon; chip: string }> = {
  corista: { label: 'Corista', Icon: Mic, chip: 'bg-pink-500/15 text-pink-700 dark:text-pink-300' },
  musico: {
    label: 'Músico',
    Icon: Guitar,
    chip: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  },
  tecnico: {
    label: 'Técnico',
    Icon: SlidersHorizontal,
    chip: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  },
  danzarina: {
    label: 'Danzarina',
    Icon: Sparkles,
    chip: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300',
  },
};

/** Resolve a free-text instrument name to its catalog category (case-insensitive). */
export function resolveCategory(
  name: string | null | undefined,
  catalog: Instrument[]
): InstrumentCategory {
  if (!name) return 'otro';
  const hit = catalog.find(i => i.name.toLowerCase() === name.trim().toLowerCase());
  return hit?.category ?? 'otro';
}

/** Small colored chip for an instrument, icon resolved from its category. */
export function InstrumentChip({
  name,
  category,
  className,
}: {
  name: string;
  category: InstrumentCategory;
  className?: string;
}) {
  const meta = CATEGORY_META[category] ?? CATEGORY_META.otro;
  const { Icon } = meta;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        meta.chip,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {name}
    </span>
  );
}

/** Role chip (corista / músico / técnico / danzarina) with its icon. */
export function FuncionChip({ funcion, className }: { funcion: Funcion; className?: string }) {
  const meta = FUNCION_META[funcion];
  if (!meta) return null;
  const { Icon } = meta;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        meta.chip,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}
