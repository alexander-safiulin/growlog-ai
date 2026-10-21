#!/usr/bin/env bash
# Apply all supabase/migrations to a throwaway Postgres and run ADR-014 seed twice.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PG_PASSWORD="${MIGRATION_TEST_PASSWORD:-growlog-test}"
DATA_DIR="${MIGRATION_TEST_DATA_DIR:-/tmp/growlog-migration-test-$$}"
PG_PORT="${MIGRATION_TEST_PORT:-$((54000 + RANDOM % 1000))}"
USE_DOCKER="${MIGRATION_TEST_USE_DOCKER:-auto}"

cleanup() {
  if [[ -n "${PG_PID:-}" ]]; then
    kill "$PG_PID" 2>/dev/null || true
    wait "$PG_PID" 2>/dev/null || true
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
  local container="growlog-migration-test-$$"
  MIGRATION_TEST_CONTAINER="$container"
  local image="${MIGRATION_TEST_PG_IMAGE:-postgres:17-alpine}"
  docker run -d --name "$container" \
    -e POSTGRES_PASSWORD="$PG_PASSWORD" \
    -p "${PG_PORT}:5432" \
    "$image" >/dev/null
  for _ in $(seq 1 60); do
    if PGPASSWORD="$PG_PASSWORD" pg_isready -h 127.0.0.1 -p "$PG_PORT" -U postgres >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

start_local_pg() {
  local initdb_bin pg_ctl_bin
  initdb_bin="$(command -v initdb || true)"
  pg_ctl_bin="$(command -v pg_ctl || true)"
  if [[ -z "$initdb_bin" && -x /usr/lib/postgresql/16/bin/initdb ]]; then
    initdb_bin=/usr/lib/postgresql/16/bin/initdb
    pg_ctl_bin=/usr/lib/postgresql/16/bin/pg_ctl
  fi
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
if [[ "$USE_DOCKER" == "1" ]] || ([[ "$USE_DOCKER" == "auto" ]] && command -v docker >/dev/null 2>&1); then
  if start_docker; then
    started=1
  fi
fi

if [[ "$started" == "0" ]]; then
  if start_local_pg; then
    started=1
  fi
fi

if [[ "$started" == "1" ]]; then
  run_sql_file "$ROOT/supabase/test/stubs/00_supabase_stubs.sql"

  for migration in "$ROOT"/supabase/migrations/*.sql; do
    echo "Applying $(basename "$migration")..."
    run_sql_file "$migration"
  done

  SEED="$ROOT/supabase/migrations/20261021120100_adr014_nutrient_seed.sql"
  echo "Seeding (pass 1)..."
  run_sql_file "$SEED"
  echo "Seeding (pass 2)..."
  run_sql_file "$SEED"

  assert_count() {
    local table="$1"
    local expected="$2"
    local actual
    actual="$(run_psql -t -c "select count(*)::int from public.${table};" | tr -d ' ')"
    if [[ "$actual" != "$expected" ]]; then
      echo "Expected ${table} count ${expected}, got ${actual}" >&2
      exit 1
    fi
  }

  assert_count fertilizer_products 125
  assert_count fertilizer_product_aliases 2
  assert_count target_solution_profiles 25
  assert_count feed_schedules 21
  assert_count nutrient_catalog_recipes 4
  assert_count nutrient_oxide_factors 2

  echo "Ephemeral migration test passed (Postgres)."
  exit 0
fi

echo "Could not start Postgres for migration test (Docker or local ephemeral cluster)." >&2
exit 2
