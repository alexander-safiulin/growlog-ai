import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const immutableScript = path.join(root, 'scripts/migration-test/check-immutable-migrations.sh');
const catalogEquiv = path.join(root, 'scripts/migration-test/run-catalog-incremental-equivalence.sh');
const ephemeralScript = path.join(root, 'scripts/migration-test/run-ephemeral-migrations.sh');

describe('ADR-014 migrations', () => {
  it('does not modify migrations already on origin/main', () => {
    const out = execFileSync('bash', [immutableScript], { encoding: 'utf8' });
    expect(out).toContain('Immutable migration check passed');
  });

  it('main migrations + branch deltas match full catalog apply', () => {
    const out = execFileSync('bash', [catalogEquiv], {
      encoding: 'utf8',
      env: { ...process.env, MIGRATION_TEST_USE_DOCKER: '0' },
    });
    expect(out).toMatch(/Catalog incremental equivalence passed|SKIP: catalog equivalence/);
  });

  it('applies all migrations and idempotent seed with expected counts', () => {
    const require = Boolean(process.env.CI || process.env.MIGRATION_TEST_REQUIRE);
    const out = execFileSync('bash', [ephemeralScript], {
      encoding: 'utf8',
      env: {
        ...process.env,
        MIGRATION_TEST_USE_DOCKER: '0',
        MIGRATION_TEST_REQUIRE: require ? '1' : '',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    if (out.includes('SKIP:')) {
      if (require) {
        throw new Error('Migration test was skipped but CI/MIGRATION_TEST_REQUIRE is set');
      }
      return;
    }
    expect(out).toContain('Ephemeral migration test passed');
  });
});
