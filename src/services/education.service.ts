import { ApiService } from './api.service';
import type {
  EducationCadence,
  EducationCurriculum,
  EducationCurriculumStatus,
  CreateCurriculumRequest,
  UpdateCurriculumRequest,
} from '@/types/education.types';

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
}
