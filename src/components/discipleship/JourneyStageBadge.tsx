import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DerivedJourneyStage } from '@/types/discipleship.types';

const STAGE_META: Record<DerivedJourneyStage, { label: string; className: string }> = {
  not_tracked: { label: 'Sin seguimiento', className: 'bg-muted text-muted-foreground' },
  new_convert: { label: 'Nuevo convertido', className: 'bg-blue-500 hover:bg-blue-600 text-white' },
  disciple: { label: 'Discípulo', className: 'bg-emerald-500 hover:bg-emerald-600 text-white' },
  disciple_maker: {
    label: 'Discipulador',
    className: 'bg-purple-500 hover:bg-purple-600 text-white',
  },
};

interface JourneyStageBadgeProps {
  stage: DerivedJourneyStage;
  className?: string;
}

/**
 * Renders the derived member-journey stage (spec: Not-Tracked Rendering).
 * `not_tracked` MUST always render as the neutral "Sin seguimiento" — never
 * as "Nuevo convertido" or any other stage — since a member with no anchor
 * row was never entered into the journey at all. Callers derive the stage
 * with `resolveJourneyStage` (src/hooks/use-member-journey.ts, PR-3) and
 * pass the result here; this component owns display only.
 */
export function JourneyStageBadge({ stage, className }: JourneyStageBadgeProps) {
  const meta = STAGE_META[stage] ?? STAGE_META.not_tracked;
  return <Badge className={cn(meta.className, className)}>{meta.label}</Badge>;
}
