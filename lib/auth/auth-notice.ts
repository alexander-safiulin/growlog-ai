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

const NOTICE_BY_CODE: Record<string, AuthNoticeId> = {
  invalid_credentials: 'badCredentials',
  user_not_found: 'badCredentials',
  email_not_confirmed: 'confirmEmail',
  phone_not_confirmed: 'confirmEmail',
  provider_email_needs_verification: 'confirmEmail',
  user_already_exists: 'alreadyRegistered',
  email_exists: 'alreadyRegistered',
  weak_password: 'shortPassword',
  email_address_invalid: 'badEmail',
  signup_disabled: 'signupsClosed',
  email_provider_disabled: 'signupsClosed',
  email_address_not_authorized: 'signupsClosed',
  over_request_rate_limit: 'rateLimit',
  over_email_send_rate_limit: 'rateLimit',
  over_sms_send_rate_limit: 'rateLimit',
  user_banned: 'blocked',
  provider_disabled: 'providerOff',
  oauth_provider_not_supported: 'providerOff',
  unexpected_audience: 'googleRejected',
  request_timeout: 'offline',
  hook_timeout: 'offline',
  hook_timeout_after_retry: 'offline',
};

function passwordMinimum(message: string): number | undefined {
  const match = message.toLowerCase().match(/at least (\d+)/);
  return match?.[1] ? Number(match[1]) : undefined;
}

export function noticeFromUnknown(error: unknown, source: AuthNoticeSource): AuthNotice {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' &&
          error !== null &&
          'message' in error &&
          typeof (error as { message: unknown }).message === 'string'
        ? (error as { message: string }).message
        : '';
  const rawCode =
    typeof error === 'object' && error !== null && 'code' in error ? (error as { code: unknown }).code : undefined;
  const code = rawCode == null ? undefined : String(rawCode);
  return noticeFromAuthMessage(message, source, code);
}

export function noticeFromAuthMessage(
  message: string,
  source: AuthNoticeSource,
  code?: string | null
): AuthNotice {
  const coded = code ? NOTICE_BY_CODE[code] : undefined;
  if (coded === 'shortPassword') return notice('shortPassword', passwordMinimum(message));
  if (coded) return notice(coded);

  const lower = message.toLowerCase();

  if (
    lower.includes('network request failed') ||
    lower.includes('failed to fetch') ||
    lower.includes('network error') ||
    lower.includes('timeout')
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

  if (lower.includes('password') && (passwordMinimum(message) || lower.includes('too short') || lower.includes('weak'))) {
    return notice('shortPassword', passwordMinimum(message));
  }

  if (
    lower.includes('unable to validate email') ||
    lower.includes('invalid format') ||
    (lower.includes('email') && lower.includes('invalid'))
  ) {
    return notice('badEmail');
  }

  if (lower.includes('missing email') || lower.includes('either an email or phone')) {
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
