import { Check, Lock, Play } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { EducationSyllabusLesson } from '@/types/education.types';
import type { DisplayLessonState } from './lib/lesson-state';

const STATE_ICON = { completed: Check, current: Play, available: Play, locked: Lock } as const;

const STATE_ICON_CLASS: Record<DisplayLessonState, string> = {
  completed: 'bg-edu-container text-on-edu-container',
  current: 'bg-edu-primary text-white',
  available: 'bg-edu-orange-container text-on-edu-orange-container',
  locked: 'bg-muted text-muted-foreground',
};

const STATE_ROW_CLASS: Record<DisplayLessonState, string> = {
  completed: '',
  current: 'bg-edu-surface-alt',
  available: '',
  locked: 'cursor-default',
};

const STATE_TITLE_CLASS: Record<DisplayLessonState, string> = {
  completed: 'text-foreground',
  current: 'font-medium text-foreground',
  available: 'text-foreground',
  locked: 'text-muted-foreground',
};

export function LessonRow({
  lesson,
  state,
  onClick,
}: {
  lesson: EducationSyllabusLesson;
  state: DisplayLessonState;
  onClick: () => void;
}) {
  const Icon = STATE_ICON[state];
  const isInteractive = state !== 'locked';

  return (
    <div
      onClick={isInteractive ? onClick : undefined}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={
        isInteractive
          ? e => {
              if (e.key === 'Enter' || e.key === ' ') onClick();
            }
          : undefined
      }
      className={cn(
        'flex items-center gap-3.5 py-3.5 pl-[30px] pr-[22px]',
        isInteractive && 'cursor-pointer hover:bg-edu-surface',
        STATE_ROW_CLASS[state]
      )}
    >
      <span
        className={cn(
          'flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full',
          STATE_ICON_CLASS[state]
        )}
      >
        <Icon className="h-[17px] w-[17px]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className={cn('text-sm', STATE_TITLE_CLASS[state])}>{lesson.title}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {state === 'locked'
            ? 'Se desbloquea al completar la lección anterior'
            : `Lección ${lesson.orderIndex}`}
        </div>
      </div>
      {lesson.durationMinutes !== null && lesson.durationMinutes > 0 && (
        <div className="w-14 shrink-0 text-right text-xs text-muted-foreground">
          {lesson.durationMinutes} min
        </div>
      )}
    </div>
  );
}
