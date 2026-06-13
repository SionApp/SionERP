import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Plus,
  Calendar as CalendarIcon,
  CalendarDays,
  List,
  ChevronLeft,
  ChevronRight,
  Music2,
  Users,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { useMobileMode } from '@/hooks/useMobileMode';
import { usePermissions } from '@/hooks/usePermissions';
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
import EventDetailDialog from './music/EventDetail';

function useMusicAccess() {
  const { permissions } = usePermissions();
  const isDirector =
    !!permissions &&
    (permissions.has_admin_access || permissions.role === 'pastor' || permissions.role === 'staff');
  return { isDirector };
}

const STATE_VARIANT: Record<AssignmentState, 'default' | 'secondary' | 'destructive'> = {
  asignado: 'secondary',
  confirmado: 'default',
  no_puedo: 'destructive',
};

const STATE_LABEL: Record<AssignmentState, string> = {
  asignado: 'Asignado',
  confirmado: 'Confirmado',
  no_puedo: 'No puedo',
};

const EVENT_TYPE_LABEL: Record<MusicEventType, string> = {
  viernes: 'Viernes',
  domingo: 'Domingo',
  especial: 'Especial',
};

const EVENT_TYPE_COLOR: Record<MusicEventType, string> = {
  viernes: 'bg-blue-500',
  domingo: 'bg-emerald-500',
  especial: 'bg-amber-500',
};

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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">Cronograma</CardTitle>
        <div className="flex gap-1 rounded-md border border-border p-0.5">
          <Button
            size="sm"
            variant={view === 'list' ? 'default' : 'ghost'}
            className="h-7 gap-1"
            onClick={() => setView('list')}
          >
            <List className="h-3.5 w-3.5" />
            Lista
          </Button>
          <Button
            size="sm"
            variant={view === 'calendar' ? 'default' : 'ghost'}
            className="h-7 gap-1"
            onClick={() => setView('calendar')}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Calendario
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : view === 'list' ? (
          <CronogramaList events={events} isDirector={isDirector} onOpenEvent={onOpenEvent} />
        ) : (
          <CronogramaCalendar events={events} onOpenEvent={onOpenEvent} />
        )}
      </CardContent>
    </Card>
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
      <p className="text-sm text-muted-foreground text-center py-8">
        No hay cultos próximos. {isDirector && 'Generá el trimestre desde la pestaña Cultos.'}
      </p>
    );
  }
  return (
    <div className="space-y-2">
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

  return (
    <button
      type="button"
      onClick={() => onOpenEvent(event)}
      className="w-full text-left rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn('h-2 w-2 rounded-full shrink-0', EVENT_TYPE_COLOR[event.eventType])}
            />
            <span className="text-sm font-semibold capitalize">
              {formatEventDate(event.eventDate)}
            </span>
            <Badge variant="outline" className="text-xs">
              {EVENT_TYPE_LABEL[event.eventType]}
            </Badge>
            {event.published && (
              <Badge variant="secondary" className="text-xs">
                Publicado
              </Badge>
            )}
          </div>
          {event.title && (
            <p className="text-sm text-muted-foreground mt-1 truncate">{event.title}</p>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {assignments.length}
            {confirmed > 0 && <span className="text-green-600">·{confirmed}✓</span>}
            {declined > 0 && <span className="text-destructive">·{declined}✗</span>}
          </span>
          <span className="flex items-center gap-1">
            <Music2 className="h-3.5 w-3.5" />
            {songs.length}
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
        <p className="text-sm font-semibold capitalize">{monthLabel}</p>
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
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: totalCells }).map((_, i) => {
          const dayNum = i - startOffset + 1;
          const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
          if (!inMonth) return <div key={i} className="aspect-square rounded-md bg-muted/20" />;
          const iso = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          const dayEvents = eventsByDate.get(iso) ?? [];
          const isToday = iso === todayISO;
          return (
            <div
              key={i}
              className={cn(
                'aspect-square rounded-md border border-border p-1 flex flex-col gap-0.5 overflow-hidden',
                isToday && 'ring-2 ring-primary',
                dayEvents.length === 0 && 'bg-card',
                dayEvents.length > 0 && 'bg-muted/30'
              )}
            >
              <span
                className={cn(
                  'text-[10px] font-semibold',
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
                    className={cn(
                      'text-[10px] leading-tight rounded px-1 py-0.5 text-white text-left truncate hover:opacity-80',
                      EVENT_TYPE_COLOR[ev.eventType]
                    )}
                    title={`${EVENT_TYPE_LABEL[ev.eventType]}${ev.title ? ` — ${ev.title}` : ''}`}
                  >
                    {ev.title || EVENT_TYPE_LABEL[ev.eventType]}
                  </button>
                ))}
                {dayEvents.length > 2 && (
                  <span className="text-[9px] text-muted-foreground px-1">
                    +{dayEvents.length - 2}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 text-xs text-muted-foreground pt-1">
        {(Object.keys(EVENT_TYPE_COLOR) as MusicEventType[]).map(t => (
          <span key={t} className="flex items-center gap-1">
            <span className={cn('h-2 w-2 rounded-full', EVENT_TYPE_COLOR[t])} />
            {EVENT_TYPE_LABEL[t]}
          </span>
        ))}
      </div>
    </div>
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
  const [form, setForm] = useState<{ eventDate: string; eventType: MusicEventType; title: string }>(
    {
      eventDate: '',
      eventType: 'domingo',
      title: '',
    }
  );
  const [batchForm, setBatchForm] = useState<{ year: string; quarter: string }>({
    year: String(new Date().getFullYear()),
    quarter: String(Math.floor(new Date().getMonth() / 3) + 1),
  });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['music-events'],
    queryFn: () => MusicService.getEvents(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateEventRequest) => MusicService.createEvent(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['music-events'] });
      setCreateOpen(false);
      setForm({ eventDate: '', eventType: 'domingo', title: '' });
      toast.success('Culto creado');
    },
    onError: () => toast.error('No se pudo crear el culto'),
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

  function handleBatch(e: React.FormEvent) {
    e.preventDefault();
    batchMutation.mutate({
      year: Number(batchForm.year),
      quarter: Number(batchForm.quarter) as 1 | 2 | 3 | 4,
    });
  }

  const sorted = [...events].sort((a, b) => b.eventDate.localeCompare(a.eventDate));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">Cultos</CardTitle>
        {isDirector && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBatchOpen(true)}
              className="gap-1"
            >
              <CalendarIcon className="h-4 w-4" />
              Trimestre
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1">
              <Plus className="h-4 w-4" />
              Nuevo
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No hay cultos registrados.
          </p>
        ) : (
          <div className="divide-y divide-border rounded-md border border-border">
            {sorted.map(ev => (
              <div key={ev.id} className="flex items-center justify-between px-3 py-2">
                <button
                  type="button"
                  onClick={() => onOpenEvent(ev)}
                  className="text-left flex-1 min-w-0 hover:opacity-70"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('h-2 w-2 rounded-full', EVENT_TYPE_COLOR[ev.eventType])} />
                    <span className="font-medium text-sm">{ev.eventDate}</span>
                    <span className="text-muted-foreground text-xs">
                      {EVENT_TYPE_LABEL[ev.eventType]}
                    </span>
                    {ev.title && <span className="text-sm truncate">— {ev.title}</span>}
                  </div>
                </button>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {ev.published && (
                    <Badge variant="secondary" className="text-xs">
                      Publicado
                    </Badge>
                  )}
                  {isDirector && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-destructive"
                      onClick={() => deleteMutation.mutate(ev.id)}
                      disabled={deleteMutation.isPending}
                    >
                      Eliminar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo culto</DialogTitle>
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
                <SelectContent>
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
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creando…' : 'Crear'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={batchOpen} onOpenChange={setBatchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generar trimestre</DialogTitle>
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
                <SelectContent>
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
    </Card>
  );
}

// ─────────────────────────────────────────────
// CANCIONES — stats globales
// ─────────────────────────────────────────────
function CancionesTab() {
  const { data: stats = [], isLoading } = useQuery({
    queryKey: ['music-song-stats'],
    queryFn: () => MusicService.getSongStats(100),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Canciones</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : stats.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No hay canciones en el repertorio. Agregalas desde el detalle de cada culto.
          </p>
        ) : (
          <div className="divide-y divide-border rounded-md border border-border">
            {stats.map(s => (
              <div key={s.id} className="flex items-center justify-between px-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{s.name}</p>
                  {s.lastPlayedDate && (
                    <p className="text-xs text-muted-foreground">Último: {s.lastPlayedDate}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {s.historicalKey && (
                    <Badge variant="outline" className="text-xs">
                      {s.historicalKey}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    {s.timesPlayed}×
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────
// SERVIDOR view (no director)
// ─────────────────────────────────────────────
function ServidorView() {
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
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mis cultos</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingAssignments ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : myAssignments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No tenés cultos asignados.
            </p>
          ) : (
            <div className="divide-y divide-border rounded-md border border-border">
              {myAssignments.map(a => (
                <div key={a.id} className="flex items-center justify-between px-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium capitalize">{a.funcion}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.eventDate ? `${a.eventDate} · ${a.eventType ?? ''}` : a.eventId}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={STATE_VARIANT[a.state]} className="text-xs">
                      {STATE_LABEL[a.state]}
                    </Badge>
                    {a.state !== AssignmentStates.no_puedo && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() =>
                          updateMutation.mutate({ id: a.id, data: { state: 'no_puedo' } })
                        }
                        disabled={updateMutation.isPending}
                      >
                        No puedo
                      </Button>
                    )}
                    {a.state === AssignmentStates.asignado && (
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-xs"
                        onClick={() =>
                          updateMutation.mutate({ id: a.id, data: { state: 'confirmado' } })
                        }
                        disabled={updateMutation.isPending}
                      >
                        Confirmar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">Mis indisponibilidades</CardTitle>
          <Button size="sm" onClick={() => setUnavailOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        </CardHeader>
        <CardContent>
          {loadingUnavail ? (
            <div className="space-y-2">
              {[1, 2].map(i => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : myUnavailability.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No tenés indisponibilidades registradas.
            </p>
          ) : (
            <div className="divide-y divide-border rounded-md border border-border">
              {myUnavailability.map(u => (
                <div key={u.id} className="flex items-center justify-between px-3 py-3">
                  <div>
                    <p className="text-sm">
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
        </CardContent>
      </Card>

      <Dialog open={unavailOpen} onOpenChange={setUnavailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar indisponibilidad</DialogTitle>
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
    </div>
  );
}

// ─────────────────────────────────────────────
// MusicPage root
// ─────────────────────────────────────────────
export default function MusicPage() {
  const isMobileApp = useMobileMode();
  const { isDirector } = useMusicAccess();
  const [detailEvent, setDetailEvent] = useState<MusicEvent | null>(null);

  if (isMobileApp) return null;

  if (!isDirector) {
    return (
      <div className="space-y-4 animate-fade-in p-3 sm:p-4 md:p-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Música</h1>
          <p className="text-sm text-muted-foreground">Módulo de equipo de alabanza</p>
        </div>
        <ServidorView />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in p-3 sm:p-4 md:p-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Música</h1>
        <p className="text-sm text-muted-foreground">Gestión del equipo de alabanza</p>
      </div>
      <Tabs defaultValue="cronograma">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="cronograma">Cronograma</TabsTrigger>
          <TabsTrigger value="cultos">Cultos</TabsTrigger>
          <TabsTrigger value="integrantes">Integrantes</TabsTrigger>
          <TabsTrigger value="canciones">Canciones</TabsTrigger>
        </TabsList>
        <TabsContent value="cronograma" className="mt-4">
          <CronogramaTab isDirector={isDirector} onOpenEvent={setDetailEvent} />
        </TabsContent>
        <TabsContent value="cultos" className="mt-4">
          <CultosTab isDirector={isDirector} onOpenEvent={setDetailEvent} />
        </TabsContent>
        <TabsContent value="integrantes" className="mt-4">
          <MusicMembers isDirector={isDirector} />
        </TabsContent>
        <TabsContent value="canciones" className="mt-4">
          <CancionesTab />
        </TabsContent>
      </Tabs>
      <EventDetailDialog
        event={detailEvent}
        open={!!detailEvent}
        onOpenChange={o => !o && setDetailEvent(null)}
        isDirector={isDirector}
      />
    </div>
  );
}
