import { ChevronRight, GraduationCap, Home } from 'lucide-react';
import { Outlet } from 'react-router-dom';

import { MobileScreen } from '@/components/mobile/MobileScreen';
import { Skeleton } from '@/components/ui/skeleton';
import { useMobileMode } from '@/hooks/useMobileMode';
import './education-theme.css';
import { ModuleTabs } from './ModuleTabs';
import { useEducationAccess } from './use-education-access';

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

  const title = isAuthor ? 'Gestión de Educación' : 'Escuela de formación';
  const subtitle = isAuthor
    ? 'Crea cursos, escribe lecciones y sigue el avance de cada alumno.'
    : 'Cursos de discipulado y formación para tu crecimiento.';

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
      <MobileScreen title="Educación" subtitle={subtitle}>
        <div className="px-4 py-4">{body}</div>
      </MobileScreen>
    );
  }

  return (
    <div className="education-shell space-y-0">
      <div className="pt-0">
        {hasAccess && !loadingAccess && (
          <nav className="flex items-center gap-1.5 text-xs text-outline" aria-label="breadcrumb">
            <Home className="h-4 w-4" />
            <span>Inicio</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-medium text-edu-text">Educación</span>
          </nav>
        )}
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h1 className="text-[28px] font-normal leading-tight text-foreground">{title}</h1>
          {hasAccess && !loadingAccess && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      {!hasAccess && !loadingAccess ? <div className="mt-6">{body}</div> : body}
    </div>
  );
}
