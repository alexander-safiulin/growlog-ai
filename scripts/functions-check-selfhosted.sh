#!/usr/bin/env bash
# Compare local supabase/functions with Coolify volume (undeployed / drift / orphans).
set -euo pipefail

# shellcheck source=functions-selfhosted-lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/functions-selfhosted-lib.sh"

usage() {
  cat <<'EOF'
Usage:
  scripts/functions-check-selfhosted.sh

Compares repo Edge Functions to the self-hosted volume on the VPS.
Exit code 0 = in sync; 1 = not deployed, drift, or orphans detected.

Environment: same as functions-deploy-selfhosted.sh (SELFHOSTED_SSH_*, SERVICE_ID, …)
EOF
}

count_rsync_changes() {
  local rel="$1"
  local src="$FUNCTIONS_DIR/$rel"
  local ssh_target
  ssh_target="$(functions_selfhosted_ssh_target)"
  local remote="${REMOTE_FUNCTIONS_ROOT}/${rel}"

  if [[ ! -e "$src" ]]; then
    echo 0
    return 0
  fi

  if [[ -f "$src" ]]; then
    if ! functions_selfhosted_remote_dir_exists "$(dirname "$rel")" 2>/dev/null; then
      echo 1
      return 0
    fi
    if ! ssh -o ConnectTimeout=15 "$ssh_target" "test -f $(printf '%q' "$remote")" 2>/dev/null; then
      echo 1
      return 0
    fi
    local local_sum remote_sum
    local_sum="$(shasum -a 256 "$src" | awk '{print $1}')"
    remote_sum="$(ssh -o ConnectTimeout=15 "$ssh_target" \
      "if command -v sha256sum >/dev/null; then sha256sum $(printf '%q' "$remote"); else shasum -a 256 $(printf '%q' "$remote"); fi" \
      2>/dev/null | awk '{print $1}')"
    if [[ "$local_sum" != "$remote_sum" ]]; then
      echo 1
    else
      echo 0
    fi
    return 0
  fi

  if ! functions_selfhosted_remote_dir_exists "$rel" 2>/dev/null; then
    echo 999
    return 0
  fi

  local out count
  out="$(rsync -rcn --itemize-changes \
    -e "ssh -o ConnectTimeout=15" \
    "$src/" \
    "${ssh_target}:${remote}/" 2>/dev/null || true)"
  count="$(printf '%s\n' "$out" | grep -E '^[<>ch.*][fdL][+cstupe.goxa][+cstupe.goxa ]' | wc -l | tr -d ' ')"
  echo "$count"
}

print_rsync_diff_hint() {
  local rel="$1"
  local src="$FUNCTIONS_DIR/$rel"
  local ssh_target
  ssh_target="$(functions_selfhosted_ssh_target)"
  local remote="${REMOTE_FUNCTIONS_ROOT}/${rel}"
  [[ -d "$src" ]] || return 0
  rsync -rcn --itemize-changes \
    -e "ssh -o ConnectTimeout=15" \
    "$src/" \
    "${ssh_target}:${remote}/" 2>/dev/null | head -20 || true
}

# workaround: macOS /bin/bash is 3.2. With set -u, "${empty[@]}" is unbound
# (the error is reported on the function line, not the expansion). Callers
# must pass elements only when the array length is greater than zero.
print_status_rows() {
  local status="$1"
  shift
  local name
  for name in "$@"; do
    printf '%-28s %s\n' "$name" "$status"
  done
}

