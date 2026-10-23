import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_ANON_KEY_FALLBACK, SUPABASE_URL_FALLBACK } from '@/lib/supabase/public-env';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL_FALLBACK,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY_FALLBACK,
  );
}
