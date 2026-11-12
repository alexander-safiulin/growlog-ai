const YMD = /^\d{4}-\d{2}-\d{2}$/;

function parseYmdUtc(ymd: string): Date | null {
  if (!YMD.test(ymd)) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Locale-friendly range for grow-report setup UI (calendar dates, UTC midnight). */
export function formatGrowReportDateRange(startDate: string, endDate: string, locale: string): string {
  const a = parseYmdUtc(startDate);
  const b = parseYmdUtc(endDate);
  if (!a || !b) return `${startDate} — ${endDate}`;
  const fmt = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  return `${fmt.format(a)} — ${fmt.format(b)}`;
}

export function validateGrowReportPeriod(startDate: string, endDate: string): { ok: true } | { ok: false; error: string } {
  if (!YMD.test(startDate) || !YMD.test(endDate)) {
    return { ok: false, error: 'invalid_date_format' };
  }
  if (startDate > endDate) {
    return { ok: false, error: 'invalid_period' };
  }
  return { ok: true };
}
