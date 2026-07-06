import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AlertCircle, AlertTriangle, CheckCircle, Info, CheckCheck } from 'lucide-react';

export interface Notification {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
  actionText?: string;
  actionUrl?: string;
  // snake_case aliases (from backend)
  action_text?: string;
  action_url?: string;
  createdAt?: string;
  created_at?: string;
  read: boolean;
  relatedUser?: {
    name: string;
    avatar?: string;
  };
  related_entity_type?: string;
  related_entity_id?: string;
}

const TYPE_CONFIG = {
  success: {
    icon: CheckCircle,
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    color: 'text-emerald-600 dark:text-emerald-400',
  },
  error: {
    icon: AlertCircle,
    bg: 'bg-red-100 dark:bg-red-900/30',
    color: 'text-red-600 dark:text-red-400',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    color: 'text-orange-600 dark:text-orange-400',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    color: 'text-blue-600 dark:text-blue-400',
  },
} as const;

function formatTime(dateString?: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h`;
  return `${Math.floor(mins / 1440)}d`;
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onAction?: (id: string, url?: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onAction,
}) => {
  const config = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.info;
  const Icon = config.icon;
  const actionText = notification.actionText ?? notification.action_text;
  const actionUrl = notification.actionUrl ?? notification.action_url;
  const timestamp = notification.createdAt ?? notification.created_at;

  const handleClick = () => {
    if (!notification.read) onMarkAsRead(notification.id);
  };

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAction?.(notification.id, actionUrl);
    if (!notification.read) onMarkAsRead(notification.id);
  };

  return (
    <div
      className={cn(
        'relative flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors',
        'hover:bg-muted/50',
        !notification.read && 'bg-blue-50/40 dark:bg-blue-950/20'
      )}
      onClick={handleClick}
    >
      {/* Unread dot */}
      {!notification.read && (
        <span className="absolute left-1.5 top-4 h-1.5 w-1.5 rounded-full bg-blue-500" />
      )}

      {/* Type icon avatar */}
      <div
        className={cn(
          'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
          config.bg
        )}
      >
        <Icon className={cn('h-4 w-4', config.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold leading-tight">{notification.title}</p>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {formatTime(timestamp)}
          </span>
        </div>

        <p className="text-[13px] text-muted-foreground leading-snug line-clamp-2">
          {notification.message}
        </p>

        {actionText && actionUrl && (
          <button
            onClick={handleAction}
            className="mt-1 text-[13px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            {actionText}
          </button>
        )}
      </div>
    </div>
  );
};

interface NotificationCenterProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDismiss: (id: string) => void;
  onAction?: (id: string, url?: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  onAction,
}) => {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="flex flex-col w-full overflow-hidden rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Notificaciones</span>
          {unreadCount > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {unreadCount} nuevas
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={onMarkAllAsRead}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Marcar todo leído
          </Button>
        )}
      </div>

      {/* List */}
      <div className="max-h-[420px] overflow-y-auto divide-y divide-border/50">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Info className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">No hay notificaciones</p>
          </div>
        ) : (
          notifications.map(n => (
            <NotificationItem
              key={n.id}
              notification={n}
              onMarkAsRead={onMarkAsRead}
              onDismiss={onDismiss}
              onAction={onAction}
            />
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="border-t px-4 py-2.5 text-center">
          <button className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">
            Ver todas las notificaciones
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
