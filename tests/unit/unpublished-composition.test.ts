import { describe, expect, it } from 'vitest';
import {
  unpublishedCompositionNames,
  unpublishedCompositionNote,
} from '@/lib/nutrient/unpublished-composition';

const products = [
  { id: 'bud', external_key: 'advanced nutrients|bud candy', name: 'Bud Candy', lines: [] },
  { id: 'bloom', external_key: 'advanced nutrients|ph perfect bloom', name: 'pH Perfect Bloom', lines: [{ form_key: 'NO3', value_pct: 0.89 }] },
];

describe('unpublished composition note', () => {
  it('names only selected fertilizers that have no composition lines', () => {
    expect(unpublishedCompositionNames(products, ['bud', 'bloom'], 'en')).toEqual(['Bud Candy']);
    expect(unpublishedCompositionNames(products, ['bloom'], 'ru')).toEqual([]);
  });

  it('builds a note only when such fertilizers are in the mix', () => {
    expect(unpublishedCompositionNote('ru', [])).toBeNull();
    const note = unpublishedCompositionNote('ru', ['Bud Candy']);
    expect(note).toContain('Bud Candy');
    expect(note).toContain('мл/л');
  });
});
