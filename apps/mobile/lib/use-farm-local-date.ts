import { farmLocalDateString } from '@growlog/domain';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** Farm-local YYYY-MM-DD; refreshes each minute and when app returns to foreground. */
export function useFarmLocalDateString(timezone: string): string {
  const [date, setDate] = useState(() => farmLocalDateString(timezone));

  useEffect(() => {
    const tick = () => {
      const next = farmLocalDateString(timezone);
      setDate((prev) => (prev === next ? prev : next));
    };
    tick();
    const interval = setInterval(tick, 60_000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [timezone]);

  return date;
}
