import { ApiService } from './api.service';
import { supabase } from '@/integrations/supabase/client';
import type {
  ChurchEvent,
  CreateEventRequest,
  UpdateEventRequest,
  EventRegistration,
  RegistrationStatus,
} from '@/types/event.types';

interface RawEvent {
  id: string;
  title: string;
  description: string;
  event_date: string;
  start_time: string;
  end_time: string;
  location: string;
  category: string;
  is_recurring: boolean;
  is_published: boolean;
  max_attendees: number | null;
  organizer: string;
  image_url: string;
  attendees_count: number;
  my_status: string;
  created_at: string;
}

interface RawRegistration {
  user_id: string;
  name: string;
  email: string;
  status: string;
  created_at: string;
}

function mapEvent(r: RawEvent): ChurchEvent {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    eventDate: r.event_date,
    startTime: r.start_time,
    endTime: r.end_time,
    location: r.location,
    category: r.category as ChurchEvent['category'],
    isRecurring: r.is_recurring,
    isPublished: r.is_published,
    maxAttendees: r.max_attendees,
    organizer: r.organizer,
    imageUrl: r.image_url,
    attendeesCount: r.attendees_count,
    myStatus: r.my_status as RegistrationStatus,
    createdAt: r.created_at,
  };
}

function toBody(data: CreateEventRequest | UpdateEventRequest) {
  return {
    title: data.title,
    description: data.description,
    event_date: data.eventDate,
    start_time: data.startTime,
    end_time: data.endTime,
    location: data.location,
    category: data.category,
    is_recurring: data.isRecurring,
    is_published: data.isPublished,
    max_attendees: data.maxAttendees,
    organizer: data.organizer,
    image_url: data.imageUrl,
  };
}

export class EventsService {
  private static base = '/events';

  static async getEvents(params?: {
    published?: boolean;
    upcoming?: boolean;
  }): Promise<ChurchEvent[]> {
    const q = new URLSearchParams();
    if (params?.published) q.append('published', 'true');
    if (params?.upcoming) q.append('upcoming', 'true');
    const qs = q.toString();
    const raw = await ApiService.get<RawEvent[]>(`${this.base}${qs ? `?${qs}` : ''}`);
    return raw.map(mapEvent);
  }

  static async getEventById(id: string): Promise<ChurchEvent> {
    const raw = await ApiService.get<RawEvent>(`${this.base}/${id}`);
    return mapEvent(raw);
  }

  static async createEvent(data: CreateEventRequest): Promise<{ id: string }> {
    return ApiService.post<{ id: string }, ReturnType<typeof toBody>>(this.base, toBody(data));
  }

  static async updateEvent(id: string, data: UpdateEventRequest): Promise<void> {
    await ApiService.put<{ message: string }, ReturnType<typeof toBody>>(
      `${this.base}/${id}`,
      toBody(data)
    );
  }

  static async deleteEvent(id: string): Promise<void> {
    await ApiService.delete(`${this.base}/${id}`);
  }

  static async register(eventId: string, status: RegistrationStatus = 'going'): Promise<void> {
    await ApiService.post<{ message: string }, { status: RegistrationStatus }>(
      `${this.base}/${eventId}/register`,
      { status }
    );
  }

  static async unregister(eventId: string): Promise<void> {
    await ApiService.delete(`${this.base}/${eventId}/register`);
  }

  static async uploadImage(file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const filePath = `events/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('church-assets')
      .upload(filePath, file, { cacheControl: '3600', upsert: false });
    if (uploadError) {
      throw new Error('Error al subir la imagen');
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('church-assets').getPublicUrl(filePath);
    return publicUrl;
  }

  static async getRegistrations(eventId: string): Promise<EventRegistration[]> {
    const raw = await ApiService.get<RawRegistration[]>(`${this.base}/${eventId}/registrations`);
    return raw.map(r => ({
      userId: r.user_id,
      name: r.name,
      email: r.email,
      status: r.status as RegistrationStatus,
      createdAt: r.created_at,
    }));
  }
}
