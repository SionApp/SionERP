import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Music2,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { MusicService } from '@/services/music.service';
import type { MusicAssignment, MusicEvent } from '@/types/music.types';
import { EVENT_TYPE_GRADIENT, EVENT_TYPE_LABEL } from './event-visual';

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

function initialsFromName(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? '';
  const b = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (a + b).toUpperCase() || '?';
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─────────────────────────────────────────────
// Confirmation progress bar
// ─────────────────────────────────────────────
export function ConfirmationProgress({
  assignments,
  className,
}: {
  assignments: MusicAssignment[];
  className?: string;
}) {
  const total = assignments.length;
  const confirmed = assignments.filter(a => a.state === 'confirmado').length;
  const declined = assignments.filter(a => a.state === 'no_puedo').length;
  const pending = total - confirmed - declined;
  const confirmedPct = total === 0 ? 0 : Math.round((confirmed / total) * 100);
  const declinedPct = total === 0 ? 0 : Math.round((declined / total) * 100);

  if (total === 0) {
    return (
      <p className={cn('text-xs text-muted-foreground', className)}>Sin equipo asignado todavía.</p>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <div className="flex items-center gap-3 text-muted-foreground">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <strong className="text-foreground">{confirmed}</strong> confirmados
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <strong className="text-foreground">{pending}</strong> pendientes
          </span>
          {declined > 0 && (
            <span className="flex items-center gap-1 text-destructive">
              <XCircle className="h-3.5 w-3.5" />
              <strong>{declined}</strong>
            </span>
          )}
        </div>
        <span className="font-semibold tabular-nums">{confirmedPct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
        <div className="h-full bg-emerald-500" style={{ width: `${confirmedPct}%` }} />
        <div className="h-full bg-destructive" style={{ width: `${declinedPct}%` }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Team avatar stack
// ─────────────────────────────────────────────
function TeamAvatars({ assignments, max = 5 }: { assignments: MusicAssignment[]; max?: number }) {
  const visible = assignments.slice(0, max);
  const overflow = assignments.length - visible.length;
  return (
    <div className="flex -space-x-2">
      {visible.map(a => (
        <div
          key={a.id}
          className={cn(
            'w-8 h-8 rounded-full ring-2 ring-background flex items-center justify-center text-[10px] font-semibold',
            a.state === 'confirmado' && 'bg-emerald-500 text-white',
            a.state === 'asignado' && 'bg-muted text-foreground',
            a.state === 'no_puedo' && 'bg-destructive text-white opacity-70'
          )}
          title={`${a.memberName ?? ''} — ${a.funcion} (${a.state})`}
        >
          {initialsFromName(a.memberName)}
        </div>
      ))}
      {overflow > 0 && (
        <div className="w-8 h-8 rounded-full ring-2 ring-background bg-muted-foreground/20 flex items-center justify-center text-[10px] font-semibold">
          +{overflow}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Stat tile
// ─────────────────────────────────────────────
function StatTile({
  label,
  value,
  icon,
  tone = 'default',
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  tone?: 'default' | 'primary' | 'warning' | 'success';
}) {
  const tones = {
    default: 'bg-card',
    primary: 'bg-primary/10 border-primary/30',
    warning: 'bg-amber-500/10 border-amber-500/30',
    success: 'bg-emerald-500/10 border-emerald-500/30',
  };
  return (
    <div className={cn('rounded-xl border border-border p-3 sm:p-4', tones[tone])}>
      <div className="flex items-center gap-2 mb-1 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-xl sm:text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

// ─────────────────────────────────────────────
// Next culto hero — uses real data for the director
// ─────────────────────────────────────────────
function NextCultoHeroCard({
  event,
  onOpen,
}: {
  event: MusicEvent;
  onOpen: (e: MusicEvent) => void;
}) {
  const { data: assignments = [] } = useQuery({
    queryKey: ['music-assignments', event.id],
    queryFn: () => MusicService.getAssignments(event.id),
  });
  const { data: songs = [] } = useQuery({
    queryKey: ['music-event-songs', event.id],
    queryFn: () => MusicService.getEventSongs(event.id),
  });

  const dCount = daysUntil(event.eventDate);
  const dLabel =
    dCount === 0
      ? 'Hoy'
      : dCount === 1
        ? 'Mañana'
        : dCount > 1
          ? `En ${dCount} días`
          : `Hace ${Math.abs(dCount)} días`;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl text-white shadow-lg',
        'bg-gradient-to-br',
        EVENT_TYPE_GRADIENT[event.eventType]
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),transparent_60%)]" />
      <div className="relative p-5 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider opacity-80">Próximo culto</p>
            <h2 className="text-2xl sm:text-3xl font-bold capitalize leading-tight mt-1">
              {formatLongDate(event.eventDate)}
            </h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur">
                {EVENT_TYPE_LABEL[event.eventType]}
              </Badge>
              {event.title && <span className="text-sm opacity-90 truncate">{event.title}</span>}
              {event.published && (
                <Badge className="bg-emerald-400/30 text-white border-0 backdrop-blur">
                  Publicado
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-3xl sm:text-4xl font-extrabold tabular-nums leading-none">
              {dCount >= 0 ? dCount : '—'}
            </div>
            <p className="text-xs opacity-80 mt-1">{dLabel}</p>
          </div>
        </div>

        <div className="bg-white/15 backdrop-blur rounded-xl p-3 sm:p-4 space-y-3">
          <ConfirmationProgress
            assignments={assignments}
            className="text-white [&_*]:!text-white"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TeamAvatars assignments={assignments} />
              <div className="text-xs">
                <p className="opacity-80">Equipo</p>
                <p className="font-semibold">
                  {assignments.length} servidor{assignments.length === 1 ? '' : 'es'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Music2 className="h-4 w-4 opacity-80" />
              <span className="font-semibold tabular-nums">{songs.length}</span>
              <span className="opacity-80">canciones</span>
            </div>
          </div>
        </div>

        <Button
          variant="secondary"
          className="w-full bg-white text-slate-900 hover:bg-white/90 gap-2"
          onClick={() => onOpen(event)}
        >
          Abrir detalle del culto
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Director hero (root)
// ─────────────────────────────────────────────
export function DirectorMusicHero({ onOpenEvent }: { onOpenEvent: (e: MusicEvent) => void }) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['music-events'],
    queryFn: () => MusicService.getEvents(),
  });
  const { data: members = [] } = useQuery({
    queryKey: ['music-members'],
    queryFn: () => MusicService.getMembers(),
  });
  const { data: songStats = [] } = useQuery({
    queryKey: ['music-song-stats'],
    queryFn: () => MusicService.getSongStats(500),
  });

  const today = todayISO();
  const upcoming = useMemo(
    () =>
      [...events]
        .filter(e => e.eventDate >= today)
        .sort((a, b) => a.eventDate.localeCompare(b.eventDate)),
    [events, today]
  );
  const nextEvent = upcoming[0];

  // Stats
  const activeMembers = members.filter(m => m.active).length;
  const thisMonth = new Date().toISOString().slice(0, 7);
  const cultosThisMonth = events.filter(e => e.eventDate.startsWith(thisMonth)).length;
  const repertoireSize = songStats.length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {nextEvent ? (
        <NextCultoHeroCard event={nextEvent} onOpen={onOpenEvent} />
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-border p-8 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center">
            <CalendarDays className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold">No hay cultos próximos</p>
            <p className="text-sm text-muted-foreground">
              Generá el trimestre desde la pestaña Cultos para empezar.
            </p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile
          label="Integrantes activos"
          value={activeMembers}
          icon={<Users className="h-3.5 w-3.5" />}
          tone="primary"
        />
        <StatTile
          label="Cultos este mes"
          value={cultosThisMonth}
          icon={<CalendarDays className="h-3.5 w-3.5" />}
        />
        <StatTile
          label="Repertorio"
          value={repertoireSize}
          icon={<Music2 className="h-3.5 w-3.5" />}
        />
        <StatTile
          label="Próximos cultos"
          value={upcoming.length}
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          tone={upcoming.length === 0 ? 'warning' : 'success'}
        />
      </div>
    </div>
  );
}
