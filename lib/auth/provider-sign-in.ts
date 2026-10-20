import type { SupabaseClient } from '@supabase/supabase-js';

export type AuthIntent = 'signin' | 'signup';
export type Web3Chain = 'ethereum' | 'solana';
export type AuthProviderId = 'google' | Web3Chain;

export type AuthProviderErrorCode =
  | 'providerDisabled'
  | 'startFailed'
  | 'noEthereumWallet'
  | 'noSolanaWallet'
  | 'noBrowserWallet'
  | 'cancelled'
  | 'noAccount'
  | 'walletLocked'
  | 'badSignature'
  | 'badDomain'
  | 'serverDisabled'
  | 'generic'
  | 'callbackError'
  | 'nativeWallet';

const DEFAULT_NEXT_PATH = '/dashboard';

type EthereumRequestWallet = {
  request: (args: { method: string; params?: unknown }) => Promise<unknown>;
};

type WindowWithWallets = Window & {
  ethereum?: unknown;
  solana?: unknown;
};

function isEthereumRequestWallet(value: unknown): value is EthereumRequestWallet {
  return (
    typeof value === 'object' &&
    value !== null &&
    'request' in value &&
    typeof (value as { request?: unknown }).request === 'function'
  );
}

export function resolveBrowserEthereumWallet(): EthereumRequestWallet | null {
  if (typeof window === 'undefined') return null;
  const wallets = window as WindowWithWallets;
  return isEthereumRequestWallet(wallets.ethereum) ? wallets.ethereum : null;
}

export function resolveBrowserSolanaWallet(): unknown | null {
  if (typeof window === 'undefined') return null;
  return (window as WindowWithWallets).solana ?? null;
}

export function hasBrowserWallet(chain: Web3Chain): boolean {
  if (chain === 'ethereum') return resolveBrowserEthereumWallet() !== null;
  return resolveBrowserSolanaWallet() !== null;
}

/** Internal path only. Rejects protocol-relative and absolute URLs. */
export function sanitizeAuthNextPath(next: string | null | undefined): string {
  if (!next) return DEFAULT_NEXT_PATH;
  if (!next.startsWith('/') || next.startsWith('//') || next.includes('\\') || next.includes('://')) {
    return DEFAULT_NEXT_PATH;
  }
  return next;
}

export function resolveAuthNextPath(intent: AuthIntent): string {
  return intent === 'signup' ? '/onboarding' : DEFAULT_NEXT_PATH;
}

export function buildAuthCallbackUrl(origin: string, nextPath: string): string {
  const base = origin.replace(/\/$/, '');
  const next = sanitizeAuthNextPath(nextPath);
  return `${base}/auth/callback?next=${encodeURIComponent(next)}`;
}

export function mapSocialAuthorizeProbeError(status: number, message: string): AuthProviderErrorCode | null {
  const lower = message.toLowerCase();
  if (status === 400 && (lower.includes('not enabled') || lower.includes('unsupported provider'))) {
    return 'providerDisabled';
  }
  return null;
}

export function mapSocialSignInError(message: string): AuthProviderErrorCode {
  const lower = message.toLowerCase();
  if (lower.includes('provider is not enabled') || lower.includes('unsupported provider')) {
    return 'providerDisabled';
  }
  return 'startFailed';
}

export function mapWeb3SignInError(message: string): AuthProviderErrorCode {
  const lower = message.toLowerCase();
  if (lower.includes('provider is not enabled') || lower.includes('web3 provider is disabled')) {
    return 'providerDisabled';
  }
  if (
    lower.includes('no compatible') ||
    lower.includes('wallet installed') ||
    lower.includes('wallet interface')
  ) {
    return 'noBrowserWallet';
  }
  if (lower.includes('rejected') || lower.includes('denied') || lower.includes('cancelled')) {
    return 'cancelled';
  }
  if (lower.includes('no accounts available') || lower.includes('wallet is connected')) {
    return 'noAccount';
  }
  if (lower.includes('eth_requestaccounts')) return 'walletLocked';
  if (lower.includes('invalid signature') || lower.includes('signature')) return 'badSignature';
  if (lower.includes('domain') || lower.includes('uri')) return 'badDomain';
  if (lower.includes('unexpected error')) return 'serverDisabled';
  return 'generic';
}

export function parseOAuthRedirectParams(url: string): {
  code: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  error: string | null;
} {
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');
  const query =
    queryIndex >= 0 ? url.slice(queryIndex + 1, hashIndex >= 0 && hashIndex > queryIndex ? hashIndex : undefined) : '';
  const hash = hashIndex >= 0 ? url.slice(hashIndex + 1) : '';
  const params = new URLSearchParams(query);
  const hashParams = new URLSearchParams(hash);
  const pick = (key: string) => params.get(key) ?? hashParams.get(key);
  return {
    code: pick('code'),
    accessToken: pick('access_token'),
    refreshToken: pick('refresh_token'),
    error: pick('error_description') ?? pick('error'),
  };
}

export async function signInWithGoogle(
  supabase: SupabaseClient,
  options: { origin: string; intent: AuthIntent }
): Promise<{ error: AuthProviderErrorCode | null; url?: string }> {
  const redirectTo = buildAuthCallbackUrl(options.origin, resolveAuthNextPath(options.intent));
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) return { error: mapSocialSignInError(error.message) };
  const url = data.url;
  if (!url) return { error: 'startFailed' };

  const disabled = await probeSocialAuthorizeUrl(url);
  if (disabled) return { error: disabled };
  return { error: null, url };
}

async function probeSocialAuthorizeUrl(url: string): Promise<AuthProviderErrorCode | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1500);
  try {
    const probe = await fetch(url, { method: 'GET', redirect: 'manual', signal: controller.signal });
    const body = (await probe.json().catch(() => null)) as { msg?: unknown; message?: unknown } | null;
    const message = String(body?.msg ?? body?.message ?? '');
    return mapSocialAuthorizeProbeError(probe.status, message);
  } catch {
    // CORS, a redirect to Google, or a slow probe. The authorize URL is still usable.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function signInWithWeb3Wallet(
  supabase: SupabaseClient,
  options: { chain: Web3Chain; origin: string; intent: AuthIntent }
): Promise<{ error: AuthProviderErrorCode | null; nextPath?: string }> {
  if (!hasBrowserWallet(options.chain)) {
    return { error: options.chain === 'ethereum' ? 'noEthereumWallet' : 'noSolanaWallet' };
  }

  let host = 'Growlog';
  try {
    host = new URL(options.origin).host;
  } catch {
    host = 'Growlog';
  }

  const statement = `Sign in to Growlog AI (${host}).`;
  const signInPageUrl = `${options.origin.replace(/\/$/, '')}/auth/login`;

  try {
    const credentials =
      options.chain === 'ethereum'
        ? ({
            chain: 'ethereum',
            statement,
            options: { url: signInPageUrl },
          } as const)
        : ({
            chain: 'solana',
            statement,
            options: { url: signInPageUrl },
          } as const);
    const { data, error } = await supabase.auth.signInWithWeb3(credentials);

    if (error) return { error: mapWeb3SignInError(error.message) };
    if (!data.session) return { error: 'generic' };
    return { error: null, nextPath: resolveAuthNextPath(options.intent) };
  } catch (caught: unknown) {
    const message = caught instanceof Error ? caught.message : '';
    return { error: message ? mapWeb3SignInError(message) : 'generic' };
  }
}
