"""One-off: build en-th.json / en-vi.json from en-unique-web.json."""
import json
import re
import sys
import time
from pathlib import Path

from deep_translator import GoogleTranslator

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "lib/i18n/web-ui/cache"

BRANDS = [
    "Hydroodo",
    "Growlog",
    "Cornell",
    "Hoagland",
    "TUYA",
    "SmartLife",
    "Supabase",
    "OpenAI",
    "Next.js",
    "MetaMask",
    "Phantom",
    "Grover",
    "Whisper",
    "WebM",
    "Ethereum",
    "Solana",
    "Zigbee",
    "Google",
    "OG Lab",
    "Tuya",
    "OPENAI_API_KEY",
    "TUYA_ACCESS_ID",
    "TUYA_ACCESS_SECRET",
]


def protect(s: str) -> tuple[str, dict[str, str]]:
    tokens: dict[str, str] = {}
    out = s
    for i, b in enumerate(BRANDS):
        if b in out:
            tok = f"__BR{i}__"
            tokens[tok] = b
            out = out.replace(b, tok)
    for m in re.finditer(r"\{[^}]+\}", s):
        ph = m.group(0)
        tok = f"__PH{len(tokens)}__"
        tokens[tok] = ph
        out = out.replace(ph, tok, 1)
    for m in re.finditer(r"`[^`]+`", s):
        code = m.group(0)
        tok = f"__CD{len(tokens)}__"
        tokens[tok] = code
        out = out.replace(code, tok, 1)
    return out, tokens


def restore(s: str, tokens: dict[str, str]) -> str:
    for tok, orig in tokens.items():
        s = s.replace(tok, orig)
    return s


def translate_all(target: str, strings: list[str]) -> dict[str, str]:
    tr = GoogleTranslator(source="en", target=target)
    out: dict[str, str] = {}
    for i, s in enumerate(strings):
        protected, tokens = protect(s)
        translated = protected
        for attempt in range(5):
            try:
                translated = tr.translate(protected)
                break
            except Exception as e:
                time.sleep(2 * (attempt + 1))
                if attempt == 4:
                    print(f"FAIL {target} {i}: {e}", file=sys.stderr)
        out[s] = restore(translated, tokens)
        if (i + 1) % 25 == 0:
            print(f"{target}: {i + 1}/{len(strings)}", flush=True)
        time.sleep(0.55)
    return out


def main() -> None:
    strings: list[str] = json.loads((CACHE / "en-unique-web.json").read_text(encoding="utf-8"))
    for target in ("th", "vi"):
        mapping = translate_all(target, strings)
        path = CACHE / f"en-{target}.json"
        path.write_text(json.dumps(mapping, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("Wrote", path, len(mapping), "keys")


if __name__ == "__main__":
    main()
