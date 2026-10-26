import { sortFertilizerRows } from '@/lib/fertilizer-list-sort';

const lowK = {
  brand: 'A',
  external_key: 'low',
  name: 'Low K',
  lines: [{ form_key: 'K', value_pct: 2 }],
};

const highK = {
  brand: 'B',
  external_key: 'high',
  name: 'High K',
  lines: [{ form_key: 'K', value_pct: 40 }],
};

describe('sortFertilizerRows', () => {
  it('sorts by name ascending', () => {
    const rows = sortFertilizerRows([highK, lowK], 'name', 'asc', 'en');
    expect(rows.map((r) => r.name)).toEqual(['Low K', 'High K']);
  });

  it('sorts by macro descending then back to name', () => {
    const byK = sortFertilizerRows([lowK, highK], 'K', 'desc', 'en');
    expect(byK.map((r) => r.name)).toEqual(['High K', 'Low K']);
    const byName = sortFertilizerRows(byK, 'name', 'asc', 'en');
    expect(byName.map((r) => r.name)).toEqual(['Low K', 'High K']);
  });
});
