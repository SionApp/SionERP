import { supabase } from '@/integrations/supabase/client';
import { ApiService } from './api.service';
import type {
  EducationCurriculum,
  EducationCurriculumStatus,
  EducationTrack,
  EducationCourseLevel,
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
  EducationCatalogCourse,
  EducationSyllabusModule,
  EducationHomeAggregate,
  EducationBlock,
  EducationStep,
  EducationLessonDetail,
  EducationLessonProgress,
} from '@/types/education.types';

const ATTACHMENT_BUCKET = 'church-documents';

interface RawCurriculum {
  id: string;
  name: string;
  description: string | null;
  status: EducationCurriculumStatus;
  track: EducationTrack | null;
  level: EducationCourseLevel | null;
  hours: number | null;
  teacher_user_id: string | null;
  teacher_name?: string | null;
  cover_path: string | null;
  objectives: string[] | null;
  requirements: string | null;
  lesson_count: number;
  student_count?: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function mapCurriculum(r: RawCurriculum): EducationCurriculum {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    status: r.status,
    track: r.track,
    level: r.level,
    hours: r.hours,
    teacherUserId: r.teacher_user_id,
    teacherName: r.teacher_name ?? null,
    coverPath: r.cover_path,
    objectives: r.objectives ?? [],
    requirements: r.requirements,
    lessonCount: r.lesson_count,
    studentCount: r.student_count ?? 0,
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
  track?: EducationTrack | null;
  teacher_name?: string | null;
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
    track: r.track ?? null,
    teacherName: r.teacher_name ?? null,
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

  // ── Catálogo, temario y panel del alumno (PR-D) ──

  static async getCatalog(track?: EducationTrack): Promise<EducationCatalogCourse[]> {
    const query = track ? `?track=${encodeURIComponent(track)}` : '';
    const raw = await ApiService.get<
      {
        id: string;
        name: string;
        description: string | null;
        track: EducationTrack | null;
        level: EducationCourseLevel | null;
        hours: number | null;
        teacher_name: string | null;
        cover_path: string | null;
        lesson_count: number;
        student_count: number;
        has_quiz: boolean;
        created_at: string;
      }[]
    >(`${this.base}/catalog${query}`);
    return raw.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      track: c.track,
      level: c.level,
      hours: c.hours,
      teacherName: c.teacher_name,
      coverPath: c.cover_path,
      lessonCount: c.lesson_count,
      studentCount: c.student_count,
      hasQuiz: c.has_quiz,
      createdAt: c.created_at,
    }));
  }

  static async getSyllabus(curriculumId: string): Promise<EducationSyllabusModule[]> {
    const raw = await ApiService.get<
      {
        id: string | null;
        title: string;
        lessons: {
          id: string;
          module_id: string | null;
          order_index: number;
          title: string;
          duration_minutes: number | null;
          state: 'completed' | 'in_progress' | 'pending';
        }[];
      }[]
    >(`${this.base}/curricula/${curriculumId}/syllabus`);
    return raw.map(m => ({
      id: m.id,
      title: m.title,
      lessons: m.lessons.map(l => ({
        id: l.id,
        moduleId: l.module_id,
        orderIndex: l.order_index,
        title: l.title,
        durationMinutes: l.duration_minutes,
        state: l.state,
      })),
    }));
  }

  static async getHome(): Promise<EducationHomeAggregate> {
    const raw = await ApiService.get<{
      in_progress_count: number;
      completed_count: number;
      continue: RawAssignment | null;
      assignments: RawAssignment[];
    }>(`${this.base}/me/home`);
    return {
      inProgressCount: raw.in_progress_count,
      completedCount: raw.completed_count,
      continueAssignment: raw.continue ? mapAssignment(raw.continue) : null,
      assignments: raw.assignments.map(mapAssignment),
    };
  }

  /** Self-serve enroll — idempotent (backend returns the existing assignment id if already enrolled). */
  static async enrollSelf(curriculumId: string): Promise<{ id: string; message: string }> {
    return ApiService.post<{ id: string; message: string }>(
      `${this.base}/curricula/${curriculumId}/enroll`
    );
  }

  /**
   * Marks a lesson complete for the CALLER's own assignment (idempotent —
   * same self-only endpoint PR1-3c already used elsewhere). `LessonViewer`
   * calls this on the last step's primary action ONLY when the lesson has
   * no quiz — a quizzed lesson's completion is a PR-F/G concern (a quiz
   * PASS, not merely reaching the last step).
   */
  static async markLessonComplete(assignmentId: string, lessonId: string): Promise<void> {
    await ApiService.put<{ message: string }>(
      `${this.base}/me/assignments/${assignmentId}/lessons/${lessonId}`
    );
  }

  // ── Visor de lección: pasos + bloques + posición (PR-E) ──

  /**
   * The actual content-serving endpoint (title/steps/blocks/the caller's own
   * step pointer). Same lesson id the syllabus already links to
   * (`curso/:curriculumId/leccion/:lessonId`) — never the design's ordinal.
   */
  static async getLessonDetail(lessonId: string): Promise<EducationLessonDetail> {
    const raw = await ApiService.get<{
      id: string;
      curriculum_id: string;
      module_id: string | null;
      order_index: number;
      title: string;
      duration_minutes: number | null;
      steps: {
        id: string;
        lesson_id: string;
        order_index: number;
        label: string;
        blocks: EducationBlock[];
        created_at: string;
        updated_at: string;
      }[];
      progress: {
        assignment_id: string;
        current_step_id: string | null;
        visited_step_ids: string[];
      } | null;
    }>(`${this.base}/lessons/${lessonId}`);
    return {
      id: raw.id,
      curriculumId: raw.curriculum_id,
      moduleId: raw.module_id,
      orderIndex: raw.order_index,
      title: raw.title,
      durationMinutes: raw.duration_minutes,
      steps: raw.steps.map(
        (s): EducationStep => ({
          id: s.id,
          lessonId: s.lesson_id,
          orderIndex: s.order_index,
          label: s.label,
          blocks: s.blocks ?? [],
          createdAt: s.created_at,
          updatedAt: s.updated_at,
        })
      ),
      progress: raw.progress
        ? ({
            assignmentId: raw.progress.assignment_id,
            currentStepId: raw.progress.current_step_id,
            visitedStepIds: raw.progress.visited_step_ids ?? [],
          } satisfies EducationLessonProgress)
        : null,
    };
  }

  /**
   * Persists the CALLER's own step pointer on every step change — the
   * server pointer this endpoint writes is what LessonViewer reads back via
   * `getLessonDetail`'s `progress` field on the next mount (spec: "Resume
   * after refresh"). Self-only, same PR-B endpoint the design names.
   */
  static async updateLessonPosition(
    assignmentId: string,
    lessonId: string,
    stepId: string
  ): Promise<void> {
    await ApiService.put<{ message: string }, { step_id: string }>(
      `${this.base}/me/assignments/${assignmentId}/lessons/${lessonId}/position`,
      { step_id: stepId }
    );
  }

  /**
   * Reads the CALLER's own answer to a `question` block. `null` (not a
   * thrown error) when no answer exists yet — a 404 from the backend is the
   * expected "never answered" state, not a failure.
   */
  static async getReflection(lessonId: string, blockId: string): Promise<string | null> {
    try {
      const raw = await ApiService.get<{ answer: string }>(
        `${this.base}/lessons/${lessonId}/reflections/${blockId}`
      );
      return raw.answer;
    } catch (err) {
      if ((err as { status?: number }).status === 404) return null;
      throw err;
    }
  }

  /** Writes (creates or updates) the CALLER's own reflection answer. */
  static async upsertReflection(lessonId: string, blockId: string, answer: string): Promise<void> {
    await ApiService.put<{ message: string }, { answer: string }>(
      `${this.base}/lessons/${lessonId}/reflections/${blockId}`,
      { answer }
    );
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

  /**
   * Signed URL for an `image`/`pdf` block's asset (PR-E, `blocks/ImageBlock`
   * and `blocks/PdfBlock` — spec: "Lesson assets are private ... served only
   * by time-limited signed URL"). A DELIBERATELY longer TTL than
   * `getLessonAttachmentSignedUrl`'s 60s: that helper backs a one-shot
   * "open the attachment" download link, while this one backs an `<img>`/
   * embed that must stay valid for as long as a student is reading the
   * step — 60s would break mid-read. Same private bucket, same
   * `education/{curriculum_id}/...` path convention, no behavior change to
   * the existing helper.
   */
  static async getEducationAssetSignedUrl(storagePath: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .createSignedUrl(storagePath, 3600);
    if (error || !data) {
      throw new Error('Error al generar el enlace del recurso');
    }
    return data.signedUrl;
  }
}
