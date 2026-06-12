import { ApiService } from './api.service';
import type {
  MusicMember,
  MusicEvent,
  MusicAssignment,
  MusicSong,
  MusicSongStat,
  EventSong,
  MusicUnavailability,
  CreateMemberRequest,
  UpdateMemberRequest,
  CreateEventRequest,
  BatchQuarterRequest,
  CreateAssignmentRequest,
  UpdateAssignmentRequest,
  AddSongToEventRequest,
  CreateUnavailabilityRequest,
} from '@/types/music.types';

interface RawMember {
  id: string;
  user_id: string;
  name?: string;
  funciones: string[];
  instrument: string | null;
  is_active: boolean;
  created_at: string;
}

interface RawEvent {
  id: string;
  event_date: string;
  event_type: string;
  title: string | null;
  notes: string | null;
  published: boolean;
  created_at: string;
}

interface RawAssignment {
  id: string;
  event_id: string;
  member_id: string;
  member_name?: string;
  funcion: string;
  state: string;
  assigned_by: string | null;
}

interface RawSong {
  id: string;
  name: string;
  name_normalized: string;
  author: string | null;
  default_key: string | null;
  historical_key: string | null;
}

interface RawEventSong {
  id: string;
  event_id: string;
  song_id: string;
  song_name: string;
  tono: string | null;
  order_index: number;
}

interface RawSongStat {
  id: string;
  name: string;
  times_played: number;
  last_played_date: string | null;
  historical_key: string | null;
}

interface RawUnavailability {
  id: string;
  member_id: string;
  start_date: string;
  end_date: string | null;
  reason: string | null;
  created_at: string;
}

interface RawCreateAssignmentResponse {
  assignment: RawAssignment;
  unavailability_warning: boolean;
}

function mapMember(r: RawMember): MusicMember {
  return {
    id: r.id,
    userId: r.user_id,
    name: r.name,
    funciones: r.funciones as MusicMember['funciones'],
    instrument: r.instrument,
    active: r.is_active,
    createdAt: r.created_at,
  };
}

function mapEvent(r: RawEvent): MusicEvent {
  return {
    id: r.id,
    eventDate: r.event_date,
    eventType: r.event_type as MusicEvent['eventType'],
    title: r.title,
    notes: r.notes,
    published: r.published,
    createdAt: r.created_at,
  };
}

function mapAssignment(r: RawAssignment): MusicAssignment {
  return {
    id: r.id,
    eventId: r.event_id,
    memberId: r.member_id,
    memberName: r.member_name,
    funcion: r.funcion as MusicAssignment['funcion'],
    state: r.state as MusicAssignment['state'],
    assignedBy: r.assigned_by,
  };
}

function mapSong(r: RawSong): MusicSong {
  return {
    id: r.id,
    name: r.name,
    nameNormalized: r.name_normalized,
    author: r.author,
    defaultKey: r.default_key,
    historicalKey: r.historical_key,
  };
}

function mapEventSong(r: RawEventSong): EventSong {
  return {
    id: r.id,
    eventId: r.event_id,
    songId: r.song_id,
    songName: r.song_name,
    tono: r.tono,
    orderIndex: r.order_index,
  };
}

function mapSongStat(r: RawSongStat): MusicSongStat {
  return {
    id: r.id,
    name: r.name,
    timesPlayed: r.times_played,
    lastPlayedDate: r.last_played_date,
    historicalKey: r.historical_key,
  };
}

function mapUnavailability(r: RawUnavailability): MusicUnavailability {
  return {
    id: r.id,
    memberId: r.member_id,
    startDate: r.start_date,
    endDate: r.end_date,
    reason: r.reason,
    createdAt: r.created_at,
  };
}

export class MusicService {
  private static base = '/music';

  static async getMembers(): Promise<MusicMember[]> {
    const raw = await ApiService.get<RawMember[]>(`${this.base}/members`);
    return raw.map(mapMember);
  }

  static async createMember(data: CreateMemberRequest): Promise<MusicMember> {
    const raw = await ApiService.post<
      RawMember,
      { user_id: string; funciones: string[]; instrument?: string | null }
    >(`${this.base}/members`, {
      user_id: data.userId,
      funciones: data.funciones,
      instrument: data.instrument,
    });
    return mapMember(raw);
  }

  static async updateMember(id: string, data: UpdateMemberRequest): Promise<MusicMember> {
    const raw = await ApiService.put<RawMember, UpdateMemberRequest>(
      `${this.base}/members/${id}`,
      data
    );
    return mapMember(raw);
  }

  static async deleteMember(id: string): Promise<void> {
    await ApiService.delete(`${this.base}/members/${id}`);
  }

  static async getEvents(params?: { from?: string; to?: string }): Promise<MusicEvent[]> {
    const q = new URLSearchParams();
    if (params?.from) q.append('from', params.from);
    if (params?.to) q.append('to', params.to);
    const qs = q.toString();
    const raw = await ApiService.get<RawEvent[]>(`${this.base}/events${qs ? `?${qs}` : ''}`);
    return raw.map(mapEvent);
  }

  static async getEventById(id: string): Promise<MusicEvent> {
    const raw = await ApiService.get<RawEvent>(`${this.base}/events/${id}`);
    return mapEvent(raw);
  }

