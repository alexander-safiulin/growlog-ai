import { describe, expect, it } from 'vitest';
import { authNoticeIsInfo, formatAuthNotice, noticeFromAuthMessage, noticeFromUnknown } from '@/lib/auth/auth-notice';
import { mobileStrings } from '@/packages/domain/src/i18n/mobile-strings';

describe('auth notices', () => {
  it('explains a missing or wrong password without claiming the account is absent', () => {
    expect(noticeFromAuthMessage('Invalid login credentials', 'signin')).toEqual({ id: 'badCredentials' });
  });

  it('points an existing email at sign-in', () => {
    expect(noticeFromAuthMessage('User already registered', 'signup')).toEqual({ id: 'alreadyRegistered' });
  });

  it('keeps the server password minimum and does not invent one', () => {
    const notice = noticeFromAuthMessage('Password should be at least 6 characters', 'signup');
    expect(notice).toEqual({ id: 'shortPassword', minLength: 6 });
    expect(formatAuthNotice('Use at least {min} characters.', notice)).toBe('Use at least 6 characters.');
    expect(noticeFromAuthMessage('Password too short', 'signup', 'weak_password')).toEqual({ id: 'shortPassword' });
  });

  it('hides the Google developer troubleshooting URL', () => {
    expect(
      noticeFromAuthMessage(
        'DEVELOPER_ERROR: Follow troubleshooting instructions at https://react-native-google-signin.github.io/docs/troubleshooting',
        'google'
      )
    ).toEqual({ id: 'googleUnavailable' });
  });

  it('separates confirmation, rate limits, and a lost connection', () => {
    expect(noticeFromAuthMessage('Email not confirmed', 'signin').id).toBe('confirmEmail');
    expect(noticeFromAuthMessage('For security purposes, you can only request this after 60 seconds.', 'signup').id).toBe(
      'rateLimit'
    );
    expect(noticeFromAuthMessage('Network request failed', 'signin').id).toBe('offline');
    expect(authNoticeIsInfo('checkInbox')).toBe(true);
    expect(authNoticeIsInfo('badCredentials')).toBe(false);
  });

  it('tells a Google token rejection apart from a generic Google failure', () => {
    expect(noticeFromAuthMessage('Unacceptable audience in id_token', 'google').id).toBe('googleRejected');
    expect(noticeFromAuthMessage('', 'google', 'unexpected_audience').id).toBe('googleRejected');
    expect(noticeFromAuthMessage('Provider (issuer) is not enabled', 'google').id).toBe('providerOff');
    expect(noticeFromAuthMessage('something unexpected', 'google').id).toBe('googleFailed');
    expect(noticeFromAuthMessage('something unexpected', 'signin').id).toBe('generic');
  });

  it('uses GoTrue codes when the sentence is not the English default', () => {
    expect(noticeFromUnknown({ message: 'Invalid credentials', code: 'invalid_credentials' }, 'signin').id).toBe(
      'badCredentials'
    );
    expect(noticeFromUnknown({ message: '', code: 'email_exists' }, 'signup').id).toBe('alreadyRegistered');
    expect(noticeFromUnknown({ message: 'Play services not available', code: 'PLAY_SERVICES_NOT_AVAILABLE' }, 'google').id).toBe(
      'playServices'
    );
  });

  it('names the same sign-up and sign-in controls the screen shows', () => {
    for (const locale of ['en', 'ru'] as const) {
      const login = mobileStrings(locale).login;
      expect(login.notices.badCredentials).toContain(login.noAccount);
      expect(login.notices.alreadyRegistered).toContain(login.hasAccount);
    }
  });
});
