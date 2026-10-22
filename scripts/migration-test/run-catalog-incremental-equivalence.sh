#!/usr/bin/env bash
# Compare catalog snapshot: all branch migrations vs origin/main migrations + deltas only.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
REF="${MIGRATION_IMMUTABLE_REF:-origin/main}"
PG_PASSWORD="${MIGRATION_TEST_PASSWORD:-growlog-test}"
DATA_DIR="${MIGRATION_TEST_DATA_DIR:-/tmp/growlog-catalog-equiv-$$}"
PG_PORT="${MIGRATION_TEST_PORT:-$((55000 + RANDOM % 1000))}"
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

cd "$ROOT"
git fetch origin main 2>/dev/null || true

if ! git rev-parse --verify "$REF" >/dev/null 2>&1; then
  echo "SKIP: catalog equivalence (cannot resolve $REF)"
  exit 0
fi

mapfile -t ON_MAIN < <(git ls-tree -r --name-only "$REF" -- supabase/migrations/ | grep '\.sql$' | xargs -I{} basename {} | sort)
mapfile -t ON_DISK < <(ls "$ROOT"/supabase/migrations/*.sql | xargs -I{} basename {} | sort)

DELTA=()
for f in "${ON_DISK[@]}"; do
  if ! printf '%s\n' "${ON_MAIN[@]}" | grep -qx "$f"; then
    DELTA+=("$f")
  fi
done

mode=""
PG_CTL_BIN=""

cleanup() {
  if [[ -n "${PG_CTL_BIN}" && -d "${DATA_DIR}" && "$mode" == "local" ]]; then
    "$PG_CTL_BIN" -D "$DATA_DIR" stop -m fast >/dev/null 2>&1 || true
    rm -rf "$DATA_DIR"
  fi
  docker rm -f "${CATALOG_EQ_CONTAINER:-growlog-catalog-equiv-$$}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

start_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    return 1
  fi
  CATALOG_EQ_CONTAINER="growlog-catalog-equiv-$$"
  docker run -d --name "$CATALOG_EQ_CONTAINER" \
    -e POSTGRES_PASSWORD="$PG_PASSWORD" \
    -p "${PG_PORT}:5432" \
    postgres:17-alpine >/dev/null
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
    echo "Catalog equivalence requires Postgres (Docker or local server)." >&2
    exit 2
  fi
  echo "SKIP: catalog equivalence (no Postgres/Docker)"
  exit 0
fi

run_psql_db() {
  local db="$1"
  shift
  if [[ "$mode" == "docker" ]]; then
    PGPASSWORD="$PG_PASSWORD" psql -h 127.0.0.1 -p "$PG_PORT" -U postgres -d "$db" -v ON_ERROR_STOP=1 "$@"
  else
    psql -h "$DATA_DIR" -p "$PG_PORT" -U postgres -d "$db" -v ON_ERROR_STOP=1 "$@"
  fi
}

run_sql_file_db() {
  local db="$1"
  local file="$2"
  run_psql_db "$db" -f "$file"
}

apply_migrations() {
  local db="$1"
  shift
  local files=("$@")
  run_psql_db postgres -c "select pg_terminate_backend(pid) from pg_stat_activity where datname = '${db}' and pid <> pg_backend_pid();" 2>/dev/null || true
  run_psql_db postgres -c "drop database if exists ${db};"
  run_psql_db postgres -c "create database ${db};"
  run_sql_file_db "$db" "$ROOT/supabase/test/stubs/00_supabase_stubs.sql"
  for base in "${files[@]}"; do
    run_sql_file_db "$db" "$ROOT/supabase/migrations/${base}"
  done
}

snapshot_db() {
  local db="$1"
  local out="$2"
  run_psql_db "$db" -t -A -c "
    select json_agg(row_to_json(t) order by t.sort_key)
    from (
      select 'fertilizer_products' as kind, fp.external_key as sort_key,
             json_build_object(
               'external_key', fp.external_key,
               'brand', fp.brand,
               'name', fp.name,
               'physical_form', fp.physical_form::text,
               'dose_unit', fp.dose_unit::text,
               'metadata', fp.metadata,
               'composition_lines', coalesce(
                 (select json_agg(json_build_object('form_key', fcl.form_key, 'value_pct', fcl.value_pct) order by fcl.form_key)
                  from public.fertilizer_composition_lines fcl where fcl.product_id = fp.id),
                 '[]'::json)
             ) as payload
      from public.fertilizer_products fp
      union all
      select 'recipes', ncr.slug,
             json_build_object('slug', ncr.slug, 'metadata', ncr.metadata, 'profile_slug', ncr.profile_slug,
               'lines', coalesce((select json_agg(json_build_object('line_order', ncrl.line_order, 'ingredient_label', ncrl.ingredient_label,
                 'dose_per_l', ncrl.dose_per_l, 'declared_pct', ncrl.declared_pct) order by ncrl.line_order)
                 from public.nutrient_catalog_recipe_lines ncrl where ncrl.recipe_id = ncr.id), '[]'::json))
      from public.nutrient_catalog_recipes ncr
      union all
      select 'profiles', tsp.slug,
             json_build_object('slug', tsp.slug, 'target_ppm', tsp.target_ppm, 'overdose_pct', tsp.overdose_pct)
      from public.target_solution_profiles tsp
    ) t;
  " | tr -d '\n' > "$out"
}

apply_migrations growlog_full "${ON_DISK[@]}"
apply_migrations growlog_incr "${ON_MAIN[@]}" "${DELTA[@]}"

FULL_SNAP="$(mktemp)"
INCR_SNAP="$(mktemp)"
snapshot_db growlog_full "$FULL_SNAP"
snapshot_db growlog_incr "$INCR_SNAP"

if ! diff -q "$FULL_SNAP" "$INCR_SNAP" >/dev/null; then
  echo "Catalog snapshot mismatch (full vs main+delta)." >&2
  echo "Delta files: ${DELTA[*]}" >&2
  exit 1
fi

echo "Catalog incremental equivalence passed."
