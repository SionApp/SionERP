import { ApiService } from './api.service';
import type { Notification } from '@/components/ui/notifications';

interface RawNotification {
  id: string;
  user_id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
  action_url?: string;
  action_text?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  read: boolean;
  created_at: string;
}

function mapNotification(raw: RawNotification): Notification {
  return {
    id: raw.id,
    type: raw.type,
    title: raw.title,
    message: raw.message,
    actionUrl: raw.action_url,
    actionText: raw.action_text,
    createdAt: raw.created_at,
    read: raw.read,
    related_entity_type: raw.related_entity_type,
    related_entity_id: raw.related_entity_id,
  };
}

export class NotificationService {
  static async getAll(): Promise<Notification[]> {
    const raw = await ApiService.get<RawNotification[]>('/notifications');
    return (raw ?? []).map(mapNotification);
  }

  static async getUnread(): Promise<Notification[]> {
    const raw = await ApiService.get<RawNotification[]>('/notifications?unread=true');
    return (raw ?? []).map(mapNotification);
  }

  static async markAsRead(id: string): Promise<void> {
    await ApiService.put<void>(`/notifications/${id}/read`);
  }

  static async markAllAsRead(): Promise<void> {
    await ApiService.put<void>('/notifications/read-all');
  }

  static async dismiss(id: string): Promise<void> {
    await ApiService.delete<void>(`/notifications/${id}`);
  }
}
