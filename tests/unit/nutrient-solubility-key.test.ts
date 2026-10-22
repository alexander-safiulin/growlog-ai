import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  inferSolubilityKeyFromDeclaredPct,
  solubilityKeyForFertilizer,
  type FertilizerSpec,
} from '@growlog/nutrient-calc';

const bundlePath = path.join(process.cwd(), 'supabase/seed/nutrient/adr014-catalog.bundle.json');

interface BundleProduct {
  external_key: string;
  brand: string;
  name: string;
  metadata: { solubility_key?: string };
  lines: Array<{ form_key: string; value_pct: number }>;
}

describe('solubility_key on catalog single salts', () => {
  const bundle = JSON.parse(readFileSync(bundlePath, 'utf8')) as {
    fertilizers: BundleProduct[];
  };

  const declaredFromLines = (lines: BundleProduct['lines']) => {
    const out: Record<string, number> = {};
    for (const l of lines) {
      if (l.value_pct) out[l.form_key] = l.value_pct;
    }
    return out;
  };

  const buiskKeys: Record<string, string> = {
    'буйские удобрения|кальциевая селитра': 'Ca(NO3)2·4H2O',
    'буйские удобрения|сульфат калия': 'K2SO4',
    'буйские удобрения|магниевая селитра': 'Mg(NO3)2·6H2O',
    'буйские удобрения|монофосфат калия': 'KH2PO4',
    'буйские удобрения|сульфат магния': 'MgSO4·7H2O',
  };

  for (const [externalKey, expectedKey] of Object.entries(buiskKeys)) {
    it(`${externalKey} → ${expectedKey}`, () => {
      const product = bundle.fertilizers.find((f) => f.external_key === externalKey);
      expect(product).toBeDefined();
      const inferred = inferSolubilityKeyFromDeclaredPct(
        declaredFromLines(product!.lines),
        externalKey,
      );
      expect(inferred).toBe(expectedKey);
      expect(product!.metadata.solubility_key).toBe(expectedKey);
      const spec: FertilizerSpec = {
        id: product!.external_key,
        name: product!.name,
        physicalForm: 'solid',
        doseUnit: 'g_per_L',
        declaredPct: declaredFromLines(product!.lines),
        elementalPct: {},
        metadata: product!.metadata,
      };
      expect(solubilityKeyForFertilizer(spec)).toBe(expectedKey);
    });
  }

  it('every inferred single-salt product in bundle carries metadata.solubility_key', () => {
    const missing: string[] = [];
    for (const f of bundle.fertilizers) {
      const declared = declaredFromLines(f.lines);
      const key = inferSolubilityKeyFromDeclaredPct(declared, f.external_key);
      if (!key) continue;
      if (f.metadata.solubility_key !== key) missing.push(f.external_key);
    }
    expect(missing).toEqual([]);
  });
});
