import { useQuery } from '@tanstack/react-query';
import { ListMusic } from 'lucide-react';
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
    <div className="music-panel p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="music-glyph">
          <ListMusic className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="music-eyebrow">Las canciones que más tocamos</p>
          <p className="music-heading mt-1 text-lg leading-none">Repertorio de la banda</p>
        </div>
        <span className="music-num ml-auto text-2xl font-semibold leading-none">
          {stats.length}
        </span>
      </div>

      <RepertoireList stats={stats} isLoading={isLoading} />
    </div>
  );
}
