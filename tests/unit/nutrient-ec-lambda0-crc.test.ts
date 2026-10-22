import { describe, expect, it } from 'vitest';
import { LAMBDA0_BY_ION } from '@growlog/nutrient-calc';

/** Expected Λ° (S·cm²·mol⁻¹) per review + CRC Handbook ionic conductivity table. */
const CRC_LAMBDA0_EXPECTED: Record<string, number> = {
  NO3: 71.44,
  NH4: 73.5,
  H2PO4: 36.0,
  HPO4: 114.0,
  SO4: 160.0,
  Cl: 76.31,
  K: 73.5,
  Na: 50.11,
  Ca: 119.0,
  Mg: 106.1,
  Fe2: 108.0,
  Mn2: 107.0,
  Zn2: 105.6,
  Cu2: 107.2,
  MoO4: 149.0,
};

describe('Λ° CRC table (per mole of ion)', () => {
  for (const [id, expected] of Object.entries(CRC_LAMBDA0_EXPECTED)) {
    it(`${id}: Λ° matches CRC reference (${expected})`, () => {
      const row = LAMBDA0_BY_ION[id];
      expect(row).toBeDefined();
      expect(row.lambda0Scm2PerMol).toBe(expected);
      expect(row.crcTableRef).toMatch(/CRC/);
    });
  }
});