main() {
  case "${1:-}" in
    -h | --help | help)
      usage
      exit 0
      ;;
    *)
      [[ $# -eq 0 ]] || functions_selfhosted_die "unknown arguments (this script takes no args)"
      ;;
  esac

  functions_selfhosted_require_rsync

  local ssh_target
  ssh_target="$(functions_selfhosted_ssh_target)"

  echo "Edge Functions sync check (self-hosted)"
  echo "  local:  supabase/functions"
  echo "  remote: ${ssh_target}:${REMOTE_FUNCTIONS_ROOT}"
  echo ""

  if ! ssh -o ConnectTimeout=15 "$ssh_target" "test -d $(printf '%q' "$REMOTE_FUNCTIONS_ROOT")"; then
    functions_selfhosted_die "remote functions root missing (deploy once or fix SELFHOSTED_COOLIFY_SERVICE_ID)"
  fi

  local local_fns=()
  local remote_fns=()
  local line
  while IFS= read -r line; do
    [[ -n "$line" ]] && local_fns+=("$line")
  done < <(functions_selfhosted_list_local)
  while IFS= read -r line; do
    [[ -n "$line" ]] && remote_fns+=("$line")
  done < <(functions_selfhosted_list_remote_functions)

  local issues=0
  local not_deployed=()
  local drift=()
  local in_sync=()
  local orphans=()

  local fn
  if ((${#local_fns[@]} > 0)); then
    for fn in "${local_fns[@]}"; do
      local changes
      changes="$(count_rsync_changes "$fn")"
      if [[ "$changes" -eq 999 ]]; then
        not_deployed+=("$fn")
        issues=$((issues + 1))
      elif [[ "$changes" -gt 0 ]]; then
        drift+=("$fn")
        issues=$((issues + 1))
      else
        in_sync+=("$fn")
      fi
    done
  fi

  if ((${#remote_fns[@]} > 0)); then
    for fn in "${remote_fns[@]}"; do
      local found=0
      local local_fn
      if ((${#local_fns[@]} > 0)); then
        for local_fn in "${local_fns[@]}"; do
          if [[ "$local_fn" == "$fn" ]]; then
            found=1
            break
          fi
        done
      fi
      if [[ $found -eq 0 ]]; then
        orphans+=("$fn")
        issues=$((issues + 1))
      fi
    done
  fi

  local shared_status="in sync"
  local shared_changes
  shared_changes="$(count_rsync_changes "_shared")"
  if [[ "$shared_changes" -eq 999 ]]; then
    shared_status="not deployed"
    issues=$((issues + 1))
  elif [[ "$shared_changes" -gt 0 ]]; then
    shared_status="drift"
    issues=$((issues + 1))
  fi

  local deno_status="—"
  if [[ -f "$FUNCTIONS_DIR/deno.json" ]]; then
    local deno_changes
    deno_changes="$(count_rsync_changes "deno.json")"
    if [[ "$deno_changes" -gt 0 ]]; then
      deno_status="drift"
      issues=$((issues + 1))
    else
      deno_status="in sync"
    fi
  fi

  printf '%-28s %s\n' "NAME" "STATUS"
  printf '%-28s %s\n' "----" "------"
  printf '%-28s %s\n' "_shared" "$shared_status"
  if [[ "$deno_status" != "—" ]]; then
    printf '%-28s %s\n' "deno.json" "$deno_status"
  fi

  if ((${#in_sync[@]} > 0)); then
    print_status_rows "in sync" "${in_sync[@]}"
  fi
  if ((${#not_deployed[@]} > 0)); then
    print_status_rows "NOT ON SERVER" "${not_deployed[@]}"
  fi
  if ((${#drift[@]} > 0)); then
    print_status_rows "DRIFT (local ≠ remote)" "${drift[@]}"
  fi
  if ((${#orphans[@]} > 0)); then
    print_status_rows "ORPHAN (server only)" "${orphans[@]}"
  fi

  if ((${#drift[@]} > 0)); then
    echo ""
    echo "Drift detail (first lines, rsync -n -c):"
    for fn in "${drift[@]}"; do
      echo "--- $fn ---"
      print_rsync_diff_hint "$fn"
    done
  fi
  if [[ "$shared_status" == "drift" ]]; then
    echo ""
    echo "--- _shared ---"
    print_rsync_diff_hint "_shared"
  fi

  echo ""
  if [[ $issues -eq 0 ]]; then
    echo "All tracked functions match the server volume."
    exit 0
  fi
  echo "$issues issue(s). Deploy: pnpm functions:deploy"
  exit 1
}

main "$@"
