import { describe, expect, it } from 'vitest';
import { nutrientTableElementKeys } from '@/lib/nutrient/solver-deviation-keys';

describe('nutrient element visibility', () => {
  it('hides Si Cl Na by default', () => {
    const keys = nutrientTableElementKeys({ showMicro: true, showOptionalIons: false });
    expect(keys).not.toContain('Si');
    expect(keys).not.toContain('Cl');
    expect(keys).not.toContain('Na');
    expect(keys).toContain('Fe');
  });

  it('shows optional ions when toggled', () => {
    const keys = nutrientTableElementKeys({ showMicro: false, showOptionalIons: true });
    expect(keys).toContain('Si');
    expect(keys).not.toContain('Fe');
  });
});
