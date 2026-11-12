/** Farm-local calendar date (yyyy-MM-dd) for a UTC/ISO instant. */
export function anchorDateFromIsoInTimezone(iso: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      calendar: 'gregory',
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

/** Farm-local calendar date (yyyy-MM-dd) for SOP materialize anchor. */
export function anchorDateForTimezone(timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      calendar: 'gregory',
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function intlLocale(locale: string): string {
  const lower = (locale ?? 'en').toLowerCase();
  if (lower.startsWith('ru')) return 'ru-RU';
  if (lower.startsWith('en')) return 'en-GB';
  return locale || 'en';
}

/** Farm-local due stamp in the app locale. Gregorian, so a Thai device calendar cannot show BE. */
export function formatSopDueWhen(
  iso: string,
  locale: string,
  timeZone: string,
  todayLabel: string,
): string {
  try {
    const at = new Date(iso);
    if (Number.isNaN(at.getTime())) return iso;
    const tz = timeZone || 'UTC';
    const loc = intlLocale(locale);
    const dueDay = anchorDateFromIsoInTimezone(iso, tz);
    const today = anchorDateForTimezone(tz);
    const time = new Intl.DateTimeFormat(loc, {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      calendar: 'gregory',
    }).format(at);
    if (dueDay === today) return `${todayLabel}, ${time}`;
    const date = new Intl.DateTimeFormat(loc, {
      timeZone: tz,
      day: 'numeric',
      month: 'short',
      calendar: 'gregory',
    }).format(at);
    return `${date}, ${time}`;
  } catch {
    return iso;
  }
}

export function sopRunTitle(run: {
  sop_definitions?: unknown;
}): string {
  if (
    run.sop_definitions &&
    typeof run.sop_definitions === 'object' &&
    'title' in run.sop_definitions
  ) {
    return (run.sop_definitions as { title: string }).title;
  }
  return 'SOP';
}
