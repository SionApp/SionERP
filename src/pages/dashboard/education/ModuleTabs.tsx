import { NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  ClipboardCheck,
  LayoutDashboard,
  LayoutGrid,
  Library,
  LineChart,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { EducationTooltip, EducationTooltipContent, EducationTooltipTrigger } from './ui';
import { useEducationHome } from './hooks/use-education-queries';

interface TabDef {
  key: string;
  label: string;
  icon: LucideIcon;
  to: string;
  end?: boolean;
  disabledHint?: string;
}

// Student = Inicio · Catálogo · Mi curso; Admin = Cursos · Progreso ·
// Revisiones (spec education-route-topology — "Tabs are role-exclusive").
// NOTE: the design-handoff README's original admin tab set ("Cursos /
// Editor de contenido / Constructor de quiz / Progreso de alumnos") is
// superseded here — the design doc's own route-topology section revises
// this explicitly: "'Editor de contenido' and 'Constructor de quiz' MUST
// NOT be top-level tabs — they are per-lesson destinations." Following the
// authoritative spec/design revision, not the earlier README prose.
const ADMIN_TABS: TabDef[] = [
  { key: 'cursos', label: 'Cursos', icon: Library, to: '/dashboard/education/admin/cursos' },
  {
    key: 'progreso',
    label: 'Progreso',
    icon: LineChart,
    to: '/dashboard/education/admin/progreso',
  },
  {
    key: 'revisiones',
    label: 'Revisiones',
    icon: ClipboardCheck,
    to: '/dashboard/education/admin/revisiones',
  },
];

export function ModuleTabs({ isAdmin }: { isAdmin: boolean }) {
  // "Mi curso" (PR-D task D.8): PR-C shipped this unconditionally disabled
  // with a tooltip (the spec's own "no enrollment" state), since no
  // data-fetching hook existed yet. Now wired to the real home aggregate —
  // enabled and pointed at the student's own in-progress/most-recent course
  // as soon as one resolves; still disabled+tooltip while there's none.
  const { data: home } = useEducationHome(!isAdmin);
  const myCourse = home?.continueAssignment ?? home?.assignments[0] ?? null;

  const studentTabs: TabDef[] = [
    {
      key: 'inicio',
      label: 'Inicio',
      icon: LayoutDashboard,
      to: '/dashboard/education',
      end: true,
    },
    { key: 'catalogo', label: 'Catálogo', icon: LayoutGrid, to: '/dashboard/education/catalogo' },
    myCourse
      ? {
          key: 'mi-curso',
          label: 'Mi curso',
          icon: BookOpen,
          to: `/dashboard/education/curso/${myCourse.curriculumId}`,
        }
      : {
          key: 'mi-curso',
          label: 'Mi curso',
          icon: BookOpen,
          to: '/dashboard/education/catalogo',
          disabledHint: 'Explorá el catálogo para empezar un curso',
        },
  ];

  const tabs = isAdmin ? ADMIN_TABS : studentTabs;

  return (
    <div className="mt-[18px] flex gap-1 overflow-x-auto border-b border-border">
      {tabs.map(tab => {
        const Icon = tab.icon;

        if (tab.disabledHint) {
          return (
            <EducationTooltip key={tab.key}>
              <EducationTooltipTrigger asChild>
                <span
                  className="flex shrink-0 cursor-default items-center gap-2 border-b-[3px] border-transparent px-[18px] py-3.5 text-sm font-medium text-muted-foreground/50"
                  aria-disabled="true"
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </span>
              </EducationTooltipTrigger>
              <EducationTooltipContent>{tab.disabledHint}</EducationTooltipContent>
            </EducationTooltip>
          );
        }

        return (
          <NavLink
            key={tab.key}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                'flex shrink-0 items-center gap-2 border-b-[3px] px-[18px] py-3.5 text-sm font-medium transition-colors',
                isActive
                  ? 'border-edu-primary text-edu-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )
            }
          >
            <Icon className="h-5 w-5" />
            {tab.label}
          </NavLink>
        );
      })}
    </div>
  );
}
