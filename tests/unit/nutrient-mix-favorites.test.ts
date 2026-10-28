import { describe, expect, it } from 'vitest';
import {
  emptyNutrientGuestStore,
  mixFavoriteFingerprint,
  parseNutrientGuestStore,
  serializeNutrientGuestStore,
  type GuestMixFavoriteDraft,
} from '@growlog/domain';
import {
  clearGuestMixFavorites,
  removeGuestMixFavorite,
  toggleGuestMixFavorite,
} from '@/lib/nutrient/guest/guest-workspace-actions';

function draft(id: string, amount = 1): GuestMixFavoriteDraft {
  return {
    label: 'Best',
    matchPct: 64.7,
    ecMsCm: 1.09,
    volumeL: 100,
    targetPpm: { N: 100 },
    achievedPpm: { N: 80 },
    doses: [
      {
        fertilizerId: id,
        name: id,
        amountPerL: amount,
        unit: 'g_per_L',
        tank: 'single',
      },
    ],
  };
}

describe('mix favorites', () => {
  it('stores a comparison snapshot and removes the same dose set', () => {
    const added = toggleGuestMixFavorite(emptyNutrientGuestStore(), draft('ca'));
    expect(added.mixFavorites).toHaveLength(1);
    expect(added.mixFavorites?.[0]?.label).toBe('Best');
    expect(mixFavoriteFingerprint(added.mixFavorites?.[0]?.doses ?? [])).toBe(
      mixFavoriteFingerprint(draft('ca').doses),
    );

    const removed = toggleGuestMixFavorite(added, draft('ca', 1));
    expect(removed.mixFavorites).toEqual([]);
  });

  it('drops the oldest snapshot past the device cap and ignores an empty mix', () => {
    let store = emptyNutrientGuestStore();
    store = toggleGuestMixFavorite(store, draft('empty', 0));
    expect(store.mixFavorites).toEqual([]);

    for (let i = 0; i < 25; i += 1) store = toggleGuestMixFavorite(store, draft(`salt-${i}`));
    expect(store.mixFavorites).toHaveLength(24);
    expect(store.mixFavorites?.[0]?.doses[0]?.fertilizerId).toBe('salt-24');
    expect(store.mixFavorites?.some((row) => row.doses[0]?.fertilizerId === 'salt-0')).toBe(false);
  });

  it('removes one snapshot, clears the list, and round-trips through JSON', () => {
    const added = toggleGuestMixFavorite(
      toggleGuestMixFavorite(emptyNutrientGuestStore(), draft('ca')),
      draft('mg'),
    );
    const first = added.mixFavorites?.[1];
    expect(first).toBeTruthy();
    const withoutFirst = removeGuestMixFavorite(added, first!.id);
    expect(withoutFirst.mixFavorites?.map((row) => row.doses[0]?.fertilizerId)).toEqual(['mg']);
    expect(clearGuestMixFavorites(withoutFirst).mixFavorites).toEqual([]);

    const parsed = parseNutrientGuestStore(serializeNutrientGuestStore(added));
    expect(parsed?.mixFavorites).toHaveLength(2);
    expect(parsed?.mixFavorites?.[0]?.doses[0]?.name).toBe('mg');
  });
});
