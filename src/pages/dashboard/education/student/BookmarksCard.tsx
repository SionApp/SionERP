import { Bookmark } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import type { LessonBookmark } from '@/types/education.types';

const MAX_VISIBLE = 5;

/**
 * "Lecciones guardadas" — StudentHome sidebar card for the personal
 * bookmark list (design gap closed per explicit user decision, see the
 * migration's header comment). Same "only render when there's something to
 * show" convention `PendingQuizAlert` already established — StudentHome
 * simply doesn't mount this component at all when `bookmarks.length === 0`,
 * no dead empty state invented here.
 *
 * A bookmark whose lesson was hard-deleted after being saved can never
 * reach this component: `GetMyBookmarks`'s INNER JOINs silently drop it
 * server-side (see handlers/education_bookmarks.go), so `items` only ever
 * contains resolvable lessons.
 */
export function BookmarksCard({ items }: { items: LessonBookmark[] }) {
  const navigate = useNavigate();
  const visible = items.slice(0, MAX_VISIBLE);

  return (
    <div className="rounded-md3-lg border border-border bg-card p-5">
      <h3 className="mb-3.5 flex items-center gap-2 text-[15px] font-medium text-foreground">
        <Bookmark className="h-4 w-4 text-edu-primary" aria-hidden="true" />
        Lecciones guardadas
      </h3>
      <div className="flex flex-col gap-1">
        {visible.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() =>
              navigate(`/dashboard/education/curso/${item.curriculumId}/leccion/${item.lessonId}`)
            }
            className="flex min-h-11 flex-col items-start gap-0.5 rounded-md3-sm px-2 py-2 text-left hover:bg-muted"
          >
            <span className="truncate text-sm font-medium text-foreground">{item.lessonTitle}</span>
            <span className="truncate text-xs text-muted-foreground">{item.curriculumName}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
