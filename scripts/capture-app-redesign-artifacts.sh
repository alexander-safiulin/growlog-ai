#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BEFORE="$ROOT/docs/design/artifacts/before"
AFTER="$ROOT/docs/design/artifacts/mockups"
mkdir -p "$BEFORE" "$AFTER"

BASE="${SCREENSHOT_BASE_URL:-http://localhost:3000}"
LANG_Q='lang=ru'
PW='npx --yes playwright@1.52.0 screenshot --browser chromium --viewport-size 390,844 --wait-for-timeout 2200'

capture() {
  local url="$1"
  local out="$2"
  local scheme="${3:-light}"
  echo "→ $out"
  if [[ "$scheme" == "dark" ]]; then
    $PW --color-scheme=dark "$url" "$out"
  else
    $PW "$url" "$out"
  fi
}

echo "Capturing BEFORE (current UI) to $BEFORE ..."
capture "$BASE/auth/login?$LANG_Q" "$BEFORE/login-light.png" light
capture "$BASE/auth/login?$LANG_Q" "$BEFORE/login-dark.png" dark
capture "$BASE/nutrient/calculator?$LANG_Q&tab=wand" "$BEFORE/nutrient-calculator-light.png" light
capture "$BASE/nutrient/calculator?$LANG_Q&tab=wand" "$BEFORE/nutrient-calculator-dark.png" dark
capture "$BASE/preview/dashboard?$LANG_Q" "$BEFORE/dashboard-light.png" light
capture "$BASE/preview/dashboard?$LANG_Q" "$BEFORE/dashboard-dark.png" dark
capture "$BASE/preview/timeline?$LANG_Q" "$BEFORE/timeline-light.png" light
capture "$BASE/preview/timeline?$LANG_Q" "$BEFORE/timeline-dark.png" dark
capture "$BASE/preview/log?$LANG_Q" "$BEFORE/journal-log-light.png" light
capture "$BASE/preview/log?$LANG_Q" "$BEFORE/journal-log-dark.png" dark
capture "$BASE/preview/settings?$LANG_Q" "$BEFORE/settings-light.png" light
capture "$BASE/preview/sensors?$LANG_Q" "$BEFORE/sensors-light.png" light
capture "$BASE/preview/onboarding?$LANG_Q" "$BEFORE/onboarding-light.png" light
capture "$BASE/preview/cycles?$LANG_Q" "$BEFORE/cycles-fragment-light.png" light

echo "Capturing AFTER mockups to $AFTER ..."
capture "$BASE/preview/mockups/dashboard?$LANG_Q&appearance=light" "$AFTER/dashboard-light.png" light
capture "$BASE/preview/mockups/dashboard?$LANG_Q&appearance=dark" "$AFTER/dashboard-dark.png" dark
capture "$BASE/preview/mockups/journal?$LANG_Q&appearance=light" "$AFTER/journal-light.png" light
capture "$BASE/preview/mockups/journal?$LANG_Q&appearance=dark" "$AFTER/journal-dark.png" dark
capture "$BASE/preview/mockups/cycle-detail?$LANG_Q&appearance=light" "$AFTER/cycle-detail-light.png" light
capture "$BASE/preview/mockups/cycle-detail?$LANG_Q&appearance=dark" "$AFTER/cycle-detail-dark.png" dark
capture "$BASE/preview/mockups/cycle-detail?$LANG_Q&appearance=light&section=chronology" "$AFTER/cycle-detail-chronology-light.png" light
capture "$BASE/preview/mockups/cycle-detail?$LANG_Q&appearance=dark&section=chronology" "$AFTER/cycle-detail-chronology-dark.png" dark
capture "$BASE/preview/mockups/cycles-list?$LANG_Q&appearance=light" "$AFTER/cycles-list-light.png" light
capture "$BASE/preview/mockups/cycles-list?$LANG_Q&appearance=dark" "$AFTER/cycles-list-dark.png" dark
capture "$BASE/preview/mockups/capture-sheet?$LANG_Q&appearance=light" "$AFTER/capture-sheet-light.png" light
capture "$BASE/preview/mockups/capture-sheet?$LANG_Q&appearance=dark" "$AFTER/capture-sheet-dark.png" dark
capture "$BASE/preview/mockups/vpd-expanded?$LANG_Q&appearance=light" "$AFTER/vpd-expanded-light.png" light
capture "$BASE/preview/mockups/vpd-expanded?$LANG_Q&appearance=dark" "$AFTER/vpd-expanded-dark.png" dark
capture "$BASE/preview/mockups/vpd-sensor-picker?$LANG_Q&appearance=light" "$AFTER/vpd-sensor-picker-light.png" light
capture "$BASE/preview/mockups/vpd-sensor-picker?$LANG_Q&appearance=dark" "$AFTER/vpd-sensor-picker-dark.png" dark

echo "Done."
ls -lh "$BEFORE"/*.png "$AFTER"/*.png 2>/dev/null || true
