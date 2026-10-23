import { describe, expect, it } from 'vitest';
import { parseGrowerNumber, parseOptionalGrowerNumber } from '@growlog/domain';

describe('parseGrowerNumber', () => {
  it('parses comma decimals', () => {
    expect(parseGrowerNumber('6,2')).toEqual({ ok: true, value: 6.2 });
  });

  it('rejects invalid tokens', () => {
    expect(parseGrowerNumber('6,2,1').ok).toBe(false);
  });

  it('allows empty optional fields', () => {
    const r = parseOptionalGrowerNumber('');
    expect(r.ok).toBe(true);
    expect(Number.isNaN((r as { value: number }).value)).toBe(true);
  });
});
