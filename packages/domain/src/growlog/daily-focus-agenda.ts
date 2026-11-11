import type { AnswerAssemblyContext } from '../types/retrieval-assembly';
import type { SopRunRow } from '../types/sop';
import { filterSopRunsForFocusDay, sortSopRunsForDailyFocus } from './sop-engine-pure';
import { normalizeProductLocale } from '../i18n/mobile-strings';
import type { SopUpcomingPreviewItem } from './sop-materialize';

export type DailyFocusRunBucket =
  | 'overdue'
  | 'due_today_critical'
  | 'due_today_high'
  | 'due_today_normal'
  | 'acknowledged';

export type DailyFocusAgendaRunItem = {
  kind: 'run';
  runId: string;
  title: string;
  status: SopRunRow['status'];
  priority: string;
  reasonText: string | null;
  dueAt: string | null;
  bucket: DailyFocusRunBucket;
};

export type DailyFocusAgendaUpcomingItem = {
  kind: 'upcoming';
  definitionId: string;
  definitionTitle: string;
  triggerId: string;
  anchorDate: string;
  reasonText: string | null;
  localTime: string | null;
};

export type DailyFocusAgenda = {
  focusDate: string;
  overdue: DailyFocusAgendaRunItem[];
  dueTodayCritical: DailyFocusAgendaRunItem[];
  dueTodayHigh: DailyFocusAgendaRunItem[];
  dueTodayNormal: DailyFocusAgendaRunItem[];
  acknowledged: DailyFocusAgendaRunItem[];
  upcoming: DailyFocusAgendaUpcomingItem[];
  /** ADR-006 flat order for UI and worker trust checks */
  orderedRuns: DailyFocusAgendaRunItem[];
};

function runTitle(r: SopRunRow): string {
  const def = r.sop_definitions;
  if (def && typeof def === 'object' && 'title' in def && typeof def.title === 'string') {
    return def.title;
  }
  return 'SOP';
}

function bucketForRun(r: SopRunRow): DailyFocusRunBucket {
  if (r.status === 'overdue') return 'overdue';
  if (r.status === 'acknowledged') return 'acknowledged';
  const pr = (r.priority ?? 'normal').toLowerCase();
  if (pr === 'urgent') return 'due_today_critical';
  if (pr === 'high') return 'due_today_high';
  return 'due_today_normal';
}

function toRunItem(r: SopRunRow): DailyFocusAgendaRunItem {
  const bucket = bucketForRun(r);
  return {
    kind: 'run',
    runId: r.id,
    title: runTitle(r),
    status: r.status,
    priority: r.priority,
    reasonText: r.reason_text,
    dueAt: r.due_at,
    bucket,
  };
}

export function buildDailyFocusAgenda(params: {
  focusDate: string;
  runs: SopRunRow[];
  upcoming?: SopUpcomingPreviewItem[];
  now?: Date;
}): DailyFocusAgenda {
  const scoped = filterSopRunsForFocusDay(params.runs, params.focusDate, params.now);
  const sorted = sortSopRunsForDailyFocus(scoped);
  const orderedRuns = sorted.map(toRunItem);

  const overdue: DailyFocusAgendaRunItem[] = [];
  const dueTodayCritical: DailyFocusAgendaRunItem[] = [];
  const dueTodayHigh: DailyFocusAgendaRunItem[] = [];
  const dueTodayNormal: DailyFocusAgendaRunItem[] = [];
  const acknowledged: DailyFocusAgendaRunItem[] = [];

  for (const item of orderedRuns) {
    switch (item.bucket) {
      case 'overdue':
        overdue.push(item);
        break;
      case 'due_today_critical':
        dueTodayCritical.push(item);
        break;
      case 'due_today_high':
        dueTodayHigh.push(item);
        break;
      case 'due_today_normal':
        dueTodayNormal.push(item);
        break;
      case 'acknowledged':
        acknowledged.push(item);
        break;
      default:
        break;
    }
  }

  const upcoming: DailyFocusAgendaUpcomingItem[] = (params.upcoming ?? []).map((u) => ({
    kind: 'upcoming',
    definitionId: u.sopDefinitionId,
    definitionTitle: u.definitionTitle,
    triggerId: u.triggerId,
    anchorDate: u.anchorDate,
    reasonText: u.reasonText,
    localTime: u.localTime,
  }));

  return {
    focusDate: params.focusDate,
    overdue,
    dueTodayCritical,
    dueTodayHigh,
    dueTodayNormal,
    acknowledged,
    upcoming,
    orderedRuns,
  };
}

