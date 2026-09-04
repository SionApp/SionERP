import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingDown } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { useLessonFunnel } from '../hooks/use-education-queries';
import type { LessonFunnelPoint } from '@/types/education.types';

// Recharts doesn't accept Tailwind classNames on its own props (bars,
// axes, grid lines) — style-prop `var()` constants are the documented
// exception for library props that can't take a className (tailwind-4
// skill: "Style Constants for Charts/Libraries").
const CHART_COLORS = {
  reached: 'hsl(var(--edu-primary-light))',
  completed: 'hsl(var(--edu-primary))',
  grid: 'hsl(var(--border))',
  text: 'hsl(var(--muted-foreground))',
};

function truncateTitle(title: string, max = 14): string {
  return title.length > max ? `${title.slice(0, max - 1)}…` : title;
}

/**
 * Finds the single biggest reached→completed drop-off (in percentage
 * points) across the funnel — the "abandonment insight" the design's PR-K
 * file manifest calls for alongside the chart itself. Pure function, easy
 * to unit-test in isolation (no chart/DOM dependency).
 */
export function biggestDropOff(
  points: LessonFunnelPoint[]
): { title: string; dropPct: number } | null {
  let worst: { title: string; dropPct: number } | null = null;
  for (const p of points) {
    if (p.reached === 0) continue;
    const dropPct = ((p.reached - p.completed) / p.reached) * 100;
    if (!worst || dropPct > worst.dropPct) {
      worst = { title: p.title, dropPct };
    }
  }
  return worst;
}

/**
 * Per-lesson reached-vs-completed drop-off chart (PR-K, K.3), mounted
 * inside `StudentProgress.tsx`. Uses `recharts` — already a project
 * dependency (`report-content.tsx`, `discipleship/*` dashboards) — no new
 * charting library added.
 */
export function LessonFunnel({ curriculumId }: { curriculumId: string }) {
  const { data: points = [], isLoading, isError } = useLessonFunnel(curriculumId);

  const insight = biggestDropOff(points);

  return (
    <div className="rounded-md3-lg border border-border bg-card p-[18px]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[15px] font-medium text-foreground">Embudo por lección</h3>
        {insight && insight.dropPct > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-edu-orange-container px-2.5 py-1 text-[11px] font-medium text-on-edu-orange-container">
            <TrendingDown className="h-3.5 w-3.5" />
            Mayor abandono en “{insight.title}” ({insight.dropPct.toFixed(0)}%)
          </span>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-56 w-full" />
      ) : isError ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No se pudo cargar el embudo de lecciones.
        </p>
      ) : points.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Este curso todavía no tiene lecciones.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={points.map(p => ({ ...p, label: truncateTitle(p.title) }))}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART_COLORS.text }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: CHART_COLORS.text }} />
            <Tooltip
              formatter={(value: number, name: string) => [
                value,
                name === 'reached' ? 'Llegaron' : 'Completaron',
              ]}
              labelFormatter={(label: string) => label}
            />
            <Bar
              dataKey="reached"
              name="reached"
              fill={CHART_COLORS.reached}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="completed"
              name="completed"
              fill={CHART_COLORS.completed}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
