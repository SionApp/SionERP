export type EducationCadence = 'weekly' | 'quarterly';
export type EducationCurriculumStatus = 'draft' | 'published' | 'archived';

export interface EducationCurriculum {
  id: string;
  name: string;
  description: string | null;
  cadence: EducationCadence;
  status: EducationCurriculumStatus;
  lessonCount: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCurriculumRequest {
  name: string;
  description?: string;
  cadence?: EducationCadence;
}

export interface UpdateCurriculumRequest {
  name?: string;
  description?: string;
  cadence?: EducationCadence;
}

export const EducationCadences: Record<EducationCadence, true> = {
  weekly: true,
  quarterly: true,
};

export const EducationCurriculumStatuses: Record<EducationCurriculumStatus, true> = {
  draft: true,
  published: true,
  archived: true,
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

export type EducationAssignmentStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';
export type EducationSourceModule = 'discipleship';

/**
 * Wire shape mirrors `models.EducationAssignment` (apps/backend-go/models/education.go).
 * Status is derived server-side (design D3) — never computed on the client.
 * assignedToName/assignedToEmail only come populated from the admin listing
 * (GetCurriculumProgress); the student-facing endpoints never need them.
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
