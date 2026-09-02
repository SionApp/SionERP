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
