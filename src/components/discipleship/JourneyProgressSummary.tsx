import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import type { JourneyEntry } from '@/types/discipleship.types';

interface JourneyProgressSummaryProps {
  entry: JourneyEntry | undefined;
  /**
   * From `useSystem().isModuleInstalled('education')` — NOT
   * `useEducationAccess()` (spec: Module-Gated Read Surface). This is an
   * install check, not an authoring check: the caller decides whether
   * Education exists in this church at all, this component only decides
   * whether there is anything to link to.
   */
  educationInstalled: boolean;
}

/**
 * One-line progress + a deep link into Education's own screens (design:
 * "Curriculum picker" / spec: "Module-Gated Read Surface"). Renders nothing
 * when Education is uninstalled, when the member has no anchor, or when no
 * path assignment was created — the stage badge alone still communicates
 * status in every one of those cases, this is additive.
 */
export function JourneyProgressSummary({ entry, educationInstalled }: JourneyProgressSummaryProps) {
  if (!educationInstalled || !entry?.curriculum_id) return null;

  const label =
    entry.stage === 'disciple' || entry.stage === 'disciple_maker'
      ? 'Camino completado'
      : 'Camino en curso';

  return (
    <Link
      to={`/dashboard/education/curso/${entry.curriculum_id}`}
      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
    >
      {label}
      <ExternalLink className="h-3 w-3" />
    </Link>
  );
}
