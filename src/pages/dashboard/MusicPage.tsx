import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Plus,
  Calendar as CalendarIcon,
  CalendarDays,
  CalendarOff,
  Guitar,
  Home,
  List,
  ListMusic,
  ChevronLeft,
  ChevronRight,
  Music2,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { MobileScreen } from '@/components/mobile/MobileScreen';
import { useMobileMode } from '@/hooks/useMobileMode';
import { MusicService } from '@/services/music.service';
import { AssignmentStates, MusicEventTypes } from '@/types/music.types';
import type {
  MusicEvent,
  AssignmentState,
  MusicEventType,
  CreateEventRequest,
  BatchQuarterRequest,
  UpdateAssignmentRequest,
  CreateUnavailabilityRequest,
} from '@/types/music.types';
import MusicMembers from './music/MusicMembers';
import MusicInstruments from './music/MusicInstruments';
import { DirectorMusicHero, MusicEmpty, StatTile } from './music/MusicHero';
import { ServidorMusicHero } from './music/ServidorHero';
import { ChannelAudios } from './music/ChannelAudios';
import { ServidorRepertoire } from './music/ServidorRepertoire';
import { RepertoireList } from './music/RepertoireList';
import { MusicFab } from './music/MusicFab';
import { InstrumentChip, resolveCategory } from './music/instrument-visual';
import {
  EVENT_TYPE_COLOR,
  EVENT_TYPE_LABEL,
  EVENT_TYPE_TONE,
  toneStyle,
} from './music/event-visual';
import { useMusicAccess } from './music/use-music-access';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import './music/music-theme.css';

const STATE_TAG: Record<AssignmentState, string> = {
  asignado: 'music-tag',
  confirmado: 'music-tag music-tag-ok',
  no_puedo: 'music-tag music-tag-warn',
};

const STATE_LABEL: Record<AssignmentState, string> = {
  asignado: 'Asignado',
  confirmado: 'Confirmado',
  no_puedo: 'No puedo',
};

const FUNCION_LABEL: Record<string, string> = {
  corista: 'Corista',
  musico: 'Músico',
  tecnico: 'Técnico',
  danzarina: 'Danzarina',
};

const FUNCION_DOT: Record<string, string> = {
  corista: 'bg-pink-400',
  musico: 'bg-amber-400',
  tecnico: 'bg-emerald-400',
  danzarina: 'bg-fuchsia-400',
};

function daysUntil(iso: string): number {
  const target = new Date(`${iso}T00:00:00`);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatEventDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─────────────────────────────────────────────
// Chrome compartido de sección: eyebrow + título serif + acción.
// Reemplaza al <Card> de shadcn dentro del módulo — la card gris con título
// bold es exactamente el patrón que hace que todos los módulos se vean igual.
// ─────────────────────────────────────────────
function Panel({
  title,
  eyebrow,
  action,
  children,
  className,
}: {
  title: string;
  eyebrow?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('music-panel p-4 sm:p-5', className)}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && <p className="music-eyebrow">{eyebrow}</p>}
          <h2 className="music-heading mt-1.5 text-xl leading-none sm:text-2xl">{title}</h2>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      {children}
    </section>
  );
}

// ─────────────────────────────────────────────
// CRONOGRAMA — vista lista + vista calendario
// ─────────────────────────────────────────────
function CronogramaTab({
  isDirector,
  onOpenEvent,
}: {
  isDirector: boolean;
  onOpenEvent: (e: MusicEvent) => void;
}) {
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['music-events'],
    queryFn: () => MusicService.getEvents(),
  });

  const views = [
    { key: 'list' as const, label: 'Lista', Icon: List },
    { key: 'calendar' as const, label: 'Calendario', Icon: CalendarDays },
  ];

  return (
    <Panel
      eyebrow="Agenda del equipo"
      title="Cronograma"
      action={
        <div className="flex gap-1 rounded-full border border-border bg-black/25 p-1">
          {views.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              data-active={view === key}
              className="music-pill music-pill-ghost"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      }
    >
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : view === 'list' ? (
        <CronogramaList events={events} isDirector={isDirector} onOpenEvent={onOpenEvent} />
      ) : (
        <CronogramaCalendar events={events} onOpenEvent={onOpenEvent} />
      )}
    </Panel>
  );
}

