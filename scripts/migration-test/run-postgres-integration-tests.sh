#!/usr/bin/env bash
# Runs all Postgres migration integration tests under tests/integration/*-postgres.test.ts.
# New *-postgres.test.ts files are picked up automatically (no package.json edit).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

mapfile -t files < <(find tests/integration -maxdepth 1 -name '*-postgres.test.ts' -print | sort)
if ((${#files[@]} == 0)); then
  echo "No *-postgres.test.ts files under tests/integration" >&2
  exit 1
fi

export MIGRATION_TEST_USE_DOCKER="${MIGRATION_TEST_USE_DOCKER:-auto}"
exec vitest run "${files[@]}"
