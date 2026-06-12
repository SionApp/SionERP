import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronLeft, Trash2, Music2, Calendar, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { MobileScreen } from '@/components/mobile/MobileScreen';
import { MobileListItem } from '@/components/mobile/MobileListItem';
import { MobileStatTile } from '@/components/mobile/MobileStatTile';
import { MobileSectionHeader } from '@/components/mobile/MobileSectionHeader';
import { MobileSegment } from '@/components/mobile/MobileSegment';
import { setMobileNavHidden } from '@/components/mobile/mobile-nav-state';
import { MusicService } from '@/services/music.service';
import { AssignmentStates } from '@/types/music.types';
import type {
  MusicAssignment,
  MusicEvent,
  AssignmentState,
  MusicEventType,
  EventSong,
  MusicUnavailability,
} from '@/types/music.types';
import { cn } from '@/lib/utils';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS_ES = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

function formatEventDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return `${DAYS_ES[d.getDay()]} ${day} ${MONTHS_ES[month - 1]}`;
}

function currentQuarter(): string {
  return String(Math.ceil((new Date().getMonth() + 1) / 3));
}

function eventInQuarter(event: MusicEvent, quarter: string): boolean {
  const month = parseInt(event.eventDate.split('-')[1], 10);
  const q = Math.ceil(month / 3);
  return String(q) === quarter;
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

const FUNCION_LABEL: Record<string, string> = {
  corista: 'Corista',
  musico: 'Músico',
  tecnico: 'Técnico',
  danzarina: 'Danzarina',
};

// ─── Shared: Assignment state badge ──────────────────────────────────────────

function StateBadge({ state }: { state: AssignmentState }) {
  return (
    <Badge variant={STATE_VARIANT[state]} className="text-xs shrink-0">
      {STATE_LABEL[state]}
    </Badge>
  );
}

// ─── Shared: Date chip (leading slot) ────────────────────────────────────────

function DateChip({ dateStr }: { dateStr: string }) {
  return (
    <div className="flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary shrink-0">
      <span className="text-[10px] font-medium leading-none">
        {formatEventDate(dateStr).split(' ')[0]}
      </span>
      <span className="text-base font-bold leading-none">
        {dateStr.split('-')[2].replace(/^0/, '')}
      </span>
    </div>
  );
}

// ─── Culto detail screen (pushed) ────────────────────────────────────────────

interface CultoDetailScreenProps {
  event: MusicEvent;
  assignmentId?: string;
  onBack: () => void;
  isDirector: boolean;
}

function CultoDetailScreen({ event, assignmentId, onBack, isDirector }: CultoDetailScreenProps) {
  const qc = useQueryClient();
  const [unavailOpen, setUnavailOpen] = useState(false);
  const [unavailForm, setUnavailForm] = useState({ startDate: '', endDate: '', reason: '' });
  const [songInput, setSongInput] = useState('');
  const [songTono, setSongTono] = useState('');
  const [songSuggestions, setSongSuggestions] = useState<
    Array<{ id: string; name: string; historicalKey: string | null }>
  >([]);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMobileNavHidden(true);
    return () => setMobileNavHidden(false);
  }, []);

  const { data: songs = [], isLoading: loadingSongs } = useQuery({
    queryKey: ['music-event-songs', event.id],
    queryFn: () => MusicService.getEventSongs(event.id),
  });

  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ['music-assignments', event.id],
    queryFn: () => MusicService.getAssignments(event.id),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, state }: { id: string; state: AssignmentState }) =>
      MusicService.updateAssignment(id, { state }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['music-my-assignments'] });
      qc.invalidateQueries({ queryKey: ['music-assignments', event.id] });
      toast.success('Estado actualizado');
    },
    onError: () => toast.error('No se pudo actualizar'),
  });

  const createUnavailMutation = useMutation({
    mutationFn: (data: { startDate: string; endDate: string | null; reason?: string }) =>
      MusicService.createUnavailability('me', data),
    onSuccess: () => {
      setUnavailOpen(false);
      setUnavailForm({ startDate: '', endDate: '', reason: '' });
      toast.success('Indisponibilidad registrada');
    },
    onError: () => toast.error('No se pudo registrar'),
  });

  const addSongMutation = useMutation({
    mutationFn: (name: string) =>
      MusicService.addSongToEvent(event.id, { name, tono: songTono || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['music-event-songs', event.id] });
      setSongInput('');
      setSongTono('');
      setSongSuggestions([]);
      toast.success('Canción agregada');
    },
    onError: () => toast.error('No se pudo agregar la canción'),
  });

  const removeSongMutation = useMutation({
    mutationFn: (songId: string) => MusicService.removeEventSong(songId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['music-event-songs', event.id] });
      toast.success('Canción eliminada');
    },
    onError: () => toast.error('No se pudo eliminar'),
  });

  function handleSongInputChange(value: string) {
    setSongInput(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    if (!value.trim()) {
      setSongSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await MusicService.getSongs(value);
        setSongSuggestions(
          results.map(s => ({ id: s.id, name: s.name, historicalKey: s.historicalKey }))
        );
      } catch {
        setSongSuggestions([]);
      }
    }, 300);
    setDebounceTimer(timer);
  }

  function handleUnavailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!unavailForm.startDate) {
      toast.error('La fecha de inicio es requerida');
      return;
    }
    createUnavailMutation.mutate({
      startDate: unavailForm.startDate,
      endDate: unavailForm.endDate || null,
      reason: unavailForm.reason || undefined,
    });
  }

  // Director: group assignments by funcion
  const byFuncion = assignments.reduce<Record<string, MusicAssignment[]>>((acc, a) => {
    (acc[a.funcion] ??= []).push(a);
    return acc;
  }, {});

  const noPuedoList = assignments.filter(a => a.state === AssignmentStates.no_puedo);

  return (
    <MobileScreen
      back
      title={formatEventDate(event.eventDate)}
      subtitle={EVENT_TYPE_LABEL[event.eventType] + (event.title ? ` — ${event.title}` : '')}
      action={
        <button
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-accent/60 active:bg-accent transition-colors"
          aria-label="Volver"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      }
    >
      {/* Repertorio section */}
      <MobileSectionHeader
        title="Repertorio"
        action={
          isDirector ? (
            <span className="text-xs text-muted-foreground">{songs.length} canciones</span>
          ) : undefined
        }
      />
      {loadingSongs ? (
        <div className="mx-4 space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-14 w-full rounded-2xl" />
          ))}
        </div>
      ) : songs.length === 0 ? (
        <p className="px-4 text-sm text-muted-foreground py-2">Sin canciones en el repertorio.</p>
      ) : (
        <div className="mx-4 rounded-2xl border border-border divide-y divide-border bg-card overflow-hidden">
          {songs.map((song: EventSong) => (
            <MobileListItem
              key={song.id}
              leading={<Music2 className="w-4 h-4 text-muted-foreground" />}
              title={song.songName}
              subtitle={song.tono ? `Tono: ${song.tono}` : undefined}
              trailing={
                isDirector ? (
                  <button
                    onClick={() => removeSongMutation.mutate(song.id)}
                    className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                    aria-label="Eliminar canción"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : undefined
              }
            />
          ))}
        </div>
      )}

      {/* Director: Song autocomplete input */}
      {isDirector && (
        <div className="mx-4 mt-3 space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Buscar canción..."
              value={songInput}
              onChange={e => handleSongInputChange(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Tono"
              value={songTono}
              onChange={e => setSongTono(e.target.value)}
              className="w-20"
            />
            <Button
              size="sm"
              onClick={() => songInput.trim() && addSongMutation.mutate(songInput.trim())}
              disabled={!songInput.trim() || addSongMutation.isPending}
            >
              Agregar
            </Button>
          </div>
          {songSuggestions.length > 0 && (
            <div className="rounded-2xl border border-border divide-y divide-border bg-card overflow-hidden">
              {songSuggestions.map(s => (
                <button
                  key={s.id}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-accent/60 active:bg-accent transition-colors"
                  onClick={() => {
                    setSongInput(s.name);
                    if (s.historicalKey) setSongTono(s.historicalKey);
                    setSongSuggestions([]);
                  }}
                >
                  <span className="text-sm font-medium">{s.name}</span>
                  {s.historicalKey && (
                    <Badge variant="outline" className="text-xs ml-2 shrink-0">
                      {s.historicalKey}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Director: Team grouped by funcion */}
      {isDirector && (
        <>
          <MobileSectionHeader title="Equipo" />
          {loadingAssignments ? (
            <div className="mx-4">
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
          ) : assignments.length === 0 ? (
            <p className="px-4 text-sm text-muted-foreground py-2">Sin asignaciones.</p>
          ) : (
            Object.entries(byFuncion).map(([funcion, list]) => (
              <div key={funcion}>
                <MobileSectionHeader title={FUNCION_LABEL[funcion] ?? funcion} className="pt-2" />
                <div className="mx-4 rounded-2xl border border-border divide-y divide-border bg-card overflow-hidden">
                  {list.map(a => (
                    <MobileListItem
                      key={a.id}
                      title={a.memberName ?? a.memberId}
                      subtitle={FUNCION_LABEL[a.funcion] ?? a.funcion}
                      trailing={<StateBadge state={a.state} />}
                    />
                  ))}
                </div>
              </div>
            ))
          )}

          {noPuedoList.length > 0 && (
            <>
              <MobileSectionHeader
                title="No pueden"
                action={
                  <div className="flex items-center gap-1 text-destructive">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">{noPuedoList.length}</span>
                  </div>
                }
              />
              <div className="mx-4 rounded-2xl border border-border divide-y divide-border bg-card overflow-hidden">
                {noPuedoList.map(a => (
                  <MobileListItem
                    key={a.id}
                    title={a.memberName ?? a.memberId}
                    subtitle={FUNCION_LABEL[a.funcion] ?? a.funcion}
                    trailing={<StateBadge state={a.state} />}
                    accent="danger"
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Servidor: action buttons */}
      {!isDirector && assignmentId && (
        <>
          <MobileSectionHeader title="Mis acciones" />
          <div className="mx-4 flex gap-3">
            <Button
              className="flex-1"
              onClick={() => updateMutation.mutate({ id: assignmentId, state: 'confirmado' })}
              disabled={updateMutation.isPending}
            >
              Confirmar
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
              onClick={() => updateMutation.mutate({ id: assignmentId, state: 'no_puedo' })}
              disabled={updateMutation.isPending}
            >
              No puedo
            </Button>
          </div>

          {/* Declare unavailability */}
          <div className="mx-4 mt-3">
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => setUnavailOpen(true)}
            >
              Declarar indisponibilidad
            </Button>
          </div>

          {unavailOpen && (
            <div
              className="fixed inset-0 z-50 flex items-end bg-black/40"
              onClick={() => setUnavailOpen(false)}
            >
              <div
                className="w-full bg-card rounded-t-3xl p-6 space-y-4"
                onClick={e => e.stopPropagation()}
              >
                <h3 className="text-base font-bold">Registrar indisponibilidad</h3>
                <form onSubmit={handleUnavailSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="us-start">Fecha inicio</Label>
                    <Input
                      id="us-start"
                      type="date"
                      value={unavailForm.startDate}
                      onChange={e => setUnavailForm(p => ({ ...p, startDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="us-end">Fecha fin (opcional)</Label>
                    <Input
                      id="us-end"
                      type="date"
                      value={unavailForm.endDate}
                      onChange={e => setUnavailForm(p => ({ ...p, endDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="us-reason">Motivo (opcional)</Label>
                    <Input
                      id="us-reason"
                      value={unavailForm.reason}
                      onChange={e => setUnavailForm(p => ({ ...p, reason: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setUnavailOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={createUnavailMutation.isPending}
                    >
                      {createUnavailMutation.isPending ? 'Guardando…' : 'Guardar'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </MobileScreen>
  );
}

// ─── Servidor View ────────────────────────────────────────────────────────────

function ServidorMobileView() {
  const qc = useQueryClient();
  const [selectedAssignment, setSelectedAssignment] = useState<{
    event: MusicEvent;
    assignmentId: string;
  } | null>(null);

  const { data: myAssignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ['music-my-assignments'],
    queryFn: () => MusicService.getMyAssignments(),
  });

  const { data: myUnavailability = [], isLoading: loadingUnavail } = useQuery({
    queryKey: ['music-my-unavailability'],
    queryFn: () => MusicService.getMyUnavailability(),
  });

  const { data: allEvents = [] } = useQuery({
    queryKey: ['music-events'],
    queryFn: () => MusicService.getEvents(),
  });

  const deleteUnavailMutation = useMutation({
    mutationFn: (id: string) => MusicService.deleteUnavailability(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['music-my-unavailability'] });
      toast.success('Indisponibilidad eliminada');
    },
    onError: () => toast.error('No se pudo eliminar'),
  });

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = myAssignments.filter(a => {
    const ev = allEvents.find(e => e.id === a.eventId);
    return ev && ev.eventDate >= today;
  });

  const pending = myAssignments.filter(a => a.state === AssignmentStates.asignado);
  const nextEvent = allEvents
    .filter(e => e.eventDate >= today)
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate))[0];

  function getEventForAssignment(a: MusicAssignment): MusicEvent | undefined {
    return allEvents.find(e => e.id === a.eventId);
  }

  if (selectedAssignment) {
    return (
      <CultoDetailScreen
        event={selectedAssignment.event}
        assignmentId={selectedAssignment.assignmentId}
        onBack={() => setSelectedAssignment(null)}
        isDirector={false}
      />
    );
  }

  return (
    <MobileScreen title="Música" subtitle="Mis cultos">
      {/* Stat chips */}
      <div className="flex gap-3 overflow-x-auto snap-x px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <MobileStatTile
          label="Próximo culto"
          value={nextEvent ? formatEventDate(nextEvent.eventDate) : '—'}
          loading={loadingAssignments}
          icon={<Calendar className="w-4 h-4" />}
          tone="primary"
        />
        <MobileStatTile
          label="Pendientes"
          value={pending.length}
          loading={loadingAssignments}
          alert={pending.length > 0}
        />
      </div>

      {/* Mis cultos */}
      <MobileSectionHeader title="Mis cultos" />
      {loadingAssignments ? (
        <div className="mx-4 space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-14 w-full rounded-2xl" />
          ))}
        </div>
      ) : upcoming.length === 0 ? (
        <p className="px-4 text-sm text-muted-foreground py-2">No tenés cultos asignados.</p>
      ) : (
        <div className="mx-4 rounded-2xl border border-border divide-y divide-border bg-card overflow-hidden">
          {upcoming.map(a => {
            const ev = getEventForAssignment(a);
            return (
              <MobileListItem
                key={a.id}
                leading={ev ? <DateChip dateStr={ev.eventDate} /> : undefined}
                title={FUNCION_LABEL[a.funcion] ?? a.funcion}
                subtitle={
                  ev
                    ? `${EVENT_TYPE_LABEL[ev.eventType]}${ev.title ? ` — ${ev.title}` : ''}`
                    : a.eventId
                }
                trailing={<StateBadge state={a.state} />}
                onClick={
                  ev ? () => setSelectedAssignment({ event: ev, assignmentId: a.id }) : undefined
                }
              />
            );
          })}
        </div>
      )}

      {/* Mis indisponibilidades */}
      <MobileSectionHeader title="Mis indisponibilidades" />
      {loadingUnavail ? (
        <div className="mx-4">
          <Skeleton className="h-14 w-full rounded-2xl" />
        </div>
      ) : myUnavailability.length === 0 ? (
        <p className="px-4 text-sm text-muted-foreground py-2">
          Sin indisponibilidades registradas.
        </p>
      ) : (
        <div className="mx-4 rounded-2xl border border-border divide-y divide-border bg-card overflow-hidden">
          {myUnavailability.map((u: MusicUnavailability) => (
            <MobileListItem
              key={u.id}
              title={u.endDate ? `${u.startDate} → ${u.endDate}` : `${u.startDate} (sin fecha fin)`}
              subtitle={u.reason ?? undefined}
              trailing={
                <button
                  onClick={() => deleteUnavailMutation.mutate(u.id)}
                  className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                  aria-label="Eliminar indisponibilidad"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              }
            />
          ))}
        </div>
      )}
    </MobileScreen>
  );
}

// ─── Director View ────────────────────────────────────────────────────────────

interface DirectorMemberRowProps {
  memberId: string;
  memberName: string;
  funcion: string;
  state: AssignmentState;
}

function DirectorMobileView() {
  const [selectedQuarter, setSelectedQuarter] = useState(currentQuarter());
  const [selectedEvent, setSelectedEvent] = useState<MusicEvent | null>(null);

  const { data: allEvents = [], isLoading: loadingEvents } = useQuery({
    queryKey: ['music-events'],
    queryFn: () => MusicService.getEvents(),
  });

  const quarterOptions = [
    { value: '1', label: 'Q1' },
    { value: '2', label: 'Q2' },
    { value: '3', label: 'Q3' },
    { value: '4', label: 'Q4' },
  ];

  const filteredEvents = allEvents.filter(e => eventInQuarter(e, selectedQuarter));

  if (selectedEvent) {
    return (
      <CultoDetailScreen event={selectedEvent} onBack={() => setSelectedEvent(null)} isDirector />
    );
  }

  return (
    <MobileScreen title="Música" subtitle="Cronograma">
      {/* Quarter segment selector */}
      <div className="px-4 pt-4 pb-2">
        <MobileSegment
          options={quarterOptions}
          value={selectedQuarter}
          onChange={setSelectedQuarter}
        />
      </div>

      <MobileSectionHeader title={`Cultos Q${selectedQuarter}`} />

      {loadingEvents ? (
        <div className="mx-4 space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-14 w-full rounded-2xl" />
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <p className="px-4 text-sm text-muted-foreground py-2">Sin cultos en Q{selectedQuarter}.</p>
      ) : (
        <div className="mx-4 rounded-2xl border border-border divide-y divide-border bg-card overflow-hidden">
          {filteredEvents.map(event => (
            <EventRowWithCount
              key={event.id}
              event={event}
              onSelect={() => setSelectedEvent(event)}
            />
          ))}
        </div>
      )}
    </MobileScreen>
  );
}

function EventRowWithCount({ event, onSelect }: { event: MusicEvent; onSelect: () => void }) {
  const { data: assignments = [] } = useQuery({
    queryKey: ['music-assignments', event.id],
    queryFn: () => MusicService.getAssignments(event.id),
  });

  const noPuedoCount = assignments.filter(a => a.state === AssignmentStates.no_puedo).length;

  return (
    <MobileListItem
      leading={<DateChip dateStr={event.eventDate} />}
      title={EVENT_TYPE_LABEL[event.eventType] + (event.title ? ` — ${event.title}` : '')}
      subtitle={`${assignments.length} asignaciones`}
      trailing={
        noPuedoCount > 0 ? (
          <Badge variant="destructive" className="text-xs">
            {noPuedoCount} no pueden
          </Badge>
        ) : assignments.length > 0 ? (
          <Badge variant="secondary" className="text-xs">
            {assignments.length}
          </Badge>
        ) : undefined
      }
      onClick={onSelect}
    />
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

interface MobileMusicPageProps {
  isDirector: boolean;
}

export function MobileMusicPage({ isDirector }: MobileMusicPageProps) {
  if (isDirector) return <DirectorMobileView />;
  return <ServidorMobileView />;
}

// Re-export unused import to silence TypeScript (cn is used inside classnames)

const _cn = cn;
