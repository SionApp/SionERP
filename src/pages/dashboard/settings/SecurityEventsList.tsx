import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SettingsService } from '@/services/settings.service';
import type { SecurityEventType } from '@/types/settings.types';

const EVENT_LABEL: Record<SecurityEventType, string> = {
  role_changed: 'Cambio de rol',
  user_suspended: 'Usuario suspendido',
  user_reactivated: 'Usuario reactivado',
  user_data_exported: 'Exportación de usuarios',
};

const EVENT_BADGE_CLASS: Record<SecurityEventType, string> = {
  role_changed: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  user_suspended: 'bg-destructive/10 text-destructive',
  user_reactivated: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  user_data_exported: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
};

export function SecurityEventsList() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['security-events'],
    queryFn: () => SettingsService.getSecurityEvents(),
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Todavía no hay eventos de seguridad registrados.
      </p>
    );
  }

  return (
    <div className="divide-y divide-border rounded-md border border-border">
      {events.map(e => (
        <div key={e.id} className="flex items-center justify-between gap-3 px-3 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {e.user_name ? `${e.actor_name} → ${e.user_name}` : e.actor_name}
            </p>
            <p className="text-xs text-muted-foreground">
              {e.ip_address || 'IP desconocida'} ·{' '}
              {new Date(e.created_at).toLocaleDateString('es-AR', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <Badge variant="secondary" className={EVENT_BADGE_CLASS[e.event_type]}>
            {EVENT_LABEL[e.event_type]}
          </Badge>
        </div>
      ))}
    </div>
  );
}
