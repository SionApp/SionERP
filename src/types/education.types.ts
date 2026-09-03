// `cadence` was DROPPED in the design-handoff migration (PR-A) — `track` +
// `level` + `hours` replaced it (spec: "Cadence is descriptive", the only
// deletion in the plan). `EducationCadence`/`EducationCadences` are gone
// from this file; the 8 occurrences that lived here are closed (tasks-v2
// D.2). The 18 remaining occurrences in `CurriculumList.tsx`/
// `CurriculumEditor.tsx` are a deliberate, tracked exception — see this
// PR's Deviations note — closed wholesale when PR-H deletes both files.
export type EducationCurriculumStatus = 'draft' | 'review' | 'published' | 'archived';
export type EducationTrack = 'discipulado' | 'servicio' | 'liderazgo' | 'familia' | 'formacion';
export type EducationCourseLevel = 'I' | 'II' | 'III';

/**
 * Wire shape mirrors `models.EducationCurriculum` (education.go). Catalog
 * metadata fields were added in the design-handoff expansion (PR-A/PR-B);
 * `teacherName`/`studentCount` are populated only by `getCurriculumById`
 * (GetCurriculumByID) — `null`/`0` on every other endpoint that returns this
 * shape (list endpoints never join them, see education.service.ts).
 */
export interface EducationCurriculum {
  id: string;
  name: string;
  description: string | null;
  status: EducationCurriculumStatus;
  track: EducationTrack | null;
  level: EducationCourseLevel | null;
  hours: number | null;
  teacherUserId: string | null;
  teacherName: string | null;
  coverPath: string | null;
  objectives: string[];
  requirements: string | null;
  lessonCount: number;
  studentCount: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCurriculumRequest {
  name: string;
  description?: string;
}

export interface UpdateCurriculumRequest {
  name?: string;
  description?: string;
}

export const EducationCurriculumStatuses: Record<EducationCurriculumStatus, true> = {
  draft: true,
  review: true,
  published: true,
  archived: true,
};

export const EducationTracks: Record<EducationTrack, true> = {
  discipulado: true,
  servicio: true,
  liderazgo: true,
  familia: true,
  formacion: true,
};

export interface EducationLesson {
  id: string;
  curriculumId: string;
  orderIndex: number;
  title: string;
  content: string | null;
  attachmentPath: string | null;
  attachmentName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLessonRequest {
  title: string;
  content?: string;
  attachmentPath?: string;
  attachmentName?: string;
  orderIndex?: number;
}

export interface UpdateLessonRequest {
  title?: string;
  content?: string;
  attachmentPath?: string;
  attachmentName?: string;
}

// ── Asignaciones + progreso (PR3a backend, PR3c UI) ──

// `in_review`/`inactive` are DERIVED status states added by the
// design-handoff spec (education-assignments DELTA) — PR-F/K wire the
// backend derivation that actually produces them (review-pending quiz
// attempts, 14-day inactivity). Included here now so the status union is
// forward-compatible; PR-D never receives these two from any endpoint it
// calls yet.
export type EducationAssignmentStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'overdue'
  | 'in_review'
  | 'inactive';
export type EducationSourceModule = 'discipleship';

/**
 * Wire shape mirrors `models.EducationAssignment` (apps/backend-go/models/education.go).
 * Status is derived server-side (design D3) — never computed on the client.
 * assignedToName/assignedToEmail only come populated from the admin listing
 * (GetCurriculumProgress); the student-facing endpoints never need them.
 * track/teacherName are a PR-D addition (assignmentSelectSQL) — populated on
 * GetMyAssignments/GetMyAssignmentByID/GetHome, null on GetCurriculumProgress.
 */
export interface EducationAssignment {
  id: string;
  curriculumId: string;
  curriculumName: string;
  assignedTo: string;
  assignedBy: string | null;
  sourceModule: EducationSourceModule | null;
  sourceRefId: string | null;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  completedLessons: number;
  totalLessons: number;
  status: EducationAssignmentStatus;
  assignedToName: string | null;
  assignedToEmail: string | null;
  track: EducationTrack | null;
  teacherName: string | null;
}

export interface CreateAssignmentsRequest {
  curriculumId: string;
  userIds: string[];
  dueDate?: string;
  sourceModule?: EducationSourceModule;
  sourceRefId?: string;
}

export interface CreateAssignmentsResult {
  created: number;
  skipped: number;
  message: string;
}

// ── Catálogo, temario y panel del alumno (PR-D, education-catalog +
// education-lesson-consumption) ──

/**
 * Wire shape mirrors `models.EducationCatalogCourse` (education_content.go).
 * `hasQuiz` is stubbed `false` server-side until PR-F ships the quizzes
 * table — never render a quiz-related affordance from this field yet.
 */
export interface EducationCatalogCourse {
  id: string;
  name: string;
  description: string | null;
  track: EducationTrack | null;
  level: EducationCourseLevel | null;
  hours: number | null;
  teacherName: string | null;
  coverPath: string | null;
  lessonCount: number;
  studentCount: number;
  hasQuiz: boolean;
  createdAt: string;
}

/**
 * Values are `completed | in_progress | pending` only in this PR — `locked`
 * (derived from a quiz pass, design A8) doesn't exist server-side yet
 * (PR-F). PR-D derives its own CLIENT-side "next available vs. locked"
 * distinction on top of `pending` — see `student/lib/lesson-state.ts`.
 */
export type EducationSyllabusLessonState = 'completed' | 'in_progress' | 'pending';

export interface EducationSyllabusLesson {
  id: string;
  moduleId: string | null;
  orderIndex: number;
  title: string;
  durationMinutes: number | null;
  state: EducationSyllabusLessonState;
}

export interface EducationSyllabusModule {
  id: string | null;
  title: string;
  lessons: EducationSyllabusLesson[];
}

/** Wire shape mirrors `models.EducationHomeAggregate` (GET /education/me/home). */
export interface EducationHomeAggregate {
  inProgressCount: number;
  completedCount: number;
  continueAssignment: EducationAssignment | null;
  assignments: EducationAssignment[];
}
