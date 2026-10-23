import { describe, expect, it } from 'vitest';
import { buildP4ImportModel } from '../../scripts/nutrient-import/p4-manufacturer-import.ts';

describe('Advanced Nutrients Connoisseur catalog aliases', () => {
  it('maps each legacy hyphen key to a distinct grow/bloom canonical product', () => {
    const { aliasRows } = buildP4ImportModel();
    const connoisseur = aliasRows.filter((a) => a.alias_external_key.includes('connoisseur'));
    const byAlias = new Map(connoisseur.map((a) => [a.alias_external_key, a.canonical_external_key]));

    expect(byAlias.get('advanced nutrients|ph-perfect-connoisseur-grow-part-a')).toBe(
      'advanced nutrients|ph perfect connoisseur grow a',
    );
    expect(byAlias.get('advanced nutrients|ph-perfect-connoisseur-grow-part-b')).toBe(
      'advanced nutrients|ph perfect connoisseur grow b',
    );
    expect(byAlias.get('advanced nutrients|ph-perfect-connoisseur-bloom-part-a')).toBe(
      'advanced nutrients|ph perfect connoisseur bloom a',
    );

    const bloomGrowA = byAlias.get('advanced nutrients|ph-perfect-connoisseur-bloom-part-a');
    const growA = byAlias.get('advanced nutrients|ph-perfect-connoisseur-grow-part-a');
    expect(bloomGrowA).not.toBe(growA);
  });
});
