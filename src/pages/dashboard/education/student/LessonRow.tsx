import { Check, FileQuestion, Lock, Play } from 'lucide-react';

import { cn } from '@/lib/utils';
import type {
  EducationSyllabusLesson,
  EducationSyllabusLessonState,
} from '@/types/education.types';

// PR-G: reads the syllabus lesson's real, server-derived `state` directly
// (design A8, wired in PR-F's `GetSyllabus` via the quiz-pass `LAG(...)`
// window functions) — no client-side `DisplayLessonState` remapping anymore
// (that interim type/file, `student/lib/lesson-state.ts`, is deleted in this
// PR). `in_progress` is the "current" lesson; `pending` is the design's
// "Sin terminar"/available row (an unenrolled browsing visitor also sees
// every lesson as `pending` — the backend already renders that state
// correctly with no lock, see `GetSyllabus`'s own comment).
const STATE_ICON = {
  completed: Check,
  in_progress: Play,
  pending: Play,
  locked: Lock,
} as const;

const STATE_ICON_CLASS: Record<EducationSyllabusLessonState, string> = {
  completed: 'bg-edu-container text-on-edu-container',
  in_progress: 'bg-edu-primary text-white',
  pending: 'bg-edu-orange-container text-on-edu-orange-container',
  locked: 'bg-muted text-muted-foreground',
};

const STATE_ROW_CLASS: Record<EducationSyllabusLessonState, string> = {
  completed: '',
  in_progress: 'bg-edu-surface-alt',
  pending: '',
  locked: 'cursor-default',
};

const STATE_TITLE_CLASS: Record<EducationSyllabusLessonState, string> = {
  completed: 'text-foreground',
  in_progress: 'font-medium text-foreground',
  pending: 'text-foreground',
  locked: 'text-muted-foreground',
};

export function LessonRow({
  lesson,
  state,
  onClick,
  compact = false,
}: {
  lesson: EducationSyllabusLesson;
  state: EducationSyllabusLessonState;
  onClick: () => void;
  /** Mobile handoff, screen 3: "solo el icono `quiz` ... en lugar del chip
   * 'Quiz' del escritorio" — no room for the full pill+label. */
  compact?: boolean;
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
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>
            {state === 'locked'
              ? 'Se desbloquea al completar la lección anterior'
              : `Lección ${lesson.orderIndex}`}
          </span>
          {lesson.hasQuiz &&
            (compact ? (
              <FileQuestion
                className="h-[17px] w-[17px] text-muted-foreground"
                aria-hidden="true"
              />
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                <FileQuestion className="h-3.5 w-3.5" aria-hidden="true" />
                Quiz
              </span>
            ))}
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
