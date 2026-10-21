import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const script = path.join(process.cwd(), 'scripts/migration-test/run-ephemeral-migrations.sh');

describe('ADR-014 migrations on ephemeral Postgres', () => {
  it('applies all migrations and idempotent seed with expected counts', () => {
    const out = execFileSync('bash', [script], {
      encoding: 'utf8',
      env: { ...process.env, MIGRATION_TEST_USE_DOCKER: '0' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    expect(out).toContain('Ephemeral migration test passed');
  });
});
