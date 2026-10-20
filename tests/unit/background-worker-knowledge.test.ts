import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('background worker knowledge.import', () => {
  it('handles knowledge.import job type', () => {
    const src = readFileSync('scripts/background-worker.ts', 'utf8');
    expect(src).toContain("case 'knowledge.import':");
    expect(src).toContain('processKnowledgeImportJob');
  });
});
