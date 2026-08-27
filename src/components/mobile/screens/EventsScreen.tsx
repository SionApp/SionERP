import { Check, Clock, Globe, MapPin, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { EVENT_CATEGORY_META, formatEventDate } from '@/pages/dashboard/events/event-meta';
import type { ChurchEvent, EventCategory } from '@/types/event.types';
import { MobileScreen } from '../MobileScreen';
import { MobileSegment } from '../MobileSegment';

export interface MobileEventsScreenProps {
  events: ChurchEvent[];
  isLoading: boolean;
  canManage: boolean;
  search: string;
  onSearch: (v: string) => void;
  categoryFilter: 'all' | EventCategory;
  onCategoryFilter: (v: 'all' | EventCategory) => void;
  onCreate: () => void;
  onEdit: (e: ChurchEvent) => void;
  onDelete: (e: ChurchEvent) => void;
  onToggleRsvp: (e: ChurchEvent) => void;
  rsvpPending: boolean;
  dialog: React.ReactNode;
}

function MobileEventCard({
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
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div
        className={cn(
          'relative flex h-20 items-center justify-center overflow-hidden',
          !event.imageUrl && cat.banner
        )}
      >
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <cat.Icon className="h-8 w-8 text-white/80" />
        )}
        <Badge className={cn('absolute right-3 top-3 border-0 text-xs', cat.chip)}>
          {cat.label}
        </Badge>
        {!event.isPublished && (
          <Badge variant="secondary" className="absolute left-3 top-3 text-xs">
            Borrador
          </Badge>
        )}
      </div>
      <div className="space-y-2 p-3">
        <div>
          <h3 className="font-semibold leading-tight">{event.title}</h3>
          <p className="mt-0.5 text-xs capitalize text-muted-foreground">
            {formatEventDate(event.eventDate)}
            {event.startTime ? ` · ${event.startTime}` : ''}
          </p>
        </div>
        {event.location && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {event.location}
          </p>
        )}
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {event.attendeesCount}
          {event.maxAttendees ? ` / ${event.maxAttendees}` : ''} inscriptos
        </p>
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={() => onToggleRsvp(event)}
            disabled={rsvpPending}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-50',
              going
                ? 'bg-primary text-primary-foreground'
                : 'border border-border text-foreground active:bg-muted'
            )}
          >
            {going ? <Check className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
            {going ? 'Voy' : 'Anotarme'}
          </button>
          {canManage && (
            <>
              <button
                type="button"
                onClick={() => onEdit(event)}
                aria-label="Editar"
                className="rounded-xl border border-border p-2.5 active:bg-muted"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(event)}
                aria-label="Eliminar"
                className="rounded-xl border border-border p-2.5 text-destructive active:bg-muted"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function MobileEventsScreen({
  events,
  isLoading,
  canManage,
  search,
  onSearch,
  categoryFilter,
  onCategoryFilter,
  onCreate,
  onEdit,
  onDelete,
  onToggleRsvp,
  rsvpPending,
  dialog,
}: MobileEventsScreenProps) {
  const categoryOptions = [
    { value: 'all', label: 'Todas' },
    ...(Object.keys(EVENT_CATEGORY_META) as EventCategory[]).map(c => ({
      value: c,
      label: EVENT_CATEGORY_META[c].label,
    })),
  ];

  return (
    <MobileScreen title="Eventos" subtitle="Próximos en la iglesia">
      <div className="space-y-3 px-4 py-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Buscar eventos…"
            className="pl-9"
          />
        </div>
        <MobileSegment
          options={categoryOptions}
          value={categoryFilter}
          onChange={v => onCategoryFilter(v as 'all' | EventCategory)}
          scrollable
        />

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-44 w-full rounded-2xl" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No hay eventos para mostrar.
          </p>
        ) : (
          <div className="space-y-3">
            {events.map(event => (
              <MobileEventCard
                key={event.id}
                event={event}
                canManage={canManage}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleRsvp={onToggleRsvp}
                rsvpPending={rsvpPending}
              />
            ))}
          </div>
        )}
      </div>

      {canManage && (
        <button
          type="button"
          onClick={onCreate}
          className="fixed bottom-24 right-4 z-30 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-lg shadow-primary/30 transition-opacity active:opacity-90 sm:right-6"
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm font-semibold">Crear evento</span>
        </button>
      )}

      {dialog}
    </MobileScreen>
  );
}
