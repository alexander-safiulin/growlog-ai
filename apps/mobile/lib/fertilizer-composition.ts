/** Label-declared forms, in display order. Values stay as stored (oxides are not converted). */
export const MACRO_FORMS = [
  'N',
  'NO3',
  'NH4',
  'NH2',
  'P',
  'P2O5',
  'K',
  'K2O',
  'Ca',
  'CaO',
  'Mg',
  'MgO',
  'S',
  'SO3',
  'SO4',
] as const;

export const MICRO_FORMS = ['Fe', 'Mn', 'Zn', 'Cu', 'B', 'Mo', 'Co', 'Si', 'Na', 'Na2O', 'Cl'] as const;

const EN_LABELS: Record<string, string> = {
  N: 'Nitrogen (N)',
  NO3: 'Nitrate nitrogen (NO₃)',
  NH4: 'Ammonium nitrogen (NH₄)',
  NH2: 'Urea nitrogen (NH₂)',
  P: 'Phosphorus (P)',
  P2O5: 'Phosphorus (P₂O₅)',
  K: 'Potassium (K)',
  K2O: 'Potassium (K₂O)',
  Ca: 'Calcium (Ca)',
  CaO: 'Calcium (CaO)',
  Mg: 'Magnesium (Mg)',
  MgO: 'Magnesium (MgO)',
  S: 'Sulfur (S)',
  SO3: 'Sulfur (SO₃)',
  SO4: 'Sulfur (SO₄)',
  Fe: 'Iron (Fe)',
  Mn: 'Manganese (Mn)',
  Zn: 'Zinc (Zn)',
  Cu: 'Copper (Cu)',
  B: 'Boron (B)',
  Mo: 'Molybdenum (Mo)',
  Co: 'Cobalt (Co)',
  Si: 'Silicon (Si)',
  Na: 'Sodium (Na)',
  Na2O: 'Sodium (Na₂O)',
  Cl: 'Chlorine (Cl)',
};

const RU_LABELS: Record<string, string> = {
  N: 'Азот (N)',
  NO3: 'Азот нитратный (NO₃)',
  NH4: 'Азот аммонийный (NH₄)',
  NH2: 'Азот амидный (NH₂)',
  P: 'Фосфор (P)',
  P2O5: 'Фосфор (P₂O₅)',
  K: 'Калий (K)',
  K2O: 'Калий (K₂O)',
  Ca: 'Кальций (Ca)',
  CaO: 'Кальций (CaO)',
  Mg: 'Магний (Mg)',
  MgO: 'Магний (MgO)',
  S: 'Сера (S)',
  SO3: 'Сера (SO₃)',
  SO4: 'Сера (SO₄)',
  Fe: 'Железо (Fe)',
  Mn: 'Марганец (Mn)',
  Zn: 'Цинк (Zn)',
  Cu: 'Медь (Cu)',
  B: 'Бор (B)',
  Mo: 'Молибден (Mo)',
  Co: 'Кобальт (Co)',
  Si: 'Кремний (Si)',
  Na: 'Натрий (Na)',
  Na2O: 'Натрий (Na₂O)',
  Cl: 'Хлор (Cl)',
};

export type CompositionEntry = { key: string; pct: number };

export type CompositionGroups = {
  macros: CompositionEntry[];
  micros: CompositionEntry[];
  other: CompositionEntry[];
};

export function compositionGroups(
  lines: Array<{ form_key: string; value_pct: number }>,
): CompositionGroups {
  const totals = new Map<string, number>();
  for (const line of lines) {
    if (!line.form_key || !Number.isFinite(line.value_pct) || line.value_pct <= 0) continue;
    totals.set(line.form_key, (totals.get(line.form_key) ?? 0) + line.value_pct);
  }

  const take = (keys: readonly string[]): CompositionEntry[] => {
    const rows: CompositionEntry[] = [];
    for (const key of keys) {
      const pct = totals.get(key);
      if (pct == null) continue;
      rows.push({ key, pct });
      totals.delete(key);
    }
    return rows;
  };

  const macros = take(MACRO_FORMS);
  const micros = take(MICRO_FORMS);
  const other = [...totals.entries()]
    .map(([key, pct]) => ({ key, pct }))
    .sort((a, b) => a.key.localeCompare(b.key));
  return { macros, micros, other };
}

export function compositionElementLabel(key: string, locale: string): string {
  const table = locale === 'ru' ? RU_LABELS : EN_LABELS;
  return table[key] ?? key;
}

export function formatCompositionPct(value: number): string {
  if (!Number.isFinite(value)) return '–';
  const digits = value >= 10 ? 1 : value >= 1 ? 2 : 4;
  const trimmed = value.toFixed(digits).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  return `${trimmed}%`;
}
