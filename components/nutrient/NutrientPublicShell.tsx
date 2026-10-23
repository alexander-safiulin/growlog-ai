'use client';

import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTranslation } from '@/components/providers/I18nProvider';
import { cn } from '@/lib/utils';
import { Beaker, BookOpen, Home, Sprout } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';

function isNutrientNavActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NutrientPublicShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const { pathname } = useRouter();

  const bottomNav = [
    { href: '/', label: t('nav.home'), icon: Home },
    { href: '/nutrient/calculator', label: t('nutrient.nav.calculator'), icon: Beaker },
    { href: '/nutrient/sources', label: t('nutrient.nav.sources'), icon: BookOpen },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-grow-leaf/15 bg-card/90 backdrop-blur-md supports-[backdrop-filter]:bg-card/75">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
              aria-label={t('appName')}
            >
              <Sprout className="h-5 w-5" />
            </Link>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-grow-moss">{t('appName')}</p>
              <h1 className="truncate text-base font-semibold leading-tight">{title}</h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-4 pb-28">{children}</main>

      <nav
        className="fixed bottom-0 inset-x-0 z-40 border-t border-grow-leaf/15 bg-card/95 backdrop-blur-md pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        aria-label={t('nav.main')}
      >
        <div className="mx-auto flex max-w-lg justify-around gap-1 px-2 pt-1">
          {bottomNav.map(({ href, label, icon: Icon }) => {
            const active = isNutrientNavActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex min-h-11 min-w-[4.5rem] flex-1 flex-col items-center justify-center rounded-xl py-1.5 text-[10px] font-medium transition-colors',
                  active
                    ? 'bg-primary/12 text-primary'
                    : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                )}
              >
                <Icon className="mb-0.5 h-5 w-5" strokeWidth={active ? 2.25 : 2} />
                <span className="truncate max-w-full px-1">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
