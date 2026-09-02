import { GraduationCap } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { MobileScreen } from '@/components/mobile/MobileScreen';
import { useMobileMode } from '@/hooks/useMobileMode';
import { CurriculumList } from './education/CurriculumList';
import { useEducationAccess } from './education/use-education-access';

// ─────────────────────────────────────────────
// No access — level 0 (no education grant, module not part of the user's
// team). Mirrors MusicPage's NoMusicAccess.
// ─────────────────────────────────────────────
function NoEducationAccess() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <GraduationCap className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold">No tenés acceso a Educación todavía</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Pedile a un administrador del módulo que te asigne un rol para ver tus currículos.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Estudiante (nivel 1-2, sin permiso de autor) — la vista "Mis currículos"
// (asignaciones + progreso) llega en PR3c. Por ahora, un estado de espera
// honesto en vez de simular una lista vacía de asignaciones.
// ─────────────────────────────────────────────
function StudentPlaceholder() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <GraduationCap className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold">Ya tenés acceso a Educación</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Tus currículos asignados van a aparecer acá muy pronto.
        </p>
      </div>
    </div>
  );
}

/**
 * Route: /dashboard/education
 *
 * PR2b scope: curriculum admin UI (author/module-admin, level ≥ 3). The
 * student-facing "Mis currículos" view (assignments + progress) and the
 * isAuthor-branched tabs shell are PR3c work — this file will grow into
 * that shell then, the same way MusicPage.tsx grew across PRs.
 */
export default function EducationPage() {
  const isMobileApp = useMobileMode();
  const { level, isAuthor, hasAccess, loadingAccess } = useEducationAccess();

  const body = loadingAccess ? (
    <Skeleton className="h-48 w-full rounded-2xl" />
  ) : !hasAccess ? (
    <NoEducationAccess />
  ) : isAuthor ? (
    <CurriculumList level={level} />
  ) : (
    <StudentPlaceholder />
  );

  if (isMobileApp) {
    return (
      <MobileScreen
        title="Educación"
        subtitle={isAuthor ? 'Currículos y lecciones' : 'Tu formación'}
      >
        <div className="px-4 py-4">{body}</div>
      </MobileScreen>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-primary">Formación y discipulado</p>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h1 className="text-3xl font-semibold leading-tight">Educación</h1>
          <p className="text-sm text-muted-foreground">
            {isAuthor ? 'Gestión de currículos' : 'Tu formación'}
          </p>
        </div>
        <hr className="mt-4 border-border" />
      </header>
      {body}
    </div>
  );
}
