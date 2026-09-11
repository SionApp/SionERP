import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { MobileScreen } from '@/components/mobile/MobileScreen';
import { useMobileMode } from '@/hooks/useMobileMode';
import {
  useEducationHome,
  useMyBookmarks,
  useMyPendingReviews,
} from '../hooks/use-education-queries';
import { ModuleTabs } from '../ModuleTabs';
import { ContinueHeroMobile } from '../mobile/ContinueHeroMobile';
import { EducationMobileHeader } from '../mobile/EducationMobileHeader';
import { StatsStripMobile } from '../mobile/StatsStripMobile';
import { BookmarksCard } from './BookmarksCard';
import { ContinueCard } from './ContinueCard';
import { MyCoursesList } from './MyCoursesList';
import { ProgressDonut } from './ProgressDonut';
import { PendingQuizAlert } from './PendingQuizAlert';

export default function StudentHome() {
  const navigate = useNavigate();
  const isMobileApp = useMobileMode();
  const { currentUser } = useAuth();
  const { data: home, isLoading, isError, refetch } = useEducationHome();
  const { data: pendingReviews } = useMyPendingReviews();
  const { data: bookmarks } = useMyBookmarks();

  const continuing = useMemo(
    () =>
      (home?.assignments ?? []).filter(a => a.status === 'in_progress' || a.status === 'overdue'),
    [home]
  );

  // Real derived rollup — sum of completed lessons over sum of total lessons
  // across every one of the student's own assignments. Never fabricated: if
  // there are zero assignments this is honestly 0%, rendered normally
  // (spec: "Zero is not an error").
  const overallPercent = useMemo(() => {
    const assignments = home?.assignments ?? [];
    const totalLessons = assignments.reduce((sum, a) => sum + a.totalLessons, 0);
    const completedLessons = assignments.reduce((sum, a) => sum + a.completedLessons, 0);
    return totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  }, [home]);

  const initial = (currentUser?.first_name?.[0] ?? '?').toUpperCase();

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md3-lg border border-destructive/30 bg-destructive/5 py-12 text-center">
        <p className="text-sm font-medium text-destructive">No se pudo cargar tu panel.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.75fr_1fr]">
        <div className="space-y-5">
          <Skeleton className="h-40 w-full rounded-md3-lg" />
          <Skeleton className="h-64 w-full rounded-md3-lg" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-md3-lg" />
          <Skeleton className="h-40 w-full rounded-md3-lg" />
        </div>
      </div>
    );
  }

  if (isMobileApp) {
    const heroAssignment = home?.continueAssignment ?? continuing[0] ?? null;
    return (
      // `education-shell`: every `edu-*` CSS var (education-theme.css) is
      // scoped to this class — the shell normally provides it, but this
      // route bypasses the shell wrapper entirely to own its own mobile
      // header, so it must carry the class itself.
      <div className="education-shell">
        <MobileScreen
          header={
            <EducationMobileHeader
              title={`Hola, ${currentUser?.first_name ?? ''}`}
              initial={initial}
            />
          }
        >
          <ModuleTabs isAdmin={false} />
          <div className="flex flex-col gap-[18px] px-4 pb-4 pt-5">
            {heroAssignment && (
              <ContinueHeroMobile
                assignment={heroAssignment}
                onClick={() =>
                  navigate(`/dashboard/education/curso/${heroAssignment.curriculumId}`)
                }
              />
            )}
            <StatsStripMobile
              inProgressCount={home?.inProgressCount ?? 0}
              completedCount={home?.completedCount ?? 0}
              overallPercent={overallPercent}
            />
            {pendingReviews && pendingReviews.length > 0 && (
              <PendingQuizAlert items={pendingReviews} />
            )}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-medium text-foreground">Mis cursos</h2>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/education/catalogo')}
                  className="text-xs font-medium text-edu-primary"
                >
                  Ver todos
                </button>
              </div>
              <MyCoursesList
                assignments={home?.assignments ?? []}
                onSelect={curriculumId => navigate(`/dashboard/education/curso/${curriculumId}`)}
              />
            </div>
          </div>
        </MobileScreen>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.75fr_1fr]">
      <div className="flex flex-col gap-5">
        {continuing.length > 0 && (
          <div>
            <h2 className="mb-3 text-lg font-medium text-foreground">Continuar aprendiendo</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {continuing.map(a => (
                <ContinueCard
                  key={a.id}
                  assignment={a}
                  onClick={() => navigate(`/dashboard/education/curso/${a.curriculumId}`)}
                />
              ))}
            </div>
          </div>
        )}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-medium text-foreground">Mis cursos</h2>
            <button
              type="button"
              onClick={() => navigate('/dashboard/education/catalogo')}
              className="text-[13px] font-medium text-edu-primary"
            >
              Ver catálogo
            </button>
          </div>
          <MyCoursesList
            assignments={home?.assignments ?? []}
            onSelect={curriculumId => navigate(`/dashboard/education/curso/${curriculumId}`)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* Profile card — 2-up mini-stats only (spec: education-copy-and-
            omissions "Certificates are absent, not stubbed" — no 3rd stat,
            no certificate string/icon anywhere). */}
        <div className="rounded-md3-lg bg-edu-container p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-edu-primary text-lg font-semibold text-white">
              {initial}
            </span>
            <div className="min-w-0">
              <div className="truncate text-base font-medium text-on-edu-container">
                {currentUser
                  ? `${currentUser.first_name} ${currentUser.last_name}`.trim()
                  : 'Alumno'}
              </div>
              <div className="truncate text-xs text-on-edu-container/80">
                {currentUser?.zone_name ? `${currentUser.zone_name} · Miembro` : 'Miembro'}
              </div>
            </div>
          </div>
          <div data-testid="profile-stats" className="mt-[18px] flex gap-2.5">
            <div className="flex-1 rounded-md3-sm bg-white/65 p-3.5 text-center">
              <div className="text-2xl font-medium text-on-edu-container">
                {home?.inProgressCount ?? 0}
              </div>
              <div className="mt-0.5 text-[11px] text-on-edu-container/85">En curso</div>
            </div>
            <div className="flex-1 rounded-md3-sm bg-white/65 p-3.5 text-center">
              <div className="text-2xl font-medium text-on-edu-container">
                {home?.completedCount ?? 0}
              </div>
              <div className="mt-0.5 text-[11px] text-on-edu-container/85">Completados</div>
            </div>
          </div>
        </div>

        <div className="rounded-md3-lg border border-border bg-card p-5">
          <h3 className="mb-3.5 text-[15px] font-medium text-foreground">Tu avance general</h3>
          <div className="flex items-center gap-[18px]">
            <ProgressDonut percent={overallPercent} />
            <p className="text-xs text-muted-foreground">
              Promedio de lecciones completadas sobre el total de tus cursos asignados.
            </p>
          </div>
        </div>

        {/* No "Próxima clase presencial" card (no data source, ruled out of
            scope — spec: education-copy-and-omissions). */}
        {pendingReviews && pendingReviews.length > 0 && <PendingQuizAlert items={pendingReviews} />}
        {bookmarks && bookmarks.length > 0 && <BookmarksCard items={bookmarks} />}
      </div>
    </div>
  );
}
