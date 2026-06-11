import { useEffect, useState, useRef } from 'react';

/**
 * Anima un número de 0 a `end` en `duration` ms.
 * Solo arranca cuando `enabled` es true (controla el trigger visual).
 */
export function useCountUp(
  end: number,
  { duration = 600, enabled = true }: { duration?: number; enabled?: boolean } = {}
) {
  const [value, setValue] = useState(0);
  const raf = useRef<number>(0);
  const startTime = useRef<number>(0);

  useEffect(() => {
    if (!enabled || end === 0) {
      setValue(end);
      return;
    }

    startTime.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      setValue(Math.round(eased * end));

      if (progress < 1) {
        raf.current = requestAnimationFrame(tick);
      }
    };

    raf.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf.current);
  }, [end, duration, enabled]);

  return value;
}
