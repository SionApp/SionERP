export const Funciones = {
  corista: 'corista',
  musico: 'musico',
  tecnico: 'tecnico',
  danzarina: 'danzarina',
} as const;
export type Funcion = (typeof Funciones)[keyof typeof Funciones];

export const AssignmentStates = {
  asignado: 'asignado',
  confirmado: 'confirmado',
  no_puedo: 'no_puedo',
} as const;
export type AssignmentState = (typeof AssignmentStates)[keyof typeof AssignmentStates];

export const MusicEventTypes = {
  viernes: 'viernes',
  domingo: 'domingo',
  especial: 'especial',
} as const;
export type MusicEventType = (typeof MusicEventTypes)[keyof typeof MusicEventTypes];

export interface MusicMember {
  id: string;
  userId: string;
  name?: string;
  email?: string | null;
  funciones: Funcion[];
  instrument: string | null;
  active: boolean;
  isDirector: boolean;
  createdAt: string;
}

export interface MusicEvent {
  id: string;
  eventDate: string;
  eventType: MusicEventType;
  title: string | null;
  notes: string | null;
  published: boolean;
  createdAt: string;
}

export interface MusicAssignment {
  id: string;
  eventId: string;
  memberId: string;
  memberName?: string;
  instrument?: string | null;
  eventDate?: string;
  eventType?: MusicEventType;
  funcion: Funcion;
  state: AssignmentState;
  assignedBy: string | null;
}

export interface MusicSong {
  id: string;
  name: string;
  nameNormalized: string;
  author: string | null;
  defaultKey: string | null;
  link: string | null;
  historicalKey: string | null;
}

export interface EventSong {
  id: string;
  eventId: string;
  songId: string;
  songName: string;
  tono: string | null;
  orderIndex: number;
  link: string | null;
  notes: string | null;
}

export interface MusicSongStat {
  id: string;
  name: string;
  timesPlayed: number;
  lastPlayedDate: string | null;
  historicalKey: string | null;
}

export interface MusicUnavailability {
  id: string;
  memberId: string;
  startDate: string;
  endDate: string | null;
  reason: string | null;
  createdAt: string;
}

export interface CreateMemberRequest {
  userId: string;
  funciones: Funcion[];
  instrument?: string | null;
  isDirector?: boolean;
}

export interface UpdateMemberRequest {
  funciones?: Funcion[];
  instrument?: string | null;
  active?: boolean;
  isDirector?: boolean;
}

export interface CreateEventRequest {
  eventDate: string;
  eventType: MusicEventType;
  title?: string;
  notes?: string;
}

export interface BatchQuarterRequest {
  year: number;
  quarter: 1 | 2 | 3 | 4;
}

export interface CreateAssignmentRequest {
  memberId?: string;
  userId?: string;
  funcion: Funcion;
}

export interface UpdateAssignmentRequest {
  state: AssignmentState;
}

export interface AddSongToEventRequest {
  name: string;
  author?: string;
  tono?: string;
  orderIndex?: number;
  link?: string;
  notes?: string;
}

export interface CreateUnavailabilityRequest {
  startDate: string;
  endDate?: string | null;
  reason?: string;
}
