import { fromZonedTime } from 'date-fns-tz';

/** UTC ISO bounds for a farm-local calendar day (matches worker focus.refresh). */
export function farmLocalDayUtcBounds(
  timelineDate: string,
  timezone: string
): { dayStartIso: string; dayEndIso: string } {
  const from = fromZonedTime(`${timelineDate}T00:00:00`, timezone || 'UTC');
  const to = fromZonedTime(`${timelineDate}T23:59:59.999`, timezone || 'UTC');
  return { dayStartIso: from.toISOString(), dayEndIso: to.toISOString() };
}