  static async createEvent(data: CreateEventRequest): Promise<MusicEvent> {
    const raw = await ApiService.post<
      RawEvent,
      { event_date: string; event_type: string; title?: string; notes?: string }
    >(`${this.base}/events`, {
      event_date: data.eventDate,
      event_type: data.eventType,
      title: data.title,
      notes: data.notes,
    });
    return mapEvent(raw);
  }

  static async updateEvent(id: string, data: Partial<CreateEventRequest>): Promise<MusicEvent> {
    const body: Record<string, unknown> = {};
    if (data.eventDate !== undefined) body.event_date = data.eventDate;
    if (data.eventType !== undefined) body.event_type = data.eventType;
    if (data.title !== undefined) body.title = data.title;
    if (data.notes !== undefined) body.notes = data.notes;
    const raw = await ApiService.put<RawEvent, Record<string, unknown>>(
      `${this.base}/events/${id}`,
      body
    );
    return mapEvent(raw);
  }

  static async deleteEvent(id: string): Promise<void> {
    await ApiService.delete(`${this.base}/events/${id}`);
  }

  static async batchCreateQuarter(
    data: BatchQuarterRequest
  ): Promise<{ created: number; skipped: number }> {
    return ApiService.post<{ created: number; skipped: number }, BatchQuarterRequest>(
      `${this.base}/events/batch-quarter`,
      data
    );
  }

  static async getAssignments(eventId: string): Promise<MusicAssignment[]> {
    const raw = await ApiService.get<RawAssignment[]>(`${this.base}/events/${eventId}/assignments`);
    return raw.map(mapAssignment);
  }

  static async createAssignment(
    eventId: string,
    data: CreateAssignmentRequest
  ): Promise<{ assignment: MusicAssignment; unavailabilityWarning: boolean }> {
    const raw = await ApiService.post<
      RawCreateAssignmentResponse,
      { member_id: string; funcion: string }
    >(`${this.base}/events/${eventId}/assignments`, {
      member_id: data.memberId,
      funcion: data.funcion,
    });
    return {
      assignment: mapAssignment(raw.assignment),
      unavailabilityWarning: raw.unavailability_warning,
    };
  }

  static async updateAssignment(
    id: string,
    data: UpdateAssignmentRequest
  ): Promise<MusicAssignment> {
    const raw = await ApiService.put<RawAssignment, UpdateAssignmentRequest>(
      `${this.base}/assignments/${id}`,
      data
    );
    return mapAssignment(raw);
  }

  static async deleteAssignment(id: string): Promise<void> {
    await ApiService.delete(`${this.base}/assignments/${id}`);
  }

  static async getSuggestions(assignmentId: string): Promise<MusicMember[]> {
    const raw = await ApiService.get<RawMember[]>(
      `${this.base}/assignments/${assignmentId}/suggestions`
    );
    return raw.map(mapMember);
  }

  static async getEventSongs(eventId: string): Promise<EventSong[]> {
    const raw = await ApiService.get<RawEventSong[]>(`${this.base}/events/${eventId}/songs`);
    return raw.map(mapEventSong);
  }

  static async addSongToEvent(eventId: string, data: AddSongToEventRequest): Promise<EventSong> {
    const raw = await ApiService.post<RawEventSong, AddSongToEventRequest>(
      `${this.base}/events/${eventId}/songs`,
      data
    );
    return mapEventSong(raw);
  }

  static async removeSongFromEvent(eventId: string, songId: string): Promise<void> {
    await ApiService.delete(`${this.base}/event-songs/${songId}`);
  }

  static async getSongs(q?: string): Promise<MusicSong[]> {
    const qs = q ? `?q=${encodeURIComponent(q)}` : '';
    const raw = await ApiService.get<RawSong[]>(`${this.base}/songs${qs}`);
    return raw.map(mapSong);
  }

  static async getSongStats(limit?: number): Promise<MusicSongStat[]> {
    const qs = limit !== undefined ? `?limit=${limit}` : '';
    const raw = await ApiService.get<RawSongStat[]>(`${this.base}/songs/stats${qs}`);
    return raw.map(mapSongStat);
  }

  static async getMyAssignments(): Promise<MusicAssignment[]> {
    const raw = await ApiService.get<RawAssignment[]>(`${this.base}/me/assignments`);
    return raw.map(mapAssignment);
  }

  static async getMyUnavailability(): Promise<MusicUnavailability[]> {
    const raw = await ApiService.get<RawUnavailability[]>(`${this.base}/me/unavailability`);
    return raw.map(mapUnavailability);
  }

  static async createUnavailability(
    memberId: string,
    data: CreateUnavailabilityRequest
  ): Promise<MusicUnavailability> {
    const raw = await ApiService.post<
      RawUnavailability,
      { start_date: string; end_date?: string | null; reason?: string }
    >(`${this.base}/members/${memberId}/unavailability`, {
      start_date: data.startDate,
      end_date: data.endDate,
      reason: data.reason,
    });
    return mapUnavailability(raw);
  }

  static async deleteUnavailability(id: string): Promise<void> {
    await ApiService.delete(`${this.base}/unavailability/${id}`);
  }

  static async getMemberUnavailability(memberId: string): Promise<MusicUnavailability[]> {
    const raw = await ApiService.get<RawUnavailability[]>(
      `${this.base}/members/${memberId}/unavailability`
    );
    return raw.map(mapUnavailability);
  }
}
