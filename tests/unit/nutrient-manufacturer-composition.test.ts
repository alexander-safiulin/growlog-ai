import { describe, expect, it } from 'vitest';
import { buildP4ImportModel } from '../../scripts/nutrient-import/p4-manufacturer-import.ts';
import { buildP5ImportModel } from '../../scripts/nutrient-import/p5-manufacturer-import.ts';
import { declaredToElemental } from '../../packages/nutrient-calc/src/oxide.ts';

const OXIDE_FORMS = new Set(['P2O5', 'K2O', 'CaO', 'MgO', 'SO3', 'SO4']);

function sumDeclaredPct(lines: Array<{ form_key: string; value_pct: number }>): number {
  return lines.reduce((s, l) => s + l.value_pct, 0);
}

function allProducts() {
  const p4 = buildP4ImportModel();
  const p5 = buildP5ImportModel();
  return [...p4.newProducts, ...p5.newProducts];
}

describe('manufacturer catalog composition sanity', () => {
  it('every manufacturer row has provenance fields', () => {
    const p4 = buildP4ImportModel();
    const p5 = buildP5ImportModel();
    const sourceIds = new Set([...p4.sources, ...p5.sources].map((s) => s.id));
    for (const p of allProducts()) {
      expect(sourceIds.has(p.source_id)).toBe(true);
      expect(p.retrieved_at).toBeTruthy();
      expect(p.trust_level).toBeTruthy();
      expect(p.license).toBeTruthy();
    }
  });

  it('declared % sums stay within plausible label totals (≤ 105%)', () => {
    for (const p of allProducts()) {
      if (!p.lines.length || p.metadata.partial_composition) continue;
      const sum = sumDeclaredPct(p.lines);
      expect(sum).toBeLessThanOrEqual(105);
      expect(sum).toBeGreaterThan(0);
    }
  });

  it('oxide forms convert to elemental via canonical factors', () => {
    const { pct } = declaredToElemental({ P2O5: 5, K2O: 4, CaO: 6 });
    expect(pct.P).toBeGreaterThan(2);
    expect(pct.K).toBeGreaterThan(3);
    expect(pct.Ca).toBeGreaterThan(4);
    for (const form of OXIDE_FORMS) {
      expect((pct as Record<string, number>)[form]).toBeUndefined();
    }
  });

  it('P5 adds feed schedules and data sources', () => {
    const p5 = buildP5ImportModel();
    expect(p5.sources.length).toBeGreaterThanOrEqual(5);
    expect(p5.feedSchedules.length).toBeGreaterThanOrEqual(5);
    expect(p5.newProducts.length).toBeGreaterThanOrEqual(25);
  });
});
