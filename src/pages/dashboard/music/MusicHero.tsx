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
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { MusicService } from '@/services/music.service';
import type { MusicAssignment, MusicEvent } from '@/types/music.types';
import { EVENT_TYPE_LABEL, EVENT_TYPE_TONE, toneStyle } from './event-visual';

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
// Confirmation progress — leyenda + medidor
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
    return <p className={cn('music-eyebrow', className)}>Sin equipo asignado todavía</p>;
  }

  return (
    <div className={className}>
      <div className="mb-2 flex items-end justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <strong className="music-num text-sm font-semibold text-foreground">{confirmed}</strong>
            <span className="music-eyebrow">confirmados</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <strong className="music-num text-sm font-semibold text-foreground">{pending}</strong>
            <span className="music-eyebrow">pendientes</span>
          </span>
          {declined > 0 && (
            <span className="flex items-center gap-1.5 text-destructive">
              <XCircle className="h-3.5 w-3.5" />
              <strong className="music-num text-sm font-semibold">{declined}</strong>
            </span>
          )}
        </div>
        <span className="music-num text-lg font-semibold leading-none">{confirmedPct}%</span>
      </div>
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07] shadow-[inset_0_1px_1px_rgba(0,0,0,0.5)]">
        <div
          className="music-meter-fill h-full rounded-full bg-emerald-400"
          style={{ width: `${confirmedPct}%` }}
        />
        <div
          className="music-meter-fill h-full bg-destructive/80"
          style={{ width: `${declinedPct}%` }}
        />
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
            'music-num flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-semibold ring-2 ring-[hsl(236_32%_9%)]',
            a.state === 'confirmado' && 'bg-emerald-400 text-emerald-950',
            a.state === 'asignado' && 'bg-white/10 text-foreground',
            a.state === 'no_puedo' && 'bg-destructive/80 text-white opacity-70'
          )}
          title={`${a.memberName ?? ''} — ${a.funcion} (${a.state})`}
        >
          {initialsFromName(a.memberName)}
        </div>
      ))}
      {overflow > 0 && (
        <div className="music-num flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.08] text-[10px] font-semibold ring-2 ring-[hsl(236_32%_9%)]">
          +{overflow}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Stat tile — lectura de consola, no tarjetita
// ─────────────────────────────────────────────
export function StatTile({
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
  const accents = {
    default: 'text-muted-foreground',
    primary: 'text-primary',
    warning: 'text-orange-700 dark:text-orange-300',
    success: 'text-emerald-700 dark:text-emerald-300',
  };
  const rules = {
    default: 'bg-border',
    primary: 'bg-primary/70',
    warning: 'bg-orange-400/70',
    success: 'bg-emerald-400/70',
  };
  return (
    <div className="music-panel relative overflow-hidden p-3 sm:p-4">
      <span className={cn('absolute inset-x-0 top-0 h-px', rules[tone])} />
      <div className="mb-2 flex items-center gap-1.5">
        <span className={accents[tone]}>{icon}</span>
        <span className="music-eyebrow">{label}</span>
      </div>
      <p className="music-num text-2xl font-semibold leading-none sm:text-3xl">{value}</p>
    </div>
  );
}

// ─────────────────────────────────────────────
// Próximo culto — "marquesina"
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
  const dLabel = dCount === 1 ? 'día' : dCount > 1 ? 'días' : 'pasado';
  const tone = EVENT_TYPE_TONE[event.eventType];

  return (
    <div className="music-stage music-rise" style={toneStyle(tone)}>
      <span className="music-spine" />
      <div className="relative space-y-5 p-5 pl-6 sm:p-7 sm:pl-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="music-eyebrow">Próximo culto</p>
            <h2 className="music-heading mt-2 text-[1.85rem] leading-[1.05] first-letter:uppercase sm:text-[2.6rem]">
              {formatLongDate(event.eventDate)}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="music-tag music-tag-tone">{EVENT_TYPE_LABEL[event.eventType]}</span>
              {event.published && <span className="music-tag music-tag-ok">Publicado</span>}
              {event.title && (
                <span className="truncate text-sm text-muted-foreground">{event.title}</span>
              )}
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

        <ConfirmationProgress assignments={assignments} />

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <TeamAvatars assignments={assignments} />
            <div>
              <p className="music-eyebrow">Equipo</p>
              <p className="music-num mt-1 text-sm font-semibold">
                {assignments.length} servidor{assignments.length === 1 ? '' : 'es'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="music-eyebrow">Repertorio</p>
            <p className="music-num mt-1 flex items-center justify-end gap-1.5 text-sm font-semibold">
              <Music2 className="h-3.5 w-3.5 text-muted-foreground" />
              {songs.length}
            </p>
          </div>
        </div>

        <Button className="w-full gap-2" onClick={() => onOpen(event)}>
          Abrir detalle del culto
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Empty state compartido
// ─────────────────────────────────────────────
export function MusicEmpty({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-8 text-center">
      <div className="music-glyph music-glyph-lg">{icon}</div>
      <div className="space-y-1">
        <p className="music-heading text-lg">{title}</p>
        {hint && <p className="mx-auto max-w-xs text-sm text-muted-foreground">{hint}</p>}
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
        <Skeleton className="h-56 w-full rounded-3xl" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
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
        <MusicEmpty
          icon={<CalendarDays className="h-6 w-6" />}
          title="No hay cultos próximos"
          hint="Generá el trimestre desde la pestaña Cultos para empezar."
        />
      )}
      <div className="music-stagger grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Integrantes"
          value={activeMembers}
          icon={<Users className="h-3.5 w-3.5" />}
          tone="primary"
        />
        <StatTile
          label="Cultos del mes"
          value={cultosThisMonth}
          icon={<CalendarDays className="h-3.5 w-3.5" />}
        />
        <StatTile
          label="Repertorio"
          value={repertoireSize}
          icon={<Music2 className="h-3.5 w-3.5" />}
        />
        <StatTile
          label="Próximos"
          value={upcoming.length}
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          tone={upcoming.length === 0 ? 'warning' : 'success'}
        />
      </div>
    </div>
  );
}
