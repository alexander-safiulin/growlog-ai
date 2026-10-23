const SUBSCRIPT_SUPERSCRIPT = /[\u2080-\u2094\u00B2\u00B3\u2070-\u2079\u207A\u207B\u00B9]/;
const CHEM_FORMULA = /^[A-Za-z0-9()[\]+.\-⁻₀-₉]+$/;

/** Latin element / acronym tokens to keep as-is (EDTA, CANNA, Fe, MgSO₄…). */
function preserveLatinToken(word: string): boolean {
  if (!word) return true;
  if (SUBSCRIPT_SUPERSCRIPT.test(word) || /\d/.test(word)) return true;
  if (/^[A-Z0-9]{2,}$/.test(word)) return true;
  if (/^(CANNA|HC|EDTA|DTPA|EDDHA|Fe|Cu|Zn|Mn|Mo|B|K|N|P|Ca|Mg|S|NH₄|NO₃|SO₄)$/i.test(word)) {
    return true;
  }
  if (CHEM_FORMULA.test(word) && /[A-Z]/.test(word) && word.length <= 12) return true;
  return false;
}

/** Russian catalog name: sentence case, preserving brands/acronyms/chemical tokens. */
export function ruProductSentenceCase(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  if (!/[а-яА-ЯёЁ]/.test(trimmed)) return trimmed;

  const words = trimmed.split(/(\s+)/);
  const normalized = words.map((part) => {
    if (/^\s+$/.test(part)) return part;
    if (preserveLatinToken(part)) return part;
    return part.toLocaleLowerCase('ru-RU');
  });

  const joined = normalized.join('');
  return joined.charAt(0).toLocaleUpperCase('ru-RU') + joined.slice(1);
}