export function agendaHasActionableRuns(agenda: DailyFocusAgenda): boolean {
  return agenda.orderedRuns.length > 0;
}

function isoInWindow(iso: string, dayStartIso: string, dayEndIso: string): boolean {
  const t = new Date(iso).getTime();
  const from = new Date(dayStartIso).getTime();
  const to = new Date(dayEndIso).getTime();
  return t >= from && t <= to;
}

function statMatchesFocusDay(statDate: string, focusDate: string): boolean {
  return statDate.slice(0, 10) === focusDate;
}

/** True when farm-local day has events, sensors, anomalies, or feed logs (not stale history only). */
export function focusPackHasSignalsToday(
  pack: AnswerAssemblyContext,
  dayStartIso: string,
  dayEndIso: string,
  focusDate: string
): boolean {
  const brief = pack.cycleBrief;
  const eventsToday = pack.recentEvents.some((e) => isoInWindow(e.occurredAt, dayStartIso, dayEndIso));
  const journalToday = (brief?.growerJournalEvents ?? []).some((e) =>
    isoInWindow(e.occurredAt, dayStartIso, dayEndIso)
  );
  const statsBriefToday = (brief?.sensorDailyStats ?? []).some((s) =>
    statMatchesFocusDay(s.statDate, focusDate)
  );
  const statsPackToday = pack.environmentalStats.some((s) =>
    statMatchesFocusDay(s.statDate, focusDate)
  );
  const sensorsToday =
    pack.sensorContext.some((s) => isoInWindow(s.capturedAt, dayStartIso, dayEndIso)) ||
    statsBriefToday ||
    statsPackToday;
  const anomaliesToday = pack.anomalyContext.some((a) => isoInWindow(a.occurredAt, dayStartIso, dayEndIso));
  const feedingToday = (brief?.recentFeedings ?? []).some((f) =>
    isoInWindow(f.occurredAt, dayStartIso, dayEndIso)
  );
  const timelineToday = pack.dailyTimelines.some(
    (t) => t.timelineDate.slice(0, 10) === focusDate && (t.summaryText?.trim().length ?? 0) > 0
  );
  return eventsToday || journalToday || sensorsToday || anomaliesToday || feedingToday || timelineToday;
}

export function assistantModelFromAgenda(
  agenda: DailyFocusAgenda,
  pack: AnswerAssemblyContext,
  options?: { locale?: string }
): {
  insight_type: 'daily_focus';
  title: string;
  body: string;
  facts: string[];
  interpretation: string | null;
  hypotheses: string[];
  recommendation: string | null;
  confidence: { score: number; label: 'low' | 'medium' | 'high' };
  missing_data: string[];
  grounding: { source_type: string; source_id: string; excerpt: string }[];
  trust_flags: string[];
} {
  const { title, body, recommendation } = deterministicDailyFocusBodyFromAgenda(agenda, options);
  const facts = agendaFactLines(agenda);
  const grounding = agenda.orderedRuns.slice(0, 5).map((r) => ({
    source_type: 'sop_run',
    source_id: r.runId,
    excerpt: r.title,
  }));
  return {
    insight_type: 'daily_focus',
    title,
    body,
    facts,
    interpretation: null,
    hypotheses: [],
    recommendation,
    confidence: {
      score: agendaHasActionableRuns(agenda) ? 0.72 : 0.55,
      label: 'medium',
    },
    missing_data: [...pack.missingData],
    grounding,
    trust_flags: [],
  };
}

export function agendaFactLines(agenda: DailyFocusAgenda): string[] {
  const lines: string[] = [];
  for (const item of agenda.orderedRuns) {
    const status = item.status === 'overdue' ? 'overdue' : item.status;
    const reason = item.reasonText ? ` — ${item.reasonText}` : '';
    lines.push(`[sop_run ${item.runId}] ${item.title} (${status}, ${item.priority})${reason}`);
  }
  for (const u of agenda.upcoming) {
    const time = u.localTime ? ` @ ${u.localTime}` : '';
    lines.push(
      `[upcoming trigger ${u.triggerId}] ${u.definitionTitle} on ${u.anchorDate}${time}${u.reasonText ? ` — ${u.reasonText}` : ''}`
    );
  }
  return lines;
}

