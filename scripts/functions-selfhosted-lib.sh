# Shared paths for self-hosted Edge Functions (Coolify). Source from deploy/check scripts.
FUNCTIONS_SELFHOSTED_LIB_SOURCED=1

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[1]}")/.." && pwd)"
FUNCTIONS_DIR="$ROOT_DIR/supabase/functions"

SELFHOSTED_SSH_USER="${SELFHOSTED_SSH_USER:-root}"
SELFHOSTED_SSH_HOST="${SELFHOSTED_SSH_HOST:-201.18.218.242}"
SELFHOSTED_COOLIFY_SERVICE_ID="${SELFHOSTED_COOLIFY_SERVICE_ID:-jvxox6algazptjelglcjmyez}"
SELFHOSTED_EDGE_FUNCTIONS_CONTAINER="${SELFHOSTED_EDGE_FUNCTIONS_CONTAINER:-supabase-edge-functions-${SELFHOSTED_COOLIFY_SERVICE_ID}}"

REMOTE_FUNCTIONS_ROOT="/data/coolify/services/${SELFHOSTED_COOLIFY_SERVICE_ID}/volumes/functions"
REMOTE_COMPOSE="/data/coolify/services/${SELFHOSTED_COOLIFY_SERVICE_ID}/docker-compose.yml"

functions_selfhosted_ssh_target() {
  printf '%s@%s' "$SELFHOSTED_SSH_USER" "$SELFHOSTED_SSH_HOST"
}

functions_selfhosted_die() {
  echo "error: $*" >&2
  exit 1
}

functions_selfhosted_list_local() {
  local name
  for name in "$FUNCTIONS_DIR"/*; do
    [[ -d "$name" ]] || continue
    name="$(basename "$name")"
    case "$name" in
      _shared) continue ;;
      deno.json | deno.lock | README.md) continue ;;
      *)
        if [[ -f "$FUNCTIONS_DIR/$name/index.ts" ]]; then
          echo "$name"
        fi
        ;;
    esac
  done | sort
}

functions_selfhosted_require_rsync() {
  command -v rsync >/dev/null 2>&1 || functions_selfhosted_die "rsync is required for drift checks (brew install rsync)"
}

functions_selfhosted_remote_dir_exists() {
  local rel="$1"
  local ssh_target
  ssh_target="$(functions_selfhosted_ssh_target)"
  ssh -o ConnectTimeout=15 "$ssh_target" \
    "test -d $(printf '%q' "${REMOTE_FUNCTIONS_ROOT}/${rel}")"
}

functions_selfhosted_resolve_edge_container_remote() {
  local ssh_target
  ssh_target="$(functions_selfhosted_ssh_target)"
  ssh -o ConnectTimeout=15 "$ssh_target" bash -s \
    "$SELFHOSTED_EDGE_FUNCTIONS_CONTAINER" \
    "$SELFHOSTED_COOLIFY_SERVICE_ID" \
    "$REMOTE_COMPOSE" <<'REMOTE'
set -euo pipefail
preferred="$1"
service_id="$2"
compose_file="$3"

if docker inspect "$preferred" >/dev/null 2>&1; then
  echo "$preferred"
  exit 0
fi

try_compose_service() {
  local svc="$1"
  if [[ -f "$compose_file" ]] && docker compose -f "$compose_file" ps --services 2>/dev/null | grep -qx "$svc"; then
    echo "$svc"
    return 0
  fi
  return 1
}

for svc in edge-functions supabase-edge-functions functions; do
  if try_compose_service "$svc"; then
    exit 0
  fi
done

name="$(docker ps --format '{{.Names}}' | grep -i 'edge-functions' | grep "$service_id" | head -n 1 || true)"
if [[ -n "$name" ]]; then
  echo "$name"
  exit 0
fi

name="$(docker ps --format '{{.Names}}' | grep -iE 'edge-functions|supabase-functions' | head -n 1 || true)"
if [[ -n "$name" ]]; then
  echo "$name"
  exit 0
fi

exit 1
REMOTE
}

functions_selfhosted_restart_edge_container() {
  local ssh_target
  ssh_target="$(functions_selfhosted_ssh_target)"
  echo "Restarting edge functions runtime ..."
  if ! ssh -o ConnectTimeout=15 "$ssh_target" bash -s \
    "$REMOTE_COMPOSE" \
    "$SELFHOSTED_EDGE_FUNCTIONS_CONTAINER" \
    "$SELFHOSTED_COOLIFY_SERVICE_ID" <<'REMOTE'
set -euo pipefail
compose_file="$1"
preferred="$2"
service_id="$3"

if [[ -f "$compose_file" ]]; then
  for svc in edge-functions supabase-edge-functions functions; do
    if docker compose -f "$compose_file" ps --services 2>/dev/null | grep -qx "$svc"; then
      docker compose -f "$compose_file" restart "$svc" --no-deps
      echo "restarted compose service: $svc"
      exit 0
    fi
  done
fi

name="$preferred"
if ! docker inspect "$name" >/dev/null 2>&1; then
  name="$(docker ps --format '{{.Names}}' | grep -i 'edge-functions' | grep "$service_id" | head -n 1 || true)"
fi
if [[ -z "$name" ]]; then
  name="$(docker ps --format '{{.Names}}' | grep -iE 'edge-functions|supabase-functions' | head -n 1 || true)"
fi
[[ -n "$name" ]] || exit 1
docker restart "$name"
echo "restarted container: $name"
REMOTE
  then
    functions_selfhosted_die "edge functions restart failed (Coolify UI → restart edge-functions, or set SELFHOSTED_EDGE_FUNCTIONS_CONTAINER)"
  fi
}

functions_selfhosted_list_remote_functions() {
  local ssh_target
  ssh_target="$(functions_selfhosted_ssh_target)"
  ssh -o ConnectTimeout=15 "$ssh_target" bash -s "$REMOTE_FUNCTIONS_ROOT" <<'REMOTE'
set -euo pipefail
root="$1"
if [[ ! -d "$root" ]]; then
  exit 2
fi
for name in "$root"/*; do
  [[ -d "$name" ]] || continue
  base="$(basename "$name")"
  case "$base" in
    _shared) continue ;;
    *)
      if [[ -f "$name/index.ts" ]]; then
        echo "$base"
      fi
      ;;
  esac
done | sort
REMOTE
}
