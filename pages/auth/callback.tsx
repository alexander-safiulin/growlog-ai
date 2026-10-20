import { sanitizeAuthNextPath } from '@/lib/auth/provider-sign-in';
import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr';
import type { GetServerSideProps } from 'next';

const FALLBACK_URL = 'https://placeholder.local';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

export const getServerSideProps: GetServerSideProps = async (context) => {
  const code = typeof context.query.code === 'string' ? context.query.code : null;
  const next = sanitizeAuthNextPath(typeof context.query.next === 'string' ? context.query.next : null);
  const oauthError = typeof context.query.error === 'string' ? context.query.error : null;

  if (oauthError || !code) {
    return {
      redirect: { destination: '/auth/login?error=callback_error', permanent: false },
    };
  }

  const pendingCookies: string[] = [];
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_KEY,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(context.req.headers.cookie ?? '');
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: Parameters<typeof serializeCookieHeader>[2];
          }[]
        ) {
          cookiesToSet.forEach(({ name, value, options }) => {
            pendingCookies.push(serializeCookieHeader(name, value, options));
          });
          context.res.setHeader('Set-Cookie', pendingCookies);
        },
      },
    }
  );

  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return {
        redirect: { destination: '/auth/login?error=callback_error', permanent: false },
      };
    }
  } catch {
    return {
      redirect: { destination: '/auth/login?error=callback_error', permanent: false },
    };
  }

  return {
    redirect: { destination: next, permanent: false },
  };
};

export default function AuthCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center text-muted-foreground">
      Redirecting…
    </div>
  );
}
