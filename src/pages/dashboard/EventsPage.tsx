import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CalendarDays,
  Clock,
  Globe,
  MapPin,
  Plus,
  Search,
  Trash2,
  Users,
  Pencil,
  Check,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { useMobileMode } from '@/hooks/useMobileMode';
import { ROLE_LEVELS } from '@/lib/permissions';
import { EventsService } from '@/services/events.service';
import { EVENT_CATEGORY_META, formatEventDate } from './events/event-meta';
import type { ChurchEvent, CreateEventRequest, EventCategory } from '@/types/event.types';
import { MobileEventsScreen } from '@/components/mobile/screens/EventsScreen';

const EMPTY_FORM: CreateEventRequest = {
  title: '',
  description: '',
  eventDate: '',
  startTime: '',
  endTime: '',
  location: '',
  category: 'service',
  isRecurring: false,
  isPublished: true,
  maxAttendees: null,
  organizer: '',
};

// ─────────────────────────────────────────────
// Create / edit dialog (controlled)
// ─────────────────────────────────────────────
function EventFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: ChurchEvent | null;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<CreateEventRequest>(EMPTY_FORM);

  // Sync form when opening (create → empty, edit → event values).
  const [syncedId, setSyncedId] = useState<string | null>(null);
  const targetId = editing?.id ?? null;
  if (open && syncedId !== targetId) {
    setSyncedId(targetId);
    setForm(
      editing
        ? {
            title: editing.title,
            description: editing.description,
            eventDate: editing.eventDate,
            startTime: editing.startTime,
            endTime: editing.endTime,
            location: editing.location,
            category: editing.category,
            isRecurring: editing.isRecurring,
            isPublished: editing.isPublished,
            maxAttendees: editing.maxAttendees,
            organizer: editing.organizer,
          }
        : EMPTY_FORM
    );
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) await EventsService.updateEvent(editing.id, form);
      else await EventsService.createEvent(form);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] });
      onOpenChange(false);
      setSyncedId(null);
      toast.success(editing ? 'Evento actualizado' : 'Evento creado');
    },
    onError: () => toast.error('No se pudo guardar el evento'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('El título es requerido');
    if (!form.eventDate) return toast.error('La fecha es requerida');
    saveMutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar evento' : 'Crear nuevo evento'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="ev-title">Título *</Label>
              <Input
                id="ev-title"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Nombre del evento"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="ev-desc">Descripción</Label>
              <Textarea
                id="ev-desc"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Describí el evento…"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Categoría *</Label>
              <Select
                value={form.category}
                onValueChange={v => setForm(p => ({ ...p, category: v as EventCategory }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(EVENT_CATEGORY_META) as EventCategory[]).map(c => (
                    <SelectItem key={c} value={c}>
                      {EVENT_CATEGORY_META[c].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-org">Organizador</Label>
              <Input
                id="ev-org"
                value={form.organizer}
                onChange={e => setForm(p => ({ ...p, organizer: e.target.value }))}
                placeholder="Nombre del organizador"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-date">Fecha *</Label>
              <Input
                id="ev-date"
                type="date"
                value={form.eventDate}
                onChange={e => setForm(p => ({ ...p, eventDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-cap">Capacidad</Label>
              <Input
                id="ev-cap"
                type="number"
                value={form.maxAttendees ?? ''}
                onChange={e =>
                  setForm(p => ({
                    ...p,
                    maxAttendees: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                placeholder="Sin límite"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-start">Hora inicio</Label>
              <Input
                id="ev-start"
                type="time"
                value={form.startTime}
                onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-end">Hora fin</Label>
              <Input
                id="ev-end"
                type="time"
                value={form.endTime}
                onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="ev-loc">Ubicación</Label>
              <Input
                id="ev-loc"
                value={form.location}
                onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                placeholder="Dirección o nombre del lugar"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label htmlFor="ev-rec">Evento recurrente</Label>
              <Switch
                id="ev-rec"
                checked={form.isRecurring}
                onCheckedChange={v => setForm(p => ({ ...p, isRecurring: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="ev-pub">Publicado</Label>
              <Switch
                id="ev-pub"
                checked={form.isPublished}
                onCheckedChange={v => setForm(p => ({ ...p, isPublished: v }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Guardando…' : editing ? 'Guardar' : 'Crear evento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// Event card
// ─────────────────────────────────────────────
function EventCard({
  event,
  canManage,
  onEdit,
  onDelete,
  onToggleRsvp,
  rsvpPending,
}: {
  event: ChurchEvent;
  canManage: boolean;
  onEdit: (e: ChurchEvent) => void;
  onDelete: (e: ChurchEvent) => void;
  onToggleRsvp: (e: ChurchEvent) => void;
  rsvpPending: boolean;
}) {
  const cat = EVENT_CATEGORY_META[event.category] ?? EVENT_CATEGORY_META.service;
  const going = event.myStatus === 'going';
  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-lg">
      <div className={cn('relative flex h-28 items-center justify-center', cat.banner)}>
        <cat.Icon className="h-10 w-10 text-white/80" />
        <Badge className={cn('absolute right-3 top-3 border-0', cat.chip)}>{cat.label}</Badge>
        {!event.isPublished && (
          <Badge variant="secondary" className="absolute left-3 top-3">
            Borrador
          </Badge>
        )}
      </div>
      <CardContent className="space-y-3 p-4">
        <div>
          <h3 className="line-clamp-1 font-bold">{event.title}</h3>
          {event.description && (
            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{event.description}</p>
          )}
        </div>
        <div className="space-y-1.5 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            <span className="capitalize">{formatEventDate(event.eventDate)}</span>
          </p>
          {(event.startTime || event.endTime) && (
            <p className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {event.startTime}
              {event.endTime ? ` – ${event.endTime}` : ''}
            </p>
          )}
          {event.location && (
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {event.location}
            </p>
          )}
          <p className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {event.attendeesCount}
            {event.maxAttendees ? ` / ${event.maxAttendees}` : ''} inscriptos
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 border-t pt-3">
          <Button
            size="sm"
            variant={going ? 'default' : 'outline'}
            className="gap-1.5"
            onClick={() => onToggleRsvp(event)}
            disabled={rsvpPending}
          >
            {going ? <Check className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
            {going ? 'Voy' : 'Anotarme'}
          </Button>
          {canManage && (
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(event)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive"
                onClick={() => onDelete(event)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────
const EventsPage = () => {
  const isMobileApp = useMobileMode();
  const qc = useQueryClient();
  const { hasAccess } = usePermissions();
  const canManage = hasAccess(ROLE_LEVELS.staff);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | EventCategory>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ChurchEvent | null>(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    // Members see only published; staff see everything (incl. drafts).
    queryFn: () => EventsService.getEvents(canManage ? undefined : { published: true }),
  });

  const rsvpMutation = useMutation({
    mutationFn: (ev: ChurchEvent) =>
      ev.myStatus === 'going'
        ? EventsService.unregister(ev.id)
        : EventsService.register(ev.id, 'going'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
    onError: () => toast.error('No se pudo actualizar tu inscripción'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => EventsService.deleteEvent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] });
      toast.success('Evento eliminado');
    },
    onError: () => toast.error('No se pudo eliminar el evento'),
  });

  const filtered = useMemo(
    () =>
      events.filter(e => {
        if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
        if (search.trim() && !e.title.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [events, categoryFilter, search]
  );

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(e: ChurchEvent) {
    setEditing(e);
    setDialogOpen(true);
  }

  if (isMobileApp) {
    return (
      <MobileEventsScreen
        events={filtered}
        isLoading={isLoading}
        canManage={canManage}
        search={search}
        onSearch={setSearch}
        categoryFilter={categoryFilter}
        onCategoryFilter={setCategoryFilter}
        onCreate={openCreate}
        onEdit={openEdit}
        onDelete={e => deleteMutation.mutate(e.id)}
        onToggleRsvp={e => rsvpMutation.mutate(e)}
        rsvpPending={rsvpMutation.isPending}
        dialog={
          <EventFormDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
        }
      />
    );
  }

  return (
    <div className="space-y-4 p-3 sm:p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="bg-gradient-to-r from-primary to-accent bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
            Gestión de Eventos
          </h1>
          <p className="text-sm text-muted-foreground">
            Creá y administrá eventos para tu congregación
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate} className="w-full gap-2 sm:w-auto">
            <Plus className="h-4 w-4" />
            Crear evento
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar eventos…"
              className="pl-10"
            />
          </div>
          <Select
            value={categoryFilter}
            onValueChange={v => setCategoryFilter(v as typeof categoryFilter)}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {(Object.keys(EVENT_CATEGORY_META) as EventCategory[]).map(c => (
                <SelectItem key={c} value={c}>
                  {EVENT_CATEGORY_META[c].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-72 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {events.length === 0 ? 'No hay eventos todavía.' : 'Sin coincidencias.'}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(event => (
            <EventCard
              key={event.id}
              event={event}
              canManage={canManage}
              onEdit={openEdit}
              onDelete={e => deleteMutation.mutate(e.id)}
              onToggleRsvp={e => rsvpMutation.mutate(e)}
              rsvpPending={rsvpMutation.isPending}
            />
          ))}
        </div>
      )}

      <EventFormDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
    </div>
  );
};

export default EventsPage;
