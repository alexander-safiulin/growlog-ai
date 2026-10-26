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

jest.mock('@/context/ThemeContext', () => {
  const { mobileThemeColors } = require('@/lib/mobile-theme');
  return {
    useTheme: () => ({
      preference: 'light',
      setPreference: jest.fn(),
      colorScheme: 'light',
      colors: mobileThemeColors('light'),
    }),
  };
});

const setTab = jest.fn();
const setActiveAlt = jest.fn();

jest.mock('@/components/nutrient/useMobileNutrientWorkspace', () => ({
  TAB_IDS: ['solutions', 'fertilizers', 'systems', 'water', 'elements', 'wand'],
  useMobileNutrientWorkspace: jest.fn(),
}));

const mockWs = () => ({
  tab: 'wand' as const,
  setTab,
  catalog: {
    elements: [{ symbol: 'N', display_name: 'Nitrogen', atomic_mass: 14, valence: 5 }],
    target_profiles: [{ slug: 'hoagland-standard', name: 'Hoagland', target_ppm: {} }],
  },
  profiles: [{ slug: 'hoagland-standard', name: 'Hoagland' }],
  myTargetProfiles: [],
  targetProfileSections: { mode: 'catalog_only', catalog: [{ slug: 'hoagland-standard', name: 'Hoagland', target_ppm: {} }] },
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
  solutionChosen: false,
  chooseSolution: jest.fn(),
  saveTankVolume: jest.fn().mockResolvedValue(undefined),
  saveCustomTargetProfile: jest.fn().mockResolvedValue(null),
  saveCurrentMix: jest.fn().mockResolvedValue(null),
  chooseFeedSystem: jest.fn(),
  chooseFeedStep: jest.fn(),
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

  it('keeps target charts collapsed until the optional section is opened', () => {
    (useMobileNutrientWorkspace as jest.Mock).mockReturnValue({
      ...mockWs(),
      tab: 'solutions',
      solutionChosen: false,
    });
    render(<NutrientMobileScreen />);
    const strings = mobileStrings('en');
    expect(screen.getByText(strings.nutrient.stepVolumeHint)).toBeTruthy();
    expect(screen.getByText(strings.nutrient.targetOptional)).toBeTruthy();
    expect(screen.getByText(strings.nutrient.chooseSolutionHint)).toBeTruthy();
    expect(screen.queryByText('Hoagland')).toBeNull();
    fireEvent.press(screen.getByText(new RegExp(strings.nutrient.chooseSolution)));
    expect(screen.getByText('Hoagland')).toBeTruthy();
  });

  it('shows saved mixes in their own card while the target profile stays collapsed', () => {
    (useMobileNutrientWorkspace as jest.Mock).mockReturnValue({
      ...mockWs(),
      tab: 'solutions',
      solutionChosen: false,
      recipes: [{ id: 'r1', name: 'Тестовый гров', volume_l: 100, cycle_id: null, linked_event_id: null }],
    });
    render(<NutrientMobileScreen />);
    const strings = mobileStrings('en');
    expect(screen.getByText(new RegExp(strings.nutrient.savedSolutions))).toBeTruthy();
    expect(screen.getByText(strings.nutrient.savedSolutionsHint)).toBeTruthy();
    expect(screen.queryByText('Тестовый гров')).toBeNull();
    fireEvent.press(screen.getByText(new RegExp(strings.nutrient.savedSolutions)));
    expect(screen.getByText('Тестовый гров')).toBeTruthy();
    expect(screen.getByText('100 L')).toBeTruthy();
    expect(screen.getByLabelText(strings.nutrient.recipeOpen)).toBeTruthy();
    expect(screen.getByLabelText(strings.nutrient.recipeRename)).toBeTruthy();
    expect(screen.getByLabelText(strings.nutrient.recipeDelete)).toBeTruthy();
    expect(screen.getByLabelText(strings.nutrient.recipeDuplicate)).toBeTruthy();
    expect(screen.queryByText(strings.nutrient.recipeOpen)).toBeNull();
    expect(screen.queryByText('Hoagland')).toBeNull();
    expect(screen.queryByText('—')).toBeNull();
  });

  it('asks for tank volume and hides salts until a solution is chosen', () => {
    (useMobileNutrientWorkspace as jest.Mock).mockReturnValue({
      ...mockWs(),
      tab: 'solutions',
      solutionChosen: true,
    });
    render(<NutrientMobileScreen />);
    const strings = mobileStrings('en');
    expect(screen.getByText(strings.nutrient.stepVolume)).toBeTruthy();
    expect(screen.queryByText(/Save recipes as PDF/)).toBeNull();
    expect(screen.queryByText(/Salt:/)).toBeNull();
    fireEvent.press(screen.getByText(new RegExp(strings.nutrient.composition)));
    expect(screen.getByText(/Salt:/)).toBeTruthy();
    fireEvent.press(screen.getByText(strings.nutrient.variantAlt.replace('{n}', '1')));
    expect(setActiveAlt).toHaveBeenCalledWith(1);
  });

  it('switches tab when a tab label is pressed', () => {
    renderScreen();
    const strings = mobileStrings('en');
    fireEvent.press(screen.getByText(strings.nutrient.tabs.fertilizers));
    expect(setTab).toHaveBeenCalledWith('fertilizers');
  });
});
