import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bell, CheckCircle, AlertTriangle, Info, X, Clock } from 'lucide-react';

export interface Notification {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
  actionText?: string;
  actionUrl?: string;
  createdAt: string;
  read: boolean;
  relatedUser?: {
    name: string;
    avatar?: string;
  };
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
  onDismiss,
  onAction,
}) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getBadgeVariant = () => {
    switch (notification.type) {
      case 'success':
        return 'default' as const;
      case 'warning':
        return 'secondary' as const;
      case 'error':
        return 'destructive' as const;
      case 'info':
      default:
        return 'outline' as const;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Ahora';
    if (diffInMinutes < 60) return `Hace ${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `Hace ${Math.floor(diffInMinutes / 60)}h`;
    return `Hace ${Math.floor(diffInMinutes / 1440)}d`;
  };

  return (
    <Card className={`transition-all ${notification.read ? 'opacity-75' : 'shadow-md'}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {notification.relatedUser ? (
            <Avatar className="w-8 h-8">
              <AvatarImage src={notification.relatedUser.avatar} />
              <AvatarFallback>
                {notification.relatedUser.name
                  .split(' ')
                  .map(n => n[0])
                  .join('')}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="flex-shrink-0">{getIcon()}</div>
          )}

          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-sm">{notification.title}</h4>
                <Badge variant={getBadgeVariant()} className="text-xs">
                  {notification.type}
                </Badge>
                {!notification.read && <div className="w-2 h-2 bg-blue-600 rounded-full"></div>}
              </div>

              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(notification.createdAt)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDismiss(notification.id)}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">{notification.message}</p>

            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {notification.actionText && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAction?.(notification.id, notification.actionUrl)}
                  >
                    {notification.actionText}
                  </Button>
                )}
                {!notification.read && (
                  <Button variant="ghost" size="sm" onClick={() => onMarkAsRead(notification.id)}>
                    Marcar como leída
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notificaciones
              {unreadCount > 0 && (
                <Badge variant="default" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Mantente al día con las actividades del discipulado</CardDescription>
          </div>

          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={onMarkAllAsRead}>
              Marcar todas como leídas
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No hay notificaciones</p>
          </div>
        ) : (
          notifications.map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={onMarkAsRead}
              onDismiss={onDismiss}
              onAction={onAction}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationCenter;
