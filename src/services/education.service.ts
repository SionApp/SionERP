import { supabase } from '@/integrations/supabase/client';
import { ApiService } from './api.service';
import type {
  EducationCadence,
  EducationCurriculum,
  EducationCurriculumStatus,
  CreateCurriculumRequest,
  UpdateCurriculumRequest,
  EducationLesson,
  CreateLessonRequest,
  UpdateLessonRequest,
  EducationAssignment,
  EducationAssignmentStatus,
  EducationSourceModule,
  CreateAssignmentsRequest,
  CreateAssignmentsResult,
} from '@/types/education.types';

const ATTACHMENT_BUCKET = 'church-documents';

interface RawCurriculum {
  id: string;
  name: string;
  description: string | null;
  cadence: EducationCadence;
  status: EducationCurriculumStatus;
  lesson_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function mapCurriculum(r: RawCurriculum): EducationCurriculum {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    cadence: r.cadence,
    status: r.status,
    lessonCount: r.lesson_count,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

interface RawAssignment {
  id: string;
  curriculum_id: string;
  curriculum_name: string;
  assigned_to: string;
  assigned_by: string | null;
  source_module: EducationSourceModule | null;
  source_ref_id: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  completed_lessons: number;
  total_lessons: number;
  status: EducationAssignmentStatus;
  assigned_to_name?: string | null;
  assigned_to_email?: string | null;
}

function mapAssignment(r: RawAssignment): EducationAssignment {
  return {
    id: r.id,
    curriculumId: r.curriculum_id,
    curriculumName: r.curriculum_name,
    assignedTo: r.assigned_to,
    assignedBy: r.assigned_by,
    sourceModule: r.source_module,
    sourceRefId: r.source_ref_id,
    dueDate: r.due_date,
    completedAt: r.completed_at,
    createdAt: r.created_at,
    completedLessons: r.completed_lessons,
    totalLessons: r.total_lessons,
    status: r.status,
    assignedToName: r.assigned_to_name ?? null,
    assignedToEmail: r.assigned_to_email ?? null,
  };
}

interface RawLesson {
  id: string;
  curriculum_id: string;
  order_index: number;
  title: string;
  content: string | null;
  attachment_path: string | null;
  attachment_name: string | null;
  created_at: string;
  updated_at: string;
}

function mapLesson(r: RawLesson): EducationLesson {
  return {
    id: r.id,
    curriculumId: r.curriculum_id,
    orderIndex: r.order_index,
    title: r.title,
    content: r.content,
    attachmentPath: r.attachment_path,
    attachmentName: r.attachment_name,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export class EducationService {
  private static base = '/education';

  /** hasRole=false means the backend returned no_module_role (404): the user has no education grant. */
  static async getMyModuleRole(): Promise<{
    roleLevel: number;
    isAuthor: boolean;
    isModuleAdmin: boolean;
    hasRole: boolean;
  }> {
    try {
      const raw = await ApiService.get<{ role_level?: number }>(
        '/permissions/module-role?module=education'
      );
      const level = raw.role_level ?? 0;
      return { roleLevel: level, isAuthor: level >= 3, isModuleAdmin: level >= 5, hasRole: true };
    } catch {
      return { roleLevel: 0, isAuthor: false, isModuleAdmin: false, hasRole: false };
    }
  }

  static async getCurricula(): Promise<EducationCurriculum[]> {
    const raw = await ApiService.get<RawCurriculum[]>(`${this.base}/curricula`);
    return raw.map(mapCurriculum);
  }

  static async getCurriculumById(id: string): Promise<EducationCurriculum> {
    const raw = await ApiService.get<RawCurriculum>(`${this.base}/curricula/${id}`);
    return mapCurriculum(raw);
  }

  static async createCurriculum(data: CreateCurriculumRequest): Promise<{ id: string }> {
    return ApiService.post<{ id: string; message: string }, CreateCurriculumRequest>(
      `${this.base}/curricula`,
      data
    );
  }

  static async updateCurriculum(id: string, data: UpdateCurriculumRequest): Promise<void> {
    await ApiService.put<{ message: string }, UpdateCurriculumRequest>(
      `${this.base}/curricula/${id}`,
      data
    );
  }

  static async updateCurriculumStatus(
    id: string,
    status: EducationCurriculumStatus
  ): Promise<void> {
    await ApiService.patch<{ message: string }, { status: EducationCurriculumStatus }>(
      `${this.base}/curricula/${id}/status`,
      { status }
    );
  }

  static async deleteCurriculum(id: string): Promise<void> {
    await ApiService.delete(`${this.base}/curricula/${id}`);
  }

  // ── Lecciones ──

  static async getLessons(curriculumId: string): Promise<EducationLesson[]> {
    const raw = await ApiService.get<RawLesson[]>(`${this.base}/curricula/${curriculumId}/lessons`);
    return raw.map(mapLesson);
  }

  static async createLesson(
    curriculumId: string,
    data: CreateLessonRequest
  ): Promise<{ id: string }> {
    return ApiService.post<
      { id: string; message: string },
      {
        title: string;
        content?: string;
        attachment_path?: string;
        attachment_name?: string;
        order_index?: number;
      }
    >(`${this.base}/curricula/${curriculumId}/lessons`, {
      title: data.title,
      content: data.content,
      attachment_path: data.attachmentPath,
      attachment_name: data.attachmentName,
      order_index: data.orderIndex,
    });
  }

  // PUT semantics: reemplaza content/attachment por completo (el backend NO
  // hace COALESCE en esos campos, sólo en title) — siempre mandar el estado
  // completo del formulario, nunca sólo el campo que cambió.
  static async updateLesson(id: string, data: UpdateLessonRequest): Promise<void> {
    await ApiService.put<
      { message: string },
      {
        title?: string;
        content?: string;
        attachment_path?: string;
        attachment_name?: string;
      }
    >(`${this.base}/lessons/${id}`, {
      title: data.title,
      content: data.content,
      attachment_path: data.attachmentPath,
      attachment_name: data.attachmentName,
    });
  }

  static async deleteLesson(id: string): Promise<void> {
    await ApiService.delete(`${this.base}/lessons/${id}`);
  }

  static async reorderLessons(
    curriculumId: string,
    order: { id: string; orderIndex: number }[]
  ): Promise<void> {
    await ApiService.put<{ message: string }, { lessons: { id: string; order_index: number }[] }>(
      `${this.base}/curricula/${curriculumId}/lessons/reorder`,
      {
        lessons: order.map(o => ({ id: o.id, order_index: o.orderIndex })),
      }
    );
  }

  // ── Asignaciones + progreso (PR3a backend, admin view — level 3+) ──

  static async getCurriculumProgress(curriculumId: string): Promise<EducationAssignment[]> {
    const raw = await ApiService.get<RawAssignment[]>(
      `${this.base}/curricula/${curriculumId}/progress`
    );
    return raw.map(mapAssignment);
  }

  static async createAssignments(data: CreateAssignmentsRequest): Promise<CreateAssignmentsResult> {
    return ApiService.post<
      CreateAssignmentsResult,
      {
        curriculum_id: string;
        user_ids: string[];
        due_date?: string;
        source_module?: EducationSourceModule;
        source_ref_id?: string;
      }
    >(`${this.base}/assignments`, {
      curriculum_id: data.curriculumId,
      user_ids: data.userIds,
      due_date: data.dueDate,
      source_module: data.sourceModule,
      source_ref_id: data.sourceRefId,
    });
  }

  static async deleteAssignment(id: string): Promise<void> {
    await ApiService.delete(`${this.base}/assignments/${id}`);
  }

  // ── Adjuntos de lección (bucket privado church-documents) ──
  // Convención de ruta: education/{curriculum_id}/{archivo} — igual a la
  // política de storage de la migración 20260901000001. Nunca getPublicUrl
  // acá, sólo URLs firmadas temporales (mismo patrón que user.service.ts).

  static async uploadLessonAttachment(
    curriculumId: string,
    file: File
  ): Promise<{ path: string; name: string }> {
    const path = `education/${curriculumId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .upload(path, file, { cacheControl: '3600', upsert: false });
    if (uploadError) {
      throw new Error('Error al subir el adjunto');
    }
    return { path, name: file.name };
  }

  static async getLessonAttachmentSignedUrl(storagePath: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .createSignedUrl(storagePath, 60);
    if (error || !data) {
      throw new Error('Error al generar el enlace del adjunto');
    }
    return data.signedUrl;
  }

  static async removeLessonAttachment(storagePath: string): Promise<void> {
    await supabase.storage.from(ATTACHMENT_BUCKET).remove([storagePath]);
  }
}
