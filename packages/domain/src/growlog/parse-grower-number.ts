export type ParseGrowerNumberError = 'empty' | 'invalid';

export type ParseGrowerNumberResult =
  | { ok: true; value: number }
  | { ok: false; error: ParseGrowerNumberError };

/** Parses grower-entered numbers with comma or dot decimal separators. */
export function parseGrowerNumber(
  raw: string,
  options?: { allowEmpty?: boolean; integer?: boolean },
): ParseGrowerNumberResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    if (options?.allowEmpty) return { ok: true, value: NaN };
    return { ok: false, error: 'empty' };
  }

  const normalized = trimmed.replace(/\s/g, '').replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    return { ok: false, error: 'invalid' };
  }

  const value = options?.integer ? parseInt(normalized, 10) : parseFloat(normalized);
  if (!Number.isFinite(value)) {
    return { ok: false, error: 'invalid' };
  }
  if (options?.integer && !Number.isInteger(value)) {
    return { ok: false, error: 'invalid' };
  }
  return { ok: true, value };
}

export function parseOptionalGrowerNumber(
  raw: string,
  options?: { integer?: boolean },
): ParseGrowerNumberResult {
  if (!raw.trim()) return { ok: true, value: NaN };
  return parseGrowerNumber(raw, { integer: options?.integer });
}

export function isNaNValue(v: number): boolean {
  return Number.isNaN(v);
}
