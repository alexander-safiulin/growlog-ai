import { describe, expect, it } from 'vitest';
import {
  buildSopSteps,
  instructionsJsonForSteps,
  parseSopSteps,
  SOP_STEP_MAX,
  sopStepProgress,
  sopStepResults,
  stepDraftsFromText,
  resolveSopExecutionStatus,
  suggestSopExecutionStatus,
} from '@growlog/domain';

describe('sop steps', () => {
  it('reads legacy string steps from document import as required checks', () => {
    expect(parseSopSteps({ steps: ['Measure runoff EC', '  ', 'Record runoff pH'] })).toEqual([
      { id: 's1', text: 'Measure runoff EC', kind: 'check', required: true },
      { id: 's3', text: 'Record runoff pH', kind: 'check', required: true },
    ]);
  });

  it('keeps stored ids and the optional flag, and replaces duplicate or invalid ids', () => {
    const steps = parseSopSteps({
      steps: [
        { id: 'ac', text: 'Check AC', required: true },
        { id: 'ac', text: 'Check dehumidifier', required: false },
        { id: 'bad id!', text: 'Photo of filter' },
        { text: '' },
      ],
    });
    expect(steps.map((s) => [s.id, s.required])).toEqual([
      ['ac', true],
      ['s2', false],
      ['s3', true],
    ]);
  });

  it('returns no steps for empty or malformed instructions', () => {
    expect(parseSopSteps({})).toEqual([]);
    expect(parseSopSteps(null)).toEqual([]);
    expect(parseSopSteps({ steps: 'one' })).toEqual([]);
    expect(parseSopSteps([{ text: 'x' }])).toEqual([]);
  });

  it('builds sequential ids, drops blanks and caps the list', () => {
    const steps = buildSopSteps([
      { text: ' Check  AC ', required: true },
      { text: '', required: true },
      { text: 'Wipe filter', required: false },
    ]);
    expect(steps).toEqual([
      { id: 's1', text: 'Check AC', kind: 'check', required: true },
      { id: 's2', text: 'Wipe filter', kind: 'check', required: false },
    ]);
    expect(parseSopSteps(instructionsJsonForSteps(steps))).toEqual(steps);
    expect(instructionsJsonForSteps([])).toEqual({});

    const many = buildSopSteps(Array.from({ length: SOP_STEP_MAX + 5 }, (_, i) => ({ text: `step ${i}`, required: true })));
    expect(many).toHaveLength(SOP_STEP_MAX);
  });

  it('splits a pasted list and strips list markers', () => {
    expect(stepDraftsFromText('1. Check AC\n- Check dehumidifier\n\n• [ ] Photo\n[x] Log it').map((d) => d.text)).toEqual([
      'Check AC',
      'Check dehumidifier',
      'Photo',
      'Log it',
    ]);
    expect(stepDraftsFromText('6.2 pH target check').map((d) => d.text)).toEqual(['6.2 pH target check']);
  });

  it('counts progress against required steps only', () => {
    const steps = buildSopSteps([
      { text: 'Check AC', required: true },
      { text: 'Check dehumidifier', required: true },
      { text: 'Clean grille', required: false },
    ]);

    const none = sopStepProgress(steps, []);
    expect(none.missingRequired.map((s) => s.id)).toEqual(['s1', 's2']);
    expect(suggestSopExecutionStatus(none)).toBeNull();

    const partial = sopStepProgress(steps, ['s1', 's3', 'unknown']);
    expect(partial).toMatchObject({ total: 3, checked: 2, requiredTotal: 2, requiredChecked: 1 });
    expect(suggestSopExecutionStatus(partial)).toBe('partially_done');

    const allRequired = sopStepProgress(steps, ['s1', 's2']);
    expect(allRequired.missingRequired).toEqual([]);
    expect(suggestSopExecutionStatus(allRequired)).toBe('done');
  });

  it('has no suggestion without a checklist', () => {
    expect(suggestSopExecutionStatus(sopStepProgress([], []))).toBeNull();
  });

  it('defaults execution status for an untouched checklist', () => {
    const steps = buildSopSteps([{ text: 'Check AC', required: true }]);
    const empty = sopStepProgress(steps, []);
    expect(resolveSopExecutionStatus(null, empty)).toBe('partially_done');
    expect(resolveSopExecutionStatus('skipped', empty)).toBe('skipped');
    expect(resolveSopExecutionStatus(null, sopStepProgress([], []))).toBe('done');
  });

  it('snapshots step text with the result', () => {
    const steps = buildSopSteps([
      { text: 'Check AC', required: true },
      { text: 'Clean grille', required: false },
    ]);
    expect(sopStepResults(steps, ['s2'])).toEqual([
      { step_id: 's1', text: 'Check AC', required: true, checked: false },
      { step_id: 's2', text: 'Clean grille', required: false, checked: true },
    ]);
  });
});
