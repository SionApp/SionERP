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
