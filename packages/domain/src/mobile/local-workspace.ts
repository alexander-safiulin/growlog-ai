import type { EventRow, GrowCycle } from '../types/database';
import type { EventType, SourceType } from '../types/domain';
import { createGuestId } from '../nutrient/guest-store';
import {
  aggregateCycleDayMarkers,
  type RawCalendarEvent,
  type RawFeedingRow,
} from '../growlog/cycle-calendar';

export const LOCAL_WORKSPACE_STORAGE_KEY = 'growlog_local_workspace_v1';
export const LOCAL_WORKSPACE_VERSION = 1 as const;

/** Sentinel ids for UI only — never sent to Supabase. */
export const LOCAL_WORKSPACE_IDS = {
  farm: 'local-workspace-farm',
  cycle: 'local-workspace-cycle',
  scope: 'local-workspace-scope',
} as const;

export type LocalGrowCycle = {
  id: string;
  name: string;
  cultivar_name: string | null;
  start_date: string;
  stage: string;
  timezone: string;
  start_material: 'seed' | 'clone';
  light_hours_on: number;
  light_hours_off: number;
  lights_on_at: string;
};

export type LocalJournalEntry = {
  id: string;
  event_type: EventType;
  occurred_at: string;
  body: string | null;
  source_type: SourceType;
  payload: Record<string, unknown>;
  created_at: string;
};

export type LocalWorkspaceStore = {
  version: typeof LOCAL_WORKSPACE_VERSION;
  cycle: LocalGrowCycle;
  journal: LocalJournalEntry[];
  /** Set after journal entries were uploaded during cloud sync. */
  journalSyncedAt: string | null;
};

export function defaultDeviceTimezone(): string {
  if (typeof Intl !== 'undefined') {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  return 'UTC';
}

export function createDefaultLocalWorkspace(now = new Date()): LocalWorkspaceStore {
  const tz = defaultDeviceTimezone();
  const start = now.toISOString().slice(0, 10);
  return {
    version: LOCAL_WORKSPACE_VERSION,
    cycle: {
      id: LOCAL_WORKSPACE_IDS.cycle,
      name: 'My grow',
      cultivar_name: null,
      start_date: start,
      stage: 'veg',
      timezone: tz,
      start_material: 'seed',
      light_hours_on: 18,
      light_hours_off: 6,
      lights_on_at: '06:00',
    },
    journal: [],
    journalSyncedAt: null,
  };
}

export function parseLocalWorkspaceStore(raw: string | null | undefined): LocalWorkspaceStore | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as LocalWorkspaceStore;
    if (parsed.version !== LOCAL_WORKSPACE_VERSION || !parsed.cycle) return null;
    return {
      ...createDefaultLocalWorkspace(),
      ...parsed,
      journal: Array.isArray(parsed.journal) ? parsed.journal : [],
    };
  } catch {
    return null;
  }
}

export function serializeLocalWorkspaceStore(store: LocalWorkspaceStore): string {
  return JSON.stringify(store);
}

export function localCycleToGrowCycle(cycle: LocalGrowCycle): GrowCycle {
  const now = new Date().toISOString();
  return {
    id: cycle.id,
    farm_id: LOCAL_WORKSPACE_IDS.farm,
    site_id: null,
    zone_id: null,
    name: cycle.name,
    cultivar_name: cycle.cultivar_name,
    batch_code: null,
    start_date: cycle.start_date,
    end_date: null,
    status: 'active',
    stage: cycle.stage,
    plant_count: null,
    start_material: cycle.start_material,
    light_hours_on: cycle.light_hours_on,
    light_hours_off: cycle.light_hours_off,
    lights_on_at: cycle.lights_on_at,
    goal_profile: null,
    metadata: { local: true },
    created_by: null,
    created_at: now,
    updated_at: now,
  };
}

export function localJournalToEventRows(store: LocalWorkspaceStore): EventRow[] {
  return store.journal.map((e) => ({
    id: e.id,
    farm_id: LOCAL_WORKSPACE_IDS.farm,
    cycle_id: store.cycle.id,
    scope_id: LOCAL_WORKSPACE_IDS.scope,
    event_type: e.event_type,
    title: null,
    body: e.body,
    occurred_at: e.occurred_at,
    source_type: e.source_type,
    payload: e.payload,
    created_at: e.created_at,
  }));
}

export function appendLocalJournalEntry(
  store: LocalWorkspaceStore,
  entry: Omit<LocalJournalEntry, 'id' | 'created_at'> & { id?: string; created_at?: string },
): LocalWorkspaceStore {
  const row: LocalJournalEntry = {
    id: entry.id ?? createGuestId(),
    created_at: entry.created_at ?? new Date().toISOString(),
    event_type: entry.event_type,
    occurred_at: entry.occurred_at,
    body: entry.body,
    source_type: entry.source_type,
    payload: entry.payload,
  };
  return { ...store, journal: [...store.journal, row] };
}

export function localJournalFeedingRows(store: LocalWorkspaceStore): RawFeedingRow[] {
  const rows: RawFeedingRow[] = [];
  for (const e of store.journal) {
    if (e.event_type !== 'watering' && e.event_type !== 'feeding') continue;
    const p = e.payload;
    rows.push({
      event_id: e.id,
      occurred_at: e.occurred_at,
      entry_kind: e.event_type,
      volume_ml: Number(p.volume_ml ?? 0),
      ph: typeof p.ph === 'number' ? p.ph : null,
      ec_ms: typeof p.ec_ms === 'number' ? p.ec_ms : null,
      air_temp_c: typeof p.air_temp_c === 'number' ? p.air_temp_c : null,
      air_rh_pct: typeof p.air_rh_pct === 'number' ? p.air_rh_pct : null,
      recipe_name: typeof p.recipe_name === 'string' ? p.recipe_name : null,
      comment: e.body,
      doses: Array.isArray(p.doses) ? (p.doses as RawFeedingRow['doses']) : [],
    });
  }
  return rows;
}

export function localJournalCalendarMarkers(
  store: LocalWorkspaceStore,
): Record<string, import('../growlog/cycle-calendar').CycleDayMarker> {
  const events: RawCalendarEvent[] = store.journal.map((e) => ({
    id: e.id,
    event_type: e.event_type,
    occurred_at: e.occurred_at,
    body: e.body,
    payload: e.payload,
  }));
  return aggregateCycleDayMarkers({
    events,
    feedingRows: localJournalFeedingRows(store),
    timeZone: store.cycle.timezone,
  });
}

export function localJournalPendingSync(store: LocalWorkspaceStore): boolean {
  return store.journal.length > 0 && store.journalSyncedAt == null;
}

export function clearLocalJournalAfterSync(store: LocalWorkspaceStore): LocalWorkspaceStore {
  return {
    ...store,
    journal: [],
    journalSyncedAt: new Date().toISOString(),
  };
}
