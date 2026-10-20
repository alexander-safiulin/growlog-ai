import { describe, expect, it } from 'vitest';
import { asksForProcedure, matchApprovedProcedure, type ProcedureHit } from '@/lib/growlog/routine-match';

const procedures: ProcedureHit[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    sourceType: 'sop_revision',
    title: 'Flower IPM v2',
    text: 'Inspect leaves for mites twice a week',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    sourceType: 'playbook_threshold',
    title: 'vpd_kpa',
    text: 'min=0.8 max=1.2',
  },
];

describe('routine match', () => {
  it('matches an approved SOP by shared words', () => {
    const hit = matchApprovedProcedure('How do I handle mites on flowers?', procedures);
    expect(hit?.sourceType).toBe('sop_revision');
  });

  it('matches a threshold by metric code', () => {
    const hit = matchApprovedProcedure('vpd_kpa is high, what should I do?', procedures);
    expect(hit?.sourceType).toBe('playbook_threshold');
  });

  it('does not match an unrelated request', () => {
    expect(matchApprovedProcedure('What should I do about a power outage?', procedures)).toBeNull();
    expect(asksForProcedure('What should I do about a power outage?')).toBe(true);
  });

  it('leaves factual questions off the procedure gate', () => {
    expect(asksForProcedure('What was yesterday temperature in room 2?')).toBe(false);
  });
});