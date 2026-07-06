export const EventCategories = {
  service: 'service',
  conference: 'conference',
  worship: 'worship',
  youth: 'youth',
  children: 'children',
  community: 'community',
} as const;
export type EventCategory = (typeof EventCategories)[keyof typeof EventCategories];

export type RegistrationStatus = '' | 'going' | 'maybe' | 'cancelled';

export interface ChurchEvent {
  id: string;
  title: string;
  description: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  location: string;
  category: EventCategory;
  isRecurring: boolean;
  isPublished: boolean;
  maxAttendees: number | null;
  organizer: string;
  imageUrl: string;
  attendeesCount: number;
  myStatus: RegistrationStatus;
  createdAt: string;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  eventDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  category: EventCategory;
  isRecurring?: boolean;
  isPublished?: boolean;
  maxAttendees?: number | null;
  organizer?: string;
  imageUrl?: string;
}

export type UpdateEventRequest = Partial<CreateEventRequest>;

export interface EventRegistration {
  userId: string;
  name: string;
  email: string;
  status: RegistrationStatus;
  createdAt: string;
}
