import { describe, expect, it } from 'vitest';
import {
  clearSopMaterializeOnce,
  materializeSopRunsForAnchorOnce,
  sopMaterializeScopeKey,
} from '@growlog/domain';

describe('materializeSopRunsForAnchorOnce', () => {
  it('runs once per farm/cycle anchor day until cleared', async () => {
    const key = sopMaterializeScopeKey('f', 'c');
    let n = 0;
    await materializeSopRunsForAnchorOnce(key, '2026-06-15', async () => {
      n += 1;
    });
    await materializeSopRunsForAnchorOnce(key, '2026-06-15', async () => {
      n += 1;
    });
    expect(n).toBe(1);
    await materializeSopRunsForAnchorOnce(key, '2026-06-16', async () => {
      n += 1;
    });
    expect(n).toBe(2);
    clearSopMaterializeOnce(key);
    await materializeSopRunsForAnchorOnce(key, '2026-06-16', async () => {
      n += 1;
    });
    expect(n).toBe(3);
  });
});
