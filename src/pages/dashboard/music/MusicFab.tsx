import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Floating action button for the music module. Shared so the three call sites
 * (Nuevo culto ×2, Avisar ausencia) stay identical and every one gets the same
 * press feedback (active:scale) instead of copy-pasted raw <button>s.
 */
export function MusicFab({
  icon: Icon,
  label,
  onClick,
  className,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        // Latón sobre tinta: el FAB es el único bloque sólido de dorado en
        // pantalla, así que la acción principal se encuentra sin buscarla.
        'music-press fixed bottom-24 right-4 z-30 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground',
        'shadow-[0_10px_30px_-10px_hsl(var(--music-brass)/0.9)] ring-1 ring-inset ring-white/25',
        'transition-[transform,box-shadow,filter] duration-150 hover:brightness-105 sm:right-6',
        className
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="text-[0.7rem] font-bold uppercase tracking-[0.14em]">{label}</span>
    </button>
  );
}
