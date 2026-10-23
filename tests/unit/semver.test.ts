import { describe, expect, it } from 'vitest';
import { semverGreaterThan } from '@growlog/domain';

describe('semverGreaterThan', () => {
  it('detects newer remote version', () => {
    expect(semverGreaterThan('1.0.1', '1.0.0')).toBe(true);
    expect(semverGreaterThan('1.0.0', '1.0.1')).toBe(false);
    expect(semverGreaterThan('1.0.0', '1.0.0')).toBe(false);
  });
});
