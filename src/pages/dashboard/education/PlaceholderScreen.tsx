import type { LucideIcon } from 'lucide-react';

interface PlaceholderScreenProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

/**
 * PR-C scaffolding: every route leaf that PR-D through PR-K will fill with
 * real content renders this "Próximamente" panel so the route tree, tabs and
 * role gating are independently testable before any data-fetching UI exists.
 * See sdd/education-module/tasks-v2 PR-C task C.8.
 */
export function PlaceholderScreen({ icon: Icon, title, description }: PlaceholderScreenProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[22px] border border-dashed border-edu-outline bg-edu-surface py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-edu-container text-on-edu-container">
        <Icon className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
