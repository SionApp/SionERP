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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { MusicService } from '@/services/music.service';
import type { MusicAssignment, AssignmentState, MusicEventType } from '@/types/music.types';

const STATE_LABEL: Record<AssignmentState, string> = {
  asignado: 'Pendiente de confirmar',
  confirmado: 'Confirmado',
  no_puedo: 'No puedo',
};

const EVENT_TYPE_LABEL: Record<string, string> = {
  viernes: 'Viernes',
  domingo: 'Domingo',
  especial: 'Especial',
};

const EVENT_TYPE_GRADIENT: Record<MusicEventType, string> = {
  viernes: 'from-blue-500 to-indigo-600',
  domingo: 'from-emerald-500 to-teal-600',
  especial: 'from-amber-500 to-orange-600',
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
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Music2 className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">Canciones del culto</p>
          <p className="text-xs text-muted-foreground">Lo que vamos a tocar</p>
        </div>
        <Badge variant="secondary" className="ml-auto tabular-nums">
          {songs.length}
        </Badge>
      </div>
      {songs.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          El director todavía no cargó el repertorio.
        </p>
      ) : (
        <ol className="space-y-1.5">
          {songs.map((s, i) => (
            <li
              key={s.id}
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-2"
            >
              <span className="w-5 shrink-0 text-center text-xs font-bold tabular-nums text-muted-foreground">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.songName}</span>
              {s.tono && (
                <Badge variant="outline" className="shrink-0 text-xs">
                  {s.tono}
                </Badge>
              )}
              {s.link && (
                <a
                  href={s.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-primary hover:opacity-70"
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
        <Skeleton className="h-44 w-full rounded-2xl" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!next) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border p-6 text-center space-y-2">
        <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold">No tenés cultos próximos asignados</p>
          <p className="text-sm text-muted-foreground">
            Cuando te asignen, vas a recibir la notificación acá.
          </p>
        </div>
      </div>
    );
  }

  const dCount = daysUntil(next.eventDate ?? '');
  const dLabel =
    dCount === 0
      ? 'Hoy'
      : dCount === 1
        ? 'Mañana'
        : dCount > 1
          ? `En ${dCount} días`
          : `Hace ${Math.abs(dCount)} días`;

  const type = (next.eventType ?? 'domingo') as MusicEventType;

  return (
    <div className="space-y-4">
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl text-white shadow-lg',
          'bg-gradient-to-br',
          EVENT_TYPE_GRADIENT[type]
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),transparent_60%)]" />
        <div className="relative p-5 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider opacity-80">Mi próximo culto</p>
              <h2 className="text-2xl sm:text-3xl font-bold capitalize leading-tight mt-1">
                {formatLongDate(next.eventDate ?? '')}
              </h2>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur">
                  {EVENT_TYPE_LABEL[type] ?? type}
                </Badge>
                <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur capitalize">
                  {next.funcion}
                </Badge>
                <span className="text-xs opacity-90">· {STATE_LABEL[next.state]}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-3xl sm:text-4xl font-extrabold tabular-nums leading-none">
                {dCount >= 0 ? dCount : '—'}
              </div>
              <p className="text-xs opacity-80 mt-1">{dLabel}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            {next.state !== 'confirmado' && (
              <Button
                size="lg"
                className="flex-1 bg-white text-emerald-700 hover:bg-white/90 gap-2 font-semibold"
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
              className="flex-1 bg-transparent text-white border-white/40 hover:bg-white/10 gap-2"
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

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-1 text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Próximos</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold tabular-nums">{upcoming.length}</p>
        </div>
        <div
          className={cn(
            'rounded-xl border p-3 sm:p-4',
            pending > 0 ? 'bg-amber-500/10 border-amber-500/30' : 'border-border'
          )}
        >
          <div className="flex items-center gap-2 mb-1 text-muted-foreground">
            <Music2 className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Pendientes</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold tabular-nums">{pending}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-1 text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Confirmados</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold tabular-nums">{confirmed}</p>
        </div>
      </div>
    </div>
  );
}
