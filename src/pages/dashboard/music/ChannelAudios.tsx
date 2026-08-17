import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Download, Radio, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MusicService } from '@/services/music.service';
import type { TelegramFile } from '@/types/music.types';

function formatBytes(n: number): string {
  if (!n) return '';
  const mb = n / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;
}

/**
 * Lists audio files ingested from the worship Telegram channel and lets the
 * team download them on-demand (proxied through the backend, token-safe).
 * Renders nothing until the bot is configured, so it never clutters the
 * dashboard before the integration is wired up.
 */
export function ChannelAudios() {
  const [search, setSearch] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: status } = useQuery({
    queryKey: ['music-telegram-status'],
    queryFn: () => MusicService.getTelegramStatus(),
    staleTime: 5 * 60_000,
  });
  const configured = status?.configured ?? false;

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['music-telegram-files', search],
    queryFn: () => MusicService.getTelegramFiles(search.trim() || undefined),
    enabled: configured,
  });

  const download = useMutation({
    mutationFn: (f: TelegramFile) =>
      MusicService.downloadTelegramFile(f.id, f.fileName || `${f.title || 'audio'}.mp3`),
    onMutate: f => setDownloadingId(f.id),
    onSettled: () => setDownloadingId(null),
    onError: () => toast.error('No se pudo descargar el audio'),
  });

  if (!configured) return null;

  return (
    <div className="music-panel p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="music-glyph music-glyph-spot">
          <Radio className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="music-eyebrow">Descargá las pistas de Telegram</p>
          <p className="music-heading mt-1 text-lg leading-none">Audios del canal</p>
        </div>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar audio…"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : files.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          {search ? 'Sin resultados.' : 'Todavía no hay audios en el canal.'}
        </p>
      ) : (
        <div className="music-stagger space-y-1.5">
          {files.map(f => (
            <div key={f.id} className="music-row flex items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{f.title || f.fileName || 'Audio'}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {f.performer && `${f.performer} · `}
                  {formatBytes(f.fileSize)}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0 text-primary"
                onClick={() => download.mutate(f)}
                disabled={downloadingId === f.id}
                aria-label={`Descargar ${f.title || f.fileName}`}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
