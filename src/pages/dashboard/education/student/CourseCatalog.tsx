import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { MobileScreen } from '@/components/mobile/MobileScreen';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useMobileMode } from '@/hooks/useMobileMode';
import type { EducationAssignmentStatus, EducationTrack } from '@/types/education.types';
import { useEducationCatalog, useEducationHome } from '../hooks/use-education-queries';
import { ModuleTabs } from '../ModuleTabs';
import { EducationMobileHeader } from '../mobile/EducationMobileHeader';
import { CatalogFilters } from './CatalogFilters';
import { CourseCard } from './CourseCard';

function CatalogSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <Skeleton key={i} className="h-[340px] w-full rounded-md3-lg" />
      ))}
    </div>
  );
}

function EmptyCatalog({ hasFilter, onClear }: { hasFilter: boolean; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md3-lg border border-dashed border-edu-outline bg-edu-surface py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-edu-container text-on-edu-container">
        <LayoutGrid className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">
          {hasFilter ? 'Ningún curso coincide con este filtro' : 'Todavía no hay cursos publicados'}
        </p>
        <p className="max-w-xs text-sm text-muted-foreground">
          {hasFilter
            ? 'Probá con otro track, o mirá el catálogo completo.'
            : 'Cuando un instructor publique un curso, vas a poder verlo acá.'}
        </p>
      </div>
      {hasFilter && (
        <Button size="sm" variant="outline" onClick={onClear}>
          Quitar filtros
        </Button>
      )}
    </div>
  );
}

export default function CourseCatalog() {
  const navigate = useNavigate();
  const isMobileApp = useMobileMode();
  const { currentUser } = useAuth();
  const [track, setTrack] = useState<EducationTrack | 'all'>('all');
  const [query, setQuery] = useState('');

  const {
    data: courses = [],
    isLoading,
    isError,
    refetch,
  } = useEducationCatalog(track === 'all' ? undefined : track);
  const { data: home } = useEducationHome();

  const myStatusByCurriculum = useMemo(() => {
    const map = new Map<string, EducationAssignmentStatus>();
    for (const a of home?.assignments ?? []) map.set(a.curriculumId, a.status);
    return map;
  }, [home]);

  // Mobile-only search bar (design mobile handoff, screen 2) — the desktop
  // catalog has none, so this filters client-side over the already-fetched
  // page rather than adding a new backend query param for one screen.
  const visibleCourses = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(c => c.name.toLowerCase().includes(q));
  }, [courses, query]);

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md3-lg border border-destructive/30 bg-destructive/5 py-12 text-center">
        <p className="text-sm font-medium text-destructive">No se pudo cargar el catálogo.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const initial = (currentUser?.first_name?.[0] ?? '?').toUpperCase();

  if (isMobileApp) {
    return (
      <div className="education-shell">
        <MobileScreen header={<EducationMobileHeader title="Catálogo" initial={initial} />}>
          <ModuleTabs isAdmin={false} />
          <div className="flex flex-col gap-3 px-4 pb-4 pt-5">
            <div className="flex items-center gap-2 rounded-full bg-surface-variant px-4 py-3">
              <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar un curso…"
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <CatalogFilters value={track} onChange={setTrack} compact />
            {isLoading ? (
              <CatalogSkeleton />
            ) : visibleCourses.length === 0 ? (
              <EmptyCatalog
                hasFilter={track !== 'all' || query !== ''}
                onClear={() => setTrack('all')}
              />
            ) : (
              <div className="flex flex-col gap-3.5">
                {visibleCourses.map(course => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    myStatus={myStatusByCurriculum.get(course.id) ?? null}
                    onClick={() => navigate(`/dashboard/education/curso/${course.id}`)}
                    compact
                  />
                ))}
              </div>
            )}
          </div>
        </MobileScreen>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <CatalogFilters value={track} onChange={setTrack} />
      {isLoading ? (
        <CatalogSkeleton />
      ) : courses.length === 0 ? (
        <EmptyCatalog hasFilter={track !== 'all'} onClear={() => setTrack('all')} />
      ) : (
        <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
          {courses.map(course => (
            <CourseCard
              key={course.id}
              course={course}
              myStatus={myStatusByCurriculum.get(course.id) ?? null}
              onClick={() => navigate(`/dashboard/education/curso/${course.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
