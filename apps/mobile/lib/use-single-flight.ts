import { useCallback, useRef, useState } from 'react';

/** Runs at most one async action at a time; overlapping calls are ignored. */
export function useSingleFlight(onSkipped?: () => void) {
  const inFlightRef = useRef(false);
  const onSkippedRef = useRef(onSkipped);
  onSkippedRef.current = onSkipped;
  const [busy, setBusy] = useState(false);

  const run = useCallback(async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (inFlightRef.current) {
      onSkippedRef.current?.();
      return undefined;
    }
    inFlightRef.current = true;
    setBusy(true);
    try {
      return await fn();
    } finally {
      inFlightRef.current = false;
      setBusy(false);
    }
  }, []);

  return { run, busy };
}
