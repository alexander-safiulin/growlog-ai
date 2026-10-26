#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
LOCALE="${1:?locale}"
FULL="${2:-}"
CHUNK=60
for ((off=0; off<720; off+=CHUNK)); do
  echo "=== $LOCALE offset=$off ==="
  npx tsx scripts/fill-locale-from-de.ts "$LOCALE" $FULL --offset="$off" --limit="$CHUNK"
  sleep 3
done
