import { useEffect, useRef, useState } from 'react';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutosaveOptions {
  /** Debounce window (tasks-v2-part2 I.4: "2s debounce"). */
  delayMs?: number;
  /** When `false`, no write is scheduled at all (e.g. no steps yet). */
  enabled?: boolean;
  /**
   * A key that changes whenever `value` was swapped for an unrelated
   * baseline (e.g. the author switched to editing a DIFFERENT step). A
   * `resetKey` change means the incoming `value` is a freshly LOADED
   * snapshot, not a pending edit — the hook re-baselines instead of racing
   * a save against the wrong record. Without this, quickly switching steps
   * could schedule (or worse, eventually fire) a write for step B using
   * step A's blocks, or vice-versa.
   */
  resetKey?: string | number | null;
}

/**
 * Generic 2s-debounced autosave hook (tasks-v2-part2 I.4). Watches a
 * serializable `value` and calls `onSave` once the caller stops changing it
 * for `delayMs`. The very first render (the value just LOADED from the
 * server) is never treated as a pending edit — same rule applies again every
 * time `resetKey` changes.
 */
export function useAutosave<T>(
  value: T,
  onSave: (value: T) => Promise<void>,
  options: UseAutosaveOptions = {}
): { status: AutosaveStatus; lastSavedAt: Date | null } {
  const delayMs = options.delayMs ?? 2000;
  const enabled = options.enabled ?? true;
  const resetKey = options.resetKey ?? null;

  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const snapshot = JSON.stringify(value);

  // React's own sanctioned "adjust state while rendering" pattern (state,
  // not a ref — react-doctor/no-ref-current-in-render correctly flagged the
  // previous ref-mutating version of this same bookkeeping): comparing
  // against a previous-render value and conditionally calling a setter
  // during render is safe because React immediately re-renders with the
  // new state before anything commits, so an interrupted/replayed render
  // never leaves stale bookkeeping behind the way a ref write would.
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  const [savedSnapshot, setSavedSnapshot] = useState(snapshot);
  const resetKeyChanged = resetKey !== prevResetKey;
  if (resetKeyChanged) {
    setPrevResetKey(resetKey);
    setSavedSnapshot(snapshot);
  }

  // The latest value/onSave, reachable from the debounce timeout's callback
  // below without re-scheduling the timer on every keystroke. Written from
  // an effect (after commit), never during render — the timeout only ever
  // fires well after commit, so effect-timing latency here doesn't matter.
  const valueRef = useRef(value);
  const onSaveRef = useRef(onSave);
  useEffect(() => {
    valueRef.current = value;
    onSaveRef.current = onSave;
  });

  useEffect(() => {
    if (!enabled || resetKeyChanged) return;
    if (snapshot === savedSnapshot) return;

    setStatus('saving');
    const timer = setTimeout(() => {
      onSaveRef
        .current(valueRef.current)
        .then(() => {
          setSavedSnapshot(snapshot);
          setStatus('saved');
          setLastSavedAt(new Date());
        })
        .catch(() => setStatus('error'));
    }, delayMs);

    return () => clearTimeout(timer);
  }, [snapshot, enabled, delayMs, resetKeyChanged, savedSnapshot]);

  return { status, lastSavedAt };
}
