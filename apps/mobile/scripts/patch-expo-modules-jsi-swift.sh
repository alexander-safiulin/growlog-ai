#!/usr/bin/env bash
# Swift 6 / Xcode 26: guard with abs(milliseconds) is ambiguous in expo-modules-jsi 57.0.4
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
REPLACEMENT='func dateFromMilliseconds(_ milliseconds: Double) throws -> Date {
  if !milliseconds.isFinite || milliseconds.magnitude > maxJavaScriptDateMilliseconds {
    throw InvalidDateException()
  }
  return Date(timeIntervalSince1970: milliseconds.rounded(.towardZero) / 1000.0)
}'
count=0
while IFS= read -r f; do
  if grep -q 'abs(milliseconds) <= maxJavaScriptDateMilliseconds' "$f" || grep -q 'abs(milliseconds) <= Double(maxJavaScriptDateMilliseconds)' "$f"; then
    perl -0777 -pi -e 's/func dateFromMilliseconds\(_ milliseconds: Double\) throws -> Date \{\n  guard milliseconds\.isFinite, abs\(milliseconds\) <= (?:Double\()?\maxJavaScriptDateMilliseconds(?:\))? else \{\n    throw InvalidDateException\(\)\n  \}\n  return Date\(timeIntervalSince1970: milliseconds\.rounded\(\.towardZero\) \/ 1000\.0\)\n\}/func dateFromMilliseconds(_ milliseconds: Double) throws -> Date {\n  if !milliseconds.isFinite || milliseconds.magnitude > maxJavaScriptDateMilliseconds {\n    throw InvalidDateException()\n  }\n  return Date(timeIntervalSince1970: milliseconds.rounded(.towardZero) \/ 1000.0)\n}/s' "$f"
    echo "patched $f"
    count=$((count + 1))
  fi
done < <(find "$ROOT/node_modules" -name 'JavaScriptCodable+Date.swift' -path '*/ExpoModulesJSI/*' 2>/dev/null || true)
if [ "$count" -eq 0 ]; then
  echo "patch-expo-modules-jsi: no files patched (already fixed or run pnpm install from repo root)"
fi
