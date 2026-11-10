import { describe, expect, it } from 'vitest';
import {
  describeImportTriggerDisplay,
  getDailyLocalTimeForEdit,
  parseSopImportModelJson,
  sanitizeSopImportDraft,
  setDailyLocalTimeOnTriggers,
  validateTriggerConfig,
} from '@growlog/domain';

describe('sop-import-draft', () => {
  it('keeps steps and drops unsupported trigger types into schedule_unparsed', () => {
    const draft = sanitizeSopImportDraft({
      title: 'Daily runoff check',
      steps: ['Measure runoff EC', 'Record pH'],
      triggers: [
        { trigger_type: 'recurring_daily', trigger_config: { local_time: '09:00' } },
        { trigger_type: 'event_based', trigger_config: { event_type: 'pest_detected' } },
      ],
    });
    expect(draft).not.toBeNull();
    expect(draft!.steps).toHaveLength(2);
    expect(draft!.triggers).toHaveLength(1);
    expect(draft!.triggers[0]!.trigger_type).toBe('recurring_daily');
    expect(draft!.schedule_unparsed.some((n) => n.includes('event_based'))).toBe(true);
  });

  it('rejects invalid local_time for time_based', () => {
    const v = validateTriggerConfig('time_based', { local_time: '25:99' });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('invalid_local_time');
  });

  it('accepts recurring_interval with interval_days', () => {
    const v = validateTriggerConfig('recurring_interval', {
      interval_days: 3,
      local_time: '08:30',
    });
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.trigger_config.interval_days).toBe(3);
      expect(v.trigger_config.local_time).toBe('08:30:00');
    }
  });

  it('reads steps from instructions_json object', () => {
    const draft = sanitizeSopImportDraft({
      title: 'Checklist',
      instructions_json: { steps: ['Step A', 'Step B'] },
    });
    expect(draft?.steps).toEqual(['Step A', 'Step B']);
  });

  it('setDailyLocalTimeOnTriggers adds recurring_daily', () => {
    const next = setDailyLocalTimeOnTriggers([], '10:30');
    expect(next).toHaveLength(1);
    expect(next[0]!.trigger_type).toBe('recurring_daily');
    expect(getDailyLocalTimeForEdit(next)).toBe('10:30');
  });

  it('describeImportTriggerDisplay returns daily time', () => {
    const d = describeImportTriggerDisplay({
      trigger_type: 'recurring_daily',
      trigger_config: { local_time: '09:00:00' },
    });
    expect(d).toEqual({ kind: 'daily', time: '09:00' });
  });

  it('does not invent tent when applies_to_scope is missing or unknown', () => {
    const draft = sanitizeSopImportDraft({
      title: 'Check',
      steps: ['Look'],
      applies_to_scope: 'greenhouse',
    });
    expect(draft?.applies_to_scope).toBeNull();
    expect(draft?.applies_to_scope_unconfirmed).toBe(true);
    expect(draft?.schedule_unparsed[0]).toBe('applies_to_scope_unconfirmed');
  });

  it('keeps a document scope and an already confirmed choice', () => {
    const named = sanitizeSopImportDraft({
      title: 'Reservoir check',
      steps: ['Measure'],
      applies_to_scope: 'reservoir',
    });
    expect(named?.applies_to_scope).toBe('reservoir');
    expect(named?.applies_to_scope_unconfirmed).toBe(false);

    const confirmed = sanitizeSopImportDraft({
      title: 'Check',
      steps: ['Look'],
      applies_to_scope: 'tent',
      schedule_unparsed: ['applies_to_scope_unconfirmed'],
    });
    expect(confirmed?.applies_to_scope).toBe('tent');
    expect(confirmed?.applies_to_scope_unconfirmed).toBe(true);
    expect(confirmed?.schedule_unparsed).toContain('applies_to_scope_unconfirmed');
  });

  it('drops impossible dates and keys the engine does not read', () => {
    const mixed = validateTriggerConfig('date_based', {
      dates: ['2026-02-31', '2026-02-28'],
      note: 'ignore me',
      local_time: '09:00',
    });
    expect(mixed.ok).toBe(true);
    if (mixed.ok) {
      expect(mixed.trigger_config).toEqual({
        dates: ['2026-02-28'],
        local_time: '09:00:00',
      });
    }
    const impossible = validateTriggerConfig('date_based', { dates: ['2026-02-31'] });
    expect(impossible.ok).toBe(false);
  });

  it('describeImportTriggerDisplay reads dates and stages arrays', () => {
    expect(
      describeImportTriggerDisplay({
        trigger_type: 'date_based',
        trigger_config: { dates: ['2026-11-01', '2026-11-08'] },
      })
    ).toEqual({ kind: 'date', date: '2026-11-01, 2026-11-08' });
    expect(
      describeImportTriggerDisplay({
        trigger_type: 'stage_based',
        trigger_config: { stages: ['flower', 'ripen'] },
      })
    ).toEqual({ kind: 'stage', stage: 'flower, ripen' });
  });

  it('parseSopImportModelJson counts dropped triggers', () => {
    const { drafts, dropped_trigger_count } = parseSopImportModelJson(
      JSON.stringify({
        drafts: [
          {
            title: 'Flush',
            steps: ['Run flush'],
            triggers: [
              { trigger_type: 'manual', trigger_config: {} },
              { trigger_type: 'recurring_daily', trigger_config: { local_time: '10:00' } },
            ],
          },
        ],
      })
    );
    expect(drafts).toHaveLength(1);
    expect(drafts[0]!.triggers).toHaveLength(1);
    expect(dropped_trigger_count).toBe(1);
  });
});
