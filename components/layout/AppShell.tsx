'use client';

import { CaptureFab } from '@/components/layout/CaptureFab';
import { ContextScopeBar } from '@/components/layout/ContextScopeBar';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTranslation } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import { useFarmContext } from '@/components/providers/FarmProvider';
import { cn } from '@/lib/utils';
import {
  Camera,
  ClipboardCheck,
  FileText,
  Home,
  List,
  LogOut,
  MessageCircle,
  Settings2,
  Sprout,
  Thermometer,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useMemo } from 'react';

function isNavActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  const { pathname } = useRouter();
  const { t } = useTranslation();
  const { supabase, farms, farmId, setFarmId } = useFarmContext();
  const showCaptureFab = pathname !== '/log';

  const nav = useMemo(
    () => [
      { href: '/dashboard', label: t('nav.focus'), icon: Home },
      { href: '/timeline', label: t('nav.timeline'), icon: List },
      {
        href: '/assistant',
        label: t('nav.ai'),
        icon: MessageCircle,
        modeTitle: t('nav.aiTitle'),
      },
      { href: '/sop', label: t('nav.sop'), icon: ClipboardCheck },
      { href: '/reports', label: t('nav.reports'), icon: FileText },
    ],
    [t]
  );

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-grow-leaf/15 bg-card/90 backdrop-blur-md shadow-sm dark:bg-card/80">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="flex min-w-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-grow-moss sm:text-xs sm:tracking-widest">
                <Sprout className="h-3 w-3 shrink-0" aria-hidden />
                <span className="truncate whitespace-nowrap">{t('appNameShort')}</span>
              </p>
              <h1 className="line-clamp-2 text-base font-semibold leading-snug sm:line-clamp-1 sm:text-lg">{title}</h1>
            </div>
            <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
              {farms.length > 1 && (
                <select
                  className="max-w-[120px] sm:max-w-[140px] min-h-11 rounded-xl border border-input bg-background px-2 py-2 text-sm"
                  value={farmId ?? ''}
                  onChange={(e) => setFarmId(e.target.value)}
                >
                  {farms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              )}
              <LanguageSwitcher />
              <Button variant="ghost" size="icon" className="h-11 w-11" asChild>
                <Link href="/photos" aria-label={t('nav.photos')}>
                  <Camera className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" className="h-11 w-11" asChild>
                <Link href="/sensors" aria-label={t('nav.sensors')}>
                  <Thermometer className="h-5 w-5" />
                </Link>
              </Button>
              <ThemeToggle />
              <Button variant="ghost" size="icon" asChild>
                <Link href="/settings" aria-label={t('nav.settings')}>
                  <Settings2 className="h-5 w-5" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                type="button"
                aria-label={t('nav.logout')}
                onClick={() => supabase.auth.signOut()}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <ContextScopeBar />
        </div>
      </header>

      <main
        className={cn(
          'mx-auto w-full max-w-3xl flex-1 px-4 py-6',
          showCaptureFab && 'pb-28'
        )}
      >
        {children}
      </main>

      {showCaptureFab && <CaptureFab />}

      <nav className="sticky bottom-0 z-40 border-t border-grow-leaf/15 bg-card/95 backdrop-blur-md shadow-[0_-4px_16px_hsl(var(--foreground)/0.04)]">
        <div className="mx-auto flex max-w-3xl gap-0.5 overflow-x-auto px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:gap-1">
          {nav.map(({ href, label, icon: Icon, modeTitle }) => {
            const active = isNavActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                title={modeTitle ?? label}
                aria-label={modeTitle ?? label}
                className={cn(
                  'flex min-h-11 min-w-[3.25rem] shrink-0 flex-col items-center justify-center rounded-xl py-2 text-[10px] font-medium transition-colors sm:min-w-[3.75rem] sm:text-[11px]',
                  active
                    ? 'bg-primary/15 text-primary shadow-sm shadow-primary/10'
                    : 'text-muted-foreground hover:bg-grow-sage/50 hover:text-foreground'
                )}
              >
                <Icon className="mb-0.5 h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
