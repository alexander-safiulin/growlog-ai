#!/usr/bin/env bash
# Apply all supabase/migrations to a throwaway Postgres and run ADR-014 seed twice.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PG_PASSWORD="${MIGRATION_TEST_PASSWORD:-growlog-test}"
DATA_DIR="${MIGRATION_TEST_DATA_DIR:-/tmp/growlog-migration-test-$$}"
PG_PORT="${MIGRATION_TEST_PORT:-$((54000 + RANDOM % 1000))}"
USE_DOCKER="${MIGRATION_TEST_USE_DOCKER:-auto}"
REQUIRE="${MIGRATION_TEST_REQUIRE:-}"

if [[ -z "$REQUIRE" && -n "${CI:-}" ]]; then
  REQUIRE=1
fi

find_pg_bin() {
  local name="$1"
  if command -v "$name" >/dev/null 2>&1; then
    command -v "$name"
    return 0
  fi
  local candidate
  for candidate in /usr/lib/postgresql/*/bin/"$name"; do
    if [[ -x "$candidate" ]]; then
      echo "$candidate"
      return 0
    fi
  done
  return 1
}

cleanup() {
  if [[ -n "${PG_CTL_BIN:-}" && -d "${DATA_DIR:-}" ]]; then
    "$PG_CTL_BIN" -D "$DATA_DIR" stop -m fast >/dev/null 2>&1 || true
  fi
  if [[ -d "$DATA_DIR" ]]; then
    rm -rf "$DATA_DIR"
  fi
  docker rm -f "${MIGRATION_TEST_CONTAINER:-growlog-migration-test-$$}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

run_psql() {
  psql -h "$DATA_DIR" -p "$PG_PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 "$@"
}

run_sql_file() {
  run_psql -f "$1"
}

start_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    return 1
  fi
  local container="growlog-migration-test-$$"
  MIGRATION_TEST_CONTAINER="$container"
  local image="${MIGRATION_TEST_PG_IMAGE:-pgvector/pgvector:pg17}"
  docker run -d --name "$container" \
    -e POSTGRES_PASSWORD="$PG_PASSWORD" \
    -p "${PG_PORT}:5432" \
    "$image" >/dev/null
  for _ in $(seq 1 60); do
    if PGPASSWORD="$PG_PASSWORD" pg_isready -h 127.0.0.1 -p "$PG_PORT" -U postgres >/dev/null 2>&1; then
      DATA_DIR="127.0.0.1"
      return 0
    fi
    sleep 1
  done
  return 1
}

start_local_pg() {
  local initdb_bin pg_ctl_bin
  initdb_bin="$(find_pg_bin initdb || true)"
  pg_ctl_bin="$(find_pg_bin pg_ctl || true)"
  PG_CTL_BIN="${pg_ctl_bin:-}"
  if [[ -z "$initdb_bin" || -z "$pg_ctl_bin" ]]; then
    return 1
  fi
  mkdir -p "$DATA_DIR"
  "$initdb_bin" -D "$DATA_DIR" -U postgres --auth-local=trust --auth-host=scram-sha-256 >/dev/null
  echo "password_encryption = 'scram-sha-256'" >> "$DATA_DIR/postgresql.conf"
  echo "port = $PG_PORT" >> "$DATA_DIR/postgresql.conf"
  echo "listen_addresses = '127.0.0.1'" >> "$DATA_DIR/postgresql.conf"
  echo "unix_socket_directories = '$DATA_DIR'" >> "$DATA_DIR/postgresql.conf"
  {
    echo "host all all 127.0.0.1/32 trust"
    echo "host all all ::1/128 trust"
  } >> "$DATA_DIR/pg_hba.conf"
  "$pg_ctl_bin" -D "$DATA_DIR" -l "$DATA_DIR/logfile" start -w
}

started=0
mode=""
if [[ "$USE_DOCKER" == "1" ]] || ([[ "$USE_DOCKER" == "auto" ]] && command -v docker >/dev/null 2>&1); then
  if start_docker; then
    started=1
    mode="docker"
  fi
fi

if [[ "$started" == "0" ]]; then
  if start_local_pg; then
    started=1
    mode="local"
  fi
fi

if [[ "$started" == "0" ]]; then
  if [[ -n "$REQUIRE" ]]; then
    echo "Migration test requires Postgres (install postgresql server or Docker)." >&2
    exit 2
  fi
  echo "SKIP: migration test (no Postgres/Docker). Set MIGRATION_TEST_REQUIRE=1 or CI=1 to enforce."
  exit 0
fi

if [[ "$mode" == "docker" ]]; then
  run_psql() {
    PGPASSWORD="$PG_PASSWORD" psql -h 127.0.0.1 -p "$PG_PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 "$@"
  }
fi

apply_all_migrations() {
  local P5_CATALOG_MIGRATION="20261023120000_adr014_p5_manufacturer_catalog.sql"
  for migration in "$ROOT"/supabase/migrations/*.sql; do
    local base
    base="$(basename "$migration")"
    if [[ "$base" == "$P5_CATALOG_MIGRATION" ]]; then
      echo "Seeding P5 catalog dedupe precondition..."
      run_sql_file "$ROOT/supabase/test/adr014-p5-dedupe-pre.sql"
    fi
    echo "Applying ${base}..."
    run_sql_file "$migration"
  done
}

run_sql_file "$ROOT/supabase/test/stubs/00_supabase_stubs.sql"

P5_CATALOG_PATH="$ROOT/supabase/migrations/20261023120000_adr014_p5_manufacturer_catalog.sql"

apply_all_migrations

echo "Asserting P5 catalog dedupe retention..."
run_sql_file "$ROOT/supabase/test/adr014-p5-dedupe-assert.sql"

echo "Re-applying P5 migration (idempotency pass 1)..."
run_sql_file "$P5_CATALOG_PATH"

echo "Re-applying P5 migration (idempotency pass 2)..."
run_sql_file "$P5_CATALOG_PATH"

assert_count() {
  local label="$1"
  local sql="$2"
  local expected="$3"
  local actual
  actual="$(run_psql -t -c "$sql" | tr -d ' ')"
  if [[ "$actual" != "$expected" ]]; then
    echo "Expected ${label} count ${expected}, got ${actual}" >&2
    exit 1
  fi
}

echo "--- Post-migration catalog counts (prod-parity: before adr014 seed re-run) ---"
run_psql -c "
select
  (select count(*)::int from public.fertilizer_products) as products_total,
  (select count(*)::int from public.fertilizer_products
    where coalesce((metadata->>'catalog_deprecated')::boolean, false) = false) as products_active,
  (select count(*)::int from public.fertilizer_products
    where coalesce((metadata->>'catalog_deprecated')::boolean, false) = true) as products_deprecated,
  (select count(*)::int from public.fertilizer_product_aliases) as aliases,
  (select count(*)::int from public.feed_schedules) as feed_schedules,
  (select count(*)::int from public.target_solution_profiles) as target_profiles,
  (select count(*)::int from public.fertilizer_composition_lines) as composition_lines;
"

# products_total: 182 pre-P5 + net-new P5 inserts (legacy hyphen rows retained)
# products_active: matches adr014 bundle fertilizer count (212)
# composition_lines: 1136 on prod restore; +1 if adr014_nutrient_seed.sql is re-applied (not done before asserts)
assert_count "fertilizer_products (total)" "select count(*)::int from public.fertilizer_products;" 225
assert_count "fertilizer_products (active)" \
  "select count(*)::int from public.fertilizer_products where coalesce((metadata->>'catalog_deprecated')::boolean, false) = false;" 212
assert_count "fertilizer_products (deprecated)" \
  "select count(*)::int from public.fertilizer_products where coalesce((metadata->>'catalog_deprecated')::boolean, false) = true;" 13
assert_count "fertilizer_product_aliases" "select count(*)::int from public.fertilizer_product_aliases;" 27
assert_count "target_solution_profiles" "select count(*)::int from public.target_solution_profiles;" 33
assert_count "feed_schedules" "select count(*)::int from public.feed_schedules;" 42
assert_count "nutrient_catalog_recipes" "select count(*)::int from public.nutrient_catalog_recipes;" 2
assert_count "nutrient_oxide_factors" "select count(*)::int from public.nutrient_oxide_factors;" 2
assert_count "fertilizer_composition_lines" \
  "select count(*)::int from public.fertilizer_composition_lines;" 1136

SEED="$ROOT/supabase/migrations/20261021120100_adr014_nutrient_seed.sql"
echo "Seeding (pass 1)..."
run_sql_file "$SEED"
echo "Seeding (pass 2)..."
run_sql_file "$SEED"

echo "Ephemeral migration test passed (Postgres ${mode})."
