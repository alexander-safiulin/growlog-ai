import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { NutrientMobileScreen } from '@/components/nutrient/NutrientMobileScreen';
import { TAB_IDS, useMobileNutrientWorkspace } from '@/components/nutrient/useMobileNutrientWorkspace';
import { mobileStrings } from '@growlog/domain/i18n/mobile-strings';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Swipeable = React.forwardRef(
    ({ children }: { children?: React.ReactNode }, _ref: unknown) => React.createElement(View, null, children),
  );
  return {
    __esModule: true,
    default: Swipeable,
    SwipeDirection: { LEFT: 'left', RIGHT: 'right' },
  };
});

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
  TAB_IDS: ['fertilizers', 'solutions', 'systems', 'water', 'elements'],
  useMobileNutrientWorkspace: jest.fn(),
}));

const mockSaveFarmFertilizerProduct = jest.fn(() => Promise.resolve('new-id'));

jest.mock('@growlog/domain', () => {
  const actual = jest.requireActual('@growlog/domain');
  return {
    ...actual,
    saveFarmFertilizerProduct: (...args: unknown[]) => mockSaveFarmFertilizerProduct(...args),
  };
});

const mockWs = () => ({
  tab: 'solutions' as const,
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
  deleteFeedSystem: jest.fn(),
  computing: false,
  result: {
    best: {
      doses: [{ fertilizerId: 'a', fertilizerName: 'Salt', amountPerL: 1, unit: 'g_per_L', tank: 'A' }],
      achievedPpm: { N_NO3: 100 },
      matchScore: 0.92,
      ecEstimateMsCm: 1.42,
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

  it('keeps target charts collapsed until the section is opened', () => {
    (useMobileNutrientWorkspace as jest.Mock).mockReturnValue({
      ...mockWs(),
      tab: 'solutions',
      solutionChosen: false,
    });
    render(<NutrientMobileScreen />);
    const strings = mobileStrings('en');
    expect(screen.getByText(strings.nutrient.stepVolumeHint)).toBeTruthy();
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

  it('shows tank volume and target setup above calculated mixes on solutions', () => {
    (useMobileNutrientWorkspace as jest.Mock).mockReturnValue({
      ...mockWs(),
      tab: 'solutions',
      solutionChosen: true,
      result: null,
    });
    render(<NutrientMobileScreen />);
    const strings = mobileStrings('en');
    expect(screen.getByText(strings.nutrient.stepVolume)).toBeTruthy();
    expect(screen.getByText(new RegExp(strings.nutrient.chooseSolution))).toBeTruthy();
    expect(screen.queryByText('Salt')).toBeNull();
    expect(screen.queryByText(strings.nutrient.variantsHeading)).toBeNull();
  });

  it('lists every calculated mix and expands any one', async () => {
    const saveCurrentMix = jest.fn().mockResolvedValue('mix-1');
    const saveCustomTargetProfile = jest.fn().mockResolvedValue('goal-1');
    (useMobileNutrientWorkspace as jest.Mock).mockReturnValue({
      ...mockWs(),
      tab: 'solutions',
      isCloudSynced: true,
      solutionChosen: true,
      saveCurrentMix,
      saveCustomTargetProfile,
    });
    render(<NutrientMobileScreen />);
    const strings = mobileStrings('en');
    expect(screen.queryByText(strings.nutrient.wandLead)).toBeNull();
    expect(screen.queryByText(strings.nutrient.saveMixHint)).toBeNull();
    expect(screen.queryByText(strings.nutrient.saveTargetProfileHint)).toBeNull();
    expect(screen.getByText(strings.nutrient.variantsHeading)).toBeTruthy();
    expect(screen.getByText(new RegExp(strings.nutrient.variantBest))).toBeTruthy();
    expect(screen.getByText(new RegExp(strings.nutrient.variantAlt.replace('{n}', '1')))).toBeTruthy();
    expect(screen.getByText('1 salt · 100.0% match')).toBeTruthy();
    expect(screen.queryByText(strings.nutrient.variantsOnlyOne)).toBeNull();
    expect(screen.getByText('EC 1.42 mS/cm')).toBeTruthy();
    expect(screen.queryByText('Salt')).toBeNull();
    expect(screen.queryByText('Alt')).toBeNull();
    expect(screen.queryByText('NO₃-N')).toBeNull();
    fireEvent.press(screen.getByText(new RegExp(strings.nutrient.variantBest)));
    expect(screen.getByText('Salt')).toBeTruthy();
    expect(screen.getByDisplayValue('1')).toBeTruthy();
    expect(screen.getByText('g/L')).toBeTruthy();
    expect(screen.getByText('tank 100 g')).toBeTruthy();
    expect(screen.queryByText(strings.nutrient.manualDose)).toBeNull();
    fireEvent.changeText(screen.getByDisplayValue('1'), '2');
    expect(screen.getByText(strings.nutrient.manualDose)).toBeTruthy();
    expect(screen.getByText('tank 200 g')).toBeTruthy();
    expect(screen.getByText('NO₃-N')).toBeTruthy();
    expect(screen.getByText(strings.nutrient.elementTarget)).toBeTruthy();
    expect(screen.getByText(strings.nutrient.elementAchieved)).toBeTruthy();
    expect(screen.getByRole('radio', { name: strings.nutrient.wandSectionTarget, selected: false })).toBeTruthy();
    expect(screen.getByRole('radio', { name: strings.nutrient.wandSectionMix, selected: true })).toBeTruthy();
    expect(screen.getByPlaceholderText(strings.nutrient.recipeName)).toBeTruthy();
    expect(screen.queryByPlaceholderText(strings.nutrient.saveTargetProfileName)).toBeNull();
    expect(screen.getByText(strings.nutrient.save)).toBeTruthy();
    expect(screen.queryByText(strings.nutrient.saveRecipe)).toBeNull();
    expect(screen.queryByText(strings.nutrient.saveTargetProfile)).toBeNull();
    fireEvent.changeText(screen.getByPlaceholderText(strings.nutrient.recipeName), 'Veg');
    fireEvent.press(screen.getByText(strings.nutrient.save));
    await waitFor(() => expect(saveCurrentMix).toHaveBeenCalledTimes(1));
    expect(saveCurrentMix.mock.calls[0][0]).toBe('Veg');
    expect(saveCustomTargetProfile).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText(strings.nutrient.saveMixDone)).toBeTruthy());
    fireEvent.press(screen.getByRole('radio', { name: strings.nutrient.wandSectionTarget }));
    expect(screen.getByPlaceholderText(strings.nutrient.saveTargetProfileName)).toBeTruthy();
    expect(screen.queryByPlaceholderText(strings.nutrient.recipeName)).toBeNull();
    fireEvent.press(screen.getByText(strings.nutrient.save));
    await waitFor(() => expect(saveCustomTargetProfile).toHaveBeenCalledWith('Veg', { N_NO3: 100 }));
    fireEvent.press(screen.getByText(new RegExp(strings.nutrient.variantAlt.replace('{n}', '1'))));
    expect(screen.getByText('Alt')).toBeTruthy();
    fireEvent.press(screen.getByText(new RegExp(strings.nutrient.variantBest)));
    expect(screen.queryByText('Salt')).toBeNull();
  });

  it('shows a single status when nothing is calculated', () => {
    (useMobileNutrientWorkspace as jest.Mock).mockReturnValue({
      ...mockWs(),
      tab: 'solutions',
      profileSlug: '',
      solutionChosen: false,
      activeStep: null,
      result: null,
      selectedIds: [],
    });
    render(<NutrientMobileScreen />);
    const strings = mobileStrings('en');
    expect(screen.getByText(strings.nutrient.wandNeedsSolution)).toBeTruthy();
    expect(screen.queryByText(strings.nutrient.wandLead)).toBeNull();
    expect(screen.queryByText(strings.nutrient.wandNeedsFertilizers)).toBeNull();
  });

  it('keeps workspace tabs visible while the fertilizer list is open', () => {
    (useMobileNutrientWorkspace as jest.Mock).mockReturnValue({
      ...mockWs(),
      tab: 'fertilizers',
    });
    render(<NutrientMobileScreen />);
    const strings = mobileStrings('en');
    for (const id of TAB_IDS) {
      expect(screen.getByText(strings.nutrient.tabs[id])).toBeTruthy();
    }
    expect(screen.getByPlaceholderText(strings.nutrient.searchFertilizers)).toBeTruthy();
  });

  it('returns from the favorites filter to the full fertilizer list', () => {
    const setFavoritesOnly = jest.fn();
    (useMobileNutrientWorkspace as jest.Mock).mockReturnValue({
      ...mockWs(),
      tab: 'fertilizers',
      favoritesOnly: true,
      filteredUnified: [],
      setFavoritesOnly,
    });
    render(<NutrientMobileScreen />);
    const strings = mobileStrings('en');
    expect(screen.getByText(strings.nutrient.favoritesEmpty)).toBeTruthy();
    expect(screen.queryByText(strings.nutrient.favoritesOnly)).toBeNull();
    fireEvent.press(screen.getByText(strings.nutrient.favoritesShowAll));
    expect(setFavoritesOnly).toHaveBeenCalledWith(false);
  });

  it('expands the full fertilizer composition, including micronutrients', () => {
    (useMobileNutrientWorkspace as jest.Mock).mockReturnValue({
      ...mockWs(),
      tab: 'fertilizers',
      filteredUnified: [
        {
          id: 'akvarin',
          scope: 'catalog',
          external_key: 'buiskie|akvarin',
          brand: 'Buiskie',
          name: 'Akvarin',
          physical_form: 'solid',
          dose_unit: 'g_per_L',
          lines: [
            { form_key: 'N', value_pct: 20 },
            { form_key: 'P2O5', value_pct: 5 },
            { form_key: 'K2O', value_pct: 10 },
            { form_key: 'Fe', value_pct: 0.054 },
            { form_key: 'Mn', value_pct: 0.042 },
          ],
        },
      ],
    });
    render(<NutrientMobileScreen />);
    const strings = mobileStrings('en');
    expect(screen.queryByText('Iron (Fe)')).toBeNull();
    expect(screen.queryByTestId('fertilizer-sort-macro-N')).toBeNull();
    fireEvent.press(screen.getByLabelText('Buiskie · Akvarin'));
    expect(screen.getByText(strings.nutrient.fertilizerCompositionMacros)).toBeTruthy();
    expect(screen.getByText('Nitrogen (N)')).toBeTruthy();
    expect(screen.getByText('20%')).toBeTruthy();
    expect(screen.getByText('Phosphorus (P₂O₅)')).toBeTruthy();
    expect(screen.getByText('Potassium (K₂O)')).toBeTruthy();
    expect(screen.getByText(strings.nutrient.fertilizerCompositionMicros)).toBeTruthy();
    expect(screen.getByText('Iron (Fe)')).toBeTruthy();
    expect(screen.getByText('0.054%')).toBeTruthy();
    expect(screen.getByText('Manganese (Mn)')).toBeTruthy();
    expect(screen.getByText('0.042%')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Buiskie · Akvarin'));
    expect(screen.queryByText('Iron (Fe)')).toBeNull();
  });

  it('lists fertilizers alphabetically without a sort control', () => {
    (useMobileNutrientWorkspace as jest.Mock).mockReturnValue({
      ...mockWs(),
      tab: 'fertilizers',
      filteredUnified: [
        {
          id: 'zeta',
          scope: 'catalog',
          external_key: 'farm:zeta',
          brand: 'Zeta',
          name: 'Zinc',
          physical_form: 'solid',
          dose_unit: 'g_per_L',
          lines: [],
        },
        {
          id: 'alpha',
          scope: 'catalog',
          external_key: 'farm:alpha',
          brand: 'Alpha',
          name: 'Ammonium',
          physical_form: 'solid',
          dose_unit: 'g_per_L',
          lines: [],
        },
      ],
    });
    render(<NutrientMobileScreen />);
    expect(screen.queryByText('A–Z')).toBeNull();
    expect(screen.queryByText('А–Я')).toBeNull();
    const labels = screen
      .getAllByRole('button')
      .map((node) => node.props.accessibilityLabel)
      .filter((label): label is string => typeof label === 'string');
    expect(labels.indexOf('Alpha · Ammonium')).toBeGreaterThanOrEqual(0);
    expect(labels.indexOf('Zeta · Zinc')).toBeGreaterThan(labels.indexOf('Alpha · Ammonium'));
  });

  it('clears every fertilizer check from the column header', () => {
    const setSelectedIds = jest.fn();
    (useMobileNutrientWorkspace as jest.Mock).mockReturnValue({
      ...mockWs(),
      tab: 'fertilizers',
      selectedIds: ['salt-1'],
      setSelectedIds,
    });
    render(<NutrientMobileScreen />);
    const strings = mobileStrings('en');
    fireEvent.press(screen.getByLabelText(strings.nutrient.clearSelection));
    expect(setSelectedIds).toHaveBeenCalledWith([]);
    expect(screen.queryByLabelText(strings.nutrient.clearFavorites)).toBeNull();
  });

  it('labels element mass and valence and keeps formulas on one line', () => {
    (useMobileNutrientWorkspace as jest.Mock).mockReturnValue({
      ...mockWs(),
      tab: 'elements',
      catalog: {
        ...mockWs().catalog,
        elements: [
          { symbol: 'P2O5', display_name: 'Phosphorus oxide' },
          { symbol: 'NO3', display_name: 'Nitrate', atomic_mass: 62.004, valence: 1 },
        ],
      },
    });
    render(<NutrientMobileScreen />);
    const strings = mobileStrings('en');
    expect(screen.getByText(strings.nutrient.elementMass)).toBeTruthy();
    expect(screen.getByText(strings.nutrient.elementValence)).toBeTruthy();
    expect(screen.getByText('62.004')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
    const formula = screen.getByText('P2O5');
    expect(formula.props.numberOfLines).toBe(1);
    expect(StyleSheet.flatten(formula.props.style).flexShrink).toBe(0);
  });

  it('opens a blank composition card and saves only the percents that were typed', async () => {
    mockSaveFarmFertilizerProduct.mockClear();
    const reload = jest.fn().mockResolvedValue(undefined);
    (useMobileNutrientWorkspace as jest.Mock).mockReturnValue({
      ...mockWs(),
      tab: 'fertilizers',
      reload,
    });
    render(<NutrientMobileScreen />);
    const strings = mobileStrings('en');

    fireEvent.press(screen.getByLabelText(strings.nutrient.newFarmProduct));

    expect(mockSaveFarmFertilizerProduct).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText(strings.nutrient.fertilizerName)).toBeTruthy();
    expect(screen.getByText(strings.nutrient.fertilizerCompositionMacros)).toBeTruthy();
    expect(screen.getByText(strings.nutrient.fertilizerCompositionMicros)).toBeTruthy();
    expect(screen.getByText('Nitrogen (N)')).toBeTruthy();
    expect(screen.getByText('Iron (Fe)')).toBeTruthy();

    fireEvent.press(screen.getByText(strings.nutrient.save));
    expect(mockSaveFarmFertilizerProduct).not.toHaveBeenCalled();
    expect(screen.getByText(strings.nutrient.fertilizerDraftMissing)).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText(strings.nutrient.fertilizerName), 'My CalMag');
    fireEvent.changeText(screen.getByLabelText('Calcium (CaO)'), '15');
    fireEvent.press(screen.getByText(strings.nutrient.save));

    await waitFor(() => expect(mockSaveFarmFertilizerProduct).toHaveBeenCalledTimes(1));
    expect(mockSaveFarmFertilizerProduct).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        farmId: 'farm-1',
        brand: '',
        name: 'My CalMag',
        physicalForm: 'solid',
        doseUnit: 'g_per_L',
        lines: [{ form_key: 'CaO', value_pct: 15 }],
      }),
    );
    expect(reload).toHaveBeenCalled();
  });

  it('switches tab when a tab label is pressed', () => {
    renderScreen();
    const strings = mobileStrings('en');
    fireEvent.press(screen.getByText(strings.nutrient.tabs.fertilizers));
    expect(setTab).toHaveBeenCalledWith('fertilizers');
  });
});
