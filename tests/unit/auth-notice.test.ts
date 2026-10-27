import { describe, expect, it } from 'vitest';
import { authNoticeIsInfo, formatAuthNotice, noticeFromAuthMessage } from '@/lib/auth/auth-notice';

describe('auth notices', () => {
  it('explains a missing or wrong password without claiming the account is absent', () => {
    expect(noticeFromAuthMessage('Invalid login credentials', 'signin')).toEqual({ id: 'badCredentials' });
  });

  it('points an existing email at sign-in', () => {
    expect(noticeFromAuthMessage('User already registered', 'signup')).toEqual({ id: 'alreadyRegistered' });
  });

  it('keeps the server password minimum', () => {
    const notice = noticeFromAuthMessage('Password should be at least 6 characters', 'signup');
    expect(notice).toEqual({ id: 'shortPassword', minLength: 6 });
    expect(formatAuthNotice('Use at least {min} characters.', notice)).toBe('Use at least 6 characters.');
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
    expect(noticeFromAuthMessage('Provider (issuer) is not enabled', 'google').id).toBe('providerOff');
    expect(noticeFromAuthMessage('something unexpected', 'google').id).toBe('googleFailed');
    expect(noticeFromAuthMessage('something unexpected', 'signin').id).toBe('generic');
  });
});
