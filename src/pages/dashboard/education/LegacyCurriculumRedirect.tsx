import { Navigate, useParams } from 'react-router-dom';

/**
 * `/dashboard/education/curricula/:curriculumId` (PR1-3c's flat route)
 * survives as a bookmark redirect into the new nested route tree (spec
 * education-route-topology — "Legacy route redirects").
 */
export default function LegacyCurriculumRedirect() {
  const { curriculumId } = useParams<{ curriculumId: string }>();
  return <Navigate to={`/dashboard/education/admin/cursos/${curriculumId}`} replace />;
}
