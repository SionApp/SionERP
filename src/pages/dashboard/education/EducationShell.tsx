import { ChevronRight, GraduationCap, Home, PlayCircle } from 'lucide-react';
import { Link, Navigate, Outlet } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { MobileScreen } from '@/components/mobile/MobileScreen';
import { Skeleton } from '@/components/ui/skeleton';
import { useMobileMode } from '@/hooks/useMobileMode';
import { cn } from '@/lib/utils';
import './education-theme.css';
import { ModuleTabs } from './ModuleTabs';
import { useEducationAccess } from './use-education-access';
import { useEducationHome } from './hooks/use-education-queries';
import StudentHome from './student/StudentHome';
import { NewLessonButton } from './admin/NewLessonButton';

// The shell's tabs are role-exclusive (ADMIN_TABS vs studentTabs in
// ModuleTabs) and none of the admin tabs point at the bare `/education`
// index — so an author landing there via the sidebar link must be sent to
// their own index (`admin/cursos`) instead of falling through to the
// student's StudentHome.
export function EducationIndexRoute() {
  const { isAuthor, loadingAccess } = useEducationAccess();

  if (loadingAccess) {
    return <Skeleton className="h-48 w-full rounded-2xl" />;
  }

  if (isAuthor) {
    return <Navigate to="admin/cursos" replace />;
  }

  return <StudentHome />;
}

// Moved verbatim from the deleted EducationPage.tsx (PR2b) — same copy,
// same shape, now living in the shell instead of the flat page.
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

/**
 * Route: /dashboard/education (nested outlet shell)
 *
 * PR-C scope: theming scope, header/breadcrumb, role-dependent tabs and the
 * <Outlet/> that PR-D through PR-K's real screens mount into. No data
 * fetching happens here — role comes from `useEducationAccess()`, the same
 * hook every child screen and the admin gate already use.
 */
export default function EducationShell() {
  const isMobileApp = useMobileMode();
  const { isAuthor, hasAccess, loadingAccess } = useEducationAccess();
  // Only students get a "continue" target — an admin's equivalent CTA
  // ("Nueva lección") needs a specific curriculum context that doesn't
  // exist at this top-level shell, so it stays omitted (no dead affordance).
  const { data: home } = useEducationHome(hasAccess && !loadingAccess && !isAuthor);
  const continueAssignment = home?.continueAssignment ?? null;

  const title = isAuthor ? 'Gestión de Educación' : 'Escuela de formación';
  const subtitle = isAuthor
    ? 'Crea cursos, escribe lecciones y sigue el avance de cada alumno.'
    : 'Cursos de discipulado y formación para tu crecimiento.';

  // The global bottom nav (Inicio/Discipulado/Miembros/Reportes/Más) stays
  // visible throughout Educación on mobile, same as every other module —
  // no module here hides it (verified: `setMobileNavHidden` outside
  // `MobileScreen`'s own detail-drilldown use is otherwise unused in the
  // codebase). The top `ModuleTabs` strip is Educación's own navigation on
  // every breakpoint, mobile included.
  const body = loadingAccess ? (
    <Skeleton className="h-48 w-full rounded-2xl" />
  ) : !hasAccess ? (
    <NoEducationAccess />
  ) : (
    <div className="education-shell">
      <ModuleTabs isAdmin={isAuthor} />
      <div className="pt-5">
        <Outlet />
      </div>
    </div>
  );

  if (isMobileApp) {
    return (
      <MobileScreen title={title} subtitle={subtitle}>
        <div className="px-4 py-4">{body}</div>
      </MobileScreen>
    );
  }

  return (
    <div className="education-shell space-y-6 p-3 sm:p-4 md:p-6">
      {/* items-end: the design aligns the CTA's bottom edge with the
          subtitle's bottom edge (verified 172px == 172px against the real
          prototype), not vertically centered against the whole row. */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {hasAccess && !loadingAccess && (
            <nav className="flex items-center gap-1.5 text-xs text-outline" aria-label="breadcrumb">
              <Home className="h-4 w-4" />
              <span>Inicio</span>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="font-medium text-edu-text">Educación</span>
            </nav>
          )}
          <div className="mt-1">
            <h1 className="text-[28px] font-normal leading-tight text-foreground">{title}</h1>
            {hasAccess && !loadingAccess && (
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        {/* `invisible` (not conditional mounting) so the button's own box
            keeps reserving its layout slot — the title/subtitle block must
            not reflow to fill the gap when there's nothing to continue yet. */}
        {hasAccess && !loadingAccess && !isAuthor && (
          <Button
            asChild={!!continueAssignment}
            disabled={!continueAssignment}
            className={cn(
              // Exact design measurements (verified against the real
              // prototype): h-12 (48px), px-[22px] py-[14px], text-[15px],
              // rounded-[16px] — none of shadcn's built-in size variants
              // (h-9/10/11) match, so they're overridden explicitly here.
              'h-12 gap-2 rounded-[16px] px-[22px] py-[14px] text-[15px] shrink-0',
              !continueAssignment && 'invisible'
            )}
          >
            {continueAssignment ? (
              <Link to={`/dashboard/education/curso/${continueAssignment.curriculumId}`}>
                <PlayCircle className="h-4 w-4" />
                Continuar donde quedé
              </Link>
            ) : (
              <>
                <PlayCircle className="h-4 w-4" />
                Continuar donde quedé
              </>
            )}
          </Button>
        )}
        {hasAccess && !loadingAccess && isAuthor && <NewLessonButton />}
      </div>
      {!hasAccess && !loadingAccess ? <div className="mt-6">{body}</div> : body}
    </div>
  );
}
