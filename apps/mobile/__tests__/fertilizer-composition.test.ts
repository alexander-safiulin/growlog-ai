import {
  compositionElementLabel,
  compositionGroups,
  formatCompositionPct,
} from '@/lib/fertilizer-composition';

describe('compositionGroups', () => {
  it('keeps label oxides and micronutrients, and drops empty lines', () => {
    const groups = compositionGroups([
      { form_key: 'Fe', value_pct: 0.054 },
      { form_key: 'N', value_pct: 20 },
      { form_key: 'K2O', value_pct: 10 },
      { form_key: 'B', value_pct: 0 },
      { form_key: 'Mn', value_pct: 0.042 },
      { form_key: 'P2O5', value_pct: 5 },
    ]);
    expect(groups.macros.map((row) => row.key)).toEqual(['N', 'P2O5', 'K2O']);
    expect(groups.micros.map((row) => row.key)).toEqual(['Fe', 'Mn']);
    expect(groups.other).toEqual([]);
  });

  it('sums duplicate forms and keeps unknown keys', () => {
    const groups = compositionGroups([
      { form_key: 'Fe', value_pct: 0.01 },
      { form_key: 'Fe', value_pct: 0.02 },
      { form_key: 'EDTA', value_pct: 1 },
    ]);
    expect(groups.micros).toEqual([{ key: 'Fe', pct: 0.03 }]);
    expect(groups.other).toEqual([{ key: 'EDTA', pct: 1 }]);
  });
});

describe('composition labels', () => {
  it('names elements in Russian and English', () => {
    expect(compositionElementLabel('Fe', 'ru')).toBe('Железо (Fe)');
    expect(compositionElementLabel('K2O', 'en')).toBe('Potassium (K₂O)');
    expect(compositionElementLabel('XYZ', 'en')).toBe('XYZ');
  });

  it('keeps micronutrient precision', () => {
    expect(formatCompositionPct(20)).toBe('20%');
    expect(formatCompositionPct(3)).toBe('3%');
    expect(formatCompositionPct(0.054)).toBe('0.054%');
    expect(formatCompositionPct(0.02)).toBe('0.02%');
  });
});
