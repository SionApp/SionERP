import { useMemo, useState } from 'react';

import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { MusicSongStat } from '@/types/music.types';

function relativeLastPlayed(date: string | null): string {
  if (!date) return 'Nunca';
  const d = new Date(`${date}T12:00:00`);
  const diff = Math.round((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  if (diff < 30) return `Hace ${diff} días`;
  if (diff < 60) return 'Hace 1 mes';
  return `Hace ${Math.floor(diff / 30)} meses`;
}

/**
 * Ranked repertoire list (search + rows), shared by the director's Canciones
 * tab and the servidor's read-only repertoire. One implementation = one set of
 * medal colors, no drift. Each medal color has a light/dark pair so it reads
 * well against the music-shell's theme-aware canvas either way.
 */
export function RepertoireList({
  stats,
  isLoading = false,
  emptyHint,
}: {
  stats: MusicSongStat[];
  isLoading?: boolean;
  emptyHint?: string;
}) {
  const [search, setSearch] = useState('');

  const ranked = useMemo(
    () =>
      [...stats].sort((a, b) => {
        if (b.timesPlayed !== a.timesPlayed) return b.timesPlayed - a.timesPlayed;
        return (b.lastPlayedDate ?? '').localeCompare(a.lastPlayedDate ?? '');
      }),
    [stats]
  );

  const filtered = useMemo(
    () =>
      search.trim()
        ? ranked.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
        : ranked,
    [ranked, search]
  );

  const maxPlays = ranked[0]?.timesPlayed ?? 0;

  return (
    <div className="space-y-3">
      {stats.length > 0 && (
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar canción…"
        />
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {stats.length === 0
            ? (emptyHint ?? 'Todavía no hay repertorio cargado.')
            : 'Sin coincidencias.'}
        </p>
      ) : (
        <div className="music-stagger space-y-1.5">
          {filtered.map((s, i) => {
            const pct = maxPlays > 0 ? Math.round((s.timesPlayed / maxPlays) * 100) : 0;
            return (
              <div key={s.id} className="music-row relative overflow-hidden">
                {/* Medidor de frecuencia al pie de la fila: el ranking se lee sin
                    mirar el número. Va abajo y no como fondo completo — un lavado
                    a todo lo alto se confunde con el estado hover de la fila. */}
                <div
                  className="music-meter-fill absolute bottom-0 left-0 h-[2px] rounded-full bg-primary/70"
                  style={{ width: `${pct}%` }}
                />
                <div className="relative flex items-center justify-between gap-2 px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        'music-num w-6 shrink-0 text-center text-xs font-semibold',
                        i === 0 && 'text-amber-700 dark:text-amber-300',
                        i === 1 && 'text-zinc-500 dark:text-zinc-400',
                        i === 2 && 'text-orange-700 dark:text-orange-300',
                        i > 2 && 'text-muted-foreground'
                      )}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {relativeLastPlayed(s.lastPlayedDate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {s.historicalKey && <span className="music-key">{s.historicalKey}</span>}
                    <span
                      className={cn(
                        'music-num text-sm font-semibold',
                        s.timesPlayed === 0 ? 'text-muted-foreground' : 'text-foreground'
                      )}
                    >
                      {s.timesPlayed}×
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
