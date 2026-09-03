import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { EducationAssignmentStatus, EducationTrack } from '@/types/education.types';
import { useEducationCatalog, useEducationHome } from '../hooks/use-education-queries';
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
  const [track, setTrack] = useState<EducationTrack | 'all'>('all');

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
