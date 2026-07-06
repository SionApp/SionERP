import { useQuery } from '@tanstack/react-query';
import { ListMusic } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MusicService } from '@/services/music.service';
import { RepertoireList } from './RepertoireList';

/**
 * Read-only repertoire for servidores: the band's growing song catalog ranked
 * by how often it's played. Same list the director sees (RepertoireList),
 * without edit controls.
 */
export function ServidorRepertoire() {
  const { data: stats = [], isLoading } = useQuery({
    queryKey: ['music-song-stats'],
    queryFn: () => MusicService.getSongStats(300),
  });

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

      <RepertoireList stats={stats} isLoading={isLoading} />
    </div>
  );
}
