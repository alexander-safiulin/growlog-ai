#!/usr/bin/env bash
# Apply supabase/migrations to the Coolify self-hosted Postgres.
#
# Opens an SSH tunnel to root@201.18.218.242, resolves the database
# container address on that host, dry-runs `supabase db push --db-url`,
# and applies only after an explicit confirmation when that dry-run
# lists migrations, custom roles, or seed files. An up-to-date database
# exits without a prompt.
#
# Bash 3.2: do not expand an empty array under `set -u` (`"${arr[@]}"`
# is an unbound variable). Extra CLI args stay in "$@" and a bare "--"
# (pnpm forwards one) is dropped before the Supabase CLI sees it.

SSH_TARGET='root@201.18.218.242'
CONTAINER_NAME='supabase-db-jvxox6algazptjelglcjmyez'
REMOTE_DB_PORT='5432'
DEFAULT_LOCAL_PORT='15432'
DEFAULT_DB_USER='postgres'
DEFAULT_DB_NAME='postgres'
DEFAULT_SSLMODE='disable'

urlencode() {
  raw=$1
  out=''
  i=0
  len=${#raw}
  while [ "$i" -lt "$len" ]; do
    c=${raw:i:1}
    case "$c" in
      [a-zA-Z0-9._~-])
        out="${out}${c}"
        ;;
      *)
        hex=$(printf '%s' "$c" | od -An -tx1 | tr -d ' \n')
        j=0
        while [ "$j" -lt "${#hex}" ]; do
          out="${out}%${hex:j:2}"
          j=$((j + 2))
        done
        ;;
    esac
    i=$((i + 1))
  done
  printf '%s' "$out"
}

build_db_url() {
  user=$(urlencode "$1")
  pass=$(urlencode "$2")
  host=$3
  port=$4
  name=$(urlencode "$5")
  sslmode=$6
  printf 'postgresql://%s:%s@%s:%s/%s?sslmode=%s' \
    "$user" "$pass" "$host" "$port" "$name" "$sslmode"
}

# Emits `set -- ...` with every bare "--" removed. `printf %q` keeps
# eval from splitting flags. Output is never an empty command.
filter_args_as_set() {
  printf 'set --'
  for arg in "$@"; do
    if [ "$arg" = "--" ]; then
      continue
    fi
    printf ' %q' "$arg"
  done
  printf '\n'
}

