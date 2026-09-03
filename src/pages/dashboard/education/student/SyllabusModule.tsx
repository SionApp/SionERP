import type { EducationSyllabusModule as EducationSyllabusModuleType } from '@/types/education.types';
import { LessonRow } from './LessonRow';
import type { DisplayLessonState } from './lib/lesson-state';
import { formatMinutes } from './lib/format';

export function SyllabusModule({
  module,
  index,
  lessonStates,
  onLessonClick,
}: {
  module: EducationSyllabusModuleType;
  index: number;
  lessonStates: Map<string, DisplayLessonState>;
  onLessonClick: (lessonId: string) => void;
}) {
  const totalMinutes = module.lessons.reduce((sum, l) => sum + (l.durationMinutes ?? 0), 0);

  return (
    <div className="border-b border-border last:border-b-0">
      <div className="flex items-center gap-3 bg-edu-surface-alt px-[22px] py-4">
        <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md3-sm bg-edu-container text-[13px] font-medium text-on-edu-container">
          {index}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-medium text-foreground">{module.title}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {module.lessons.length} {module.lessons.length === 1 ? 'lección' : 'lecciones'}
            {totalMinutes > 0 ? ` · ${formatMinutes(totalMinutes)}` : ''}
          </div>
        </div>
      </div>
      {module.lessons.map(lesson => (
        <LessonRow
          key={lesson.id}
          lesson={lesson}
          state={lessonStates.get(lesson.id) ?? 'locked'}
          onClick={() => onLessonClick(lesson.id)}
        />
      ))}
    </div>
  );
}
