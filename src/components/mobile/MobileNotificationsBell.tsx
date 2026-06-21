import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NotificationCenter } from '@/components/ui/notifications';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotificationsData } from '@/hooks/useNotificationsData';

/** Campanita de notificaciones para el header mobile (el shell mobile no tiene header web). */
export function MobileNotificationsBell({ className }: { className?: string }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, dismiss } = useNotificationsData();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={cn('relative rounded-xl', className)}>
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-1.5rem)] max-w-[380px] p-0" align="end">
        <NotificationCenter
          notifications={notifications}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onDismiss={dismiss}
        />
      </PopoverContent>
    </Popover>
  );
}
