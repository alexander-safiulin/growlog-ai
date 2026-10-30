'use client';

import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { GrowEcoBackdrop } from '@/components/layout/GrowEcoBackdrop';
import { PageHead } from '@/components/layout/PageHead';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTranslation } from '@/components/providers/I18nProvider';
import Link from 'next/link';
import { useFarmContext } from '@/components/providers/FarmProvider';
import { useRouter } from 'next/router';
import { AuthProviderButtons, AuthProviderDivider } from '@/components/auth/AuthProviderButtons';
import { shouldShowSupabaseEnvHint } from '@/lib/supabase/public-env';
import { useEffect, useState } from 'react';

const showSupabaseEnvHint = shouldShowSupabaseEnvHint();

export function LoginPageClient() {
  const supabase = createClient();
  const router = useRouter();
  const { t } = useTranslation();
  const { userId, authLoading } = useFarmContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (userId) void router.replace('/dashboard');
  }, [authLoading, userId, router]);

  useEffect(() => {
    if (!router.isReady) return;
    if (router.query.error === 'callback_error') {
      setError(t('auth.oauth.callbackError'));
    }
  }, [router.isReady, router.query.error, t]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      if (mode === 'signin') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      } else {
        const { error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
      }
      await router.replace('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('auth.signInError'));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <PageHead titleKey="titles.login" />
      <GrowEcoBackdrop className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
        <div className="absolute right-4 top-4 flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>

        <Link
          href="/"
          className="mb-8 text-[22px] font-semibold leading-none tracking-tight text-grow-brand transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-2xl"
        >
          Growlog
        </Link>

        <Card className="w-full max-w-md border-grow-leaf/20 bg-card/90 shadow-lg shadow-grow-leaf/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>
              {mode === 'signin' ? t('titles.login') : t('auth.signUp')}
            </CardTitle>
            <CardDescription>
              {mode === 'signin' ? t('auth.signInTitle') : t('auth.signUpTitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuthProviderButtons
              intent={mode}
              disabled={pending}
              onError={(message) => setError(message || null)}
            />
            <div className="my-4">
              <AuthProviderDivider />
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('common.email')}</label>
                <Input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-grow-leaf/20 focus-visible:ring-primary"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('common.password')}</label>
                <Input
                  type="password"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-grow-leaf/20 focus-visible:ring-primary"
                  required
                  minLength={6}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full shadow-md shadow-primary/15" disabled={pending}>
                {pending
                  ? t('auth.signInPending')
                  : mode === 'signin'
                    ? t('auth.signIn')
                    : t('auth.signUp')}
              </Button>
            </form>
            <button
              type="button"
              className="mt-4 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            >
              {mode === 'signin' ? t('auth.noAccount') : t('auth.hasAccount')}
            </button>
            {showSupabaseEnvHint && (
              <p className="mt-6 text-center text-xs text-muted-foreground">
                {t('auth.envHint')}{' '}
                <code className="rounded bg-muted px-1">NEXT_PUBLIC_SUPABASE_URL</code> {t('auth.envAnd')}{' '}
                <code className="rounded bg-muted px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.{' '}
                <Link href="/" className="text-primary underline-offset-2 hover:underline">
                  {t('auth.backHome')}
                </Link>
              </p>
            )}
          </CardContent>
        </Card>

        <p className="mt-8 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span>by OG Lab</span>
          <span aria-hidden>·</span>
          <Link href="/" className="transition-colors hover:text-grow-leaf">
            {t('auth.backHome')}
          </Link>
        </p>
      </GrowEcoBackdrop>
    </>
  );
}
