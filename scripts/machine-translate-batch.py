import json
import sys
import time

from deep_translator import GoogleTranslator

inp, outp = sys.argv[1], sys.argv[2]
strings = json.load(open(inp, encoding='utf-8'))
translator = GoogleTranslator(source='auto', target='th')
out = []
for i, s in enumerate(strings):
    if not s or not any('\u0400' <= c <= '\u04FF' or c in 'äöüßÄÖÜ' for c in s):
        out.append(s)
        continue
    try:
        out.append(translator.translate(s))
    except Exception:
        out.append(s)
    if (i + 1) % 20 == 0:
        time.sleep(0.5)
json.dump(out, open(outp, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
