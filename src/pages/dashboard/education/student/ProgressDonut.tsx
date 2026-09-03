/**
 * Overall-progress donut. `percent` is a real derived rollup — sum of
 * completed lessons over sum of total lessons across every one of the
 * student's own assignments (computed by the caller from `education-home`,
 * never fabricated). 0% renders normally, not as an error state (spec:
 * "Zero is not an error").
 */
export function ProgressDonut({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div
      className="relative h-24 w-24 shrink-0 rounded-full"
      style={{
        background: `conic-gradient(hsl(var(--edu-primary)) 0% ${clamped}%, hsl(var(--edu-track)) ${clamped}% 100%)`,
      }}
    >
      <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-card">
        <span className="text-[22px] font-medium leading-none text-foreground">{clamped}%</span>
        <span className="mt-1 text-[10px] text-muted-foreground">del plan</span>
      </div>
    </div>
  );
}
