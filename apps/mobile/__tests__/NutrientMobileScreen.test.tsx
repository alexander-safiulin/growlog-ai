import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { NutrientMobileScreen } from '@/components/nutrient/NutrientMobileScreen';
import { TAB_IDS, useMobileNutrientWorkspace } from '@/components/nutrient/useMobileNutrientWorkspace';
import { mobileStrings } from '@growlog/domain/i18n/mobile-strings';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@/context/LocaleContext', () => {
  const { mobileStrings: ms } = require('@growlog/domain/i18n/mobile-strings');
  return {
    useMobileLocale: () => ({
      locale: 'en',
      strings: ms('en'),
      setLocale: jest.fn(),
    }),
  };
});

const setTab = jest.fn();
const setActiveAlt = jest.fn();

jest.mock('@/components/nutrient/useMobileNutrientWorkspace', () => {
  const actual = jest.requireActual('@/components/nutrient/useMobileNutrientWorkspace');
  return {
    ...actual,
    useMobileNutrientWorkspace: jest.fn(),
  };
});

const mockWs = () => ({
  tab: 'wand' as const,
  setTab,
  catalog: {
    elements: [{ symbol: 'N', display_name: 'Nitrogen', atomic_mass: 14, valence: 5 }],
    target_profiles: [{ slug: 'hoagland-standard', name: 'Hoagland', target_ppm: {} }],
  },
  profiles: [{ slug: 'hoagland-standard', name: 'Hoagland' }],
  profileSlug: 'hoagland-standard',
  setProfileSlug: jest.fn(),
  selectedIds: [],
  setSelectedIds: jest.fn(),
  unified: [],
  filteredUnified: [],
  search: '',
  setSearch: jest.fn(),
  favoritesOnly: false,
  setFavoritesOnly: jest.fn(),
  favoriteIds: new Set<string>(),
  volumeL: 100,
  setVolumeL: jest.fn(),
  result: {
    best: {
      doses: [{ fertilizerId: 'a', fertilizerName: 'Salt', amountPerL: 1, unit: 'g_per_L', tank: 'A' }],
      achievedPpm: { N_NO3: 100 },
      matchScore: 0.92,
      warnings: [],
    },
    alternatives: [
      {
        doses: [{ fertilizerId: 'b', fertilizerName: 'Alt', amountPerL: 1, unit: 'g_per_L', tank: 'A' }],
        achievedPpm: { N_NO3: 90 },
        matchScore: 0.85,
        warnings: [],
      },
    ],
  },
  target: { N_NO3: 100 },
  activeAlt: 0,
  setActiveAlt,
  waterProfiles: [],
  activeWaterId: '',
  setActiveWaterId: jest.fn(),
  recipes: [],
  growCycles: [],
  cycleLabelById: {},
  eventLabelById: {},
  feedSystems: [],
  stepsBySystem: {},
  activeSystemId: '',
  setActiveSystemId: jest.fn(),
  activeStepId: '',
  setActiveStepId: jest.fn(),
  activeStep: null,
  reload: jest.fn(),
  loadRecipe: jest.fn(),
  farmId: 'farm-1',
  userId: 'user-1',
  cycle: { id: 'cycle-1', name: 'Grow 1', status: 'active' },
  scopeId: 'scope-1',
  supabase: {} as never,
});

function renderScreen() {
  (useMobileNutrientWorkspace as jest.Mock).mockReturnValue(mockWs());
  return render(<NutrientMobileScreen />);
}

describe('NutrientMobileScreen', () => {
  beforeEach(() => {
    setTab.mockClear();
    setActiveAlt.mockClear();
  });

  it('renders all nutrient workspace tabs', () => {
    renderScreen();
    const strings = mobileStrings('en');
    for (const id of TAB_IDS) {
      expect(screen.getByText(strings.nutrient.tabs[id])).toBeTruthy();
    }
  });

  it('wand tab shows score and alternative chips', () => {
    renderScreen();
    expect(screen.getByText(/Score/)).toBeTruthy();
    expect(screen.getByText('Best')).toBeTruthy();
    fireEvent.press(screen.getByText('Alt 1'));
    expect(setActiveAlt).toHaveBeenCalledWith(1);
  });

  it('switches tab when a tab label is pressed', () => {
    renderScreen();
    const strings = mobileStrings('en');
    fireEvent.press(screen.getByText(strings.nutrient.tabs.fertilizers));
    expect(setTab).toHaveBeenCalledWith('fertilizers');
  });
});
