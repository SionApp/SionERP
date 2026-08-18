import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Music2,
  ThumbsDown,
  ThumbsUp,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { MusicService } from '@/services/music.service';
import type { MusicAssignment, AssignmentState, MusicEventType } from '@/types/music.types';
import { EVENT_TYPE_LABEL, EVENT_TYPE_TONE, toneStyle } from './event-visual';
import { MusicEmpty, StatTile } from './MusicHero';

const STATE_LABEL: Record<AssignmentState, string> = {
  asignado: 'Pendiente de confirmar',
  confirmado: 'Confirmado',
  no_puedo: 'No puedo',
};

function daysUntil(iso: string): number {
  const target = new Date(`${iso}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatLongDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// Songs the servidor will play at their next culto — front and center so that
// walking in on Monday already shows Sunday's setlist.
function NextCultoSongs({ eventId }: { eventId: string }) {
  const { data: songs = [], isLoading } = useQuery({
    queryKey: ['music-event-songs', eventId],
    queryFn: () => MusicService.getEventSongs(eventId),
  });

  if (isLoading) return <Skeleton className="h-24 w-full rounded-2xl" />;

  return (
    <div className="music-panel p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="music-glyph">
          <Music2 className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="music-eyebrow">Canciones del culto</p>
          <p className="music-heading mt-1 text-lg leading-none">Lo que vamos a tocar</p>
        </div>
        <span className="music-num ml-auto text-2xl font-semibold leading-none">
          {songs.length}
        </span>
      </div>
      {songs.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          El director todavía no cargó el repertorio.
        </p>
      ) : (
        <ol className="music-stagger space-y-1.5">
          {songs.map((s, i) => (
            <li key={s.id} className="music-row flex items-center gap-3 px-3 py-2.5">
              <span className="music-num w-5 shrink-0 text-center text-xs font-semibold text-muted-foreground">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.songName}</span>
              {s.tono && <span className="music-key shrink-0">{s.tono}</span>}
              {s.link && (
                <a
                  href={s.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-primary transition-opacity hover:opacity-70"
                  aria-label={`Abrir ${s.songName}`}
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function ServidorMusicHero() {
  const qc = useQueryClient();
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['music-my-assignments'],
    queryFn: () => MusicService.getMyAssignments(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, state }: { id: string; state: AssignmentState }) =>
      MusicService.updateAssignment(id, { state }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['music-my-assignments'] });
      toast.success('Listo, gracias por confirmar');
    },
    onError: () => toast.error('No se pudo actualizar'),
  });

  const today = todayISO();
  const upcoming = useMemo(
    () =>
      [...assignments]
        .filter(a => a.eventDate && a.eventDate >= today && a.state !== 'no_puedo')
        .sort((a, b) => (a.eventDate ?? '').localeCompare(b.eventDate ?? '')),
    [assignments, today]
  );

  const next = upcoming[0] as MusicAssignment | undefined;
  const pending = assignments.filter(a => a.state === 'asignado').length;
  const confirmed = upcoming.filter(a => a.state === 'confirmado').length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full rounded-3xl" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!next) {
    return (
      <MusicEmpty
        icon={<Sparkles className="h-6 w-6" />}
        title="No tenés cultos próximos asignados"
        hint="Cuando te asignen, vas a recibir la notificación acá."
      />
    );
  }

  const dCount = daysUntil(next.eventDate ?? '');
  const dLabel = dCount === 1 ? 'día' : dCount > 1 ? 'días' : 'pasado';
  const type = (next.eventType ?? 'domingo') as MusicEventType;
  const tone = EVENT_TYPE_TONE[type] ?? EVENT_TYPE_TONE.domingo;
  const isConfirmed = next.state === 'confirmado';

  return (
    <div className="space-y-4">
      <div className="music-stage music-rise" style={toneStyle(tone)}>
        <span className="music-spine" />
        <div className="relative space-y-5 p-5 pl-6 sm:p-7 sm:pl-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="music-eyebrow">Mi próximo culto</p>
              <h2 className="music-heading mt-2 text-[1.85rem] leading-[1.05] first-letter:uppercase sm:text-[2.6rem]">
                {formatLongDate(next.eventDate ?? '')}
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="music-tag music-tag-tone">{EVENT_TYPE_LABEL[type] ?? type}</span>
                <span className="music-tag">{next.funcion}</span>
                {next.instrument && <span className="music-tag">{next.instrument}</span>}
              </div>
            </div>
            <div className="shrink-0 text-right">
              {dCount === 0 ? (
                <span className="music-heading text-3xl leading-none text-[hsl(var(--music-tone))] sm:text-4xl">
                  Hoy
                </span>
              ) : (
                <span className="music-num block text-[2.75rem] font-semibold leading-none text-[hsl(var(--music-tone))] sm:text-[3.5rem]">
                  {dCount > 0 ? dCount : Math.abs(dCount)}
                </span>
              )}
              {dCount !== 0 && <p className="music-eyebrow mt-2">{dLabel}</p>}
            </div>
          </div>

          <hr className="music-rule" />

          <div className="flex items-center gap-2">
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                isConfirmed ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse-dot'
              )}
            />
            <span className="music-eyebrow">{STATE_LABEL[next.state]}</span>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {!isConfirmed && (
              <Button
                size="lg"
                className="flex-1 gap-2 font-semibold"
                onClick={() => updateMutation.mutate({ id: next.id, state: 'confirmado' })}
                disabled={updateMutation.isPending}
              >
                <ThumbsUp className="h-4 w-4" />
                Confirmar participación
              </Button>
            )}
            <Button
              size="lg"
              variant="outline"
              className="flex-1 gap-2 border-white/15 bg-transparent hover:bg-white/5"
              onClick={() => updateMutation.mutate({ id: next.id, state: 'no_puedo' })}
              disabled={updateMutation.isPending}
            >
              <ThumbsDown className="h-4 w-4" />
              No puedo
            </Button>
          </div>
        </div>
      </div>

      <NextCultoSongs eventId={next.eventId} />

      <div className="music-stagger grid grid-cols-3 gap-3">
        <StatTile
          label="Próximos"
          value={upcoming.length}
          icon={<CalendarDays className="h-3.5 w-3.5" />}
        />
        <StatTile
          label="Pendientes"
          value={pending}
          icon={<Music2 className="h-3.5 w-3.5" />}
          tone={pending > 0 ? 'warning' : 'default'}
        />
        <StatTile
          label="Confirmados"
          value={confirmed}
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          tone="success"
        />
      </div>
    </div>
  );
}
