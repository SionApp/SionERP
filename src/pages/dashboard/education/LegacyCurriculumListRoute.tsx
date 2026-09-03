import { CurriculumList } from './CurriculumList';
import { useEducationAccess } from './use-education-access';

/**
 * PR-C transitional mount for `admin/cursos`: routes into the existing
 * PR2b `CurriculumList` component (already role-gated server-side, and now
 * client-gated too by the parent `EducationAdminGate`) instead of a
 * "Próximamente" placeholder — per the orchestrator's explicit allowance to
 * keep PR1-3c admin components working as-is through this transitional
 * slice. Superseded by `admin/AdminCourseList.tsx` in PR-H (see tasks-v2
 * H.5), which deletes this file's target alongside `CurriculumEditor.tsx`
 * and `LessonList.tsx`.
 */
export default function LegacyCurriculumListRoute() {
  const { level } = useEducationAccess();
  return <CurriculumList level={level} />;
}
