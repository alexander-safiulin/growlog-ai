import { describe, expect, it } from 'vitest';
import {
  normalizeFarmInviteEmail,
  pickGuestMergeTargetFarmId,
  parseAcceptedInvitations,
} from '@growlog/domain';
import type { Farm } from '@growlog/domain';

const farm = (id: string, created_at: string): Farm => ({
  id,
  name: id,
  slug: null,
  timezone: 'UTC',
  country: null,
  city: null,
  settings: {},
  is_deleted: false,
  created_at,
  updated_at: created_at,
});

describe('farm membership helpers', () => {
  it('normalizes invite email', () => {
    expect(normalizeFarmInviteEmail('  A@B.COM ')).toBe('a@b.com');
  });

  it('picks oldest admin farm for guest merge', () => {
    const farms = [farm('b', '2020-01-02'), farm('a', '2020-01-01')];
    const memberships = [
      { farm_id: 'a', role: 'admin' as const },
      { farm_id: 'b', role: 'viewer' as const },
    ];
    expect(pickGuestMergeTargetFarmId(farms, memberships, 'b')).toBe('a');
  });

  it('never defaults to viewer-only farm', () => {
    const farms = [farm('v', '2020-01-01'), farm('g', '2020-01-02')];
    const memberships = [
      { farm_id: 'v', role: 'viewer' as const },
      { farm_id: 'g', role: 'grower' as const },
    ];
    expect(pickGuestMergeTargetFarmId(farms, memberships, 'v')).toBe('g');
  });

  it('parses accepted invitation rows', () => {
    expect(
      parseAcceptedInvitations([
        { farm_id: 'x', farm_name: 'OGL', role: 'grower' },
        { bad: true },
      ]),
    ).toEqual([{ farm_id: 'x', farm_name: 'OGL', role: 'grower' }]);
  });
});
