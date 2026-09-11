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
  LessonOrderEntry,
  EducationCourseModule,
  CreateCourseModuleRequest,
  UpdateCourseModuleRequest,
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
  EducationSyllabusLessonState,
  CreateStepRequest,
  UpdateStepRequest,
  StepOrderEntry,
  LessonBookmark,
  QuizRunnerView,
  QuizRunnerQuestion,
  QuizRunnerOption,
  SaveQuizAnswerRequest,
  QuizResultView,
  QuizResultQuestion,
  QuizResultVerdict,
  QuizPendingReviewItem,
  QuizReviewQueueItem,
  QuizAuthorView,
  QuizAuthorQuestion,
  QuizAuthorOption,
  UpsertQuizRequest,
  RosterStudent,
  StudentRoster,
  LessonFunnelPoint,
  ReviewAnswerRequest,
} from '@/types/education.types';

const ATTACHMENT_BUCKET = 'church-documents';
// Course covers live on the PUBLIC bucket (RLS-whitelisted for the
// `education/%` prefix since PR-A's migration, section 7) — never the
// private `church-documents` bucket lesson media uses. Same bucket/pattern
// `EventsService.uploadImage` already established (events.service.ts).
const COVER_BUCKET = 'church-assets';

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
  module_id: string | null;
  order_index: number;
  title: string;
  duration_minutes: number | null;
  created_at: string;
  updated_at: string;
}

