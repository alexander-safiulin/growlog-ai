export type AuthNoticeId =
  | 'googleUnavailable'
  | 'googleCancelled'
  | 'googleBusy'
  | 'playServices'
  | 'googleRejected'
  | 'googleFailed'
  | 'providerOff'
  | 'signupsClosed'
  | 'confirmEmail'
  | 'badCredentials'
  | 'alreadyRegistered'
  | 'shortPassword'
  | 'badEmail'
  | 'missingFields'
  | 'rateLimit'
  | 'offline'
  | 'blocked'
  | 'checkInbox'
  | 'generic';

export type AuthNoticeSource = 'google' | 'signin' | 'signup';

export type AuthNotice = {
  id: AuthNoticeId;
  minLength?: number;
};

const INFO_NOTICES = new Set<AuthNoticeId>(['googleCancelled', 'checkInbox']);

export function authNoticeIsInfo(id: AuthNoticeId): boolean {
  return INFO_NOTICES.has(id);
}

export function formatAuthNotice(template: string, notice: AuthNotice): string {
  if (notice.minLength == null) return template;
  return template.replaceAll('{min}', String(notice.minLength));
}

function notice(id: AuthNoticeId, minLength?: number): AuthNotice {
  return minLength == null ? { id } : { id, minLength };
}

export function noticeFromAuthMessage(message: string, source: AuthNoticeSource): AuthNotice {
  const lower = message.toLowerCase();

  if (
    lower.includes('network request failed') ||
    lower.includes('failed to fetch') ||
    lower.includes('network error') ||
    lower.includes('timeout') ||
    lower.includes('offline')
  ) {
    return notice('offline');
  }

  if (
    lower.includes('rate limit') ||
    lower.includes('too many') ||
    lower.includes('only request this after') ||
    lower.includes('over_request_rate_limit') ||
    lower.includes('for security purposes')
  ) {
    return notice('rateLimit');
  }

  if (lower.includes('developer_error') || lower.includes('developer error')) {
    return notice('googleUnavailable');
  }

  if (lower.includes('play services')) {
    return notice('playServices');
  }

  if (lower.includes('email not confirmed') || lower.includes('email_not_confirmed')) {
    return notice('confirmEmail');
  }

  if (
    lower.includes('invalid login') ||
    lower.includes('invalid credentials') ||
    (source !== 'google' && lower.includes('invalid grant'))
  ) {
    return notice('badCredentials');
  }

  if (
    lower.includes('already registered') ||
    lower.includes('already been registered') ||
    lower.includes('user already exists')
  ) {
    return notice('alreadyRegistered');
  }

  const minLength = lower.match(/at least (\d+)/)?.[1];
  if (lower.includes('password') && (minLength || lower.includes('too short') || lower.includes('weak'))) {
    return notice('shortPassword', minLength ? Number(minLength) : 6);
  }

  if (
    lower.includes('unable to validate email') ||
    lower.includes('invalid format') ||
    (lower.includes('email') && lower.includes('invalid'))
  ) {
    return notice('badEmail');
  }

  if (lower.includes('missing email') || lower.includes('is required')) {
    return notice('missingFields');
  }

  if (
    lower.includes('signups not allowed') ||
    lower.includes('signup is disabled') ||
    lower.includes('signups are disabled')
  ) {
    return notice('signupsClosed');
  }

  if (
    lower.includes('provider is not enabled') ||
    lower.includes('unsupported provider') ||
    lower.includes('provider (issuer)')
  ) {
    return notice('providerOff');
  }

  if (lower.includes('banned') || lower.includes('user is not allowed')) {
    return notice('blocked');
  }

  if (source === 'google' && (lower.includes('cancel') || lower.includes('canceled'))) {
    return notice('googleCancelled');
  }

  if (
    source === 'google' &&
    (lower.includes('nonce') || lower.includes('audience') || lower.includes('id token') || lower.includes('id_token'))
  ) {
    return notice('googleRejected');
  }

  if (source === 'google') return notice('googleFailed');
  return notice('generic');
}