export function formatDailyFocusAgendaForPrompt(agenda: DailyFocusAgenda): string {
  const sections: string[] = [`daily_focus_agenda (focus_date=${agenda.focusDate})`];
  const pushGroup = (label: string, items: DailyFocusAgendaRunItem[]) => {
    if (!items.length) return;
    sections.push(`${label}:`);
    for (const item of items) {
      sections.push(
        `- run_id=${item.runId} title=${JSON.stringify(item.title)} status=${item.status} priority=${item.priority}${item.reasonText ? ` reason=${JSON.stringify(item.reasonText)}` : ''}`
      );
    }
  };
  pushGroup('critical_overdue_and_overdue', agenda.overdue);
  pushGroup('due_today_critical', agenda.dueTodayCritical);
  pushGroup('due_today_high', agenda.dueTodayHigh);
  pushGroup('due_today_normal', agenda.dueTodayNormal);
  pushGroup('acknowledged_not_completed', agenda.acknowledged);
  if (agenda.upcoming.length) {
    sections.push('upcoming_1_to_3_days:');
    for (const u of agenda.upcoming) {
      sections.push(
        `- def=${JSON.stringify(u.definitionTitle)} trigger_id=${u.triggerId} anchor_date=${u.anchorDate}${u.localTime ? ` local_time=${u.localTime}` : ''}`
      );
    }
  }
  if (sections.length === 1) {
    sections.push('(no open sop_runs and no upcoming calendar triggers in preview)');
  }
  return sections.join('\n');
}

export type DailyFocusGroundingLike = {
  source_type: string;
  source_id: string | null;
};

/** Deterministic trust check: top agenda run must appear in grounding when runs exist. */
export function dailyFocusGroundingPassesAgenda(
  agenda: DailyFocusAgenda,
  grounding: DailyFocusGroundingLike[]
): boolean {
  if (!agenda.orderedRuns.length) {
    return !grounding.some((g) => g.source_type === 'sop_run');
  }
  const topId = agenda.orderedRuns[0]!.runId;
  const allowedRunIds = new Set(agenda.orderedRuns.map((r) => r.runId));
  for (const g of grounding) {
    if (g.source_type !== 'sop_run' || g.source_id == null) continue;
    if (!allowedRunIds.has(g.source_id)) return false;
  }
  return grounding.some(
    (g) => g.source_type === 'sop_run' && g.source_id != null && g.source_id === topId
  );
}

export function deterministicDailyFocusBodyFromAgenda(
  agenda: DailyFocusAgenda,
  options?: { locale?: string }
): { title: string; body: string; recommendation: string | null } {
  const loc = normalizeProductLocale(options?.locale);
  const ru = loc === 'ru';
  const title = ru ? `Фокус на ${agenda.focusDate}` : `Focus for ${agenda.focusDate}`;

  const parts: string[] = [];
  const top = agenda.orderedRuns[0];
  if (top) {
    const lead = ru
      ? top.status === 'overdue'
        ? `Сначала: просроченный регламент «${top.title}».`
        : `Сначала: «${top.title}».`
      : top.status === 'overdue'
        ? `Start with overdue SOP "${top.title}".`
        : `Start with "${top.title}".`;
    parts.push(lead);
    if (top.reasonText) {
      parts.push(top.reasonText);
    }
    const more = agenda.orderedRuns.length - 1;
    if (more > 0) {
      parts.push(ru ? `Ещё задач: ${more}.` : `${more} more SOP task(s) in today's agenda.`);
    }
  } else {
    parts.push(
      ru ? 'Обязательных регламентов на сегодня нет.' : 'No required SOP tasks for today.'
    );
  }

  if (agenda.upcoming.length) {
    const soon = agenda.upcoming.slice(0, 3);
    const soonLines = soon.map((u) => {
      const time = u.localTime ? ` ${u.localTime}` : '';
      return ru
        ? `${u.definitionTitle} — ${u.anchorDate}${time}`
        : `${u.definitionTitle} — ${u.anchorDate}${time}`;
    });
    parts.push((ru ? 'Скоро: ' : 'Soon: ') + soonLines.join('; '));
  }

  const recommendation =
    top != null
      ? ru
        ? `Откройте регламент и выполните шаги: ${top.title}.`
        : `Open the SOP and complete: ${top.title}.`
      : null;

  return { title, body: parts.join(' '), recommendation };
}
