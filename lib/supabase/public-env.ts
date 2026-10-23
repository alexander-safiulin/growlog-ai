/** Placeholders allow `next build` without local .env; treat as unconfigured in dev UI. */
export const SUPABASE_URL_FALLBACK = 'https://placeholder.local';
export const SUPABASE_ANON_KEY_FALLBACK =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

export function isPublicSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url?.trim() || !key?.trim()) return false;
  if (url === SUPABASE_URL_FALLBACK || key === SUPABASE_ANON_KEY_FALLBACK) return false;
  return true;
}

/** Dev-only hint when public Supabase env is missing; never shown in production. */
export function shouldShowSupabaseEnvHint(): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  return !isPublicSupabaseConfigured();
}
