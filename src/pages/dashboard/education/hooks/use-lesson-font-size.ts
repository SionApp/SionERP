import { useCallback, useState } from 'react';

/**
 * Client-local reading-size preference for the lesson viewer's content
 * column (README §4 "Visor de lección": `text_increase` "Texto" pill in the
 * top bar). Explicitly NOT synced to the server — this is a per-device
 * reading comfort setting, distinct from `current_step_id`/
 * `visited_step_ids` progress (design: "Bookmark and font size are
 * client-local localStorage — a reading preference, not progress").
 *
 * Applied as a `font-size: N%` override on the content wrapper, which
 * cascades to every text-bearing block's `size="full"` classes — those are
 * deliberately written in `em` (not Tailwind's default `rem`, which is
 * root-anchored and would ignore an ancestor override) precisely so this
 * cascades correctly. Explicitly NOT `zoom`/`transform: scale`: both scale
 * the element's rendered BOX, not just its type, which at the largest stop
 * on a 375px viewport reliably overflows the box past the viewport width —
 * exactly the class of mobile horizontal-scroll bug this project has
 * shipped before. A `font-size` cascade only ever changes how much
 * VERTICAL space wrapped text needs, never the box's width, so there is no
 * overflow risk at any stop. Nav footer and step indicator sit OUTSIDE this
 * wrapper and keep their fixed ≥44px touch targets regardless.
 */
const STORAGE_KEY = 'education-lesson-font-size';
const STOPS = [100, 115, 130] as const;
type FontSizeStop = (typeof STOPS)[number];

function readStoredStop(): FontSizeStop {
  if (typeof window === 'undefined') return 100;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const parsed = raw ? Number(raw) : 100;
  return (STOPS as readonly number[]).includes(parsed) ? (parsed as FontSizeStop) : 100;
}

export function useLessonFontSize() {
  const [stop, setStop] = useState<FontSizeStop>(readStoredStop);

  const cycle = useCallback(() => {
    setStop(current => {
      const next = STOPS[(STOPS.indexOf(current) + 1) % STOPS.length];
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      }
      return next;
    });
  }, []);

  return {
    /** `font-size` percentage for the content wrapper, e.g. `"115%"`. */
    fontSizePercent: `${stop}%`,
    /** `true` once the stop has cycled past the default — used to badge the "Texto" pill. */
    isEnlarged: stop !== 100,
    cycle,
  };
}
