const GRADIENT_COUNT = 5;

/** djb2 — small, deterministic, good-enough distribution for a 5-bucket pick. */
function hashString(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return Math.abs(hash);
}

/**
 * Deterministic cover-gradient CSS var for a course, from curriculum id +
 * track (spec: "the per-course cover gradient MUST be deterministic ...
 * stable across renders and sessions"). Same id+track always resolves to
 * the same one of the 5 `--edu-cover-N` gradients defined in
 * education-theme.css — never a random pick, never a raw hex literal here.
 */
export function getCourseGradientVar(curriculumId: string, track: string | null): string {
  const bucket = (hashString(curriculumId + (track ?? '')) % GRADIENT_COUNT) + 1;
  return `var(--edu-cover-${bucket})`;
}
