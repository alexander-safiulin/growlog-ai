#!/usr/bin/env bash
# Fail if any migration file that exists on origin/main was modified locally.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
REF="${MIGRATION_IMMUTABLE_REF:-origin/main}"

cd "$ROOT"
git fetch origin main 2>/dev/null || true

if ! git rev-parse --verify "$REF" >/dev/null 2>&1; then
  echo "WARN: cannot resolve $REF — skipping immutable migration check" >&2
  exit 0
fi

failed=0
while IFS= read -r rel; do
  [[ -z "$rel" ]] && continue
  if [[ ! -f "$ROOT/$rel" ]]; then
    echo "IMMUTABLE MIGRATION MISSING (was on $REF): $rel" >&2
    failed=1
    continue
  fi
  if ! git diff --quiet "$REF" -- "$rel"; then
    echo "IMMUTABLE MIGRATION MODIFIED (must not change after apply): $rel" >&2
    git diff --stat "$REF" -- "$rel" >&2 || true
    failed=1
  fi
done < <(git ls-tree -r --name-only "$REF" -- supabase/migrations/ | grep '\.sql$' || true)

if [[ "$failed" != "0" ]]; then
  exit 1
fi

echo "Immutable migration check passed ($REF)."