function CronogramaList({
  events,
  isDirector,
  onOpenEvent,
}: {
  events: MusicEvent[];
  isDirector: boolean;
  onOpenEvent: (e: MusicEvent) => void;
}) {
  const upcoming = events.filter(e => e.eventDate >= today()).slice(0, 30);
  if (upcoming.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No hay cultos próximos. {isDirector && 'Generá el trimestre desde la pestaña Cultos.'}
      </p>
    );
  }
  return (
    <div className="music-stagger space-y-2">
      {upcoming.map(ev => (
        <EventListRow key={ev.id} event={ev} onOpenEvent={onOpenEvent} />
      ))}
    </div>
  );
}

function EventListRow({
  event,
  onOpenEvent,
}: {
  event: MusicEvent;
  onOpenEvent: (e: MusicEvent) => void;
}) {
  const { data: assignments = [] } = useQuery({
    queryKey: ['music-assignments', event.id],
    queryFn: () => MusicService.getAssignments(event.id),
  });
  const { data: songs = [] } = useQuery({
    queryKey: ['music-event-songs', event.id],
    queryFn: () => MusicService.getEventSongs(event.id),
  });

  const confirmed = assignments.filter(a => a.state === 'confirmado').length;
  const declined = assignments.filter(a => a.state === 'no_puedo').length;
  const dCount = daysUntil(event.eventDate);

  return (
    <button
      type="button"
      onClick={() => onOpenEvent(event)}
      style={toneStyle(EVENT_TYPE_TONE[event.eventType])}
      className="music-row relative block w-full overflow-hidden p-3 pl-5 text-left"
    >
      <span className="music-spine" />
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="w-11 shrink-0 text-center">
            <span className="music-num block text-lg font-semibold leading-none text-[hsl(var(--music-tone))]">
              {dCount >= 0 ? dCount : '—'}
            </span>
            <span className="music-eyebrow music-eyebrow-xs mt-1 block">
              {dCount === 0 ? 'hoy' : 'días'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold capitalize">{formatEventDate(event.eventDate)}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="music-tag music-tag-tone">
                {EVENT_TYPE_LABEL[event.eventType]}
              </span>
              {event.published && <span className="music-tag music-tag-ok">Publicado</span>}
              {event.title && (
                <span className="truncate text-xs text-muted-foreground">{event.title}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            <span className="music-num">{assignments.length}</span>
            {confirmed > 0 && (
              <span className="music-num text-emerald-700 dark:text-emerald-300">
                ·{confirmed}✓
              </span>
            )}
            {declined > 0 && <span className="music-num text-destructive">·{declined}✗</span>}
          </span>
          <span className="flex items-center gap-1">
            <Music2 className="h-3.5 w-3.5" />
            <span className="music-num">{songs.length}</span>
          </span>
        </div>
      </div>
    </button>
  );
}

function CronogramaCalendar({
  events,
  onOpenEvent,
}: {
  events: MusicEvent[];
  onOpenEvent: (e: MusicEvent) => void;
}) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const eventsByDate = useMemo(() => {
    const map = new Map<string, MusicEvent[]>();
    for (const ev of events) {
      const arr = map.get(ev.eventDate) ?? [];
      arr.push(ev);
      map.set(ev.eventDate, arr);
    }
    return map;
  }, [events]);

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric',
  });

  const firstOfMonth = new Date(cursor.year, cursor.month, 1);
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  // Start week on Monday: getDay() returns 0=Sun, want 1=Mon as col 0
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const todayISO = today();

  function prevMonth() {
    setCursor(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
    );
  }
  function nextMonth() {
    setCursor(({ year, month }) =>
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }
    );
  }
  function goToday() {
    const d = new Date();
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="music-heading text-lg capitalize leading-none">{monthLabel}</p>
        <div className="flex gap-1">
          <Button size="icon" variant="outline" className="h-7 w-7" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={goToday}>
            Hoy
          </Button>
          <Button size="icon" variant="outline" className="h-7 w-7" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
          <div key={d} className="music-eyebrow music-eyebrow-xs py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: totalCells }).map((_, i) => {
          const dayNum = i - startOffset + 1;
          const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
          if (!inMonth)
            return (
              <div key={i} className="min-h-[3.5rem] rounded-lg bg-white/[0.015] sm:aspect-square" />
            );
          const iso = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          const dayEvents = eventsByDate.get(iso) ?? [];
          const isToday = iso === todayISO;
          return (
            <div
              key={i}
              className={cn(
                'flex min-h-[3.5rem] flex-col gap-0.5 overflow-hidden rounded-lg border p-1 transition-colors sm:aspect-square',
                isToday
                  ? 'border-primary/60 bg-primary/[0.07]'
                  : 'border-border/60 bg-black/20 hover:border-border'
              )}
            >
              <span
                className={cn(
                  'music-num text-[10px] font-semibold',
                  isToday ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {dayNum}
              </span>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {dayEvents.slice(0, 2).map(ev => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => onOpenEvent(ev)}
                    style={toneStyle(EVENT_TYPE_TONE[ev.eventType])}
                    className="music-press truncate rounded px-1 py-0.5 text-left text-[10px] font-medium leading-tight text-[hsl(var(--music-tone))]"
                    title={`${EVENT_TYPE_LABEL[ev.eventType]}${ev.title ? ` — ${ev.title}` : ''}`}
                  >
                    <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[hsl(var(--music-tone))] align-middle" />
                    {ev.title || EVENT_TYPE_LABEL[ev.eventType]}
                  </button>
                ))}
                {dayEvents.length > 2 && (
                  <span className="music-num px-1 text-[9px] text-muted-foreground">
                    +{dayEvents.length - 2}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 pt-1">
        {(Object.keys(EVENT_TYPE_COLOR) as MusicEventType[]).map(t => (
          <span key={t} className="music-eyebrow flex items-center gap-1.5">
            <span className={cn('h-1.5 w-1.5 rounded-full', EVENT_TYPE_COLOR[t])} />
            {EVENT_TYPE_LABEL[t]}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Nuevo culto — diálogo controlado (reusado por el FAB y el tab Cultos)
// ─────────────────────────────────────────────
function CreateEventDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<{ eventDate: string; eventType: MusicEventType; title: string }>(
    { eventDate: '', eventType: 'domingo', title: '' }
  );

  const createMutation = useMutation({
    mutationFn: (data: CreateEventRequest) => MusicService.createEvent(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['music-events'] });
      onOpenChange(false);
      setForm({ eventDate: '', eventType: 'domingo', title: '' });
      toast.success('Culto creado');
    },
    onError: () => toast.error('No se pudo crear el culto'),
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.eventDate) {
      toast.error('La fecha es requerida');
      return;
    }
    createMutation.mutate({
      eventDate: form.eventDate,
      eventType: form.eventType,
      title: form.title || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="music-shell">
        <DialogHeader>
          <DialogTitle className="music-heading text-2xl">Nuevo culto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="ev-date">Fecha</Label>
            <Input
              id="ev-date"
              type="date"
              value={form.eventDate}
              onChange={e => setForm(p => ({ ...p, eventDate: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select
              value={form.eventType}
              onValueChange={v => setForm(p => ({ ...p, eventType: v as MusicEventType }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="music-shell">
                {(Object.keys(MusicEventTypes) as MusicEventType[]).map(t => (
                  <SelectItem key={t} value={t}>
                    {EVENT_TYPE_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ev-title">Título (opcional)</Label>
            <Input
              id="ev-title"
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder='Ej: "Domingo de Familias"'
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creando…' : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// CULTOS — CRUD
// ─────────────────────────────────────────────
function CultosTab({
  isDirector,
  onOpenEvent,
}: {
  isDirector: boolean;
  onOpenEvent: (e: MusicEvent) => void;
}) {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchForm, setBatchForm] = useState<{ year: string; quarter: string }>({
    year: String(new Date().getFullYear()),
    quarter: String(Math.floor(new Date().getMonth() / 3) + 1),
  });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['music-events'],
    queryFn: () => MusicService.getEvents(),
  });

  const batchMutation = useMutation({
    mutationFn: (data: BatchQuarterRequest) => MusicService.batchCreateQuarter(data),
    onSuccess: result => {
      qc.invalidateQueries({ queryKey: ['music-events'] });
      setBatchOpen(false);
      const created = result.created ?? 0;
      const skipped = result.skipped ?? 0;
      toast.success(`Generados: ${created}, ya existentes: ${skipped}`);
    },
    onError: () => toast.error('No se pudo generar el trimestre'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => MusicService.deleteEvent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['music-events'] });
      toast.success('Culto eliminado');
    },
    onError: () => toast.error('No se pudo eliminar el culto'),
  });

  function handleBatch(e: React.FormEvent) {
    e.preventDefault();
    batchMutation.mutate({
      year: Number(batchForm.year),
      quarter: Number(batchForm.quarter) as 1 | 2 | 3 | 4,
    });
  }

  const sorted = [...events].sort((a, b) => b.eventDate.localeCompare(a.eventDate));

  return (
    <Panel
      eyebrow="Calendario litúrgico"
      title="Cultos"
      action={
        isDirector && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setBatchOpen(true)} className="gap-1">
              <CalendarIcon className="h-4 w-4" />
              Trimestre
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1">
              <Plus className="h-4 w-4" />
              Nuevo
            </Button>
          </div>
        )
      }
    >
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-11 w-full rounded-xl" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No hay cultos registrados.</p>
      ) : (
        <div className="music-stagger space-y-1.5">
          {sorted.map(ev => (
            <div
              key={ev.id}
              style={toneStyle(EVENT_TYPE_TONE[ev.eventType])}
              className="music-row relative flex items-center justify-between overflow-hidden px-3 py-2.5 pl-5"
            >
              <span className="music-spine" />
              <button
                type="button"
                onClick={() => onOpenEvent(ev)}
                className="music-press min-w-0 flex-1 text-left"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="music-num text-sm font-semibold">{ev.eventDate}</span>
                  <span className="music-tag music-tag-tone">
                    {EVENT_TYPE_LABEL[ev.eventType]}
                  </span>
                  {ev.title && (
                    <span className="truncate text-sm text-muted-foreground">{ev.title}</span>
                  )}
                </div>
              </button>
              <div className="ml-2 flex shrink-0 items-center gap-2">
                {ev.published && <span className="music-tag music-tag-ok">Publicado</span>}
                {isDirector && (
                  <ConfirmDialog
                    trigger={
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-destructive"
                        disabled={deleteMutation.isPending}
                      >
                        Eliminar
                      </Button>
                    }
                    title="¿Eliminar culto?"
                    description={`Se elimina el culto del ${ev.eventDate}${ev.title ? ` — "${ev.title}"` : ''} junto con su equipo asignado y su repertorio. No se puede deshacer.`}
                    confirmLabel="Eliminar culto"
                    onConfirm={() => deleteMutation.mutate(ev.id)}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateEventDialog open={createOpen} onOpenChange={setCreateOpen} />

      <Dialog open={batchOpen} onOpenChange={setBatchOpen}>
        <DialogContent className="music-shell">
          <DialogHeader>
            <DialogTitle className="music-heading text-2xl">
              Generar trimestre
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBatch} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Crea automáticamente los cultos de los viernes y domingos del trimestre elegido.
            </p>
            <div className="space-y-1">
              <Label htmlFor="batch-year">Año</Label>
              <Input
                id="batch-year"
                type="number"
                min="2020"
                max="2100"
                value={batchForm.year}
                onChange={e => setBatchForm(p => ({ ...p, year: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Trimestre</Label>
              <Select
                value={batchForm.quarter}
                onValueChange={v => setBatchForm(p => ({ ...p, quarter: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="music-shell">
                  <SelectItem value="1">Q1 — Ene / Mar</SelectItem>
                  <SelectItem value="2">Q2 — Abr / Jun</SelectItem>
                  <SelectItem value="3">Q3 — Jul / Sep</SelectItem>
                  <SelectItem value="4">Q4 — Oct / Dic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setBatchOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={batchMutation.isPending}>
                {batchMutation.isPending ? 'Generando…' : 'Generar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}

// ─────────────────────────────────────────────
// CANCIONES — stats globales
// ─────────────────────────────────────────────
function CancionesTab() {
  const { data: stats = [], isLoading } = useQuery({
    queryKey: ['music-song-stats'],
    queryFn: () => MusicService.getSongStats(500),
  });

  const totalPlays = stats.reduce((acc, s) => acc + s.timesPlayed, 0);
  const neverPlayed = stats.filter(s => s.timesPlayed === 0).length;

  return (
    <div className="space-y-4">
      <div className="music-stagger grid grid-cols-3 gap-3">
        <StatTile
          label="En catálogo"
          value={stats.length}
          icon={<Music2 className="h-3.5 w-3.5" />}
          tone="primary"
        />
        <StatTile
          label="Veces tocadas"
          value={totalPlays}
          icon={<TrendingUp className="h-3.5 w-3.5" />}
        />
        <StatTile
          label="Sin uso"
          value={neverPlayed}
          icon={<CalendarIcon className="h-3.5 w-3.5" />}
          tone={neverPlayed > 0 ? 'warning' : 'default'}
        />
      </div>

      <Panel eyebrow="Lo que más tocamos" title="Ranking del repertorio">
        <RepertoireList
          stats={stats}
          isLoading={isLoading}
          emptyHint="No hay canciones en el repertorio. Agregalas desde el detalle de cada culto."
        />
      </Panel>
    </div>
  );
}

// ─────────────────────────────────────────────
// SERVIDOR view (no director)
// ─────────────────────────────────────────────
function ServidorView({ embedExtras = true }: { embedExtras?: boolean }) {
  const qc = useQueryClient();
  const [unavailOpen, setUnavailOpen] = useState(false);
  const [unavailForm, setUnavailForm] = useState<{
    startDate: string;
    endDate: string;
    reason: string;
  }>({
    startDate: '',
    endDate: '',
    reason: '',
  });

  const { data: myAssignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ['music-my-assignments'],
    queryFn: () => MusicService.getMyAssignments(),
  });

  const { data: myUnavailability = [], isLoading: loadingUnavail } = useQuery({
    queryKey: ['music-my-unavailability'],
    queryFn: () => MusicService.getMyUnavailability(),
  });

  const { data: instruments = [] } = useQuery({
    queryKey: ['music-instruments'],
    queryFn: () => MusicService.getInstruments(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAssignmentRequest }) =>
      MusicService.updateAssignment(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['music-my-assignments'] });
      toast.success('Estado actualizado');
    },
    onError: () => toast.error('No se pudo actualizar'),
  });

  const createUnavailMutation = useMutation({
    mutationFn: ({ memberId, data }: { memberId: string; data: CreateUnavailabilityRequest }) =>
      MusicService.createUnavailability(memberId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['music-my-unavailability'] });
      setUnavailOpen(false);
      setUnavailForm({ startDate: '', endDate: '', reason: '' });
      toast.success('Indisponibilidad registrada');
    },
    onError: () => toast.error('No se pudo registrar'),
  });

  const deleteUnavailMutation = useMutation({
    mutationFn: (id: string) => MusicService.deleteUnavailability(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['music-my-unavailability'] });
      toast.success('Indisponibilidad eliminada');
    },
    onError: () => toast.error('No se pudo eliminar'),
  });

  const todayStr = today();
  const upcomingAssignments = [...myAssignments]
    .filter(a => !a.eventDate || a.eventDate >= todayStr)
    .sort((a, b) => (a.eventDate ?? '').localeCompare(b.eventDate ?? ''));

  function handleUnavailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!unavailForm.startDate) {
      toast.error('La fecha de inicio es requerida');
      return;
    }
    createUnavailMutation.mutate({
      memberId: 'me',
      data: {
        startDate: unavailForm.startDate,
        endDate: unavailForm.endDate || null,
        reason: unavailForm.reason || undefined,
      },
    });
  }

  return (
    <div className="space-y-4">
      <Panel eyebrow="Tu agenda" title="Mis cultos">
        {loadingAssignments ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : upcomingAssignments.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No tenés cultos próximos asignados.
          </p>
        ) : (
          <div className="music-stagger space-y-2">
            {upcomingAssignments.map(a => {
              const d = a.eventDate ? daysUntil(a.eventDate) : null;
              const tone = EVENT_TYPE_TONE[a.eventType ?? 'domingo'] ?? EVENT_TYPE_TONE.domingo;
              return (
                <div
                  key={a.id}
                  style={toneStyle(tone)}
                  className="music-row relative overflow-hidden p-3 pl-5"
                >
                  <span className="music-spine" />
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="w-11 shrink-0 text-center">
                        <span className="music-num block text-lg font-semibold leading-none text-[hsl(var(--music-tone))]">
                          {d != null && d >= 0 ? d : '—'}
                        </span>
                        <span className="music-eyebrow music-eyebrow-xs mt-1 block">
                          {d === 0 ? 'hoy' : 'días'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              'h-1.5 w-1.5 shrink-0 rounded-full',
                              FUNCION_DOT[a.funcion] ?? 'bg-muted-foreground'
                            )}
                          />
                          <p className="text-sm font-semibold">
                            {FUNCION_LABEL[a.funcion] ?? a.funcion}
                          </p>
                        </div>
                        <p className="truncate text-xs capitalize text-muted-foreground">
                          {a.eventDate ? formatEventDate(a.eventDate) : a.eventId}
                          {a.eventType ? ` · ${EVENT_TYPE_LABEL[a.eventType]}` : ''}
                        </p>
                        {a.instrument && (
                          <div className="mt-1.5">
                            <InstrumentChip
                              name={a.instrument}
                              category={resolveCategory(a.instrument, instruments)}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <span className={cn('shrink-0', STATE_TAG[a.state])}>{STATE_LABEL[a.state]}</span>
                  </div>
                  {a.state !== AssignmentStates.no_puedo && (
                    <div className="mt-3 flex gap-2">
                      {a.state === AssignmentStates.asignado && (
                        <Button
                          size="sm"
                          className="h-8 flex-1"
                          onClick={() =>
                            updateMutation.mutate({ id: a.id, data: { state: 'confirmado' } })
                          }
                          disabled={updateMutation.isPending}
                        >
                          Confirmar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 flex-1 border-white/15 bg-transparent hover:bg-white/5"
                        onClick={() =>
                          updateMutation.mutate({ id: a.id, data: { state: 'no_puedo' } })
                        }
                        disabled={updateMutation.isPending}
                      >
                        No puedo
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {embedExtras && (
        <>
          <ServidorRepertoire />
          <ChannelAudios />
        </>
      )}

      <Panel
        eyebrow="Cuándo no estás"
        title="Mis indisponibilidades"
        action={
          <Button size="sm" onClick={() => setUnavailOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        }
      >
        {loadingUnavail ? (
          <div className="space-y-2">
            {[1, 2].map(i => (
              <Skeleton key={i} className="h-11 w-full rounded-xl" />
            ))}
          </div>
        ) : myUnavailability.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No tenés indisponibilidades registradas.
          </p>
        ) : (
          <div className="music-stagger space-y-1.5">
            {myUnavailability.map(u => (
              <div key={u.id} className="music-row flex items-center justify-between px-3 py-2.5">
                <div className="min-w-0">
                  <p className="music-num text-sm">
                    {u.startDate}
                    {u.endDate ? ` → ${u.endDate}` : ' (indefinida)'}
                  </p>
                  {u.reason && <p className="text-xs text-muted-foreground">{u.reason}</p>}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-destructive"
                  onClick={() => deleteUnavailMutation.mutate(u.id)}
                  disabled={deleteUnavailMutation.isPending}
                >
                  Eliminar
                </Button>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Dialog open={unavailOpen} onOpenChange={setUnavailOpen}>
        <DialogContent className="music-shell">
          <DialogHeader>
            <DialogTitle className="music-heading text-2xl">
              Registrar indisponibilidad
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUnavailSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="u-start">Fecha inicio</Label>
              <Input
                id="u-start"
                type="date"
                value={unavailForm.startDate}
                onChange={e => setUnavailForm(p => ({ ...p, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="u-end">Fecha fin (opcional)</Label>
              <Input
                id="u-end"
                type="date"
                value={unavailForm.endDate}
                onChange={e => setUnavailForm(p => ({ ...p, endDate: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Dejá vacío si la ausencia es indefinida (licencia, salud, etc.).
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="u-reason">Motivo (opcional)</Label>
              <Input
                id="u-reason"
                value={unavailForm.reason}
                onChange={e => setUnavailForm(p => ({ ...p, reason: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setUnavailOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createUnavailMutation.isPending}>
                {createUnavailMutation.isPending ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <MusicFab icon={CalendarOff} label="Avisar ausencia" onClick={() => setUnavailOpen(true)} />
    </div>
  );
}

// ─────────────────────────────────────────────
// SERVIDOR mobile — segmented control con indicador que se desliza
// ─────────────────────────────────────────────
const SERVIDOR_TABS = [
  { key: 'inicio' as const, label: 'Inicio', Icon: Home },
  { key: 'cultos' as const, label: 'Mis cultos', Icon: CalendarDays },
  { key: 'repertorio' as const, label: 'Repertorio', Icon: ListMusic },
];

function ServidorMobile() {
  const [screen, setScreen] = useState<'inicio' | 'cultos' | 'repertorio'>('inicio');
  const activeIndex = SERVIDOR_TABS.findIndex(t => t.key === screen);

  return (
    <div className="space-y-4">
      <div className="music-navbar sticky top-14 z-30 -mx-4 px-4 py-2">
        <div
          className="music-seg"
          style={{ '--music-seg-index': String(activeIndex) } as React.CSSProperties}
        >
          <span className="music-seg-thumb" aria-hidden />
          {SERVIDOR_TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setScreen(key)}
              data-active={screen === key}
              className="music-seg-item"
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {screen === 'inicio' && <ServidorMusicHero />}
      {screen === 'cultos' && <ServidorView embedExtras={false} />}
      {screen === 'repertorio' && (
        <>
          <ServidorRepertoire />
          <ChannelAudios />
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// DIRECTOR mobile — píldoras scrolleables + pantallas dedicadas
// ─────────────────────────────────────────────
function DirectorMobile({ onOpenEvent }: { onOpenEvent: (e: MusicEvent) => void }) {
  const [screen, setScreen] = useState<
    'inicio' | 'cronograma' | 'cultos' | 'integrantes' | 'instrumentos' | 'canciones'
  >('inicio');
  const [createOpen, setCreateOpen] = useState(false);

  const tabs = [
    { key: 'inicio' as const, label: 'Inicio', Icon: Home },
    { key: 'cronograma' as const, label: 'Cronograma', Icon: CalendarDays },
    { key: 'cultos' as const, label: 'Cultos', Icon: CalendarIcon },
    { key: 'integrantes' as const, label: 'Integrantes', Icon: Users },
    { key: 'instrumentos' as const, label: 'Instrumentos', Icon: Guitar },
    { key: 'canciones' as const, label: 'Canciones', Icon: ListMusic },
  ];

  const showCreateFab = screen === 'inicio' || screen === 'cronograma' || screen === 'cultos';

  return (
    <div className="space-y-4">
      <div className="music-navbar sticky top-14 z-30 -mx-4 px-4 py-2">
        <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setScreen(key)}
              data-active={screen === key}
              className="music-pill"
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {screen === 'inicio' && <DirectorMusicHero onOpenEvent={onOpenEvent} />}
      {screen === 'cronograma' && <CronogramaTab isDirector onOpenEvent={onOpenEvent} />}
      {screen === 'cultos' && <CultosTab isDirector onOpenEvent={onOpenEvent} />}
      {screen === 'integrantes' && <MusicMembers isDirector />}
      {screen === 'instrumentos' && <MusicInstruments isDirector />}
      {screen === 'canciones' && <CancionesTab />}

      {showCreateFab && (
        <MusicFab icon={Plus} label="Nuevo culto" onClick={() => setCreateOpen(true)} />
      )}
      <CreateEventDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

// ─────────────────────────────────────────────
// MusicPage root
// ─────────────────────────────────────────────
function NoMusicAccess() {
  return (
    <MusicEmpty
      icon={<Music2 className="h-6 w-6" />}
      title="No sos parte del equipo de música"
      hint="Pedile al director que te agregue como integrante para ver tus cultos y asignaciones."
    />
  );
}

const DIRECTOR_TABS = [
  { value: 'cronograma', label: 'Cronograma' },
  { value: 'cultos', label: 'Cultos' },
  { value: 'integrantes', label: 'Integrantes' },
  { value: 'instrumentos', label: 'Instrumentos' },
  { value: 'canciones', label: 'Canciones' },
];

export default function MusicPage() {
  const isMobileApp = useMobileMode();
  const navigate = useNavigate();
  const { isDirector, hasAccess, loadingAccess } = useMusicAccess();
  const [createEventOpen, setCreateEventOpen] = useState(false);

  const openEvent = (e: MusicEvent) => navigate(`/dashboard/music/eventos/${e.id}`);

  const servidorBody = loadingAccess ? (
    <Skeleton className="h-48 w-full rounded-3xl" />
  ) : !hasAccess ? (
    <NoMusicAccess />
  ) : (
    <>
      <ServidorMusicHero />
      <ServidorView />
    </>
  );

  const body = !isDirector ? (
    servidorBody
  ) : (
    <>
      <DirectorMusicHero onOpenEvent={openEvent} />
      <Tabs defaultValue="cronograma">
        <TabsList className="music-tabs w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {DIRECTOR_TABS.map(t => (
            <TabsTrigger key={t.value} value={t.value} className="music-tab">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="cronograma" className="music-rise mt-5">
          <CronogramaTab isDirector={isDirector} onOpenEvent={openEvent} />
        </TabsContent>
        <TabsContent value="cultos" className="music-rise mt-5">
          <CultosTab isDirector={isDirector} onOpenEvent={openEvent} />
        </TabsContent>
        <TabsContent value="integrantes" className="music-rise mt-5">
          <MusicMembers isDirector={isDirector} />
        </TabsContent>
        <TabsContent value="instrumentos" className="music-rise mt-5">
          <MusicInstruments isDirector={isDirector} />
        </TabsContent>
        <TabsContent value="canciones" className="music-rise mt-5">
          <CancionesTab />
        </TabsContent>
      </Tabs>

      <ChannelAudios />

      <MusicFab icon={Plus} label="Nuevo culto" onClick={() => setCreateEventOpen(true)} />
      <CreateEventDialog open={createEventOpen} onOpenChange={setCreateEventOpen} />
    </>
  );

  // Native mobile: wrap in MobileScreen chrome (sticky header), same responsive body.
  if (isMobileApp) {
    return (
      <>
        <MobileScreen title="Música" subtitle={isDirector ? 'Equipo de alabanza' : 'Mis cultos'}>
          <div className="music-shell music-aurora min-h-screen space-y-5 px-4 py-4">
            {isDirector ? (
              <DirectorMobile onOpenEvent={openEvent} />
            ) : loadingAccess ? (
              <Skeleton className="h-48 w-full rounded-3xl" />
            ) : !hasAccess ? (
              <NoMusicAccess />
            ) : (
              <ServidorMobile />
            )}
          </div>
        </MobileScreen>
      </>
    );
  }

  return (
    <div className="music-shell music-aurora space-y-6 rounded-2xl p-3 sm:p-5 md:p-8">
      <header className="music-rise">
        <p className="music-eyebrow">Ministerio de alabanza</p>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h1 className="music-heading text-[2.5rem] leading-none sm:text-[3.25rem]">Música</h1>
          <p className="text-sm text-muted-foreground">
            {isDirector ? 'Gestión del equipo de alabanza' : 'Equipo de alabanza'}
          </p>
        </div>
        <hr className="music-rule mt-4" />
      </header>
      {body}
    </div>
  );
}
