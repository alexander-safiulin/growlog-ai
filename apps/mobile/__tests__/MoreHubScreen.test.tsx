import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import MoreHubScreen from '@/app/(tabs)/more/index';
import { useFarmContext } from '@/providers/FarmProvider';
import { mobileStrings } from '@growlog/domain/i18n/mobile-strings';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

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

jest.mock('@/providers/FarmProvider', () => ({
  useFarmContext: jest.fn(),
}));

const useFarmContextMock = useFarmContext as jest.MockedFunction<typeof useFarmContext>;
const copy = mobileStrings('en').more;

function mockSession(userId: string | null, email?: string) {
  const signOut = jest.fn().mockResolvedValue({ error: null });
  const getUser = jest.fn().mockResolvedValue({
    data: { user: email ? { email } : null },
  });
  useFarmContextMock.mockReturnValue({
    supabase: { auth: { getUser, signOut } },
    userId,
    authLoading: false,
  } as unknown as ReturnType<typeof useFarmContext>);
  return { signOut, getUser };
}

describe('MoreHubScreen session row', () => {
  beforeEach(() => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('offers sign in when there is no session', () => {
    mockSession(null);
    render(<MoreHubScreen />);
    expect(screen.getByText(copy.signIn)).toBeTruthy();
    expect(screen.getByText(copy.signInHint)).toBeTruthy();
    expect(screen.queryByText(copy.signOut)).toBeNull();
    fireEvent.press(screen.getByText(copy.signIn));
    expect(router.push).toHaveBeenCalledWith('/(auth)/login');
  });

  it('offers sign out for the signed-in account and keeps the session until confirmed', async () => {
    const { signOut } = mockSession('user-1', 'grower@farm.test');
    render(<MoreHubScreen />);
    expect(await screen.findByText('grower@farm.test')).toBeTruthy();
    fireEvent.press(screen.getByText(copy.signOut));
    expect(signOut).not.toHaveBeenCalled();
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2] as {
      text: string;
      onPress?: () => void;
    }[];
    buttons.find((button) => button.text === copy.signOut)?.onPress?.();
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
