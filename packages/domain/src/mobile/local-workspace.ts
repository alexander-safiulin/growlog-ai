import type { EventRow, GrowCycle } from '../types/database';
import type { EventType, SourceType } from '../types/domain';
import { createGuestId } from '../nutrient/guest-store';
import {
  aggregateCycleDayMarkers,
  type RawCalendarEvent,
  type RawFeedingRow,
} from '../growlog/cycle-calendar';
import {
  growerStageRank,
  initialStageForMaterial,
  stagesForStartMaterial,
  type GrowCycleStage,
  type StartMaterial,
} from '../growlog/cycle-tracking';

export const LOCAL_WORKSPACE_STORAGE_KEY = 'growlog_local_workspace_v1';
export const LOCAL_WORKSPACE_VERSION = 1 as const;

/** Sentinel ids for UI only — never sent to Supabase. */
export const LOCAL_WORKSPACE_IDS = {
  farm: 'local-workspace-farm',
  cycle: 'local-workspace-cycle',
  scope: 'local-workspace-scope',
} as const;

const LOCAL_WORKSPACE_ID_SET: ReadonlySet<string> = new Set(Object.values(LOCAL_WORKSPACE_IDS));

/** True for on-device sentinel ids — must not be sent to Supabase as UUIDs. */
export function isLocalWorkspaceEntityId(id: string | null | undefined): boolean {
  if (!id) return false;
  return LOCAL_WORKSPACE_ID_SET.has(id);
}

/** True when any id is an on-device sentinel. Cloud reads should return empty; writes must not run. */
export function hasLocalWorkspaceEntityId(...ids: Array<string | null | undefined>): boolean {
  return ids.some((id) => isLocalWorkspaceEntityId(id));
}

export type LocalFarm = {
  name: string;
  timezone: string;
};

export type LocalGrowCycle = {
  id: string;
  name: string;
  cultivar_name: string | null;
  start_date: string;
  stage: string;
  timezone: string;
  start_material: StartMaterial;
  plant_count: number | null;
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
  farm: LocalFarm;
  cycle: LocalGrowCycle;
  journal: LocalJournalEntry[];
  /** Set after journal entries were uploaded during cloud sync. */
  journalSyncedAt: string | null;
};

export type LocalNewCycleInput = {
  cycleName: string;
  cultivarName?: string | null;
  startDate: string;
  stage: GrowCycleStage;
  startMaterial: StartMaterial;
  plantCount?: number | null;
  lightHoursOn: number;
  lightHoursOff: number;
  lightsOnAt: string;
  timezone: string;
};

export type LocalFoundationSetupInput = LocalNewCycleInput & {
  farmName: string;
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
    farm: { name: 'My grow', timezone: tz },
    cycle: {
      id: LOCAL_WORKSPACE_IDS.cycle,
      name: 'Cycle 1',
      cultivar_name: null,
      start_date: start,
      stage: initialStageForMaterial('seed'),
      timezone: tz,
      start_material: 'seed',
      plant_count: null,
      light_hours_on: 18,
      light_hours_off: 6,
      lights_on_at: '06:00',
    },
    journal: [],
    journalSyncedAt: null,
  };
}

function normalizeLocalGrowCycle(cycle: LocalGrowCycle, fallbackTz: string): LocalGrowCycle {
  return {
    ...cycle,
    timezone: cycle.timezone || fallbackTz,
    start_material: cycle.start_material === 'clone' ? 'clone' : 'seed',
    plant_count: cycle.plant_count ?? null,
    light_hours_on: cycle.light_hours_on ?? 18,
    light_hours_off: cycle.light_hours_off ?? 6,
    lights_on_at: cycle.lights_on_at ?? '06:00',
  };
}