load_password() {
  file=$1
  if [ ! -f "$file" ]; then
    echo "Missing ${file}. Copy .env.example to .env and set GROWLOG_DB_PASSWORD." >&2
    return 1
  fi

  password=''
  line=''
  while IFS= read -r line || [ -n "$line" ]; do
    line=${line%$'\r'}
    case "$line" in
      ''|\#*)
        continue
        ;;
    esac
    case "$line" in
      export\ *)
        line=${line#export }
        ;;
    esac
    case "$line" in
      GROWLOG_DB_PASSWORD=*)
        password=${line#GROWLOG_DB_PASSWORD=}
        ;;
    esac
  done < "$file"

  case "$password" in
    \"*\")
      password=${password#\"}
      password=${password%\"}
      ;;
    \'*\')
      password=${password#\'}
      password=${password%\'}
      ;;
  esac

  if [ -z "$password" ]; then
    echo "GROWLOG_DB_PASSWORD is missing or empty in ${file}." >&2
    return 1
  fi
  printf '%s' "$password"
}

port_open() {
  (echo >/dev/tcp/127.0.0.1/"$1") >/dev/null 2>&1
}

# Dry-run writes these lines to stderr when there is something to apply.
# "DRY RUN: migrations will *not* be pushed" is the banner and is not a hit.
dry_run_needs_confirm() {
  printf '%s\n' "$1" | grep -Eq \
    'Would push these migrations:|Would create custom roles|Would seed these files:' \
    && return 0
  return 1
}

dry_run_is_current() {
  printf '%s\n' "$1" | grep -Eq 'database is up to date\.' && return 0
  return 1
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Required command not found: $1" >&2
    if [ -n "${2:-}" ]; then
      echo "$2" >&2
    fi
    return 1
  fi
}

usage() {
  cat <<'EOF'
Usage: pnpm db:push [-- <supabase db push flags>]

Dry-runs, then asks for confirmation only when the dry-run lists
migrations, custom roles, or seed files. An up-to-date database exits
without a prompt. The apply command is:
  supabase db push --db-url <tunnel> [flags]

Targets root@201.18.218.242 and container
supabase-db-jvxox6algazptjelglcjmyez. The container address is resolved
on the server at runtime. GROWLOG_DB_PASSWORD is read from ./.env
(gitignored). A bare "--" argument is ignored.

Optional environment:
  GROWLOG_DB_LOCAL_PORT   local tunnel port (default 15432)
  GROWLOG_DB_USER         database user (default postgres)
  GROWLOG_DB_NAME         database name (default postgres)
EOF
}

cleanup() {
  status=$?
  if [ -n "${tunnel_pid:-}" ]; then
    kill "$tunnel_pid" 2>/dev/null || true
    wait "$tunnel_pid" 2>/dev/null || true
    tunnel_pid=''
  fi
  exit "$status"
}

main() {
  set -euo pipefail

  eval "$(filter_args_as_set "$@")"

  for arg in "$@"; do
    if [ "$arg" = "--help" ]; then
      usage
      exit 0
    fi
  done

  script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
  root=$(cd "${script_dir}/.." && pwd)
  cd "$root"

  local_port=${GROWLOG_DB_LOCAL_PORT:-$DEFAULT_LOCAL_PORT}
  db_user=${GROWLOG_DB_USER:-$DEFAULT_DB_USER}
  db_name=${GROWLOG_DB_NAME:-$DEFAULT_DB_NAME}
  case "$local_port" in
    ''|*[!0-9]*)
      echo "GROWLOG_DB_LOCAL_PORT must be a number." >&2
      exit 1
      ;;
  esac

  require_cmd ssh
  require_cmd awk
  require_cmd od
  require_cmd supabase \
    "Install the Supabase CLI (https://supabase.com/docs/guides/cli) and retry."

  password=$(load_password "${root}/.env")

  echo "Resolving ${CONTAINER_NAME} on ${SSH_TARGET}..."
  container_ip=$(
    ssh -o ConnectTimeout=20 "$SSH_TARGET" \
      "docker inspect --format '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}' '${CONTAINER_NAME}'" \
      </dev/null \
      | awk '{ for (i = 1; i <= NF; i++) if ($i ~ /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/) { print $i; exit } }'
  ) || {
    echo "Could not resolve ${CONTAINER_NAME} on ${SSH_TARGET}." >&2
    exit 1
  }
  if [ -z "$container_ip" ]; then
    echo "Container ${CONTAINER_NAME} has no IPv4 address on ${SSH_TARGET}." >&2
    exit 1
  fi
  if ! printf '%s\n' "$container_ip" | grep -Eq '^[0-9]{1,3}(\.[0-9]{1,3}){3}$'; then
    echo "Refusing unexpected container address." >&2
    exit 1
  fi

  if port_open "$local_port"; then
    echo "Local port ${local_port} is already in use. Set GROWLOG_DB_LOCAL_PORT." >&2
    exit 1
  fi

  tunnel_pid=''
  trap cleanup EXIT
  ssh \
    -o ExitOnForwardFailure=yes \
    -o ServerAliveInterval=30 \
    -o ServerAliveCountMax=3 \
    -N \
    -L "127.0.0.1:${local_port}:${container_ip}:${REMOTE_DB_PORT}" \
    "$SSH_TARGET" </dev/null &
  tunnel_pid=$!

  ready=0
  attempt=0
  while [ "$attempt" -lt 50 ]; do
    if ! kill -0 "$tunnel_pid" 2>/dev/null; then
      echo "SSH tunnel exited before 127.0.0.1:${local_port} was ready." >&2
      wait "$tunnel_pid" || true
      tunnel_pid=''
      exit 1
    fi
    if port_open "$local_port"; then
      ready=1
      break
    fi
    attempt=$((attempt + 1))
    sleep 0.2
  done
  if [ "$ready" -ne 1 ]; then
    echo "Timed out waiting for the SSH tunnel on 127.0.0.1:${local_port}." >&2
    exit 1
  fi

  db_url=$(build_db_url "$db_user" "$password" '127.0.0.1' "$local_port" "$db_name" "$DEFAULT_SSLMODE")
  unset password

  echo "Tunnel ready: ${SSH_TARGET} -> ${CONTAINER_NAME} (${container_ip}) on 127.0.0.1:${local_port}."
  echo "Dry run (no migrations are applied yet):"
  set +e
  if [ "$#" -gt 0 ]; then
    dry_output=$(supabase db push --db-url "$db_url" --dry-run "$@" 2>&1)
  else
    dry_output=$(supabase db push --db-url "$db_url" --dry-run 2>&1)
  fi
  dry_status=$?
  set -e
  printf '%s\n' "$dry_output"
  if [ "$dry_status" -ne 0 ]; then
    exit "$dry_status"
  fi

  if ! dry_run_needs_confirm "$dry_output"; then
    if dry_run_is_current "$dry_output"; then
      echo "Nothing to apply."
      exit 0
    fi
    echo "Dry-run output was not recognized. Confirmation is required before applying." >&2
  fi

  if ! { : >/dev/tty; } 2>/dev/null; then
    echo "A terminal is required to confirm. No migrations were applied." >&2
    exit 1
  fi
  printf '\nApply these changes to %s through %s? [y/N] ' "$CONTAINER_NAME" "$SSH_TARGET" >/dev/tty
  answer=''
  IFS= read -r answer </dev/tty || answer=''
  case "$answer" in
    y|Y|yes|YES) ;;
    *)
      echo "Aborted. No migrations were applied."
      exit 0
      ;;
  esac

  echo "Applying migrations..."
  if [ "$#" -gt 0 ]; then
    supabase db push --db-url "$db_url" "$@"
  else
    supabase db push --db-url "$db_url"
  fi
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  main "$@"
fi
