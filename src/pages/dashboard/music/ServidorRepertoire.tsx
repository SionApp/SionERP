import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ListMusic } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { MusicService } from '@/services/music.service';

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
 * Read-only repertoire for servidores: the band's growing song catalog ranked
 * by how often it's played. Same data the director sees, without edit controls.
 */
export function ServidorRepertoire() {
  const [search, setSearch] = useState('');
  const { data: stats = [], isLoading } = useQuery({
    queryKey: ['music-song-stats'],
    queryFn: () => MusicService.getSongStats(300),
  });

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
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <ListMusic className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">Repertorio de la banda</p>
          <p className="text-xs text-muted-foreground">Las canciones que más tocamos</p>
        </div>
        <Badge variant="secondary" className="ml-auto tabular-nums">
          {stats.length}
        </Badge>
      </div>

      {stats.length > 0 && (
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar canción…"
          className="mb-3"
        />
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-11 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          {stats.length === 0 ? 'Todavía no hay repertorio cargado.' : 'Sin coincidencias.'}
        </p>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((s, i) => {
            const pct = maxPlays > 0 ? Math.round((s.timesPlayed / maxPlays) * 100) : 0;
            return (
              <div
                key={s.id}
                className="relative overflow-hidden rounded-xl border border-border/60 bg-background/40"
              >
                <div
                  className="absolute inset-y-0 left-0 bg-primary/10"
                  style={{ width: `${pct}%` }}
                />
                <div className="relative flex items-center justify-between gap-2 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        'w-5 shrink-0 text-center text-xs font-bold tabular-nums',
                        i === 0 && 'text-amber-400',
                        i === 1 && 'text-zinc-300',
                        i === 2 && 'text-orange-400',
                        i > 2 && 'text-muted-foreground'
                      )}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {relativeLastPlayed(s.lastPlayedDate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {s.historicalKey && (
                      <Badge variant="outline" className="text-xs">
                        {s.historicalKey}
                      </Badge>
                    )}
                    <Badge
                      variant={s.timesPlayed === 0 ? 'outline' : 'secondary'}
                      className="text-xs tabular-nums"
                    >
                      {s.timesPlayed}×
                    </Badge>
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
