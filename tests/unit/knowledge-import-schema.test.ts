import { describe, expect, it } from 'vitest';
import { parseClassifiedImportJson } from '@/lib/growlog/knowledge-import-schema';

describe('parseClassifiedImportJson', () => {
  it('parses drafts array wrapper', () => {
    const raw = JSON.stringify({
      drafts: [
        {
          kind: 'playbook_threshold',
          title: 'VPD veg',
          excerpt: 'Keep VPD 0.8-1.2',
          body: 'Keep VPD between 0.8 and 1.2 kPa in veg.',
          metric_code: 'vpd_kpa',
          min_value: 0.8,
          max_value: 1.2,
          cycle_stage: 'veg',
        },
      ],
    });
    const out = parseClassifiedImportJson(raw);
    expect(out).toHaveLength(1);
    expect(out[0]?.kind).toBe('playbook_threshold');
    expect(out[0]?.metric_code).toBe('vpd_kpa');
  });
});
