import { Outlet } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { useEducationAccess } from './use-education-access';

/**
 * Client-side UX gate for `/dashboard/education/admin/*` (education level
 * ≥ 3 — "isAuthor"). This is UX only: the backend's `RequireModuleLevel`
 * check on every admin endpoint is the authoritative boundary (design A9 /
 * spec education-route-topology — "Student is refused an admin route").
 */
export default function EducationAdminGate() {
  const { isAuthor, loadingAccess } = useEducationAccess();

  if (loadingAccess) {
    return <Skeleton className="h-48 w-full rounded-[22px]" />;
  }

  if (!isAuthor) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[22px] border border-dashed border-edu-outline bg-edu-surface py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-edu-container text-on-edu-container">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            Esta sección es solo para instructores
          </p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Necesitás rol de Instructor o Administrador de Educación para entrar acá. El servidor
            también valida esto, no es solo una restricción visual.
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
