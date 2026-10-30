import { describe, expect, it } from 'vitest';
import {
  appendLocalJournalEntry,
  createDefaultLocalWorkspace,
  transitionLocalGrowCycleStage,
  hasLocalWorkspaceEntityId,
  isLocalWorkspaceEntityId,
  LOCAL_WORKSPACE_IDS,
  localJournalPendingSync,
  parseLocalWorkspaceStore,
} from './local-workspace';

describe('local-workspace', () => {
  it('creates default cycle on first run', () => {
    const store = createDefaultLocalWorkspace(new Date('2026-03-20T12:00:00Z'));
    expect(store.farm.name).toBe('My grow');
    expect(store.cycle.name).toBe('Cycle 1');
    expect(store.journal).toEqual([]);
  });

  it('appends journal entries and detects pending sync', () => {
    let store = createDefaultLocalWorkspace();
    store = appendLocalJournalEntry(store, {
      event_type: 'watering',
      occurred_at: new Date().toISOString(),
      body: 'Test',
      source_type: 'user_form',
      payload: { volume_ml: 1000 },
    });
    expect(store.journal).toHaveLength(1);
    expect(localJournalPendingSync(store)).toBe(true);
  });

  it('flags sentinel ids', () => {
    expect(isLocalWorkspaceEntityId(LOCAL_WORKSPACE_IDS.cycle)).toBe(true);
    expect(isLocalWorkspaceEntityId('00000000-0000-4000-8000-000000000001')).toBe(false);
    expect(hasLocalWorkspaceEntityId('farm-uuid', LOCAL_WORKSPACE_IDS.cycle)).toBe(true);
    expect(hasLocalWorkspaceEntityId('farm-uuid', 'cycle-uuid')).toBe(false);
  });

  it('transitions stage locally with journal event', () => {
    let store = createDefaultLocalWorkspace();
    expect(store.cycle.stage).toBe('veg');
    store = transitionLocalGrowCycleStage(store, { newStage: 'preflower' });
    expect(store.cycle.stage).toBe('preflower');
    expect(store.journal).toHaveLength(1);
    expect(store.journal[0]?.event_type).toBe('stage_changed');
    expect(store.journal[0]?.payload).toEqual({ from_stage: 'veg', to_stage: 'preflower' });
  });

  it('round-trips JSON storage', () => {
    const store = createDefaultLocalWorkspace();
    const parsed = parseLocalWorkspaceStore(JSON.stringify(store));
    expect(parsed?.cycle.id).toBe(store.cycle.id);
  });
});
