import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe2,
  Music2,
  Plus,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MusicService } from '@/services/music.service';
import { Funciones } from '@/types/music.types';
import type {
  MusicAssignment,
  MusicEvent,
  MusicMember,
  Funcion,
  AssignmentState,
} from '@/types/music.types';
import type { User } from '@/types/user.types';
import { ConfirmationProgress } from './MusicHero';
import { UserSearchPicker } from './UserSearchPicker';
import { InstrumentChip, resolveCategory } from './instrument-visual';
import { EVENT_TYPE_LABEL, EVENT_TYPE_TONE, toneStyle } from './event-visual';

const FUNCION_LABELS: Record<Funcion, string> = {
  corista: 'Coristas',
  musico: 'Músicos',
  tecnico: 'Técnicos',
  danzarina: 'Danzarinas',
};

const FUNCION_SINGULAR: Record<Funcion, string> = {
  corista: 'Corista',
  musico: 'Músico',
  tecnico: 'Técnico',
  danzarina: 'Danzarina',
};

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

function formatEventDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// ─────────────────────────────────────────────
// Equipo — asignación de servidores por función
// ─────────────────────────────────────────────
export function TeamSection({ event, isDirector }: { event: MusicEvent; isDirector: boolean }) {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [funcion, setFuncion] = useState<Funcion | ''>('');
  const [instrument, setInstrument] = useState('');
  const [suggestionsFor, setSuggestionsFor] = useState<string | null>(null);

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['music-assignments', event.id],
    queryFn: () => MusicService.getAssignments(event.id),
  });

  // Members are needed only to exclude already-assigned users from the search.
  const { data: members = [] } = useQuery({
    queryKey: ['music-members'],
    queryFn: () => MusicService.getMembers(),
    enabled: isDirector,
  });

  // Catalog drives the instrument chips' icon/color (resolved by name).
  const { data: instruments = [] } = useQuery({
    queryKey: ['music-instruments'],
    queryFn: () => MusicService.getInstruments(),
  });

  const { data: suggestions = [], isLoading: loadingSuggestions } = useQuery({
    queryKey: ['music-suggestions', suggestionsFor],
    queryFn: () => MusicService.getSuggestions(suggestionsFor as string),
    enabled: !!suggestionsFor,
  });

  const createMutation = useMutation({
    mutationFn: (data: {
      memberId?: string;
      userId?: string;
      funcion: Funcion;
      instrument?: string;
    }) => MusicService.createAssignment(event.id, data),
    onSuccess: result => {
      qc.invalidateQueries({ queryKey: ['music-assignments', event.id] });
      qc.invalidateQueries({ queryKey: ['music-members'] });
      qc.invalidateQueries({ queryKey: ['music-instruments'] });
      setSuggestionsFor(null);
      setInstrument('');
      if (result.unavailabilityWarning) {
        toast.warning('Asignado, pero la persona declaró indisponibilidad para esa fecha');
      } else {
        toast.success('Servidor asignado');
      }
    },
    onError: (err: Error & { status?: number }) => {
      toast.error(
        err.status === 409 ? 'Esa persona ya está asignada a este culto' : 'No se pudo asignar'
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => MusicService.deleteAssignment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['music-assignments', event.id] });
      toast.success('Asignación eliminada');
    },
    onError: () => toast.error('No se pudo eliminar la asignación'),
  });

  // user_ids already assigned to this culto (to exclude from the search).
  const memberUserById = new Map(members.map(m => [m.id, m.userId]));
  const assignedUserIds = new Set(
    assignments.map(a => memberUserById.get(a.memberId)).filter((x): x is string => !!x)
  );

  const byFuncion = assignments.reduce<Record<string, MusicAssignment[]>>((acc, a) => {
    (acc[a.funcion] ??= []).push(a);
    return acc;
  }, {});

  function handlePickUser(u: User | null) {
    if (!u) return;
    if (!funcion) {
      toast.error('Elegí primero la función');
      return;
    }
    createMutation.mutate({
      userId: u.id,
      funcion,
      instrument: funcion === 'musico' && instrument ? instrument : undefined,
    });
  }

  function handleSuggestionPick(s: MusicMember, originalFuncion: Funcion) {
    createMutation.mutate({ memberId: s.id, funcion: originalFuncion });
  }

  return (
    <div className="music-panel space-y-3 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="music-glyph">
            <Users className="h-4 w-4" />
          </span>
          <div>
            <p className="music-eyebrow">Quién sirve</p>
            <h3 className="music-heading mt-1 text-xl leading-none">Equipo</h3>
          </div>
        </div>
        {isDirector && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1"
            onClick={() => setAddOpen(o => !o)}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Asignar
          </Button>
        )}
      </div>

      {isDirector && addOpen && (
        <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/30">
          <div className="space-y-1">
            <Label className="text-xs">Función</Label>
            <Select
              value={funcion}
              onValueChange={v => {
                setFuncion(v as Funcion);
                setInstrument('');
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Elegí la función" />
              </SelectTrigger>
              <SelectContent className="music-shell">
                {(Object.keys(Funciones) as Funcion[]).map(f => (
                  <SelectItem key={f} value={f}>
                    {FUNCION_SINGULAR[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {funcion === 'musico' && (
            <div className="space-y-1">
              <Label className="text-xs">Instrumento</Label>
              <Select value={instrument} onValueChange={setInstrument}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Elegí el instrumento (opcional)" />
                </SelectTrigger>
                <SelectContent className="music-shell">
                  {instruments
                    .filter(i => i.isActive)
                    .map(ins => (
                      <SelectItem key={ins.id} value={ins.name}>
                        {ins.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs">Persona</Label>
            <UserSearchPicker
              excludeUserIds={assignedUserIds}
              placeholder={funcion ? 'Buscar en la iglesia…' : 'Elegí primero la función'}
              onPick={handlePickUser}
            />
            <p className="text-xs text-muted-foreground">
              Buscá cualquier persona de la iglesia. Si no es integrante todavía, se da de alta
              automáticamente con esta función.
            </p>
          </div>
          {createMutation.isPending && (
            <p className="text-xs text-muted-foreground text-right">Asignando…</p>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map(i => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : assignments.length === 0 ? (
        <p className="text-sm text-muted-foreground py-3 text-center">Nadie asignado todavía.</p>
      ) : (
        (Object.keys(FUNCION_LABELS) as Funcion[])
          .filter(f => byFuncion[f]?.length)
          .map(f => (
            <div key={f}>
              <div className="mb-2 flex items-center gap-2">
                <span className="music-eyebrow">{FUNCION_LABELS[f]}</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <div className="music-stagger space-y-1.5">
                {byFuncion[f].map(a => (
                  <div key={a.id} className="music-row px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm truncate">{a.memberName || a.memberId}</p>
                        {a.instrument && (
                          <div className="mt-1">
                            <InstrumentChip
                              name={a.instrument}
                              category={resolveCategory(a.instrument, instruments)}
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={STATE_TAG[a.state]}>{STATE_LABEL[a.state]}</span>
                        {isDirector && a.state === 'no_puedo' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs px-2"
                            onClick={() => setSuggestionsFor(p => (p === a.id ? null : a.id))}
                          >
                            Reemplazo
                          </Button>
                        )}
                        {isDirector && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-destructive"
                            onClick={() => deleteMutation.mutate(a.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {suggestionsFor === a.id && (
                      <div className="mt-2 rounded-md bg-muted/50 p-2">
                        <p className="text-xs font-medium mb-1">Sugerencias de reemplazo</p>
                        {loadingSuggestions ? (
                          <Skeleton className="h-6 w-full" />
                        ) : suggestions.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            No hay integrantes disponibles para esta función.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {suggestions.map(s => (
                              <Button
                                key={s.id}
                                size="sm"
                                variant="secondary"
                                className="h-6 text-xs"
                                onClick={() => handleSuggestionPick(s, a.funcion)}
                                disabled={createMutation.isPending}
                              >
                                {s.name ?? s.userId}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Repertorio — canciones con tono, link y notas
// ─────────────────────────────────────────────
export function SetlistSection({ event, isDirector }: { event: MusicEvent; isDirector: boolean }) {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: '', tono: '', link: '', notes: '' });
  const [search, setSearch] = useState('');

  const { data: songs = [], isLoading } = useQuery({
    queryKey: ['music-event-songs', event.id],
    queryFn: () => MusicService.getEventSongs(event.id),
  });

  const { data: catalogMatches = [] } = useQuery({
    queryKey: ['music-song-search', search],
    queryFn: () => MusicService.getSongs(search),
    enabled: isDirector && search.trim().length >= 2,
  });

  const addMutation = useMutation({
    mutationFn: () =>
      MusicService.addSongToEvent(event.id, {
        name: form.name.trim(),
        tono: form.tono.trim() || undefined,
        link: form.link.trim() || undefined,
        notes: form.notes.trim() || undefined,
        orderIndex: songs.length,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['music-event-songs', event.id] });
      qc.invalidateQueries({ queryKey: ['music-song-stats'] });
      setForm({ name: '', tono: '', link: '', notes: '' });
      setSearch('');
      setAddOpen(false);
      toast.success('Canción agregada al repertorio');
    },
    onError: () => toast.error('No se pudo agregar la canción'),
  });

  const removeMutation = useMutation({
    mutationFn: (songId: string) => MusicService.removeSongFromEvent(event.id, songId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['music-event-songs', event.id] });
      toast.success('Canción quitada del repertorio');
    },
    onError: () => toast.error('No se pudo quitar la canción'),
  });

  const linkedSongIds = new Set(songs.map(s => s.songId));
  const visibleMatches = catalogMatches.filter(m => !linkedSongIds.has(m.id)).slice(0, 5);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('El nombre de la canción es requerido');
      return;
    }
    addMutation.mutate();
  }

  return (
    <div className="music-panel space-y-3 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="music-glyph">
            <Music2 className="h-4 w-4" />
          </span>
          <div>
            <p className="music-eyebrow">Qué vamos a tocar</p>
            <h3 className="music-heading mt-1 text-xl leading-none">Repertorio</h3>
          </div>
        </div>
        {isDirector && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1"
            onClick={() => setAddOpen(o => !o)}
          >
            <Plus className="h-3.5 w-3.5" />
            Canción
          </Button>
        )}
      </div>

      {isDirector && addOpen && (
        <form
          onSubmit={handleAdd}
          className="rounded-lg border border-border p-3 space-y-2 bg-muted/30"
        >
          <div className="relative">
            <Input
              placeholder="Nombre de la canción"
              value={form.name}
              onChange={e => {
                setForm(p => ({ ...p, name: e.target.value }));
                setSearch(e.target.value);
              }}
            />
            {visibleMatches.length > 0 && search.trim().length >= 2 && (
              <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
                {visibleMatches.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between"
                    onClick={() => {
                      setForm(p => ({
                        ...p,
                        name: m.name,
                        tono: p.tono || m.historicalKey || '',
                        link: p.link || m.link || '',
                      }));
                      setSearch('');
                    }}
                  >
                    <span>{m.name}</span>
                    {m.historicalKey && (
                      <Badge variant="outline" className="text-xs ml-2">
                        {m.historicalKey}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Tono (ej: G, Am)"
              value={form.tono}
              onChange={e => setForm(p => ({ ...p, tono: e.target.value }))}
            />
            <Input
              placeholder="Link (YouTube, etc.)"
              value={form.link}
              onChange={e => setForm(p => ({ ...p, link: e.target.value }))}
            />
          </div>
          <Input
            placeholder="Descripción / indicaciones (opcional)"
            value={form.notes}
            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
          />
          <div className="flex justify-end">
            <Button size="sm" type="submit" className="h-8" disabled={addMutation.isPending}>
              {addMutation.isPending ? 'Agregando…' : 'Agregar'}
            </Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map(i => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : songs.length === 0 ? (
        <p className="text-sm text-muted-foreground py-3 text-center">
          Sin canciones en el repertorio.
        </p>
      ) : (
        <div className="music-stagger space-y-1.5">
          {songs.map((s, i) => (
            <div key={s.id} className="music-row flex items-start justify-between gap-2 px-3 py-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="music-num w-5 shrink-0 text-xs text-muted-foreground">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="text-sm font-medium truncate">{s.songName}</p>
                  {s.tono && <span className="music-key shrink-0">{s.tono}</span>}
                  {s.link && (
                    <a
                      href={s.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary shrink-0 hover:opacity-70"
                      aria-label={`Abrir link de ${s.songName}`}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
                {s.notes && <p className="text-xs text-muted-foreground ml-7 mt-0.5">{s.notes}</p>}
              </div>
              {isDirector && (
                <ConfirmDialog
                  trigger={
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-destructive shrink-0"
                      disabled={removeMutation.isPending}
                      aria-label={`Quitar ${s.songName} del repertorio`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  }
                  title="¿Quitar canción?"
                  description={`Se quita "${s.songName}" del repertorio de este culto.`}
                  confirmLabel="Quitar"
                  onConfirm={() => removeMutation.mutate(s.songId)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Detalle de culto — header (título, badges, progreso, acciones)
// El Equipo y el Repertorio los compone MusicEventDetailPage en su grid.
// ─────────────────────────────────────────────
function formatDateForShare(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function EventDetailHeader({
  event,
  isDirector,
}: {
  event: MusicEvent;
  isDirector: boolean;
}) {
  const qc = useQueryClient();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  const updateEventMutation = useMutation({
    mutationFn: (data: { title?: string; published?: boolean }) =>
      MusicService.updateEvent(event.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['music-events'] });
      qc.invalidateQueries({ queryKey: ['music-event', event.id] });
      setEditingTitle(false);
      toast.success('Culto actualizado');
    },
    onError: () => toast.error('No se pudo actualizar el culto'),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['music-assignments', event.id],
    queryFn: () => MusicService.getAssignments(event.id),
  });

  const { data: songs = [] } = useQuery({
    queryKey: ['music-event-songs', event.id],
    queryFn: () => MusicService.getEventSongs(event.id),
  });

  const tone = EVENT_TYPE_TONE[event.eventType] ?? EVENT_TYPE_TONE.domingo;

  async function handleShareSetlist() {
    const lines: string[] = [];
    lines.push(`🎵 *Culto ${formatDateForShare(event.eventDate)}*`);
    if (event.title) lines.push(`_${event.title}_`);
    lines.push('');
    if (songs.length === 0) {
      lines.push('Sin canciones en el repertorio todavía.');
    } else {
      lines.push('*Repertorio:*');
      songs.forEach((s, i) => {
        const tono = s.tono ? `  (${s.tono})` : '';
        lines.push(`${i + 1}. ${s.songName}${tono}`);
        if (s.notes) lines.push(`   _${s.notes}_`);
        if (s.link) lines.push(`   ${s.link}`);
      });
    }
    if (assignments.length > 0) {
      lines.push('');
      lines.push('*Equipo:*');
      const byFuncion = assignments.reduce<Record<string, MusicAssignment[]>>((acc, a) => {
        (acc[a.funcion] ??= []).push(a);
        return acc;
      }, {});
      const FUNCION_SHARE: Record<Funcion, string> = {
        corista: 'Coristas',
        musico: 'Músicos',
        tecnico: 'Técnicos',
        danzarina: 'Danzarinas',
      };
      (Object.keys(FUNCION_SHARE) as Funcion[]).forEach(f => {
        const list = byFuncion[f];
        if (!list?.length) return;
        const names = list.map(a => {
          const tag = a.state === 'confirmado' ? ' ✅' : a.state === 'no_puedo' ? ' ❌' : '';
          return `${a.memberName || 'Sin nombre'}${tag}`;
        });
        lines.push(`• *${FUNCION_SHARE[f]}:* ${names.join(', ')}`);
      });
    }
    const text = lines.join('\n');
    const ok = await copyToClipboard(text);
    if (ok) toast.success('Repertorio copiado — pegalo en el grupo');
    else toast.error('No se pudo copiar al portapapeles');
  }

  return (
    <div className="music-stage space-y-4 p-5 pl-6 sm:p-7 sm:pl-8" style={toneStyle(tone)}>
      <span className="music-spine" />
      <div>
        <p className="music-eyebrow">Detalle del culto</p>
        <h1 className="music-heading mt-2 text-[1.85rem] leading-[1.05] first-letter:uppercase sm:text-[2.6rem]">
          {formatEventDate(event.eventDate)}
        </h1>
        <div className="flex flex-wrap items-center gap-2 pt-3">
          <span className="music-tag music-tag-tone">
            {EVENT_TYPE_LABEL[event.eventType] ?? event.eventType}
          </span>
          {event.published && <span className="music-tag music-tag-ok">Publicado</span>}
        </div>
      </div>

      <div>
        {editingTitle ? (
          <div className="flex gap-2">
            <Input
              value={titleDraft}
              onChange={e => setTitleDraft(e.target.value)}
              placeholder="Título del culto"
              className="h-9"
            />
            <Button
              size="sm"
              className="h-9"
              onClick={() => updateEventMutation.mutate({ title: titleDraft })}
              disabled={updateEventMutation.isPending}
            >
              Guardar
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Label className="text-sm font-normal text-muted-foreground">
              {event.title || 'Sin título'}
            </Label>
            {isDirector && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs px-2"
                onClick={() => {
                  setTitleDraft(event.title ?? '');
                  setEditingTitle(true);
                }}
              >
                Editar
              </Button>
            )}
          </div>
        )}
      </div>

      <hr className="music-rule" />

      <ConfirmationProgress assignments={assignments} />

      {isDirector && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={handleShareSetlist}>
            <Copy className="h-3.5 w-3.5" />
            Compartir al grupo
          </Button>
          <Button
            size="sm"
            variant={event.published ? 'secondary' : 'default'}
            className="gap-1.5"
            onClick={() => updateEventMutation.mutate({ published: !event.published })}
            disabled={updateEventMutation.isPending}
          >
            {event.published ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Publicado
              </>
            ) : (
              <>
                <Globe2 className="h-3.5 w-3.5" />
                Publicar cronograma
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
