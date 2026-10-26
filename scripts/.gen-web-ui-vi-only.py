"""Generate en-vi.json from en-unique-web.json (MyMemory, slow)."""
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "lib/i18n/web-ui/cache"
strings = json.loads((CACHE / "en-unique-web.json").read_text(encoding="utf-8"))

BRANDS = [
    "Hydroodo", "Growlog", "Cornell", "Hoagland", "TUYA", "SmartLife",
    "Supabase", "OpenAI", "Next.js", "MetaMask", "Phantom", "Grover",
    "Whisper", "WebM", "Ethereum", "Solana", "Zigbee", "Google",
    "OG Lab", "Tuya", "OPENAI_API_KEY", "TUYA_ACCESS_ID", "TUYA_ACCESS_SECRET",
]


def protect(s: str) -> tuple[str, dict[str, str]]:
    tokens: dict[str, str] = {}
    out = s
    idx = 0
    for b in BRANDS:
        if b in out:
            tok = f"ZZBR{idx}ZZ"
            idx += 1
            tokens[tok] = b
            out = out.replace(b, tok)
    for m in re.finditer(r"\{[^}]+\}", s):
        ph = m.group(0)
        tok = f"ZZPH{idx}ZZ"
        idx += 1
        tokens[tok] = ph
        out = out.replace(ph, tok, 1)
    for m in re.finditer(r"`[^`]+`", s):
        code = m.group(0)
        tok = f"ZZCD{idx}ZZ"
        idx += 1
        tokens[tok] = code
        out = out.replace(code, tok, 1)
    return out, tokens


def restore(s: str, tokens: dict[str, str]) -> str:
    for tok, orig in sorted(tokens.items(), key=lambda x: -len(x[0])):
        s = s.replace(tok, orig)
    return s


def translate_one(text: str) -> str:
    url = (
        "https://api.mymemory.translated.net/get?q="
        + urllib.parse.quote(text)
        + "&langpair=en|vi"
    )
    with urllib.request.urlopen(url, timeout=45) as resp:
        data = json.loads(resp.read().decode())
    tr = data.get("responseData", {}).get("translatedText") or text
    if "MYMEMORY WARNING" in tr.upper():
        raise RuntimeError(tr)
    return tr


def main() -> None:
    out_path = CACHE / "en-vi.json"
    out: dict[str, str] = {}
    if out_path.exists():
        out = json.loads(out_path.read_text(encoding="utf-8"))

    for i, s in enumerate(strings):
        if s in out and out[s] != s:
            continue
        p, tokens = protect(s)
        tr = p
        for attempt in range(8):
            try:
                tr = translate_one(p)
                break
            except Exception as e:
                wait = 5 * (attempt + 1)
                print(f"vi {i} retry {attempt} ({wait}s): {e}", flush=True)
                time.sleep(wait)
        out[s] = restore(tr, tokens)
        if (i + 1) % 15 == 0:
            out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(f"vi: {i + 1}/{len(strings)}", flush=True)
        time.sleep(2.2)

    for k in strings:
        out.setdefault(k, k)
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Wrote", out_path, len(out))


if __name__ == "__main__":
    main()
