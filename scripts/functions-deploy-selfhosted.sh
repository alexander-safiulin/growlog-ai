#!/usr/bin/env bash
# Deploy Edge Functions to self-hosted Supabase on Coolify (copy to mounted volumes + restart).
# Cloud `supabase functions deploy` does NOT target self-hosted Docker stacks.
set -euo pipefail

# shellcheck source=functions-selfhosted-lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/functions-selfhosted-lib.sh"

usage() {
  cat <<'EOF'
Usage:
  scripts/functions-deploy-selfhosted.sh              Deploy all function folders + _shared
  scripts/functions-deploy-selfhosted.sh <name> ...   Deploy only named functions (+ _shared)

Environment (optional overrides):
  SELFHOSTED_SSH_USER
  SELFHOSTED_SSH_HOST
  SELFHOSTED_COOLIFY_SERVICE_ID          Coolify service id (default: jvxox6algazptjelglcjmyez)
  SELFHOSTED_EDGE_FUNCTIONS_CONTAINER    Docker container to restart after copy

Secrets are NOT deployed by this script. Set them on the edge-functions
service in Coolify.

After deploy, functions are at:
  https://supabase.growlog.ai/functions/v1/<function-name>

There are no Edge Functions in this repo yet. Background work stays on `pnpm worker`.
Add supabase/functions/<name>/index.ts and supabase/functions/_shared before deploying.
EOF
}

sync_path() {
  local rel="$1"
  local src="$FUNCTIONS_DIR/$rel"
  local ssh_target
  ssh_target="$(functions_selfhosted_ssh_target)"
  local remote="${REMOTE_FUNCTIONS_ROOT}/${rel}"

  [[ -e "$src" ]] || functions_selfhosted_die "missing local path: supabase/functions/$rel"

  echo "→ $rel"
  if command -v rsync >/dev/null 2>&1; then
    rsync -az --delete \
      -e "ssh -o ConnectTimeout=15" \
      "$src/" \
      "${ssh_target}:${remote}/"
  else
    ssh -o ConnectTimeout=15 "$ssh_target" "mkdir -p $(printf '%q' "$remote")"
    scp -rq "$src/." "${ssh_target}:${remote}/"
  fi
}

main() {
  case "${1:-}" in
    -h | --help | help)
      usage
      exit 0
      ;;
  esac

  local targets=()
  if (($# > 0)); then
    targets=("$@")
  else
    local line
    while IFS= read -r line; do
      [[ -n "$line" ]] && targets+=("$line")
    done < <(functions_selfhosted_list_local)
  fi

  ((${#targets[@]} > 0)) || functions_selfhosted_die "no functions found under supabase/functions"

  echo "Self-hosted Edge Functions deploy"
  echo "  host: ${SELFHOSTED_SSH_USER}@${SELFHOSTED_SSH_HOST}"
  echo "  remote: ${REMOTE_FUNCTIONS_ROOT}"
  echo ""

  sync_path "_shared"
  if [[ -f "$FUNCTIONS_DIR/deno.json" ]]; then
    local ssh_target
    ssh_target="$(functions_selfhosted_ssh_target)"
    echo "→ deno.json"
    scp -q "$FUNCTIONS_DIR/deno.json" "${ssh_target}:${REMOTE_FUNCTIONS_ROOT}/deno.json"
  fi

  local fn
  for fn in "${targets[@]}"; do
    [[ -f "$FUNCTIONS_DIR/$fn/index.ts" ]] || functions_selfhosted_die "unknown function: $fn (expected supabase/functions/$fn/index.ts)"
    sync_path "$fn"
  done

  echo ""
  functions_selfhosted_restart_edge_container
  echo ""
  echo "Done. Smoke-test one function, e.g.:"
  echo "  curl -i \"\${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/<function-name>\" -H \"Authorization: Bearer \${NEXT_PUBLIC_SUPABASE_ANON_KEY}\""
}

main "$@"
