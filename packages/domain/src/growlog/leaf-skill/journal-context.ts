import type { LeafJournalContext } from './types';

/**
 * Build leaf skill journal slice from retrieval-friendly facts (ADR-003).
 * Caller passes already-fetched events/readings — no DB here.
 */
export type LeafJournalFeed = {
  metricCode: string;
  value: number;
  recordedAt: string;
};

export type LeafJournalEvent = {
  eventType: string;
  occurredAt: string;
  title?: string | null;
  body?: string | null;
};

const PH_CODES = new Set(['ph', 'substrate_ph', 'runoff_ph', 'solution_ph', 'water_ph']);
const EC_CODES = new Set(['ec', 'substrate_ec', 'runoff_ec', 'solution_ec', 'water_ec']);

function latestMetric(readings: LeafJournalFeed[], codes: Set<string>): number | null {
  let best: LeafJournalFeed | null = null;
  for (const r of readings) {
    if (!codes.has(r.metricCode.toLowerCase())) continue;
    if (!best || r.recordedAt > best.recordedAt) best = r;
  }
  return best ? best.value : null;
}

function latestFeeding(events: LeafJournalEvent[]): { at: string; label: string } | null {
  let best: LeafJournalEvent | null = null;
  for (const e of events) {
    if (e.eventType !== 'feeding' && e.eventType !== 'watering') continue;
    if (!best || e.occurredAt > best.occurredAt) best = e;
  }
  if (!best) return null;
  const label = [best.title, best.body].filter(Boolean).join(' — ') || best.eventType;
  return { at: best.occurredAt, label };
}

export function buildLeafJournalContext(params: {
  sensorReadings?: LeafJournalFeed[];
  recentEvents?: LeafJournalEvent[];
}): LeafJournalContext {
  const readings = params.sensorReadings ?? [];
  const events = params.recentEvents ?? [];
  const substratePh = latestMetric(readings, PH_CODES);
  const substrateEc = latestMetric(readings, EC_CODES);
  const feeding = latestFeeding(events);
  return {
    substratePh,
    substrateEc,
    solutionPh: null,
    solutionEc: null,
    lastFeedingAt: feeding?.at ?? null,
    lastFeedingLabel: feeding?.label ?? null,
  };
}
