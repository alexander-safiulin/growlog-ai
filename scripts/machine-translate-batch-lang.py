"""Translate a JSON list of strings with Google Translate (deep_translator)."""
import json
import sys
import time

from deep_translator import GoogleTranslator

if len(sys.argv) < 4:
    print("usage: machine-translate-batch-lang.py <source> <target> <in.json> <out.json>", file=sys.stderr)
    sys.exit(2)

source, target, inp, outp = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
strings = json.load(open(inp, encoding="utf-8"))
translator = GoogleTranslator(source=source, target=target)
out = []
for i, s in enumerate(strings):
    if not s or not isinstance(s, str):
        out.append(s)
        continue
    if len(s) <= 3 and s.isascii() and not any(c.isalpha() for c in s):
        out.append(s)
        continue
    translated = s
    for attempt in range(5):
        try:
            translated = translator.translate(s)
            break
        except Exception as e:
            wait = 2.0 * (attempt + 1)
            time.sleep(wait)
            if attempt == 4:
                print(f"warn: failed {target} #{i}: {e}", file=sys.stderr)
    out.append(translated)
    time.sleep(1.1)

json.dump(out, open(outp, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
