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
  const savedSnapshotRef = useRef(snapshot);
  const lastResetKeyRef = useRef(resetKey);
  const valueRef = useRef(value);
  valueRef.current = value;
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  // Ref mutation during render — the documented React pattern for
  // "adjusting state (here: a ref baseline) when a prop changes" without an
  // extra effect round-trip. `resetKeyChanged` is only used to gate effect
  // scheduling below, never to compute this render's own output.
  const resetKeyChanged = lastResetKeyRef.current !== resetKey;
  if (resetKeyChanged) {
    lastResetKeyRef.current = resetKey;
    savedSnapshotRef.current = snapshot;
  }

  useEffect(() => {
    if (!enabled || resetKeyChanged) return;
    if (snapshot === savedSnapshotRef.current) return;

    setStatus('saving');
    const timer = setTimeout(() => {
      onSaveRef
        .current(valueRef.current)
        .then(() => {
          savedSnapshotRef.current = snapshot;
          setStatus('saved');
          setLastSavedAt(new Date());
        })
        .catch(() => setStatus('error'));
    }, delayMs);

    return () => clearTimeout(timer);
  }, [snapshot, enabled, delayMs, resetKeyChanged]);

  return { status, lastSavedAt };
}