function mapLesson(r: RawLesson): EducationLesson {
  return {
    id: r.id,
    curriculumId: r.curriculum_id,
    moduleId: r.module_id,
    orderIndex: r.order_index,
    title: r.title,
    durationMinutes: r.duration_minutes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

interface RawCourseModule {
  id: string;
  curriculum_id: string;
  order_index: number;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

function mapCourseModule(r: RawCourseModule): EducationCourseModule {
  return {
    id: r.id,
    curriculumId: r.curriculum_id,
    orderIndex: r.order_index,
    title: r.title,
    description: r.description,
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
    return ApiService.post<
      { id: string; message: string },
      {
        name: string;
        description?: string;
        track?: EducationTrack;
        level?: EducationCourseLevel;
        hours?: number;
        teacher_user_id?: string;
        cover_path?: string;
        objectives?: string[];
        requirements?: string;
      }
    >(`${this.base}/curricula`, {
      name: data.name,
      description: data.description,
      track: data.track,
      level: data.level,
      hours: data.hours,
      teacher_user_id: data.teacherUserId,
      cover_path: data.coverPath,
      objectives: data.objectives,
      requirements: data.requirements,
    });
  }

  static async updateCurriculum(id: string, data: UpdateCurriculumRequest): Promise<void> {
    await ApiService.put<
      { message: string },
      {
        name?: string;
        description?: string;
        track?: EducationTrack | '';
        level?: EducationCourseLevel;
        hours?: number;
        teacher_user_id?: string;
        cover_path?: string;
        objectives?: string[];
        requirements?: string;
      }
    >(`${this.base}/curricula/${id}`, {
      name: data.name,
      description: data.description,
      track: data.track,
      level: data.level,
      hours: data.hours,
      teacher_user_id: data.teacherUserId,
      cover_path: data.coverPath,
      objectives: data.objectives,
      requirements: data.requirements,
    });
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

  // ── Lecciones (shell: título/módulo/duración/posición — el contenido por
  // pasos/bloques se maneja aparte, ver getLessonDetail más abajo) ──

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
      { title: string; module_id?: string | null; duration_minutes?: number; order_index?: number }
    >(`${this.base}/curricula/${curriculumId}/lessons`, {
      title: data.title,
      module_id: data.moduleId,
      duration_minutes: data.durationMinutes,
      order_index: data.orderIndex,
    });
  }

  static async updateLesson(id: string, data: UpdateLessonRequest): Promise<void> {
    await ApiService.put<
      { message: string },
      { title?: string; module_id?: string | null; duration_minutes?: number }
    >(`${this.base}/lessons/${id}`, {
      title: data.title,
      module_id: data.moduleId,
      duration_minutes: data.durationMinutes,
    });
  }

  static async deleteLesson(id: string): Promise<void> {
    await ApiService.delete(`${this.base}/lessons/${id}`);
  }

  /**
   * Bulk lesson-order/move-between-modules operation (PR-B's `SetLessonOrder`,
   * spec: "Reordering and moving between modules MUST be one bulk operation").
   * `ModuleLessonTree` always sends the FULL ordered set of the curriculum's
   * lessons on every reorder or cross-module move — never a single-lesson
   * PATCH — course-wide `order_index` stays unique regardless of module.
   */
  static async setLessonOrder(curriculumId: string, lessons: LessonOrderEntry[]): Promise<void> {
    await ApiService.put<
      { message: string },
      { lessons: { id: string; module_id: string | null; order_index: number }[] }
    >(`${this.base}/curricula/${curriculumId}/lesson-order`, {
      lessons: lessons.map(l => ({ id: l.id, module_id: l.moduleId, order_index: l.orderIndex })),
    });
  }

  // ── Módulos de curso (PR-B, education-catalog "Course modules group
  // lessons without owning order") ──

  static async getCourseModules(curriculumId: string): Promise<EducationCourseModule[]> {
    const raw = await ApiService.get<RawCourseModule[]>(
      `${this.base}/curricula/${curriculumId}/modules`
    );
    return raw.map(mapCourseModule);
  }

  static async createCourseModule(
    curriculumId: string,
    data: CreateCourseModuleRequest
  ): Promise<{ id: string }> {
    return ApiService.post<
      { id: string; message: string },
      { title: string; description?: string; order_index?: number }
    >(`${this.base}/curricula/${curriculumId}/modules`, {
      title: data.title,
      description: data.description,
      order_index: data.orderIndex,
    });
  }

  static async updateCourseModule(id: string, data: UpdateCourseModuleRequest): Promise<void> {
    await ApiService.put<{ message: string }, { title?: string; description?: string }>(
      `${this.base}/modules/${id}`,
      { title: data.title, description: data.description }
    );
  }

  static async deleteCourseModule(id: string): Promise<void> {
    await ApiService.delete(`${this.base}/modules/${id}`);
  }

  static async reorderCourseModules(
    curriculumId: string,
    modules: { id: string; orderIndex: number }[]
  ): Promise<void> {
    await ApiService.put<{ message: string }, { modules: { id: string; order_index: number }[] }>(
      `${this.base}/curricula/${curriculumId}/modules/reorder`,
      { modules: modules.map(m => ({ id: m.id, order_index: m.orderIndex })) }
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
          state: EducationSyllabusLessonState;
          has_quiz: boolean;
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
        hasQuiz: l.has_quiz,
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

  // ── Editor de bloques — CRUD de pasos (PR-I, tasks-v2-part2, author
  // level >= 3). Wire request shapes mirror `CreateStep`/`UpdateStep`/
  // `ReorderSteps` (handlers/education_steps.go) field-for-field — never
  // guessed. Every write funnels through the server's `ValidateLessonBlocks`
  // (the ONLY write path into `education_lesson_steps.blocks`); a malformed
  // block shape comes back as a 400, surfaced by the caller (LessonEditor's
  // autosave hook) rather than silently swallowed here. ──

  static async createStep(lessonId: string, req: CreateStepRequest): Promise<{ id: string }> {
    return ApiService.post<
      { id: string; message: string },
      { label: string; blocks?: EducationBlock[]; order_index?: number }
    >(`${this.base}/lessons/${lessonId}/steps`, {
      label: req.label,
      blocks: req.blocks,
      order_index: req.orderIndex,
    });
  }

  static async updateStep(lessonId: string, stepId: string, req: UpdateStepRequest): Promise<void> {
    await ApiService.put<{ message: string }, { label?: string; blocks?: EducationBlock[] }>(
      `${this.base}/lessons/${lessonId}/steps/${stepId}`,
      {
        label: req.label,
        blocks: req.blocks,
      }
    );
  }

  static async deleteStep(lessonId: string, stepId: string): Promise<void> {
    await ApiService.delete<{ message: string }>(
      `${this.base}/lessons/${lessonId}/steps/${stepId}`
    );
  }

  /** Sends the FULL ordered set of the lesson's steps — same "bulk operation,
   * never a partial PATCH" convention `ModuleLessonTree`'s lesson reorder
   * already established (`SetLessonOrder`). */
  static async reorderSteps(lessonId: string, entries: StepOrderEntry[]): Promise<void> {
    await ApiService.put<{ message: string }, { steps: { id: string; order_index: number }[] }>(
      `${this.base}/lessons/${lessonId}/steps/reorder`,
      { steps: entries.map(e => ({ id: e.id, order_index: e.orderIndex })) }
    );
  }

  // ── Marcadores de lección (bookmarks) — pequeño follow-up que cierra el
  // gap del design handoff: la pill "Guardar" del visor (README §4) no
  // tenía especificación de comportamiento más allá del ícono. Servidor,
  // NO localStorage — visible desde `StudentHome` en cualquier dispositivo.
  // Independiente de progreso/asignaciones. Ambos writes son idempotentes
  // (el backend nunca falla al repetir la misma acción). ──

  /** Idempotente — guardar una lección ya guardada simplemente succeeds. */
  static async bookmarkLesson(lessonId: string): Promise<void> {
    await ApiService.put<{ message: string }>(`${this.base}/me/lessons/${lessonId}/bookmark`);
  }

  /** Idempotente — quitar una lección ya no guardada simplemente succeeds. */
  static async unbookmarkLesson(lessonId: string): Promise<void> {
    await ApiService.delete<{ message: string }>(`${this.base}/me/lessons/${lessonId}/bookmark`);
  }

  /** La lista de lecciones guardadas del caller — alimenta `BookmarksCard` en StudentHome. */
  static async getMyBookmarks(): Promise<LessonBookmark[]> {
    const raw = await ApiService.get<
      {
        id: string;
        lesson_id: string;
        lesson_title: string;
        curriculum_id: string;
        curriculum_name: string;
        module_title: string | null;
        created_at: string;
      }[]
    >(`${this.base}/me/bookmarks`);
    return raw.map(b => ({
      id: b.id,
      lessonId: b.lesson_id,
      lessonTitle: b.lesson_title,
      curriculumId: b.curriculum_id,
      curriculumName: b.curriculum_name,
      moduleTitle: b.module_title,
      createdAt: b.created_at,
    }));
  }

  // ── Adjuntos de lección (bucket privado church-documents) ──
  // Convención de ruta: education/{curriculum_id}/{archivo} — igual a la
  // política de storage de la migración 20260901000001. Nunca getPublicUrl
  // acá, sólo URLs firmadas temporales (mismo patrón que user.service.ts).
  // `uploadLessonAttachment`/`getLessonAttachmentSignedUrl` (PR2c's legacy
  // one-shot attachment flow, consumed only by the now-deleted `LessonList.
  // tsx`) were removed in PR-H — lesson media goes through step `blocks`
  // (`image`/`pdf` block types) since PR-A/E, served by the signed-URL
  // helper right below.

  /**
   * Signed URL for an `image`/`pdf` block's asset (PR-E, `blocks/ImageBlock`
   * and `blocks/PdfBlock` — spec: "Lesson assets are private ... served only
   * by time-limited signed URL"). A 1-hour TTL — long enough that an `<img>`/
   * embed stays valid for as long as a student is reading the step. Private
   * bucket, `education/{curriculum_id}/...` path convention.
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

  /**
   * Uploads an `image`/`pdf` block's asset from the block editor (PR-I,
   * `BlockCardBody`'s media upload zone) to the SAME private bucket +
   * `education/{curriculum_id}/...` path convention `getEducationAssetSignedUrl`
   * above already reads from — never the public `church-assets` bucket
   * `uploadCourseCover` uses (design threat matrix: "Private lesson media
   * leaking publicly"). Returns only the storage PATH; the caller stores
   * that path on the block's `data.path` and reads it back through the
   * signed-URL helper, exactly like `CoverUpload`'s path/File separation.
   */
  static async uploadLessonAsset(curriculumId: string, file: File): Promise<{ path: string }> {
    const ext = file.name.split('.').pop();
    const path = `education/${curriculumId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) {
      throw new Error('Error al subir el archivo');
    }
    return { path };
  }

  // ── Portada de curso (PR-H, bucket público church-assets) ──
  // `education/covers/{path}` — RLS-whitelisted since PR-A's migration
  // (section 7, storage.objects policies extended with `education/%`).
  // PUBLIC bucket + `getPublicUrl` on purpose (unlike lesson media above):
  // course covers render on the unauthenticated-looking catalog card grid
  // the same way `EventsService.uploadImage` already treats event images —
  // never a signed URL for this one.

  static async uploadCourseCover(file: File): Promise<{ path: string; publicUrl: string }> {
    const fileExt = file.name.split('.').pop();
    const path = `education/covers/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from(COVER_BUCKET)
      .upload(path, file, { cacheControl: '3600', upsert: false });
    if (uploadError) {
      throw new Error('Error al subir la portada');
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from(COVER_BUCKET).getPublicUrl(path);
    return { path, publicUrl };
  }

  /** Derives the public URL for an already-uploaded cover path — no network call. */
  static getCoverPublicUrl(coverPath: string): string {
    return supabase.storage.from(COVER_BUCKET).getPublicUrl(coverPath).data.publicUrl;
  }

  // ── Quiz — runtime del alumno (PR-G) ──
  // Wire shapes mirror models.QuizRunnerView / models.QuizResultView
  // (education_quiz_runner.go / education_quiz.go) field-for-field — see
  // that Go file's own header comment on why the runner shape structurally
  // cannot carry a correctness flag. mapQuizRunnerView/mapQuizResultView
  // below are the ONLY place snake_case → camelCase happens for these
  // types; no other file in this module unmarshals raw quiz JSON.

  private static mapQuizRunnerOption(o: { id: string; text: string }): QuizRunnerOption {
    return { id: o.id, text: o.text };
  }

  private static mapQuizRunnerQuestion(q: {
    id: string;
    position: number;
    type: QuizRunnerQuestion['type'];
    prompt: string;
    points: number;
    selected_option_id: string | null;
    text_answer: string | null;
    options: { id: string; text: string }[];
  }): QuizRunnerQuestion {
    return {
      id: q.id,
      position: q.position,
      type: q.type,
      prompt: q.prompt,
      points: q.points,
      selectedOptionId: q.selected_option_id,
      textAnswer: q.text_answer,
      options: (q.options ?? []).map(EducationService.mapQuizRunnerOption),
    };
  }

  private static mapQuizRunnerView(raw: {
    id: string;
    lesson_id: string;
    attempt_id: string;
    attempt_number: number;
    attempts_left: number;
    time_limit_minutes: number | null;
    expires_at: string | null;
    show_result: boolean;
    max_score: number;
    questions: Parameters<typeof EducationService.mapQuizRunnerQuestion>[0][];
  }): QuizRunnerView {
    return {
      id: raw.id,
      lessonId: raw.lesson_id,
      attemptId: raw.attempt_id,
      attemptNumber: raw.attempt_number,
      attemptsLeft: raw.attempts_left,
      timeLimitMinutes: raw.time_limit_minutes,
      expiresAt: raw.expires_at,
      showResult: raw.show_result,
      maxScore: raw.max_score,
      questions: (raw.questions ?? []).map(EducationService.mapQuizRunnerQuestion),
    };
  }

  private static mapQuizResultView(raw: {
    attempt_id: string;
    attempt_number: number;
    auto_score: number;
    max_score: number;
    pass_score: number;
    passed: boolean | null;
    review_pending: boolean;
    can_retry: boolean;
    next_lesson_id: string | null;
    questions:
      | {
          id: string;
          prompt: string;
          verdict: QuizResultVerdict;
          your_option_text: string | null;
          your_text_answer: string | null;
          correct_text: string | null;
          feedback: string | null;
        }[]
      | null;
  }): QuizResultView {
    return {
      attemptId: raw.attempt_id,
      attemptNumber: raw.attempt_number,
      autoScore: raw.auto_score,
      maxScore: raw.max_score,
      passScore: raw.pass_score,
      passed: raw.passed,
      reviewPending: raw.review_pending,
      canRetry: raw.can_retry,
      nextLessonId: raw.next_lesson_id,
      questions: raw.questions
        ? raw.questions.map(
            (q): QuizResultQuestion => ({
              id: q.id,
              prompt: q.prompt,
              verdict: q.verdict,
              yourOptionText: q.your_option_text,
              yourTextAnswer: q.your_text_answer,
              correctText: q.correct_text,
              feedback: q.feedback,
            })
          )
        : null,
    };
  }

  /**
   * Pre-submit quiz view for the caller's own current OPEN attempt, if any
   * (no side effect — does not create an attempt). `attemptId` comes back
   * empty when the caller hasn't started yet; `QuizRunner` calls
   * `startQuizAttempt` in that case, which is idempotent.
   */
  static async getQuizRunner(lessonId: string): Promise<QuizRunnerView> {
    const raw = await ApiService.get(`${this.base}/me/lessons/${lessonId}/quiz`);
    return EducationService.mapQuizRunnerView(
      raw as Parameters<typeof EducationService.mapQuizRunnerView>[0]
    );
  }

  /**
   * Whether the caller already has an attempt on this lesson's quiz, and
   * whether it's submitted — lets the lesson viewer route straight to the
   * existing result (resuelto or en revisión) instead of into
   * `startQuizAttempt`, which 409s once the retry ceiling is reached.
   */
  static async getMyLatestQuizAttempt(
    lessonId: string
  ): Promise<{ attemptId: string | null; submitted: boolean }> {
    const raw = (await ApiService.get(
      `${this.base}/me/lessons/${lessonId}/quiz/latest-attempt`
    )) as { attempt_id: string | null; submitted: boolean };
    return { attemptId: raw.attempt_id, submitted: raw.submitted };
  }

  /**
   * Creates a new attempt OR returns the caller's existing OPEN one
   * (backend-idempotent, PR-F's StartAttempt — safe to call again to
   * resume, e.g. after a refresh). Always returns the full runner view.
   */
  static async startQuizAttempt(lessonId: string): Promise<QuizRunnerView> {
    const raw = await ApiService.post(`${this.base}/me/lessons/${lessonId}/quiz/attempts`);
    return EducationService.mapQuizRunnerView(
      raw as Parameters<typeof EducationService.mapQuizRunnerView>[0]
    );
  }

  /**
   * Upserts a DRAFT answer pre-submission. Exactly one of
   * `selectedOptionId`/`textAnswer` must be set (backend rejects both-or-
   * neither) — `QuizRunner` never sends both.
   */
  static async saveQuizAnswer(
    lessonId: string,
    attemptId: string,
    payload: SaveQuizAnswerRequest
  ): Promise<void> {
    await ApiService.put<
      { message: string },
      { question_id: string; selected_option_id?: string; text_answer?: string }
    >(`${this.base}/me/lessons/${lessonId}/quiz/attempts/${attemptId}/answers`, {
      question_id: payload.questionId,
      selected_option_id: payload.selectedOptionId,
      text_answer: payload.textAnswer,
    });
  }

  /** Grades server-side and returns the QuizResultView — the only path that computes `passed`. */
  static async submitQuizAttempt(lessonId: string, attemptId: string): Promise<QuizResultView> {
    const raw = await ApiService.post(
      `${this.base}/me/lessons/${lessonId}/quiz/attempts/${attemptId}/submit`
    );
    return EducationService.mapQuizResultView(
      raw as Parameters<typeof EducationService.mapQuizResultView>[0]
    );
  }

  /** Re-fetches a submitted attempt's result (resume/refresh on the result screen). */
  static async getQuizAttemptResult(attemptId: string): Promise<QuizResultView> {
    const raw = await ApiService.get(`${this.base}/me/quiz-attempts/${attemptId}`);
    return EducationService.mapQuizResultView(
      raw as Parameters<typeof EducationService.mapQuizResultView>[0]
    );
  }

  /**
   * The caller's OWN submitted-but-ungraded `short`-answer attempts — powers
   * `PendingQuizAlert`. Self-only, church-scoped (PR-G addition to the quiz
   * backend, see `handlers/education_quiz_runner.go`'s
   * `GetMyPendingReviews`).
   */
  static async getMyPendingReviews(): Promise<QuizPendingReviewItem[]> {
    const raw = await ApiService.get<
      {
        attempt_id: string;
        lesson_id: string;
        lesson_title: string;
        curriculum_id: string;
        curriculum_name: string;
        due_date: string | null;
        submitted_at: string;
      }[]
    >(`${this.base}/me/quiz-attempts/pending-review`);
    return raw.map(r => ({
      attemptId: r.attempt_id,
      lessonId: r.lesson_id,
      lessonTitle: r.lesson_title,
      curriculumId: r.curriculum_id,
      curriculumName: r.curriculum_name,
      dueDate: r.due_date,
      submittedAt: r.submitted_at,
    }));
  }

  /**
   * Every `short`-answer response still awaiting manual grading, church-wide
   * (level >= 3). PR-H reuses this read-only for `AdminCourseList`'s "Por
   * revisar" KPI count — the full grading workflow is PR-K's `ReviewQueue.tsx`.
   */
  static async getReviewQueue(): Promise<QuizReviewQueueItem[]> {
    const raw = await ApiService.get<
      {
        answer_id: string;
        attempt_id: string;
        question_id: string;
        prompt: string;
        points: number;
        text_answer: string;
        student_name: string;
        lesson_id: string;
        lesson_title: string;
        submitted_at: string;
      }[]
    >(`${this.base}/reviews`);
    return raw.map(r => ({
      answerId: r.answer_id,
      attemptId: r.attempt_id,
      questionId: r.question_id,
      prompt: r.prompt,
      points: r.points,
      textAnswer: r.text_answer,
      studentName: r.student_name,
      lessonId: r.lesson_id,
      lessonTitle: r.lesson_title,
      submittedAt: r.submitted_at,
    }));
  }

  // ── Quiz — admin authoring (PR-J, education-quiz-authoring) ──
  // Wire shapes mirror `models.QuizAuthorView`/`QuizAuthorQuestion`/
  // `QuizAuthorOption` (education_quiz.go) field-for-field — see that Go
  // file's header for why this is the ONLY family that ever carries
  // `is_correct`/`feedback_ok`/`feedback_bad`. Never imported by any
  // `student/*` file.

  private static mapQuizAuthorOption(o: {
    id: string;
    order_index: number;
    text: string;
    is_correct: boolean;
  }): QuizAuthorOption {
    return { id: o.id, orderIndex: o.order_index, text: o.text, isCorrect: o.is_correct };
  }

  private static mapQuizAuthorQuestion(q: {
    id: string;
    order_index: number;
    type: QuizAuthorQuestion['type'];
    prompt: string;
    points: number;
    feedback_ok: string | null;
    feedback_bad: string | null;
    answer_count: number;
    options: Parameters<typeof EducationService.mapQuizAuthorOption>[0][];
  }): QuizAuthorQuestion {
    return {
      id: q.id,
      orderIndex: q.order_index,
      type: q.type,
      prompt: q.prompt,
      points: q.points,
      feedbackOk: q.feedback_ok,
      feedbackBad: q.feedback_bad,
      answerCount: q.answer_count,
      options: (q.options ?? []).map(EducationService.mapQuizAuthorOption),
    };
  }

  private static mapQuizAuthorView(raw: {
    id: string;
    lesson_id: string;
    pass_score: number;
    time_limit_minutes: number | null;
    shuffle_options: boolean;
    allow_retry: boolean;
    show_result: boolean;
    questions: Parameters<typeof EducationService.mapQuizAuthorQuestion>[0][];
  }): QuizAuthorView {
    return {
      id: raw.id,
      lessonId: raw.lesson_id,
      passScore: raw.pass_score,
      timeLimitMinutes: raw.time_limit_minutes,
      shuffleOptions: raw.shuffle_options,
      allowRetry: raw.allow_retry,
      showResult: raw.show_result,
      questions: (raw.questions ?? []).map(EducationService.mapQuizAuthorQuestion),
    };
  }

  /**
   * The full answer-key-carrying quiz tree for one lesson (level >= 3).
   * `null` (not a thrown error) when the lesson has no quiz yet — the
   * backend's 404 ("Esta lección todavía no tiene quiz") is the expected
   * "not authored yet" state, not a failure, same convention as
   * `getReflection`'s 404-as-null handling above.
   */
  static async getQuizAuthor(lessonId: string): Promise<QuizAuthorView | null> {
    try {
      const raw = await ApiService.get(`${this.base}/lessons/${lessonId}/quiz`);
      return EducationService.mapQuizAuthorView(
        raw as Parameters<typeof EducationService.mapQuizAuthorView>[0]
      );
    } catch (err) {
      if ((err as { status?: number }).status === 404) return null;
      throw err;
    }
  }

  /**
   * Saves the FULL quiz tree in one request (`UpsertQuiz` — no separate
   * per-question/per-option route). A question absent from `payload.
   * questions` is deleted server-side; `payload.force` must be `true` when
   * deleting a question that already has student answers, or the backend
   * refuses with 409 naming the real answer count.
   */
  static async upsertQuiz(lessonId: string, payload: UpsertQuizRequest): Promise<QuizAuthorView> {
    const raw = await ApiService.put(`${this.base}/lessons/${lessonId}/quiz`, {
      pass_score: payload.passScore,
      time_limit_minutes: payload.timeLimitMinutes,
      shuffle_options: payload.shuffleOptions,
      allow_retry: payload.allowRetry,
      show_result: payload.showResult,
      force: payload.force ?? false,
      questions: payload.questions.map(q => ({
        id: q.id,
        order_index: q.orderIndex,
        type: q.type,
        prompt: q.prompt,
        points: q.points,
        feedback_ok: q.feedbackOk,
        feedback_bad: q.feedbackBad,
        options: q.options.map(o => ({
          id: o.id,
          order_index: o.orderIndex,
          text: o.text,
          is_correct: o.isCorrect,
        })),
      })),
    });
    return EducationService.mapQuizAuthorView(
      raw as Parameters<typeof EducationService.mapQuizAuthorView>[0]
    );
  }

  // ── Analytics + review queue (PR-K, education-manual-review /
  // education-assignments DELTA) ──

  private static mapRosterStudent(r: {
    assignment_id: string;
    user_id: string;
    name: string;
    email: string;
    status: EducationAssignmentStatus;
    completed_lessons: number;
    total_lessons: number;
    progress_pct: number;
    due_date: string | null;
    last_quiz_score: number | null;
    last_quiz_max: number | null;
    last_quiz_verdict: 'passed' | 'failed' | 'in_review' | null;
  }): RosterStudent {
    return {
      assignmentId: r.assignment_id,
      userId: r.user_id,
      name: r.name,
      email: r.email,
      status: r.status,
      completedLessons: r.completed_lessons,
      totalLessons: r.total_lessons,
      progressPct: r.progress_pct,
      dueDate: r.due_date,
      lastQuizScore: r.last_quiz_score,
      lastQuizMax: r.last_quiz_max,
      lastQuizVerdict: r.last_quiz_verdict,
    };
  }

  /** `GET /education/curricula/:id/roster` — StudentProgress.tsx's roster + 4 KPIs, one round trip. */
  static async getStudentRoster(curriculumId: string): Promise<StudentRoster> {
    const raw = await ApiService.get<{
      curriculum_id: string;
      curriculum_name: string;
      kpis: {
        active_students: number;
        avg_progress_pct: number;
        quiz_pass_rate: number;
        inactive_count: number;
      };
      students: Parameters<typeof EducationService.mapRosterStudent>[0][];
    }>(`${this.base}/curricula/${curriculumId}/roster`);
    return {
      curriculumId: raw.curriculum_id,
      curriculumName: raw.curriculum_name,
      kpis: {
        activeStudents: raw.kpis.active_students,
        avgProgressPct: raw.kpis.avg_progress_pct,
        quizPassRate: raw.kpis.quiz_pass_rate,
        inactiveCount: raw.kpis.inactive_count,
      },
      students: (raw.students ?? []).map(EducationService.mapRosterStudent),
    };
  }

  /** `GET /education/curricula/:id/funnel` — LessonFunnel.tsx's per-lesson drop-off chart. */
  static async getLessonFunnel(curriculumId: string): Promise<LessonFunnelPoint[]> {
    const raw = await ApiService.get<
      {
        lesson_id: string;
        title: string;
        order_index: number;
        reached: number;
        completed: number;
      }[]
    >(`${this.base}/curricula/${curriculumId}/funnel`);
    return raw.map(p => ({
      lessonId: p.lesson_id,
      title: p.title,
      orderIndex: p.order_index,
      reached: p.reached,
      completed: p.completed,
    }));
  }

  /** `GET /education/curricula/:id/roster.csv` — same roster data, CSV download (ExportUsers precedent). */
  static async exportRosterCSV(curriculumId: string, curriculumName: string): Promise<void> {
    const blob = await ApiService.getBlob(`${this.base}/curricula/${curriculumId}/roster.csv`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const slug = curriculumName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    a.download = `progreso-${slug || curriculumId}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /**
   * Grades one short-answer response — calls the ALREADY-LIVE PR-F
   * `ReviewAnswer` endpoint directly (`education_quiz_review.go`). PR-K adds
   * no new grading route; `ReviewQueue.tsx` is simply this endpoint's first
   * frontend caller.
   */
  static async reviewAnswer(answerId: string, payload: ReviewAnswerRequest): Promise<void> {
    await ApiService.put(`${this.base}/reviews/answers/${answerId}`, {
      is_correct: payload.isCorrect,
      awarded_points: payload.awardedPoints,
      review_note: payload.reviewNote ?? null,
    });
  }
}