export function applyLocalNewCycle(
  store: LocalWorkspaceStore,
  input: LocalNewCycleInput,
): LocalWorkspaceStore {
  const tz = input.timezone || store.farm.timezone;
  return {
    ...store,
    farm: { ...store.farm, timezone: tz },
    cycle: {
      id: LOCAL_WORKSPACE_IDS.cycle,
      name: input.cycleName.trim() || 'Cycle 1',
      cultivar_name: input.cultivarName?.trim() || null,
      start_date: input.startDate,
      stage: input.stage,
      timezone: tz,
      start_material: input.startMaterial,
      plant_count: input.plantCount ?? null,
      light_hours_on: input.lightHoursOn,
      light_hours_off: input.lightHoursOff,
      lights_on_at: input.lightsOnAt,
    },
    journal: [],
    journalSyncedAt: null,
  };
}

export function applyLocalFoundationSetup(
  store: LocalWorkspaceStore | null,
  input: LocalFoundationSetupInput,
): LocalWorkspaceStore {
  const base = store ?? createDefaultLocalWorkspace();
  const tz = input.timezone || base.farm.timezone;
  const withFarm: LocalWorkspaceStore = {
    ...base,
    farm: { name: input.farmName.trim() || base.farm.name, timezone: tz },
  };
  return applyLocalNewCycle(withFarm, input);
}

export function parseLocalWorkspaceStore(raw: string | null | undefined): LocalWorkspaceStore | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as LocalWorkspaceStore;
    if (parsed.version !== LOCAL_WORKSPACE_VERSION || !parsed.cycle) return null;
    const defaults = createDefaultLocalWorkspace();
    const cycle = normalizeLocalGrowCycle(parsed.cycle, defaults.farm.timezone);
    const farm: LocalFarm = parsed.farm ?? {
      name: cycle.name === defaults.cycle.name ? defaults.farm.name : cycle.name,
      timezone: cycle.timezone,
    };
    return {
      ...defaults,
      ...parsed,
      farm,
      cycle,
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
    plant_count: cycle.plant_count,
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

export function assertLocalGrowCycleStageTransition(
  fromStage: string,
  toStage: GrowCycleStage,
  startMaterial: 'seed' | 'clone',
  allowBackward: boolean,
): void {
  const material = startMaterial ?? 'seed';
  if (material === 'clone' && toStage === 'propagation') {
    throw new Error('grow_cycle_stage: clone cycles cannot enter propagation');
  }
  if (material === 'seed' && toStage === 'cloning') {
    throw new Error('grow_cycle_stage: seed cycles cannot enter cloning');
  }
  if (fromStage === toStage) return;

  const fromRank = growerStageRank(fromStage);
  const toRank = growerStageRank(toStage);
  if (fromRank === 0 || toRank === 0) {
    throw new Error('grow_cycle_stage: invalid stage');
  }
  if (toRank < fromRank && !allowBackward) {
    throw new Error('grow_cycle_stage: backward stage transition not allowed');
  }
  if (!stagesForStartMaterial(material).includes(toStage)) {
    throw new Error('grow_cycle_stage: invalid new_stage');
  }
}

export function transitionLocalGrowCycleStage(
  store: LocalWorkspaceStore,
  params: {
    newStage: GrowCycleStage;
    occurredAt?: string;
    allowBackward?: boolean;
  },
): LocalWorkspaceStore {
  const fromStage = store.cycle.stage;
  assertLocalGrowCycleStageTransition(
    fromStage,
    params.newStage,
    store.cycle.start_material,
    params.allowBackward ?? false,
  );
  if (fromStage === params.newStage) return store;

  const occurredAt = params.occurredAt ?? new Date().toISOString();
  const withEvent = appendLocalJournalEntry(store, {
    event_type: 'stage_changed',
    occurred_at: occurredAt,
    body: null,
    source_type: 'user_form',
    payload: { from_stage: fromStage, to_stage: params.newStage },
  });
  return {
    ...withEvent,
    cycle: { ...withEvent.cycle, stage: params.newStage },
  };
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
