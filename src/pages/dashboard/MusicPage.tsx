import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Calendar } from 'lucide-react';
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
import { useMobileMode } from '@/hooks/useMobileMode';
import { usePermissions } from '@/hooks/usePermissions';
import { MusicService } from '@/services/music.service';
import { AssignmentStates, MusicEventTypes } from '@/types/music.types';
import type {
  MusicAssignment,
  MusicEvent,
  AssignmentState,
  MusicEventType,
  CreateEventRequest,
  BatchQuarterRequest,
  UpdateAssignmentRequest,
  CreateUnavailabilityRequest,
} from '@/types/music.types';
import MusicMembers from './music/MusicMembers';
import { MobileMusicPage } from './music/MobileMusicPage';

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

function AssignmentBadge({ state }: { state: AssignmentState }) {
  return (
    <Badge variant={STATE_VARIANT[state]} className="text-xs">
      {STATE_LABEL[state]}
    </Badge>
  );
}

function CronogramaTab({ isDirector }: { isDirector: boolean }) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['music-events'],
    queryFn: () => MusicService.getEvents(),
  });

  if (isLoading)
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );

  const upcoming = events
    .filter(e => e.eventDate >= new Date().toISOString().slice(0, 10))
    .slice(0, 20);

  if (upcoming.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">No hay cultos próximos.</p>
    );
  }

  return (
    <div className="space-y-3">
      {upcoming.map(event => (
        <EventAssignmentCard key={event.id} event={event} isDirector={isDirector} />
      ))}
    </div>
  );
}

function EventAssignmentCard({ event, isDirector }: { event: MusicEvent; isDirector: boolean }) {
  const qc = useQueryClient();
  const { data: assignments = [] } = useQuery({
    queryKey: ['music-assignments', event.id],
    queryFn: () => MusicService.getAssignments(event.id),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAssignmentRequest }) =>
      MusicService.updateAssignment(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['music-assignments', event.id] });
    },
    onError: () => toast.error('No se pudo actualizar el estado'),
  });

  const byFuncion = assignments.reduce<Record<string, MusicAssignment[]>>((acc, a) => {
    (acc[a.funcion] ??= []).push(a);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            {event.eventDate} — {EVENT_TYPE_LABEL[event.eventType]}
            {event.title ? ` — ${event.title}` : ''}
          </CardTitle>
          {event.published && (
            <Badge variant="secondary" className="text-xs">
              Publicado
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {Object.entries(byFuncion).map(([funcion, list]) => (
          <div key={funcion} className="mb-2">
            <p className="text-xs text-muted-foreground mb-1 capitalize">{funcion}</p>
            <div className="space-y-1">
              {list.map(a => (
                <div key={a.id} className="flex items-center justify-between">
                  <span className="text-sm">{a.memberName ?? a.memberId}</span>
                  <div className="flex items-center gap-2">
                    <AssignmentBadge state={a.state} />
                    {!isDirector && a.state !== 'no_puedo' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-xs px-2"
                        onClick={() =>
                          updateMutation.mutate({ id: a.id, data: { state: 'no_puedo' } })
                        }
                        disabled={updateMutation.isPending}
                      >
                        No puedo
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {assignments.length === 0 && (
          <p className="text-xs text-muted-foreground">Sin asignaciones.</p>
        )}
      </CardContent>
    </Card>
  );
}

function CultosTab({ isDirector }: { isDirector: boolean }) {
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
    quarter: '1',
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
      toast.success(`Creados: ${result.created}, omitidos: ${result.skipped}`);
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
              <Calendar className="h-4 w-4" />
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
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No hay cultos registrados.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {events.map(ev => (
              <div key={ev.id} className="flex items-center justify-between py-3">
                <div>
                  <span className="font-medium text-sm">{ev.eventDate}</span>
                  <span className="text-muted-foreground text-sm ml-2">
                    {EVENT_TYPE_LABEL[ev.eventType]}
                  </span>
                  {ev.title && <span className="text-sm ml-2">{ev.title}</span>}
                </div>
                <div className="flex items-center gap-2">
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
                  <SelectItem value="1">Q1 — Ene/Mar</SelectItem>
                  <SelectItem value="2">Q2 — Abr/Jun</SelectItem>
                  <SelectItem value="3">Q3 — Jul/Sep</SelectItem>
                  <SelectItem value="4">Q4 — Oct/Dic</SelectItem>
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

function CancionesTab() {
  const { data: stats = [], isLoading } = useQuery({
    queryKey: ['music-song-stats'],
    queryFn: () => MusicService.getSongStats(50),
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
            No hay canciones en el repertorio.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {stats.map(s => (
              <div key={s.id} className="flex items-center justify-between py-3">
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
            <div className="divide-y divide-border">
              {myAssignments.map(a => (
                <div key={a.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium capitalize">{a.funcion}</p>
                    <p className="text-xs text-muted-foreground">{a.eventId}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <AssignmentBadge state={a.state} />
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
            <div className="divide-y divide-border">
              {myUnavailability.map(u => (
                <div key={u.id} className="flex items-center justify-between py-3">
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

export default function MusicPage() {
  const isMobileApp = useMobileMode();
  const { isDirector } = useMusicAccess();

  if (isMobileApp) return <MobileMusicPage isDirector={isDirector} />;

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
          <CronogramaTab isDirector={isDirector} />
        </TabsContent>
        <TabsContent value="cultos" className="mt-4">
          <CultosTab isDirector={isDirector} />
        </TabsContent>
        <TabsContent value="integrantes" className="mt-4">
          <MusicMembers isDirector={isDirector} />
        </TabsContent>
        <TabsContent value="canciones" className="mt-4">
          <CancionesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
