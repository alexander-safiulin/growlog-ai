import { describe, expect, it } from 'vitest';
import {
  appendLocalJournalEntry,
  createDefaultLocalWorkspace,
  localJournalPendingSync,
  parseLocalWorkspaceStore,
} from './local-workspace';

describe('local-workspace', () => {
  it('creates default cycle on first run', () => {
    const store = createDefaultLocalWorkspace(new Date('2026-03-20T12:00:00Z'));
    expect(store.cycle.name).toBe('My grow');
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

  it('round-trips JSON storage', () => {
    const store = createDefaultLocalWorkspace();
    const parsed = parseLocalWorkspaceStore(JSON.stringify(store));
    expect(parsed?.cycle.id).toBe(store.cycle.id);
  });
});
