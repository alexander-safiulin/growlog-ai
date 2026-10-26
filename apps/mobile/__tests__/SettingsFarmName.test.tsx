import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import SettingsScreen, { FARM_NAME_SAVE_MS } from '@/app/(tabs)/more/settings';

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

jest.mock('@/components/settings/OfflineQueuePanel', () => ({ OfflineQueuePanel: () => null }));
jest.mock('@/components/settings/LanguagePreferenceSection', () => ({
  LanguagePreferenceSection: () => null,
}));
jest.mock('@/components/settings/ThemePreferenceSection', () => ({
  ThemePreferenceSection: () => null,
}));
jest.mock('@/components/settings/WorkspaceSyncSection', () => ({
  WorkspaceSyncSection: () => null,
}));
jest.mock('@/lib/notifications', () => ({ registerForPushNotifications: jest.fn() }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn() } }));

const mockEq = jest.fn();
const mockUpdate = jest.fn(() => ({ eq: mockEq }));
const mockRefetchAll = jest.fn();

jest.mock('@/providers/FarmProvider', () => ({
  useFarmContext: () => ({
    supabase: {
      from: jest.fn(() => ({ update: mockUpdate })),
      auth: { signOut: jest.fn() },
    },
    farms: [{ id: 'farm-1', name: 'OGL' }],
    farmId: 'farm-1',
    setFarmId: jest.fn(),
    cycle: null,
    scopes: [],
    scopeId: null,
    setScopeId: jest.fn(),
    refetchAll: mockRefetchAll,
    isLocalWorkspace: false,
    userId: 'user-1',
  }),
}));

async function settle(ms = FARM_NAME_SAVE_MS) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('settings farm name', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockEq.mockReset();
    mockEq.mockResolvedValue({ error: null });
    mockUpdate.mockClear();
    mockRefetchAll.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('saves a paused edit without a save button', async () => {
    render(<SettingsScreen />);
    expect(screen.queryByText('Save farm name')).toBeNull();

    fireEvent.changeText(screen.getByDisplayValue('OGL'), 'North');
    expect(mockUpdate).not.toHaveBeenCalled();

    await settle();

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith({ name: 'North' });
    expect(mockEq).toHaveBeenCalledWith('id', 'farm-1');
    expect(mockRefetchAll).toHaveBeenCalled();
    expect(screen.getByText('Saved.')).toBeTruthy();
  });

  it('does not write when the name returns to the saved value', async () => {
    render(<SettingsScreen />);
    const input = screen.getByDisplayValue('OGL');
    fireEvent.changeText(input, 'North');
    fireEvent.changeText(screen.getByDisplayValue('North'), 'OGL');

    await settle();

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('saves on blur before the pause elapses', async () => {
    render(<SettingsScreen />);
    fireEvent.changeText(screen.getByDisplayValue('OGL'), '  North  ');
    fireEvent(screen.getByDisplayValue('  North  '), 'blur');
    await settle(0);

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith({ name: 'North' });
  });

  it('restores the saved name when the field is cleared', async () => {
    render(<SettingsScreen />);
    fireEvent.changeText(screen.getByDisplayValue('OGL'), '   ');
    fireEvent(screen.getByDisplayValue('   '), 'blur');
    await settle(0);

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('OGL')).toBeTruthy();
  });

  it('saves a pending edit when the screen closes', async () => {
    const view = render(<SettingsScreen />);
    fireEvent.changeText(screen.getByDisplayValue('OGL'), 'North');
    view.unmount();
    await settle(0);

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith({ name: 'North' });
  });

  it('shows the database error under the field', async () => {
    mockEq.mockResolvedValueOnce({ error: { message: 'permission denied' } });
    render(<SettingsScreen />);
    fireEvent.changeText(screen.getByDisplayValue('OGL'), 'North');
    await settle();

    expect(screen.getByText('permission denied')).toBeTruthy();
    expect(screen.queryByText('Saved.')).toBeNull();
  });
});
