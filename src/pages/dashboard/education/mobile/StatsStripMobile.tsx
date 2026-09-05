/**
 * Mobile handoff, screen 1.b ("Tira de tres stats") — replaces the desktop
 * profile card's 2-up mini-stats AND the separate "Tu avance general" donut
 * card with one 3-tile strip; the doc's own words: "la cifra '62% del plan'
 * cumple la misma función [que el donut] en una fracción del espacio."
 * All three values are real, never fabricated (spec: "Zero is not an
 * error" — 0 renders plainly, same as any other value).
 */
export function StatsStripMobile({
  inProgressCount,
  completedCount,
  overallPercent,
}: {
  inProgressCount: number;
  completedCount: number;
  overallPercent: number;
}) {
  return (
    <div className="flex gap-2.5">
      <div className="flex-1 rounded-[18px] bg-edu-container p-3.5 text-center">
        <div className="text-[22px] font-medium text-on-edu-container">{inProgressCount}</div>
        <div className="mt-0.5 text-[11px] text-edu-text">En curso</div>
      </div>
      <div className="flex-1 rounded-[18px] bg-surface-container p-3.5 text-center">
        <div className="text-[22px] font-medium text-foreground">{completedCount}</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">Completados</div>
      </div>
      <div className="flex-1 rounded-[18px] bg-surface-container p-3.5 text-center">
        <div className="text-[22px] font-medium text-foreground">{overallPercent}%</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">Del plan</div>
      </div>
    </div>
  );
}
